import { normalizeError } from './error'
import { fetchWithPoolingOnServer, serverFetchUrl, type FetchWithPoolingOnServerOptions } from './http-client'
import { recordRuntimeError } from './telemetry'

// ─────────────────────────────────────────────────────────────
// Config: Only 2 knobs instead of 5
// ─────────────────────────────────────────────────────────────
export function getEnvNumber(name: string, fallback: number): number {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

export function getFastJsonTimeoutMs(): number {
	return getEnvNumber('SERVER_FETCH_JSON_FAST_TIMEOUT_MS', 10_000)
}

export function getSlowJsonTimeoutMs(): number {
	return getEnvNumber('SERVER_FETCH_JSON_SLOW_TIMEOUT_MS', 45_000)
}

function getDefaultJsonTimeoutMs(): number {
	return typeof window === 'undefined' ? getEnvNumber('SERVER_FETCH_JSON_TIMEOUT_MS', 25_000) : 60_000
}

const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g
const PUBLIC_SINGLEFLIGHT_HOSTS = new Set([
	'api.llama.fi',
	'pro-api.llama.fi',
	'fe-cache.llama.fi',
	'defillama-datasets.llama.fi',
	'raw.githubusercontent.com',
	'yields.llama.fi',
	'coins.llama.fi',
	'stablecoins.llama.fi',
	'bridges.llama.fi',
	'nft.llama.fi',
	'fdv-server.llama.fi',
	'etfs.llama.fi',
	'risks.llama.fi',
	'users.llama.fi',
	'ask.llama.fi'
])
const fetchJsonSingleflight = new Map<string, { promise: Promise<unknown>; waiters: number }>()

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

function escapeRegExp(value: string): string {
	return value.replace(REGEXP_SPECIAL_CHARS, '\\$&')
}

function envEnabled(name: string, fallback = false): boolean {
	const raw = process.env[name]
	if (raw === undefined) return fallback
	return raw === '1' || raw.toLowerCase() === 'true'
}

function requestMethod(options?: RequestInit): string {
	return (options?.method ?? 'GET').toUpperCase()
}

function hasUnsafeSingleflightHeaders(options?: RequestInit): boolean {
	if (!options?.headers) return false
	const headers = new Headers(options.headers)
	return headers.has('authorization') || headers.has('cookie')
}

function isRequestInput(url: RequestInfo | URL): url is Request {
	return typeof Request !== 'undefined' && url instanceof Request
}

function resolvedUrlString(url: RequestInfo | URL): string | null {
	const resolved = typeof window === 'undefined' ? serverFetchUrl(url) : url
	if (typeof resolved === 'string') return resolved
	if (resolved instanceof URL) return resolved.toString()
	if (typeof (resolved as any)?.url === 'string') return (resolved as any).url
	return null
}

function singleflightKey(url: RequestInfo | URL, options?: FetchWithPoolingOnServerOptions): string | null {
	if (!envEnabled('SERVER_FETCH_JSON_SINGLEFLIGHT')) return null
	if (typeof window !== 'undefined') return null
	if (isRequestInput(url)) return null
	if (requestMethod(options) !== 'GET' || options?.body || hasUnsafeSingleflightHeaders(options)) return null

	const raw = resolvedUrlString(url)
	if (!raw) return null
	try {
		const parsed = new URL(raw)
		if (!PUBLIC_SINGLEFLIGHT_HOSTS.has(parsed.hostname)) return null
		return `${requestMethod(options)} ${parsed.toString()} timeout=${options?.timeout ?? getDefaultJsonTimeoutMs()}`
	} catch {
		return null
	}
}

function waitForSingleflight<T>(promise: Promise<unknown>, waitMs: number): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | undefined
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		timeout = setTimeout(() => reject(new Error(`singleflight wait timeout after ${waitMs}ms`)), waitMs)
	})
	return Promise.race([promise, timeoutPromise]).finally(() => {
		if (timeout) clearTimeout(timeout)
	}) as Promise<T>
}

async function runSingleflight<T>(key: string, waitMs: number, run: () => Promise<T>): Promise<T> {
	const maxWaiters = Math.max(0, getEnvNumber('SERVER_FETCH_JSON_SINGLEFLIGHT_MAX_WAITERS', 20))
	const existing = fetchJsonSingleflight.get(key)

	if (existing && existing.waiters < maxWaiters) {
		existing.waiters++
		try {
			return await waitForSingleflight<T>(existing.promise, waitMs)
		} finally {
			existing.waiters--
		}
	}

	const promise = run().finally(() => {
		if (fetchJsonSingleflight.get(key)?.promise === promise) {
			fetchJsonSingleflight.delete(key)
		}
	}) as Promise<unknown>
	fetchJsonSingleflight.set(key, { promise, waiters: 0 })
	return promise as Promise<T>
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
// Fetch with single retry loop
// ─────────────────────────────────────────────────────────────
export async function fetchJson<T = any>(
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	extraRetry: boolean = false
): Promise<T> {
	const timeout = options?.timeout ?? getDefaultJsonTimeoutMs()
	const requestOptions = { ...options, timeout }
	const key = singleflightKey(url, requestOptions)
	if (key) {
		const waitMs = Math.max(1, getEnvNumber('SERVER_FETCH_JSON_SINGLEFLIGHT_WAIT_MS', timeout))
		return runSingleflight<T>(key, waitMs, () =>
			fetchJsonWithRetries<T>(
				url,
				{ ...requestOptions, telemetry: { ...requestOptions.telemetry, singleflightRole: 'leader' } },
				extraRetry
			)
		)
	}
	return fetchJsonWithRetries<T>(url, requestOptions, extraRetry)
}

async function fetchJsonWithRetries<T = any>(
	url: RequestInfo | URL,
	options: FetchWithPoolingOnServerOptions,
	extraRetry: boolean = false
): Promise<T> {
	const maxAttempts = extraRetry ? 3 : 2
	const sanitizedUrl = sanitizeUrlForLogs(url)
	let lastErr: Error | null = null
	let lastErrWasHtml = false
	let lastStatus: number | null = null

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const res = await fetchWithPoolingOnServer(url, {
				...options,
				telemetry: { ...options.telemetry, attempt: attempt + 1, maxAttempts }
			})

			if (!res.ok) {
				lastStatus = res.status
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

			return res.json()
		} catch (err) {
			lastErr = normalizeError(err)
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
	const errorKind = lastErrWasHtml
		? 'html'
		: lastStatus != null
			? lastStatus
			: lastErr && isTransientError(lastErr)
				? 'transient'
				: 'error'
	const errorMessage = lastErrWasHtml
		? 'returned html page'
		: (lastErr?.message.replace(new RegExp(`^${escapeRegExp(sanitizedUrl)}:\\s*`), '') ?? 'Unknown fetch error')
	recordRuntimeError(lastErr ?? new Error(errorMessage), 'outboundFetch', { url: sanitizedUrl, status: errorKind })
	if (!lastErr) {
		throw new Error(`${sanitizedUrl}: Unknown fetch error`)
	}
	if (lastErr.message.startsWith(`${sanitizedUrl}:`)) {
		throw Object.assign(new Error(lastErr.message), { stack: lastErr.stack })
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
