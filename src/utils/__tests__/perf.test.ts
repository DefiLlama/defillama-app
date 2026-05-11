import type { GetStaticPropsContext } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jitterCacheSeconds, readCacheJitterMeta } from '../maxAgeForNext'

describe('withPerformanceLogging', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.resetModules()
		vi.unstubAllEnvs()
	})

	it('jitters numeric getStaticProps revalidate values on props results', async () => {
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')
		const { withPerformanceLogging } = await import('../perf')

		const wrapped = withPerformanceLogging('protocol/[protocol]', async () => ({
			props: { ok: true },
			revalidate: 3600
		}))
		const context = { params: { protocol: 'uniswap' } } satisfies GetStaticPropsContext
		const result = await wrapped(context)
		const expected = jitterCacheSeconds(3600, 'protocol/[protocol]:/protocol/uniswap')

		expect(result).toMatchObject({ props: { ok: true }, revalidate: expected.seconds })
		expect(readCacheJitterMeta(result)).toEqual({ cache_jitter_seconds: expected.offsetSeconds })
	})

	it('jitters numeric getStaticProps revalidate values on notFound results', async () => {
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')
		const { withPerformanceLogging } = await import('../perf')

		const wrapped = withPerformanceLogging('protocol/[protocol]', async () => ({
			notFound: true,
			revalidate: 3600
		}))
		const context = { params: { protocol: 'missing' } } satisfies GetStaticPropsContext
		const result = await wrapped(context)
		const expected = jitterCacheSeconds(3600, 'protocol/[protocol]:/protocol/missing')

		expect(result).toEqual({ notFound: true, revalidate: expected.seconds })
		expect(readCacheJitterMeta(result)).toEqual({ cache_jitter_seconds: expected.offsetSeconds })
	})

	it('stops retrying transient page build failures once the cumulative budget is exceeded', async () => {
		vi.stubEnv('PAGE_BUILD_MAX_RETRIES', '3')
		vi.stubEnv('PAGE_BUILD_RETRY_BUDGET_MS', '1')
		const { withPerformanceLogging } = await import('../perf')
		let calls = 0

		const wrapped = withPerformanceLogging('slow-route', async () => {
			calls++
			await new Promise((resolve) => setTimeout(resolve, 5))
			throw new Error('timeout from upstream')
		})

		const context = { params: {} } satisfies GetStaticPropsContext
		await expect(wrapped(context)).rejects.toThrow('timeout from upstream')
		expect(calls).toBe(1)
	})

	it('logs final page build failures in development', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubEnv('PAGE_BUILD_MAX_RETRIES', '1')
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const { withPerformanceLogging } = await import('../perf')

		const wrapped = withPerformanceLogging('cex/[cex]', async () => {
			throw new Error('overview API failed')
		})

		await expect(wrapped({ params: { cex: 'bybit' } } satisfies GetStaticPropsContext)).rejects.toThrow(
			'overview API failed'
		)
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('[page-build] cex/[cex] failed after'),
			{ params: { cex: 'bybit' } },
			'overview API failed'
		)
	})
})
