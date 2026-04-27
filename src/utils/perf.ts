import type { ParsedUrlQuery } from 'querystring'
import type { GetStaticProps, GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import {
	postRuntimeLogs,
	sleep,
	getJitteredDelay,
	isTransientError,
	getEnvNumber,
	flushRuntimeLogs,
	formatRuntimeLog
} from './async'
import { getCache, type RedisCachePayload, setCache, setPageBuildTimes } from './cache-client'
import { normalizeError, getErrorMessage } from './error'
import { fetchWithPoolingOnServer, withPageBuildSignal } from './http-client'

const REDIS_URL = process.env.REDIS_URL as string

const MAX_PAGE_BUILD_RETRIES = Math.max(1, getEnvNumber('PAGE_BUILD_MAX_RETRIES', 3))
const PAGE_BUILD_TIMEOUT_MS = Math.max(1_000, getEnvNumber('PAGE_BUILD_TIMEOUT_MS', 15_000))
const PAGE_BUILD_TIMEOUT_TEXT = 'page build timed out after'

export class PageBuildTimeoutError extends Error {
	constructor(filename: string, timeoutMs: number) {
		super(`${filename}: ${PAGE_BUILD_TIMEOUT_TEXT} ${timeoutMs}ms`)
		this.name = 'PageBuildTimeoutError'
	}
}

function getParamsContext(params: ParsedUrlQuery | undefined): Record<string, unknown> | undefined {
	return params ? { params } : undefined
}

function truncateForLog(value: string, maxLength: number): string {
	return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function getErrorStackPreview(error: Error | null): string | null {
	if (!error?.stack) return null
	return truncateForLog(
		error.stack
			.split('\n')
			.slice(1, 4)
			.map((line) => line.trim())
			.filter(Boolean)
			.join(' | '),
		700
	)
}

function isPageBuildTimeoutError(error: Error | null): boolean {
	return error instanceof PageBuildTimeoutError
}

async function withPageBuildTimeout<T>(callback: () => T | Promise<T>, filename: string): Promise<T> {
	const controller = new AbortController()
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			controller.abort()
			reject(new PageBuildTimeoutError(filename, PAGE_BUILD_TIMEOUT_MS))
		}, PAGE_BUILD_TIMEOUT_MS)
	})

	try {
		return await withPageBuildSignal(controller.signal, () => Promise.race([callback(), timeout]))
	} finally {
		if (timeoutId) clearTimeout(timeoutId)
		controller.abort()
	}
}

export const withPerformanceLogging = <T extends { [key: string]: any }, P extends ParsedUrlQuery = ParsedUrlQuery>(
	filename: string,
	getStaticPropsFunction: GetStaticProps<T, P>
): GetStaticProps<T, P> => {
	return async (context: GetStaticPropsContext<P>) => {
		const start = Date.now()
		const { params } = context
		let lastError: Error | null = null

		for (let attempt = 0; attempt < MAX_PAGE_BUILD_RETRIES; attempt++) {
			try {
				const props = await withPageBuildTimeout(() => getStaticPropsFunction(context), filename)
				const elapsed = Date.now() - start

				if (elapsed > 10_000) {
					await setPageBuildTimes(`${filename} ${JSON.stringify(params ?? '')}`, [Date.now(), `${elapsed}ms`])
					postRuntimeLogs(
						formatRuntimeLog({
							event: 'PAGE_BUILD',
							level: 'info',
							status: 'slow',
							durationMs: elapsed,
							target: filename,
							context: getParamsContext(params)
						})
					)
				}

				return props
			} catch (error) {
				lastError = normalizeError(error)
				const canRetry =
					attempt < MAX_PAGE_BUILD_RETRIES - 1 && !isPageBuildTimeoutError(lastError) && isTransientError(lastError)

				if (canRetry) {
					const delay = getJitteredDelay(100, attempt, 1000)
					postRuntimeLogs(
						formatRuntimeLog({
							event: 'PAGE_BUILD',
							level: 'retry',
							status: `attempt ${attempt + 1}/${MAX_PAGE_BUILD_RETRIES}`,
							target: filename,
							context: { ...(getParamsContext(params) ?? {}), delayMs: delay },
							message: `${lastError.name || 'Error'}: ${lastError.message}`,
							stack: getErrorStackPreview(lastError)
						}),
						{ level: 'retry', forceConsole: true }
					)
					await sleep(delay)
					continue
				}
				break
			}
		}

		const elapsed = Date.now() - start
		await setPageBuildTimes(`${filename} ERROR`, [Date.now(), `${elapsed}ms`])
		postRuntimeLogs(
			formatRuntimeLog({
				event: 'PAGE_BUILD',
				level: 'error',
				status: isPageBuildTimeoutError(lastError)
					? 'timeout'
					: lastError && isTransientError(lastError)
						? 'transient'
						: 'error',
				durationMs: elapsed,
				target: filename,
				context: getParamsContext(params),
				message: lastError ? `${lastError.name || 'Error'}: ${lastError.message}` : 'Unknown build error',
				stack: getErrorStackPreview(lastError)
			}),
			{ level: 'error', forceConsole: true }
		)
		await flushRuntimeLogs()
		throw lastError ?? new Error(`${filename}: Unknown build error`)
	}
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
			postRuntimeLogs(
				formatRuntimeLog({
					event: 'fetchOverCache',
					level: 'error',
					status: 'network',
					durationMs: Date.now() - start,
					target: String(url),
					message: getErrorMessage(error)
				}),
				{ level: 'error' }
			)
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
			postRuntimeLogs(
				formatRuntimeLog({
					event: 'fetchOverCache',
					level: 'error',
					status: 504,
					durationMs: Date.now() - start,
					target: String(url),
					message: getErrorMessage(err)
				}),
				{ level: 'error' }
			)
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
