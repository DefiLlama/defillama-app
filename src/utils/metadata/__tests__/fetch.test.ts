import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchCoreMetadataSourcesMock } = vi.hoisted(() => ({
	fetchCoreMetadataSourcesMock: vi.fn()
}))

vi.mock('../sources', () => ({
	fetchCoreMetadataSources: fetchCoreMetadataSourcesMock
}))

describe('fetchCoreMetadata', () => {
	beforeEach(() => {
		vi.resetModules()
		fetchCoreMetadataSourcesMock.mockReset()
	})

	it('returns the core metadata payload shape from upstream sources', async () => {
		fetchCoreMetadataSourcesMock.mockResolvedValue({
			protocols: { 'parent#aave': { name: 'aave', displayName: 'Aave', tvl: true } },
			chains: { Ethereum: { name: 'Ethereum', id: 'ethereum' } },
			categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
			cexsResponse: { cexs: [], cg_volume_cexs: ['binance'] },
			rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
			rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
			tokenlistArray: [
				{
					id: 'aave',
					symbol: 'AAVE',
					current_price: 1,
					price_change_24h: null,
					price_change_percentage_24h: null,
					ath: null,
					ath_date: null,
					atl: null,
					atl_date: null,
					market_cap: null,
					fully_diluted_valuation: null,
					total_volume: null,
					total_supply: null,
					circulating_supply: null,
					max_supply: null
				}
			],
			tokenDirectory: { aave: { name: 'Aave', symbol: 'AAVE' } },
			liquidationsResponse: {
				data: {
					aave: {
						Ethereum: [
							{
								owner: '0xowner',
								liqPrice: 1,
								collateral: 'WETH',
								collateralAmount: 1,
								collateralAmountUsd: 1
							}
						]
					}
				},
				tokens: { Ethereum: { WETH: { symbol: 'ETH', decimals: 18 } } },
				validThresholds: [],
				timestamp: 0
			},
			bridgesResponse: {
				bridges: [
					{
						id: 1,
						name: 'Stargate',
						displayName: 'Stargate',
						slug: 'stargate',
						chains: ['Ethereum'],
						destinationChain: 'Arbitrum'
					}
				],
				chains: []
			},
			emissionsProtocolsList: ['aave']
		})
		const { fetchCoreMetadata } = await import('../fetch')

		const payload = await fetchCoreMetadata()

		expect(payload.cexs).toEqual([])
		expect(payload.cgExchangeIdentifiers).toEqual(['binance'])
		expect(payload.tokenlist.aave.symbol).toBe('AAVE')
		expect(payload.tokenDirectory.aave.symbol).toBe('AAVE')
		expect(payload.bridgeProtocolSlugs).toContain('stargate')
		expect(payload.bridgeChainSlugs).toEqual(['ethereum', 'arbitrum'])
		expect(payload.liquidationsTokenSymbols).toContain('ETH')
		expect(payload.emissionsProtocolsList).toEqual(['aave'])
	})
})
