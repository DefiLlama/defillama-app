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

export async function fetchWithErrorLogging(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions,
	retry: boolean = false
): Promise<Response> {
	const start = Date.now()
	try {
		const res = await fetchOverCache(url, options)
		if (res.status !== 200) {
			const end = Date.now()
			postRuntimeLogs(`[HTTP] [error] [${res.status}] [${end - start}ms] <${url}>`)
		}
		return res
	} catch (error) {
		if (retry) {
			try {
				const res = await fetchOverCache(url, options)
				if (res.status >= 400) {
					const end = Date.now()
					postRuntimeLogs(`[HTTP] [1] [error] [${res.status}] [${end - start}ms] <${url}>`)
				}
				return res
			} catch (error) {
				try {
					const res = await fetchOverCache(url, options)
					if (res.status >= 400) {
						const end = Date.now()
						postRuntimeLogs(`[HTTP] [2] [error] [${res.status}] [${end - start}ms] <${url}>`)
					}
					return res
				} catch (error) {
					const end = Date.now()
					postRuntimeLogs(
						`[HTTP] [3] [error] [fetch] [${(error as Error).name}] [${(error as Error).message}] [${
							end - start
						}ms] <${url}>`
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

async function handleFetchResponse(res: Response) {
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
		postRuntimeLogs(`[parse] [${e.message}] < ${res.url} >`)

		throw e // Re-throw the error instead of returning empty object
	}
}

export async function fetchJson(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions,
	retry: boolean = false
): Promise<any> {
	const res = await fetchWithErrorLogging(url, options, retry).then(handleFetchResponse)
	return res
}
