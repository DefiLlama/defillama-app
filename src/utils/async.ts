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
			console.error(message)
			if (shouldThrow) {
				throw error
			}
		}
	}
}

export async function fetchWithThrows(url: RequestInfo | URL, options?: FetchOverCacheOptions): Promise<Response> {
	const start = Date.now()
	const res = await fetchOverCache(url, options)
	if (res.status >= 400) {
		const end = Date.now()
		throw new Error(`[HTTP] [error] [${res.status}] [${end - start}ms] <${url}>`)
	}
	return res
}

export async function fetchWithErrorLogging(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions
): Promise<Response> {
	const start = Date.now()
	try {
		const res = await fetchOverCache(url, options)
		if (res.status >= 400) {
			const end = Date.now()
			console.error(`[HTTP] [error] [${res.status}] [${end - start}ms] <${url}>`)
		}
		return res
	} catch (error) {
		try {
			const res = await fetchOverCache(url, options)
			if (res.status >= 400) {
				const end = Date.now()
				console.error(`[HTTP] [error] [${res.status}] [${end - start}ms] <${url}>`)
			}
			return res
		} catch (error) {
			try {
				const res = await fetchOverCache(url, options)
				if (res.status >= 400) {
					const end = Date.now()
					console.error(`[HTTP] [error] [${res.status}] [${end - start}ms] <${url}>`)
				}
				return res
			} catch (error) {
				const end = Date.now()
				console.error(
					`[HTTP] [error] [fetch] [${(error as Error).name}] [${(error as Error).message}] [${end - start}ms] <${url}>`
				)
				return null
			}
		}
	}
}
