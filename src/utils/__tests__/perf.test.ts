import type { GetStaticPropsContext } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jitterCacheSeconds, readCacheJitterMeta } from '../maxAgeForNext'

describe('withPerformanceLogging', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
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

	it('can skip numeric getStaticProps revalidate jitter', async () => {
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		vi.stubEnv('NEXT_BUILD_ID', 'build-a')
		const { withPerformanceLogging } = await import('../perf')

		const wrapped = withPerformanceLogging(
			'index',
			async () => ({
				props: { ok: true },
				revalidate: 60
			}),
			{ jitterRevalidate: false }
		)
		const result = await wrapped({ params: {} } satisfies GetStaticPropsContext)

		expect(result).toEqual({ props: { ok: true }, revalidate: 60 })
		expect(readCacheJitterMeta(result)).toBeUndefined()
	})

	it('records Next revalidation reasons on static route telemetry', async () => {
		vi.stubEnv('OPS_TELEMETRY_URL', 'test-ingest-url')
		vi.stubEnv('OPS_TELEMETRY_TOKEN', 'secret')
		vi.stubEnv('OPS_TELEMETRY_BATCH_SIZE', '100')
		vi.stubEnv('OPS_TELEMETRY_QUEUE_MAX', '100')
		vi.stubEnv('OPS_TELEMETRY_SEND_TIMEOUT_MS', '100')
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)
		const { withPerformanceLogging } = await import('../perf')
		const { telemetryTest } = await import('../telemetry')

		try {
			const wrapped = withPerformanceLogging(
				'index',
				async () => ({
					props: { ok: true },
					revalidate: 60
				}),
				{ jitterRevalidate: false }
			)

			await wrapped({ params: {}, revalidateReason: 'stale' } satisfies GetStaticPropsContext)

			const events = fetchMock.mock.calls
				.filter(([url]) => url === process.env.OPS_TELEMETRY_URL)
				.flatMap(([, init]) => JSON.parse(String((init as RequestInit).body)).events)
			const tick = events.find((event) => event.type === 'page_build_finish_tick')
			expect(tick?.attributes).toMatchObject({
				revalidate_reason: 'stale',
				telemetry_target_id: 'defillama'
			})
		} finally {
			telemetryTest.reset()
		}
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

	it('records route phase timings as route telemetry attributes', async () => {
		vi.stubEnv('OPS_TELEMETRY_URL', 'test-ingest-url')
		vi.stubEnv('OPS_TELEMETRY_TOKEN', 'secret')
		vi.stubEnv('OPS_TELEMETRY_BATCH_SIZE', '100')
		vi.stubEnv('OPS_TELEMETRY_QUEUE_MAX', '100')
		vi.stubEnv('OPS_TELEMETRY_SEND_TIMEOUT_MS', '100')
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)
		const { createRoutePhaseTimer } = await import('../perf')
		const { telemetryTest, withStaticRouteTelemetry } = await import('../telemetry')

		try {
			await withStaticRouteTelemetry('phase-route', async () => {
				const timer = createRoutePhaseTimer()
				const stopTotal = timer.start('total')
				await timer.time('async_phase', async () => 'ok')
				stopTotal()
				timer.record()
				return { props: { ok: true } }
			})

			const events = fetchMock.mock.calls
				.filter(([url]) => url === process.env.OPS_TELEMETRY_URL)
				.flatMap(([, init]) => JSON.parse(String((init as RequestInit).body)).events)
			const route = events.find((event) => event.type === 'route_execution' && event.route === 'phase-route')
			expect(route?.attributes?.route_phases_ms).toMatchObject({
				async_phase: expect.any(Number),
				total: expect.any(Number)
			})
		} finally {
			telemetryTest.reset()
		}
	})
})
