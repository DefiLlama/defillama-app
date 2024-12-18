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

export async function fetchWithErrorLogging(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions
): Promise<Response> {
	const start = Date.now()
	try {
		const res = await fetchOverCache(url, options)
		if (res.status >= 400) {
			const end = Date.now()
			console.error(`[HTTP] [0] [error] [${res.status}] [${end - start}ms] <${url}>`)
		}
		return res
	} catch (error) {
		// try {
		// 	const res = await fetchOverCache(url, options)
		// 	if (res.status >= 400) {
		// 		const end = Date.now()
		// 		console.error(`[HTTP] [1] [error] [${res.status}] [${end - start}ms] <${url}>`)
		// 	}
		// 	return res
		// } catch (error) {
		// 	try {
		// 		const res = await fetchOverCache(url, options)
		// 		if (res.status >= 400) {
		// 			const end = Date.now()
		// 			console.error(`[HTTP] [2] [error] [${res.status}] [${end - start}ms] <${url}>`)
		// 		}
		// 		return res
		// 	} catch (error) {
		// 		const end = Date.now()
		// 		console.error(
		// 			`[HTTP] [3] [error] [fetch] [${(error as Error).name}] [${(error as Error).message}] [${
		// 				end - start
		// 			}ms] <${url}>`
		// 		)
		// 		return null
		// 	}
		// }

		throw error
	}
}

export async function fetchWithTimeout(url, ms, options = {}) {
	const controller = new AbortController()
	const promise = fetchWithErrorLogging(url, { signal: controller.signal, ...options })
	const timeout = setTimeout(() => controller.abort(), ms)
	return promise.finally(() => clearTimeout(timeout))
}

const dataCache: {
	[key: string]: any
} = {}

export async function wrappedFetch(
	endpoint: string,
	{ retries = 0, cache = false }: { retries?: number; cache?: boolean } = {}
): Promise<any> {
	if (cache) {
		retries++
		if (!dataCache[endpoint]) {
			dataCache[endpoint] = _getData(retries)
		}
		return dataCache[endpoint]
	}
	return _getData(retries)

	async function _getData(retiresLeft = 0, attempts = 0) {
		try {
			const res = await fetchWithErrorLogging(endpoint).then((res) => res.json())
			return res
		} catch (error) {
			if (retiresLeft > 0) {
				attempts++
				await sleep(attempts * 30 * 1000) // retry after 30 seconds * attempts
				return _getData(retiresLeft - 1, attempts)
			}
			throw error
		}
	}
}

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export const fetchApi = async (url: string | Array<string>) => {
	if (!url) return null
	try {
		const data =
			typeof url === 'string'
				? await fetchWithErrorLogging(url).then(async (res) => {
						if (!res.ok) {
							throw new Error(res.statusText ?? `Failed to fetch ${url}`)
						}
						const data = await res.json()
						return data
				  })
				: await Promise.all(
						url.map((u) =>
							fetchWithErrorLogging(u).then(async (res) => {
								if (!res.ok) {
									throw new Error(res.statusText ?? `Failed to fetch ${u}`)
								}
								const data = await res.json()
								return data
							})
						)
				  )
		return data
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : `Failed to fetch ${typeof url === 'string' ? url : url.join(', ')}`
		)
	}
}
