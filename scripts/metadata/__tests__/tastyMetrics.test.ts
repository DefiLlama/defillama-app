import { describe, expect, it, vi } from 'vitest'
import { fetchTastyMetrics } from '../tastyMetrics'

describe('fetchTastyMetrics', () => {
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
