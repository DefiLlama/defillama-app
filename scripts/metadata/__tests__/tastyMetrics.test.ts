import { describe, expect, it, vi } from 'vitest'
import { fetchTastyMetrics } from '../tastyMetrics'

describe('fetchTastyMetrics', () => {
	it('passes an abort signal to the Tasty request', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify([])))

		await fetchTastyMetrics({
			endAt: 2,
			env: { TASTY_API_URL: 'https://tasty.test' },
			fetchFn,
			logger: { log: vi.fn() },
			startAt: 1
		})

		expect(fetchFn).toHaveBeenCalledWith(
			'https://tasty.test/metrics?startAt=1&endAt=2&unit=day&type=url',
			expect.objectContaining({
				signal: expect.any(AbortSignal)
			})
		)
	})

	it('returns empty metrics when the Tasty response is not ok', async () => {
		const result = await fetchTastyMetrics({
			endAt: 2,
			env: { TASTY_API_URL: 'https://tasty.test' },
			fetchFn: vi.fn().mockResolvedValue(new Response('not authorized', { status: 401 })),
			logger: { log: vi.fn() },
			startAt: 1
		})

		expect(result).toEqual({ tastyMetrics: {}, trendingRoutes: [] })
	})

	it('returns empty metrics when the Tasty request fails', async () => {
		const result = await fetchTastyMetrics({
			endAt: 2,
			env: { TASTY_API_URL: 'https://tasty.test' },
			fetchFn: vi.fn().mockRejectedValue(new Error('network failed')),
			logger: { log: vi.fn() },
			startAt: 1
		})

		expect(result).toEqual({ tastyMetrics: {}, trendingRoutes: [] })
	})
})
