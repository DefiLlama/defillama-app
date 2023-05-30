// import { performance } from 'perf_hooks'
import { GetStaticProps, GetStaticPropsContext } from 'next'
import { getCache, setCache } from './cache-client'
import { maxAgeForNext } from '~/api'

export const withPerformanceLogging = <T extends {}>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T>
): GetStaticProps<T> => {
	return async (context: GetStaticPropsContext) => {
		const start = Date.now()
		const { params } = context
		try {
			const props = await getStaticPropsFunction(context)
			const end = Date.now()

			if (end - start > 10_000) {
				console.log(
					`[PREPARED][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : '')
				)
			}

			return props
		} catch (error) {
			const end = Date.now()
			console.log(`[ERROR][${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : ''))
			throw error
		}
	}
}

export const fetchWithPerformanceLogging = async (api: string) => {
	const startTime = Date.now()

	const data = await fetch(api).then((res) => res.json())

	if (Date.now() - startTime > 5_000) {
		console.log('done fetching', api, Date.now() - startTime)
	}

	return data
}

export type FetchOverCacheOptions = RequestInit & { ttl?: string | number; silent?: boolean }

export const fetchOverCache = async (url: string, options?: FetchOverCacheOptions): Promise<Response> => {
	const start = Date.now()

	const cacheKey = `app-cache::${url}`
	const cache = await getCache(cacheKey)

	if (cache) {
		const Body = cache.Body
		const ContentType = cache.ContentType
		const arrayBuffer = new Uint8Array(Body).buffer
		const blob = new Blob([arrayBuffer])
		const responseInit = {
			status: 200,
			statusText: 'OK',
			headers: new Headers({
				'Content-Type': ContentType
			})
		}
		const end = Date.now()
		!options?.silent && console.log(`[fetchOverCache] [HIT] [${(end - start).toFixed(0)}ms] <${url}>`)

		return new Response(blob, responseInit)
	} else {
		const response = await fetch(url, options)
		const arrayBuffer = await response.arrayBuffer()
		const Body = Buffer.from(arrayBuffer)
		const ContentType = response.headers.get('Content-Type')
		const payload = {
			Key: cacheKey,
			Body,
			ContentType
		}
		const ttl = options?.ttl || maxAgeForNext([21])
		await setCache(payload, ttl)
		const end = Date.now()
		!options?.silent && console.log(`[fetchOverCache] [MISS] [${(end - start).toFixed(0)}ms] <${url}>`)
		return response
	}
}

export const fetchOverCacheJson = async <T = any>(url: string, options?: FetchOverCacheOptions): Promise<T> => {
	const data = await fetchOverCache(url, options).then((res) => res.json())
	return data as T
}
