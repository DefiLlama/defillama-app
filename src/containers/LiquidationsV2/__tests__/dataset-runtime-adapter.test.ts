import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchProtocolLiquidations: vi.fn(),
	fetchProtocolsList: vi.fn(),
	getLiquidationsProtocolChainIdsFromCache: vi.fn(),
	getLiquidationsProtocolsResponseFromCache: vi.fn()
}))

vi.mock('~/containers/LiquidationsV2/api', () => ({
	fetchProtocolLiquidations: mocks.fetchProtocolLiquidations,
	fetchProtocolsList: mocks.fetchProtocolsList
}))

vi.mock('~/containers/LiquidationsV2/server/dataset.cache', () => ({
	getLiquidationsProtocolChainIdsFromCache: mocks.getLiquidationsProtocolChainIdsFromCache,
	getLiquidationsProtocolsResponseFromCache: mocks.getLiquidationsProtocolsResponseFromCache,
	getLiquidationsChainFromCache: vi.fn(),
	getLiquidationsOverviewFromCache: vi.fn(),
	getLiquidationsProtocolFromCache: vi.fn(),
	getTokenLiquidationsFromCache: vi.fn(),
	hasTokenLiquidationsInCache: vi.fn()
}))

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.clearAllMocks()
})

afterEach(() => {
	vi.resetModules()
	vi.unstubAllEnvs()
})

describe('liquidations dataset runtime adapters', () => {
	it('falls back to network chain ids when the liquidations cache domain failed', async () => {
		const { DatasetDomainUnavailableError } = await import('~/server/datasetCache/core')
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		mocks.getLiquidationsProtocolChainIdsFromCache.mockRejectedValue(
			new DatasetDomainUnavailableError('liquidations', 'build failed')
		)
		mocks.fetchProtocolLiquidations.mockResolvedValue({
			timestamp: 1,
			data: {
				ethereum: [],
				arbitrum: []
			}
		})

		const { getLiquidationsProtocolChainIds } = await import('~/containers/LiquidationsV2/server/dataset')

		await expect(getLiquidationsProtocolChainIds('aave')).resolves.toEqual(['ethereum', 'arbitrum'])
		expect(mocks.fetchProtocolLiquidations).toHaveBeenCalledWith('aave')
		warnSpy.mockRestore()
	})
})
