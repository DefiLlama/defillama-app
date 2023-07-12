// import { performance } from 'perf_hooks'
import { GetStaticProps, GetStaticPropsContext } from 'next'
import { RedisCachePayload, getCache, setCache } from './cache-client'
import { maxAgeForNext } from '~/api'

const isServer = typeof window === 'undefined'
const REDIS_URL = process.env.REDIS_URL as string
const IS_RUNTIME = !!process.env.IS_RUNTIME

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
					`[PREPARED] [${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : '')
				)
			}

			return props
		} catch (error) {
			const end = Date.now()
			console.log(
				`[ERROR] [${(end - start).toFixed(0)}ms] <${filename}>` + (params ? ' ' + JSON.stringify(params) : '')
			)
			throw error
		}
	}
}

export type FetchOverCacheOptions = RequestInit & { ttl?: string | number; silent?: boolean }

export const fetchOverCache = async (url: RequestInfo | URL, options?: FetchOverCacheOptions): Promise<Response> => {
	const start = Date.now()

	const cacheKey = 'defillama-cache:' + url.toString().replace(/^https?:\/\//, '')
	const cache = REDIS_URL ? await getCache(cacheKey) : null

	if (process.env.NODE_ENV === 'development') {
		try {
			const response = await fetch(url, options)
			return response
		} catch (error) {
			console.log('fetch error for', url)
			console.log(error)
		}
	} else if (cache) {
		const Body = cache.Body
		const ContentType = cache.ContentType
		const StatusCode = cache.StatusCode || 200
		const StatusText = cache.StatusText || 'OK'
		const arrayBuffer = new Uint8Array(Body).buffer
		const blob = new Blob([arrayBuffer])
		const responseInit = {
			status: StatusCode,
			statusText: StatusText,
			headers: new Headers({
				'Content-Type': ContentType
			})
		}
		const end = Date.now()
		IS_RUNTIME &&
			!options?.silent &&
			isServer &&
			console.log(`[fetch-cache] [HIT] [${StatusCode}] [${(end - start).toFixed(0)}ms] <${url}>`)

		return new Response(blob, responseInit)
	} else {
		const response = await fetch(url, options)
		const arrayBuffer = await response.arrayBuffer()
		const Body = Buffer.from(arrayBuffer)
		const ContentType = response.headers.get('Content-Type')
		const StatusCode = response.status
		const StatusText = response.statusText
		const payload: RedisCachePayload = {
			Key: cacheKey,
			Body,
			ContentType,
			StatusCode,
			StatusText
		}

		// if error, cache for 10 minutes only
		const ttl = StatusCode >= 400 ? 600 : options?.ttl || maxAgeForNext([21])
		await setCache(payload, ttl)
		const blob = new Blob([arrayBuffer])
		const responseInit = {
			status: StatusCode,
			statusText: StatusText,
			headers: new Headers({
				'Content-Type': ContentType
			})
		}
		const end = Date.now()
		IS_RUNTIME &&
			!options?.silent &&
			isServer &&
			console.log(`[fetch-cache] [MISS] [${StatusCode}] [${(end - start).toFixed(0)}ms] <${url}>`)
		return new Response(blob, responseInit)
	}
}

export const fetchOverCacheJson = async <T = any>(
	url: RequestInfo | URL,
	options?: FetchOverCacheOptions
): Promise<T> => {
	const data = await fetchOverCache(url, options).then((res) => res.json())
	return data as T
}
