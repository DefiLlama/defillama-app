import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchCoreMetadataSourcesMock, fetchMetadataJsonMock } = vi.hoisted(() => ({
	fetchCoreMetadataSourcesMock: vi.fn(),
	fetchMetadataJsonMock: vi.fn()
}))

vi.mock('../sources', () => ({
	fetchCoreMetadataSources: fetchCoreMetadataSourcesMock
}))

vi.mock('../http', () => ({
	fetchMetadataJson: fetchMetadataJsonMock
}))

function createCoreMetadataSources(overrides: Record<string, unknown> = {}) {
	return {
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
		emissionsProtocolsList: ['aave'],
		emissions: [],
		...overrides
	}
}

describe('fetchCoreMetadata', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		vi.resetModules()
		fetchCoreMetadataSourcesMock.mockReset()
		fetchMetadataJsonMock.mockReset()
	})

	it('returns the core metadata payload shape from upstream sources', async () => {
		fetchCoreMetadataSourcesMock.mockResolvedValue(createCoreMetadataSources())
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
		expect(payload.emissionsHistoricalPrices).toEqual({})
		expect(fetchMetadataJsonMock).not.toHaveBeenCalled()
	})

	it('precomputes emissions historical prices with a single 6h POST', async () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = nowSec - 8 * day
		vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000)
		fetchCoreMetadataSourcesMock.mockResolvedValue(
			createCoreMetadataSources({
				emissions: [
					{
						name: 'Chainlink',
						token: 'coingecko:chainlink',
						gecko_id: 'chainlink',
						events: [
							{ timestamp: nowSec - 60 * day, noOfTokens: [1], category: 'team' },
							{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' },
							{ timestamp: nowSec + day, noOfTokens: [20], category: 'team' }
						]
					}
				]
			})
		)
		fetchMetadataJsonMock.mockResolvedValue({
			coins: {
				'coingecko:chainlink': {
					prices: [{ timestamp: lastPastEvent, price: 2 }]
				}
			}
		})
		const { fetchCoreMetadata } = await import('../fetch')

		const payload = await fetchCoreMetadata()
		const [, requestOptions] = fetchMetadataJsonMock.mock.calls[0]
		const requestBody = JSON.parse(requestOptions.body)

		expect(fetchMetadataJsonMock).toHaveBeenCalledTimes(1)
		expect(fetchMetadataJsonMock.mock.calls[0][0]).toContain('/pro/prices/historical')
		expect(requestOptions).toMatchObject({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		})
		expect(requestBody.searchWidth).toBe('6h')
		expect(requestBody.coins['coingecko:chainlink']).toHaveLength(15)
		expect(payload.emissionsHistoricalPrices).toEqual({
			'coingecko:chainlink': {
				prices: [{ timestamp: lastPastEvent, price: 2 }]
			}
		})
	})

	it('keeps metadata pulls successful when emissions historical prices fail', async () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = nowSec - 8 * day
		vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000)
		const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
		fetchCoreMetadataSourcesMock.mockResolvedValue(
			createCoreMetadataSources({
				emissions: [
					{
						name: 'Chainlink',
						token: 'coingecko:chainlink',
						gecko_id: 'chainlink',
						events: [
							{ timestamp: nowSec - 60 * day, noOfTokens: [1], category: 'team' },
							{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' }
						]
					}
				]
			})
		)
		fetchMetadataJsonMock.mockRejectedValue(new Error('coins unavailable'))
		const { fetchCoreMetadata } = await import('../fetch')

		const payload = await fetchCoreMetadata()

		expect(payload.emissionsHistoricalPrices).toEqual({})
		expect(consoleLog).toHaveBeenCalledWith('Failed to precompute emissions historical prices', expect.any(Error))
	})
})
