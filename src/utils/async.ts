import { fetchWithPoolingOnServer, type FetchWithPoolingOnServerOptions } from './http-client'

// ─────────────────────────────────────────────────────────────
// Config: Only 2 knobs instead of 5
// ─────────────────────────────────────────────────────────────
export function getEnvNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

const LOG_MAX_QPS = Math.max(0, getEnvNumber('RUNTIME_LOG_MAX_QPS', 5))
const LOG_QUEUE_MAX = Math.max(10, getEnvNumber('RUNTIME_LOG_QUEUE_MAX', 200))
const WEBHOOK_MIN_INTERVAL_MS = Math.max(250, getEnvNumber('RUNTIME_LOG_WEBHOOK_MIN_INTERVAL_MS', 1000))
const LOG_SILENT =
	process.env.RUNTIME_LOG_SILENT === '1' ||
	(process.env.NODE_ENV === 'production' && process.env.RUNTIME_LOG_SILENT !== '0')

// ─────────────────────────────────────────────────────────────
// Shared utilities (exported for perf.ts to reuse)
// ─────────────────────────────────────────────────────────────
export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getJitteredDelay(baseMs: number, attempt: number, maxMs: number): number {
	const exp = Math.min(baseMs * 2 ** attempt, maxMs)
	return Math.floor(exp * (0.5 + Math.random()))
}

const TRANSIENT_ERRORS = ['aborted', 'socket', 'econnreset', 'etimedout', 'timeout', 'fetch failed', 'network']

export function isTransientError(err: unknown): boolean {
	if (!(err instanceof Error)) return false
	const msg = err.message.toLowerCase()
	return TRANSIENT_ERRORS.some((t) => msg.includes(t))
}

function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 429 || (status >= 500 && status < 600)
}

function looksLikeHtmlDocument(text: string): boolean {
	// We specifically want to catch "Cloudflare HTML error page" type responses.
	// Keep this cheap: no regex, small checks, case-insensitive.
	const s = text.trimStart().slice(0, 2048).toLowerCase()
	return s.startsWith('<!doctype html') || s.startsWith('<html') || (s.includes('<head') && s.includes('</html>'))
}

function sanitizeResponseTextForError(text: string): string {
	if (!text) return ''
	if (looksLikeHtmlDocument(text)) return '[html error page]'
	// Keep logs/errors small; avoid huge payloads (and accidental PII) in exceptions.
	const trimmed = text.trim()
	if (trimmed.length <= 500) return trimmed
	return `${trimmed.slice(0, 500)}…`
}

function sanitizeUrlForLogs(input: RequestInfo | URL): string {
	let raw: string

	if (typeof input === 'string') raw = input
	else if (input instanceof URL) raw = input.toString()
	// Request (browser/undici) has `.url`
	else if (typeof (input as any)?.url === 'string') raw = (input as any).url
	else raw = String(input)

	// Minimal behavior:
	// - If SERVER_URL / V2_SERVER_URL (or lowercase variants) is set, strip it from logged URL.
	// - If not set, log as-is.
	const apiKey = process.env.API_KEY
	if (apiKey && raw.includes(apiKey)) {
		raw = raw.replaceAll(apiKey, '[REDACTED]')
	}

	const serverUrlCandidates = [
		process.env.SERVER_URL,
		process.env.server_url,
		process.env.V2_SERVER_URL,
		process.env.v2_server_url
	].filter((url): url is string => typeof url === 'string' && url.length > 0)

	for (const candidate of serverUrlCandidates) {
		// Normalize env URL for log-sanitizing:
		// - strip trailing slashes
		// - if it ends with `/api` (or `/api/`), strip that too
		const base = candidate.replace(/\/+$/, '').replace(/\/api$/, '')
		if (!base) continue
		if (raw.startsWith(base)) return raw.slice(base.length) || '/'
	}

	try {
		const parsed = new URL(raw)
		// Fallback when env candidates are unavailable in client runtime.
		if (parsed.hostname === 'api.llama.fi' || parsed.hostname === 'pro-api.llama.fi') {
			const pathWithoutBase = parsed.pathname.replace(/^\/[^/]+\/api(\/|$)/, '/').replace(/^\/api(\/|$)/, '/')
			return `${pathWithoutBase}${parsed.search}${parsed.hash}` || '/'
		}
	} catch {
		// raw can be a relative URL; keep as-is.
	}

	return raw
}

// ─────────────────────────────────────────────────────────────
// Logging: Simple QPS throttle + dedup + async webhook
// ─────────────────────────────────────────────────────────────
const recentErrors = new Map<string, number>() // key → timestamp
const DEDUP_WINDOW_MS = 60_000
const DEDUP_MAX_ENTRIES = 1000
const CLEANUP_INTERVAL_MS = 10_000
let lastCleanupTime = 0
let qpsWindow = 0
let qpsCount = 0
let dropped = 0

const logQueue: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let webhookInFlight = false
let webhookNextSendAt = 0
let webhookBackoffMs = 0
const WEBHOOK_MAX_BACKOFF_MS = 30_000

function webhookEnabled(): boolean {
	return typeof window === 'undefined' && !!process.env.RUNTIME_LOGS_WEBHOOK
}

function ensureFlushScheduled(delayMs: number = 0): void {
	if (flushTimer || !webhookEnabled()) return
	const delay = Math.max(0, delayMs)
	flushTimer = setTimeout(() => void flushQueue(), delay)
	if (typeof flushTimer.unref === 'function') {
		flushTimer.unref()
	}
}

async function flushQueue(): Promise<void> {
	// Allow rescheduling by clearing timer handle first.
	flushTimer = null

	if (!webhookEnabled()) return
	if (webhookInFlight) {
		ensureFlushScheduled(250)
		return
	}
	if (logQueue.length === 0 && dropped === 0) return

	const now = Date.now()
	if (now < webhookNextSendAt) {
		ensureFlushScheduled(webhookNextSendAt - now)
		return
	}

	// Convert accumulated drops into a single line, so it also gets rate-limited.
	if (dropped > 0) {
		logQueue.unshift(`[logs] ${dropped} dropped`)
		dropped = 0
	}

	// Build ONE batch (slow mode): at most one webhook request per flush.
	// (Discord limit is 2000; keep margin for safety.)
	let batch = ''
	while (logQueue.length > 0) {
		const line = logQueue[0] ?? ''
		const next = batch ? `${batch}\n${line}` : line
		if (next.length > 1900) {
			if (!batch) {
				// Single line too large: send truncated and move on.
				batch = line.slice(0, 1900)
				logQueue.shift()
			}
			break
		}
		batch = next
		logQueue.shift()
	}

	if (!batch) return

	webhookInFlight = true
	const result = await sendWebhook(batch)
	webhookInFlight = false

	const afterSendNow = Date.now()

	if (result.ok) {
		webhookBackoffMs = 0
		webhookNextSendAt = afterSendNow + WEBHOOK_MIN_INTERVAL_MS
	} else if (result.retryAfterMs && result.retryAfterMs > 0) {
		// Respect Discord rate limiting.
		webhookNextSendAt = afterSendNow + Math.min(WEBHOOK_MAX_BACKOFF_MS, result.retryAfterMs)
	} else {
		// Generic failure: exponential-ish backoff, bounded.
		webhookBackoffMs = Math.min(WEBHOOK_MAX_BACKOFF_MS, webhookBackoffMs ? webhookBackoffMs * 2 : 2000)
		webhookNextSendAt = afterSendNow + webhookBackoffMs
	}

	// Schedule next flush only if we still have work.
	if (logQueue.length > 0 || dropped > 0) {
		ensureFlushScheduled(Math.max(0, webhookNextSendAt - Date.now()))
	}
}

async function sendWebhook(content: string): Promise<{ ok: boolean; retryAfterMs?: number }> {
	const url = process.env.RUNTIME_LOGS_WEBHOOK
	if (!url) return { ok: false }

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 5000)

	try {
		const res = await fetch(url, {
			method: 'POST',
			body: JSON.stringify({ content }),
			headers: { 'Content-Type': 'application/json' },
			signal: controller.signal
		})

		if (res.status === 429) {
			const retryAfterHeader = res.headers.get('Retry-After') || ''
			const retryAfterSeconds = Number(retryAfterHeader)
			const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 5000
			return { ok: false, retryAfterMs }
		}

		return { ok: res.ok }
	} catch {
		// Silently ignore webhook failures (best-effort logger)
		return { ok: false }
	} finally {
		clearTimeout(timeoutId)
	}
}

type RuntimeLogOptions = {
	level?: 'info' | 'error'
	forceConsole?: boolean
}

export function postRuntimeLogs(log: string, options?: RuntimeLogOptions): void {
	// Never log or ship HTML pages (e.g. Cloudflare error documents).
	// These are noisy, can be huge, and aren't useful for runtime diagnostics here.
	if (looksLikeHtmlDocument(log)) return

	const now = Date.now()
	const level = options?.level ?? 'info'
	const forceConsole = options?.forceConsole ?? false
	let droppedForThrottle = false

	// QPS throttle
	if (now - qpsWindow >= 1000) {
		qpsWindow = now
		qpsCount = 0
	}
	if (LOG_MAX_QPS > 0 && qpsCount >= LOG_MAX_QPS) {
		dropped++
		droppedForThrottle = true
		ensureFlushScheduled(0)
	}
	if (!droppedForThrottle) {
		qpsCount++
	}

	// Dedup: skip if same error logged within window
	const key = log.replace(/\[\d+ms\]/g, '').replace(/\d{10,}/g, '')
	const lastSeen = recentErrors.get(key)
	if (!droppedForThrottle && lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
		dropped++
		ensureFlushScheduled(0)
		droppedForThrottle = true
	}
	if (!droppedForThrottle) {
		recentErrors.set(key, now)
	}

	// Periodic cleanup (time-throttled to avoid running on every call)
	const shouldCleanup = recentErrors.size > 500 && now - lastCleanupTime >= CLEANUP_INTERVAL_MS
	if (shouldCleanup || recentErrors.size >= DEDUP_MAX_ENTRIES) {
		lastCleanupTime = now
		const cutoff = now - DEDUP_WINDOW_MS
		for (const [k, t] of recentErrors) {
			if (t < cutoff) recentErrors.delete(k)
		}
		// Hard cap: evict oldest entries if map still too large
		if (recentErrors.size >= DEDUP_MAX_ENTRIES) {
			const toDelete = recentErrors.size - DEDUP_MAX_ENTRIES + 100
			let deleted = 0
			for (const key of recentErrors.keys()) {
				if (deleted >= toDelete) break
				recentErrors.delete(key)
				deleted++
			}
		}
	}

	// Enqueue for webhook
	if (!droppedForThrottle && webhookEnabled()) {
		if (logQueue.length >= LOG_QUEUE_MAX) {
			dropped++
			ensureFlushScheduled(0)
		} else {
			logQueue.push(log.slice(0, 1900))
			ensureFlushScheduled(0)
		}
	}

	// Console (unless silent)
	// IMPORTANT: apply the same throttle/dedup gate to console to avoid event-loop spam.
	// If webhook is disabled, console may be the only place logs go, so keep it even when throttled.
	if ((!LOG_SILENT || forceConsole || level === 'error') && (!droppedForThrottle || !webhookEnabled())) {
		const output = level === 'error' ? console.error : console.log
		output(`\n${log}\n`)
	}
}

// ─────────────────────────────────────────────────────────────
// Fetch with single retry loop
// ─────────────────────────────────────────────────────────────
export async function fetchJson<T = any>(
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	extraRetry: boolean = false
): Promise<T> {
	const start = Date.now()
	const maxAttempts = extraRetry ? 3 : 2
	const sanitizedUrl = sanitizeUrlForLogs(url)
	let lastErr: Error | null = null
	let lastErrWasHtml = false

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const res = await fetchWithPoolingOnServer(url, options)

			if (!res.ok) {
				// Non-retryable client errors → fail fast
				if (res.status >= 400 && res.status < 500 && !isRetryableStatus(res.status)) {
					const text = await res.text().catch(() => res.statusText)
					const sanitized = sanitizeResponseTextForError(text || res.statusText)
					lastErrWasHtml = looksLikeHtmlDocument(text || '')
					throw new Error(`${sanitizedUrl}: [${res.status}] ${sanitized || res.statusText}`)
				}
				// Retryable server errors
				if (isRetryableStatus(res.status) && attempt < maxAttempts - 1) {
					await sleep(getJitteredDelay(200, attempt, 2000))
					continue
				}
				const text = await res.text().catch(() => res.statusText)
				const sanitized = sanitizeResponseTextForError(text || res.statusText)
				lastErrWasHtml = looksLikeHtmlDocument(text || '')
				throw new Error(`${sanitizedUrl}: [${res.status}] ${sanitized || res.statusText}`)
			}

			const data = await res.json()
			const elapsed = Date.now() - start
			if (elapsed > 5000) {
				postRuntimeLogs(`[fetchJson] [${elapsed}ms] < ${sanitizedUrl} >`)
			}

			return data
		} catch (err) {
			lastErr = err instanceof Error ? err : new Error(String(err))
			// Common case: API returned HTML (starts with "<") but we tried to parse JSON.
			// We don't have the body here, but the SyntaxError message is a strong signal.
			if (/unexpected token\s*</i.test(lastErr.message)) {
				lastErrWasHtml = true
			}
			const canRetry = attempt < maxAttempts - 1 && isTransientError(lastErr)
			if (canRetry) {
				await sleep(getJitteredDelay(100, attempt, 2000))
				continue
			}
		}
	}

	// Log on final failure only
	const elapsed = Date.now() - start
	const finalLog = lastErrWasHtml
		? `[fetchJson] [error] [${elapsed}ms] [returned html page] < ${sanitizedUrl} >`
		: `[fetchJson] [error] [${elapsed}ms] [${lastErr?.message}] < ${sanitizedUrl} >`
	// Avoid spamming console when webhook logging is configured.
	postRuntimeLogs(finalLog, { level: 'error', forceConsole: !webhookEnabled() })
	if (!lastErr) {
		throw new Error(`${sanitizedUrl}: Unknown fetch error`)
	}
	if (lastErr.message.startsWith(`${sanitizedUrl}:`)) {
		throw lastErr
	}
	throw new Error(`${sanitizedUrl}: ${lastErr.message}`)
}

// ─────────────────────────────────────────────────────────────
// Response handlers (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────
export async function handleFetchResponse(res: Response): Promise<unknown> {
	if (res.ok) {
		return res.json()
	}

	let errorMessage = `[${res.status}]`
	if (res.statusText) {
		errorMessage += `: ${res.statusText}`
	}

	const responseText = await res.text().catch(() => '')
	if (responseText) {
		try {
			const errorResponse = JSON.parse(responseText)
			errorMessage = errorResponse.error ?? errorResponse.message ?? sanitizeResponseTextForError(responseText)
		} catch {
			errorMessage = sanitizeResponseTextForError(responseText)
		}
	}

	throw new Error(errorMessage)
}

export async function handleSimpleFetchResponse(res: Response): Promise<Response> {
	if (!res.ok) {
		let errorMessage = `[HTTP] [error] [${res.status}]`

		if (res.statusText) {
			errorMessage += `: ${res.statusText}`
		}

		const responseText = await res.text().catch(() => '')
		if (responseText) {
			try {
				const errorResponse = JSON.parse(responseText)
				errorMessage = errorResponse.error ?? errorResponse.message ?? sanitizeResponseTextForError(responseText)
			} catch {
				errorMessage = sanitizeResponseTextForError(responseText)
			}
		}

		throw new Error(errorMessage)
	}
	return res
}
