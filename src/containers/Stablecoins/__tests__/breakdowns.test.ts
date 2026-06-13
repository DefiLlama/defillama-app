import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchStablecoinChartAllApi: vi.fn(),
	fetchStablecoinDominanceAllApi: vi.fn()
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinChartAllApi: mocks.fetchStablecoinChartAllApi,
	fetchStablecoinDominanceAllApi: mocks.fetchStablecoinDominanceAllApi
}))

beforeEach(() => {
	vi.clearAllMocks()
})

describe('stablecoin breakdown routes', () => {
	it('starts the aggregate chart fetch before waiting on dominance data', async () => {
		let resolveDominance: (value: unknown) => void = () => {}
		mocks.fetchStablecoinDominanceAllApi.mockReturnValue(
			new Promise((resolve) => {
				resolveDominance = resolve
			})
		)
		mocks.fetchStablecoinChartAllApi.mockResolvedValue({
			aggregated: [
				{ date: 1, totalCirculatingUSD: { tether: 10 } },
				{ date: 2, totalCirculatingUSD: { tether: 20 } }
			]
		})
		const { stablecoinByChainBreakdown } = await import('~/containers/Stablecoins/server/breakdowns')

		const resultPromise = stablecoinByChainBreakdown.handle({
			method: 'GET',
			url: '',
			headers: {},
			query: { limit: '1' }
		})
		await Promise.resolve()

		expect(mocks.fetchStablecoinChartAllApi).toHaveBeenCalledTimes(1)
		resolveDominance({
			chainChartMap: {
				Ethereum: [
					{ date: 1, totalCirculatingUSD: { tether: 10 } },
					{ date: 2, totalCirculatingUSD: { tether: 20 } }
				]
			}
		})

		await expect(resultPromise).resolves.toMatchObject({
			status: 200,
			body: {
				metadata: expect.objectContaining({
					chains: ['Ethereum']
				})
			}
		})
	})
})
