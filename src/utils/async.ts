import { FetchOverCacheOptions, fetchOverCache } from './perf'

export function withErrorLogging<T extends any[], R>(
	fn: (...args: T) => Promise<R>,
	shouldThrow = true,
	note?: string
): (...args: T) => Promise<R> {
	return async (...args: T) => {
		try {
			return await fn(...args)
		} catch (error) {
			const name = fn.name || 'unknown function'
			const message = (note ? `[${name}] [error] ` + `[${note}] <` : `<`) + JSON.stringify(args) + '>'
			postRuntimeLogs(message)
			if (shouldThrow) {
				throw error
			}
		}
	}
}

async function fetchWithErrorLogging(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions,
	retry: boolean = false
): Promise<Response> {
	const start = Date.now()
	try {
		const res = await fetchOverCache(url, options)
		if (res.status !== 200) {
			// const end = Date.now()
			// postRuntimeLogs(`[HTTP] [error] [${res.status}] [${end - start}ms] < ${url} >`)
		}
		return res
	} catch (error) {
		if (retry) {
			try {
				const res = await fetchOverCache(url, options)
				if (res.status >= 400) {
					const end = Date.now()
					postRuntimeLogs(`[HTTP] [1] [error] [${res.status}] [${end - start}ms] < ${url} >`)
				}
				return res
			} catch (error) {
				try {
					const res = await fetchOverCache(url, options)
					if (res.status >= 400) {
						const end = Date.now()
						postRuntimeLogs(`[HTTP] [2] [error] [${res.status}] [${end - start}ms] < ${url} >`)
					}
					return res
				} catch (error) {
					const end = Date.now()
					postRuntimeLogs(
						`[HTTP] [3] [error] [fetch] [${(error as Error).name}] [${(error as Error).message}] [${
							end - start
						}ms] < ${url} >`
					)
					return null
				}
			}
		}
		throw error
	}
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

export function postRuntimeLogs(log) {
	if (typeof window === 'undefined' && process.env.RUNTIME_LOGS_WEBHOOK) {
		fetch(process.env.RUNTIME_LOGS_WEBHOOK, {
			method: 'POST',
			body: JSON.stringify({ content: log }),
			headers: { 'Content-Type': 'application/json' }
		})
	}
	console.log(`\n${log}\n`)
}

async function handleFetchResponse(
	res: Response,
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions,
	callerInfo?: string
) {
	try {
		if (res.status === 200) {
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
			} catch (jsonError) {
				// If JSON parsing fails, use the text response
				errorMessage = responseText
			}
		}

		throw new Error(errorMessage)
	} catch (e) {
		// Log with caller info if available
		const logMessage = callerInfo
			? `[fetchJson] [error] [caller: ${callerInfo}] [${e.message}] < ${url} >`
			: `[HTTP] [parse] [error] [${e.message}] < ${url} > \n${JSON.stringify(options)}`

		postRuntimeLogs(logMessage)

		throw e // Re-throw the error instead of returning empty object
	}
}

export async function fetchJson(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions,
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
		// Only log here if the error didn't come from handleFetchResponse
		if (!error.message.includes('[HTTP]')) {
			postRuntimeLogs(
				`[fetchJson] [error] [${end - start}ms] [caller: ${callerInfo}] [${
					error instanceof Error ? error.message : 'Unknown error'
				}] < ${url} >`
			)
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
