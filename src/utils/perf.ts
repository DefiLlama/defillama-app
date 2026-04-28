import type { ParsedUrlQuery } from 'querystring'
import type { GetStaticProps, GetStaticPropsContext, GetStaticPropsResult } from 'next'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { sleep, getJitteredDelay, isTransientError, getEnvNumber } from './async'
import { getCache, type RedisCachePayload, setCache, setPageBuildTimes } from './cache-client'
import { normalizeError } from './error'
import { fetchWithPoolingOnServer } from './http-client'
import { recordRuntimeError, withStaticRouteTelemetry } from './telemetry'

const REDIS_URL = process.env.REDIS_URL as string

const MAX_PAGE_BUILD_RETRIES = Math.max(1, getEnvNumber('PAGE_BUILD_MAX_RETRIES', 3))

export const withPerformanceLogging = <T extends { [key: string]: any }, P extends ParsedUrlQuery = ParsedUrlQuery>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T, P>
): GetStaticProps<T, P> => {
	return async (context: GetStaticPropsContext<P>) => {
		const run = async () => runPerformanceLoggedStaticProps(filename, getStaticPropsFunction, context)
		return withStaticRouteTelemetry(filename, run, context.params ? { params: context.params } : undefined)
	}
}

async function runPerformanceLoggedStaticProps<
	T extends { [key: string]: any },
	P extends ParsedUrlQuery = ParsedUrlQuery
>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T, P>,
	context: GetStaticPropsContext<P>
): Promise<GetStaticPropsResult<T>> {
	const start = Date.now()
	const { params } = context
	let lastError: Error | null = null

	for (let attempt = 0; attempt < MAX_PAGE_BUILD_RETRIES; attempt++) {
		try {
			const props = await getStaticPropsFunction(context)
			const elapsed = Date.now() - start

			if (elapsed > 10_000) {
				await setPageBuildTimes(`${filename} ${JSON.stringify(params ?? '')}`, [Date.now(), `${elapsed}ms`])
			}

			return props
		} catch (error) {
			lastError = normalizeError(error)
			const canRetry = attempt < MAX_PAGE_BUILD_RETRIES - 1 && isTransientError(lastError)

			if (canRetry) {
				const delay = getJitteredDelay(100, attempt, 1000)
				recordRuntimeError(lastError, 'pageBuild', {
					route: filename,
					attempt: attempt + 1,
					max_attempts: MAX_PAGE_BUILD_RETRIES,
					delay_ms: delay,
					params
				})
				await sleep(delay)
				continue
			}
			break
		}
	}

	const elapsed = Date.now() - start
	await setPageBuildTimes(`${filename} ERROR`, [Date.now(), `${elapsed}ms`])
	throw lastError ?? new Error(`${filename}: Unknown build error`)
}

type FetchOverCacheOptions = RequestInit & { ttl?: string | number; silent?: boolean; timeout?: number }

export const fetchOverCache = async (url: RequestInfo | URL, options?: FetchOverCacheOptions): Promise<Response> => {
	const start = Date.now()
	const cacheKey = 'defillama-cache:' + url.toString().replace(/^https?:\/\//, '')
	const cache = REDIS_URL ? await getCache(cacheKey) : null

	if (process.env.NODE_ENV === 'development') {
		try {
			const response = await fetchWithPoolingOnServer(url, options)
			return response
		} catch (error) {
			recordRuntimeError(error, 'outboundFetch', { url: String(url), duration_ms: Date.now() - start })
			throw error
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
		return new Response(blob, responseInit)
	} else {
		let responseInit: ResponseInit
		let blob: Blob
		let StatusCode: number
		const timeout = options?.timeout ?? 60_000

		try {
			const response = await fetchWithPoolingOnServer(url, { ...options, timeout })

			const arrayBuffer = await response.arrayBuffer()
			const Body = Buffer.from(arrayBuffer)
			const ContentType = response.headers.get('Content-Type') ?? 'application/octet-stream'
			StatusCode = response.status
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
			blob = new Blob([arrayBuffer])

			responseInit = {
				status: StatusCode,
				statusText: StatusText,
				headers: new Headers({
					'Content-Type': ContentType
				})
			}
		} catch (err) {
			recordRuntimeError(err, 'outboundFetch', { url: String(url), duration_ms: Date.now() - start, status: 504 })
			StatusCode = 504
			responseInit = {
				status: StatusCode,
				statusText: 'Gateway Timeout after ' + timeout + 'ms',
				headers: new Headers({
					'Content-Type': 'text/plain'
				})
			}
			blob = new Blob(['Gateway Timeout'])
		}

		return new Response(blob, responseInit)
	}
}
