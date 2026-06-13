import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchExchangeMarketsListFromCache: vi.fn(),
	fetchExchangeMarketsListFromNetwork: vi.fn()
}))

vi.mock('~/containers/Cexs/api', () => ({
	fetchExchangeMarketsListFromNetwork: mocks.fetchExchangeMarketsListFromNetwork
}))

vi.mock('~/containers/Markets/server/dataset.cache', () => ({
	fetchCexMarketsSlugIndexFromCache: vi.fn(),
	fetchExchangeMarketsListFromCache: mocks.fetchExchangeMarketsListFromCache,
	fetchTokenMarketsSymbolIndexFromCache: vi.fn()
}))

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.clearAllMocks()
})

afterEach(() => {
	vi.resetModules()
	vi.unstubAllEnvs()
})

describe('markets runtime adapter', () => {
	it('falls back to the network exchange list when the markets cache domain failed', async () => {
		const { DatasetDomainUnavailableError } = await import('~/server/datasetCache/core')
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const networkMarkets = {
			cex: {
				spot: [{ exchange: 'binance', defillama_slug: 'Binance-CEX', market_count: 1, total_volume_24h: 100 }],
				linear_perp: [],
				inverse_perp: []
			},
			dex: {
				spot: [],
				linear_perp: [],
				inverse_perp: []
			},
			totals: {}
		}
		mocks.fetchExchangeMarketsListFromCache.mockRejectedValue(
			new DatasetDomainUnavailableError('markets', 'build failed')
		)
		mocks.fetchExchangeMarketsListFromNetwork.mockResolvedValue(networkMarkets)

		const { resolveMarketsExchangeByParam } = await import('~/containers/Markets/server/dataset')

		await expect(resolveMarketsExchangeByParam('Binance')).resolves.toBe('binance')
		expect(mocks.fetchExchangeMarketsListFromNetwork).toHaveBeenCalledTimes(1)
		warnSpy.mockRestore()
	})
})
