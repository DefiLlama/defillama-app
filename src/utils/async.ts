import { fetchWithPoolingOnServer, FetchWithPoolingOnServerOptions } from './perf'

function shouldRetryError(error: unknown): boolean {
	if (!(error instanceof Error)) return false
	const message = error.message.toLowerCase()
	return (
		message.includes('socket') ||
		message.includes('connection') ||
		message.includes('econnreset') ||
		message.includes('econnrefused') ||
		message.includes('etimedout') ||
		message.includes('network') ||
		message.includes('fetch failed') ||
		message.includes('certificate') ||
		message.includes('ssl') ||
		message.includes('tls')
	)
}

async function fetchWithErrorLogging(
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	retry: boolean = false
): Promise<Response> {
	const start = Date.now()
	const maxRetries = retry ? 3 : 2
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const res = await fetchWithPoolingOnServer(url, options)
			return res
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			const shouldRetry = retry || shouldRetryError(error)
			const isLastAttempt = attempt === maxRetries - 1

			if (shouldRetry && !isLastAttempt) {
				const delay = Math.min(100 * Math.pow(2, attempt), 1000)
				await sleep(delay)
				continue
			}

			if (isLastAttempt && attempt > 0) {
				const end = Date.now()
				postRuntimeLogs(
					`[HTTP] [${attempt + 1}] [error] [fetch] [${lastError.name}] [${lastError.message}] [${end - start}ms] < ${url} >`
				)
			}

			throw lastError
		}
	}

	throw lastError
}

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

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

// Error deduplication to prevent log flooding
const recentErrors = new Map<string, { count: number; lastLogged: number }>()
const ERROR_DEDUP_WINDOW_MS = 60_000 // 1 minute window
const ERROR_DEDUP_MAX_PER_WINDOW = 3 // Max logs per unique error per window
const DISCORD_MAX_LENGTH = 1900 // Discord limit is 2000, leave buffer
const WEBHOOK_TIMEOUT_MS = 5_000 // 5 second timeout for webhook
let lastCleanup = Date.now()

function getErrorKey(log: string): string {
	// Extract URL and error type for deduplication key
	// Remove timing info which varies: [123ms] -> []
	return log.replace(/\[\d+ms\]/g, '[]').replace(/\d{13,}/g, 'TS')
}

function truncateLog(log: string, maxLength: number): string {
	if (log.length <= maxLength) return log
	return log.slice(0, maxLength - 20) + '... [truncated]'
}

export function postRuntimeLogs(log: string) {
	const now = Date.now()
	const errorKey = getErrorKey(log)
	const existing = recentErrors.get(errorKey)

	// Check if this is a duplicate error within the window
	if (existing && now - existing.lastLogged < ERROR_DEDUP_WINDOW_MS) {
		existing.count++
		if (existing.count > ERROR_DEDUP_MAX_PER_WINDOW) {
			// Suppress duplicate - only log every 10th occurrence after threshold
			if (existing.count % 10 === 0) {
				const suppressedLog = `${log} [suppressed ${existing.count - ERROR_DEDUP_MAX_PER_WINDOW} similar errors]`
				doPostRuntimeLogs(suppressedLog)
			}
			return
		}
		existing.lastLogged = now
	} else {
		recentErrors.set(errorKey, { count: 1, lastLogged: now })
	}

	// Cleanup old entries periodically (time-based, not size-based)
	if (now - lastCleanup > ERROR_DEDUP_WINDOW_MS) {
		lastCleanup = now
		const cutoff = now - ERROR_DEDUP_WINDOW_MS
		for (const [key, value] of recentErrors.entries()) {
			if (value.lastLogged < cutoff) {
				recentErrors.delete(key)
			}
		}
	}

	doPostRuntimeLogs(log)
}

function doPostRuntimeLogs(log: string) {
	// Truncate for Discord's 2000 char limit
	const truncatedLog = truncateLog(log, DISCORD_MAX_LENGTH)

	if (typeof window === 'undefined' && process.env.RUNTIME_LOGS_WEBHOOK) {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

		fetch(process.env.RUNTIME_LOGS_WEBHOOK, {
			method: 'POST',
			body: JSON.stringify({ content: truncatedLog }),
			headers: { 'Content-Type': 'application/json' },
			signal: controller.signal
		})
			.catch(() => {
				// Silently ignore webhook failures - don't want logging failures to cause more errors
			})
			.finally(() => clearTimeout(timeoutId))
	}

	console.log(`\n${truncatedLog}\n`)
}

export async function handleFetchResponse(
	res: Response,
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	callerInfo?: string
) {
	try {
		if (res.ok) {
			const response = await res.json()
			return response
		}

		// Handle non-200 status codes
		let errorMessage = `[HTTP] [error] [${res.status}] < ${res.url} >`

		// Try to get error message from statusText first
		if (res.statusText) {
			errorMessage += `: ${res.statusText}`
		}

		// Read response body only once
		const responseText = await res.text()

		if (responseText) {
			// Try to parse as JSON first
			try {
				const errorResponse = JSON.parse(responseText)
				if (errorResponse.error) {
					errorMessage = errorResponse.error
				} else if (errorResponse.message) {
					errorMessage = errorResponse.message
				} else {
					// If JSON parsing succeeded but no error/message field, use the text
					errorMessage = responseText
				}
			} catch {
				// If JSON parsing fails, use the text response
				errorMessage = responseText
			}
		}

		throw new Error(errorMessage)
	} catch (e) {
		// Mark error as already logged to prevent double logging in fetchJson
		if (e instanceof Error && !e.message.startsWith('[LOGGED]')) {
			e.message = `[LOGGED] ${e.message}`
		}
		throw e // Re-throw the error - logging happens in fetchJson with timing info
	}
}

export async function fetchJson(
	url: RequestInfo | URL,
	options?: FetchWithPoolingOnServerOptions,
	retry: boolean = false
): Promise<any> {
	const start = Date.now()

	// Capture caller information at the time of call
	const callerInfo = getCallerInfo(new Error().stack)

	try {
		const res = await fetchWithErrorLogging(url, options, retry).then((res) =>
			handleFetchResponse(res, url, options, callerInfo)
		)

		const end = Date.now()
		if (end - start > 5000) {
			postRuntimeLogs(`[fetchJson] [success] [${end - start}ms] < ${url} >`)
		}

		return res
	} catch (error) {
		const end = Date.now()
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		// Remove [LOGGED] prefix for cleaner output
		const cleanMessage = errorMessage.replace(/^\[LOGGED\]\s*/, '')

		postRuntimeLogs(
			`[fetchJson] [error] [${end - start}ms] [caller: ${callerInfo}] [${cleanMessage}] < ${url} >`
		)

		// Re-throw with clean message
		if (error instanceof Error) {
			error.message = cleanMessage
		}
		throw error
	}
}

// Helper function to extract caller information from stack trace
function getCallerInfo(stack?: string): string {
	if (!stack) return 'unknown'

	const lines = stack.split('\n')
	// Look for the first line that contains a file path and function name
	// Skip lines that contain fetchJson, handleFetchResponse, etc.
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()
		// Match patterns like "at functionName (file:line:column)" or "at file:line:column"
		const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)|at\s+(.+?):(\d+):(\d+)/)
		if (match) {
			const functionName = match[1] || 'anonymous'
			const filePath = match[2] || match[5]
			const lineNumber = match[3] || match[6]

			// Skip if this is fetchJson, handleFetchResponse, or other internal functions
			if (
				functionName.includes('fetchJson') ||
				functionName.includes('handleFetchResponse') ||
				functionName.includes('fetchWithErrorLogging') ||
				functionName.includes('getCallerInfo')
			) {
				continue
			}

			// Extract just the filename from the full path
			const fileName = filePath.split('/').pop()?.split('\\').pop() || 'unknown'
			return `${functionName} (${fileName}:${lineNumber})`
		}
	}

	return 'unknown'
}

export async function handleSimpleFetchResponse(res: Response) {
	if (!res.ok) {
		let errorMessage = `[HTTP] [error] [${res.status}]`

		// Try to get error message from statusText first
		if (res.statusText) {
			errorMessage += `: ${res.statusText}`
		}

		// Read response body only once
		const responseText = await res.text()

		if (responseText) {
			// Try to parse as JSON first
			try {
				const errorResponse = JSON.parse(responseText)
				if (errorResponse.error) {
					errorMessage = errorResponse.error
				} else if (errorResponse.message) {
					errorMessage = errorResponse.message
				} else {
					// If JSON parsing succeeded but no error/message field, use the text
					errorMessage = responseText
				}
			} catch {
				// If JSON parsing fails, use the text response
				errorMessage = responseText
			}
		}

		throw new Error(errorMessage)
	}
	return res
}
