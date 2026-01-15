import { fetchWithPoolingOnServer, FetchWithPoolingOnServerOptions } from './http-client'

// ─────────────────────────────────────────────────────────────
// Config: Only 2 knobs instead of 5
// ─────────────────────────────────────────────────────────────
function getEnvNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

const LOG_MAX_QPS = Math.max(0, getEnvNumber('RUNTIME_LOG_MAX_QPS', 5))
const LOG_QUEUE_MAX = Math.max(10, getEnvNumber('RUNTIME_LOG_QUEUE_MAX', 200))
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

export function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 429 || (status >= 500 && status < 600)
}

// ─────────────────────────────────────────────────────────────
// Logging: Simple QPS throttle + dedup + async webhook
// ─────────────────────────────────────────────────────────────
const recentErrors = new Map<string, number>() // key → timestamp
const DEDUP_WINDOW_MS = 60_000
const DEDUP_MAX_ENTRIES = 1000
let qpsWindow = 0
let qpsCount = 0
let dropped = 0

const logQueue: string[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function webhookEnabled(): boolean {
	return typeof window === 'undefined' && !!process.env.RUNTIME_LOGS_WEBHOOK
}

function startFlushTimer(): void {
	if (flushTimer || !webhookEnabled()) return
	flushTimer = setInterval(flushQueue, 1000)
	if (typeof flushTimer.unref === 'function') {
		flushTimer.unref()
	}
}

function flushQueue(): void {
	if (logQueue.length === 0 && dropped === 0) {
		// Stop timer when idle to save CPU
		if (flushTimer) {
			clearInterval(flushTimer)
			flushTimer = null
		}
		return
	}

	const items = logQueue.splice(0)
	if (dropped > 0) {
		items.unshift(`[logs] ${dropped} dropped`)
		dropped = 0
	}

	// Batch into ≤1900 char messages (Discord limit is 2000)
	let batch = ''
	for (const line of items) {
		const next = batch ? `${batch}\n${line}` : line
		if (next.length > 1900) {
			if (batch) sendWebhook(batch)
			batch = line.slice(0, 1900)
		} else {
			batch = next
		}
	}
	if (batch) sendWebhook(batch)
}

function sendWebhook(content: string): void {
	const url = process.env.RUNTIME_LOGS_WEBHOOK
	if (!url) return

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 5000)

	fetch(url, {
		method: 'POST',
		body: JSON.stringify({ content }),
		headers: { 'Content-Type': 'application/json' },
		signal: controller.signal
	})
		.catch(() => {
			// Silently ignore webhook failures
		})
		.finally(() => clearTimeout(timeoutId))
}

type RuntimeLogOptions = {
	level?: 'info' | 'error'
	forceConsole?: boolean
}

export function postRuntimeLogs(log: string, options?: RuntimeLogOptions): void {
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
		startFlushTimer()
	}
	if (!droppedForThrottle) {
		qpsCount++
	}

	// Dedup: skip if same error logged within window
	const key = log.replace(/\[\d+ms\]/g, '').replace(/\d{10,}/g, '')
	const lastSeen = recentErrors.get(key)
	if (!droppedForThrottle && lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
		dropped++
		startFlushTimer()
		droppedForThrottle = true
	}
	if (!droppedForThrottle) {
		recentErrors.set(key, now)
	}

	// Periodic cleanup (lazy, on log)
	if (recentErrors.size > 500) {
		const cutoff = now - DEDUP_WINDOW_MS
		for (const [k, t] of recentErrors) {
			if (t < cutoff) recentErrors.delete(k)
		}
	}

	// Hard cap: evict oldest entries if map grows too large
	if (recentErrors.size >= DEDUP_MAX_ENTRIES) {
		// Map iteration order is insertion order, so first entries are oldest
		const toDelete = recentErrors.size - DEDUP_MAX_ENTRIES + 100 // Remove 100 to avoid thrashing
		let deleted = 0
		for (const key of recentErrors.keys()) {
			if (deleted >= toDelete) break
			recentErrors.delete(key)
			deleted++
		}
	}

	// Enqueue for webhook
	if (!droppedForThrottle && webhookEnabled()) {
		if (logQueue.length >= LOG_QUEUE_MAX) {
			dropped++
			startFlushTimer()
		} else {
			logQueue.push(log.slice(0, 1900))
			startFlushTimer()
		}
	}

	// Console (unless silent)
	if (!LOG_SILENT || forceConsole || level === 'error') {
		const output = level === 'error' ? console.error : console.log
		output(`\n${log}\n`)
	}
}

// ─────────────────────────────────────────────────────────────
// Fetch with single retry loop
// ─────────────────────────────────────────────────────────────
export async function fetchJson(
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	retry: boolean = false
): Promise<any> {
	const start = Date.now()
	const maxAttempts = retry ? 3 : 2
	let lastErr: Error | null = null

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const res = await fetchWithPoolingOnServer(url, options)

			if (!res.ok) {
				// Non-retryable client errors → fail fast
				if (res.status >= 400 && res.status < 500 && !isRetryableStatus(res.status)) {
					const text = await res.text().catch(() => res.statusText)
					throw new Error(`[${res.status}] ${text}`)
				}
				// Retryable server errors
				if (isRetryableStatus(res.status) && attempt < maxAttempts - 1) {
					await sleep(getJitteredDelay(200, attempt, 2000))
					continue
				}
				const text = await res.text().catch(() => res.statusText)
				throw new Error(`[${res.status}] ${text}`)
			}

			const data = await res.json()
			const elapsed = Date.now() - start
			if (elapsed > 5000) {
				postRuntimeLogs(`[fetchJson] [${elapsed}ms] < ${url} >`)
			}

			return data
		} catch (err) {
			lastErr = err instanceof Error ? err : new Error(String(err))
			const canRetry = attempt < maxAttempts - 1 && isTransientError(lastErr)
			if (canRetry) {
				await sleep(getJitteredDelay(100, attempt, 2000))
				continue
			}
		}
	}

	// Log on final failure only
	const elapsed = Date.now() - start
	postRuntimeLogs(`[fetchJson] [error] [${elapsed}ms] [${lastErr?.message}] < ${url} >`, {
		level: 'error',
		forceConsole: true
	})
	throw lastErr
}

// ─────────────────────────────────────────────────────────────
// Simple fetch wrapper for API calls
// ─────────────────────────────────────────────────────────────
export const fetchApi = async (url: string | Array<string>) => {
	if (!url) return null
	try {
		const data = typeof url === 'string' ? await fetchJson(url) : await Promise.all(url.map((u) => fetchJson(u)))
		return data
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : `Failed to fetch ${typeof url === 'string' ? url : url.join(', ')}`
		)
	}
}

// ─────────────────────────────────────────────────────────────
// Response handlers (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────
export async function handleFetchResponse(res: Response): Promise<any> {
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
			if (errorResponse.error) {
				errorMessage = errorResponse.error
			} else if (errorResponse.message) {
				errorMessage = errorResponse.message
			} else {
				errorMessage = responseText
			}
		} catch {
			errorMessage = responseText
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
				if (errorResponse.error) {
					errorMessage = errorResponse.error
				} else if (errorResponse.message) {
					errorMessage = errorResponse.message
				} else {
					errorMessage = responseText
				}
			} catch {
				errorMessage = responseText
			}
		}

		throw new Error(errorMessage)
	}
	return res
}
