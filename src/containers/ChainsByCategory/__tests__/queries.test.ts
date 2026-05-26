import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
	fetchChainsByCategoryMock,
	fetchChainsAssetsMock,
	fetchAdapterChainMetricsMock,
	getDimensionAdapterOverviewOfAllChainsMock,
	fetchStablecoinAssetsApiMock
} = vi.hoisted(() => ({
	fetchChainsByCategoryMock: vi.fn(),
	fetchChainsAssetsMock: vi.fn(),
	fetchAdapterChainMetricsMock: vi.fn(),
	getDimensionAdapterOverviewOfAllChainsMock: vi.fn(),
	fetchStablecoinAssetsApiMock: vi.fn()
}))

vi.mock('~/containers/BridgedTVL/api', () => ({
	fetchChainsAssets: fetchChainsAssetsMock
}))

vi.mock('~/containers/Chains/api', () => ({
	fetchChainsByCategory: fetchChainsByCategoryMock
}))

vi.mock('~/containers/DimensionAdapters/api', () => ({
	fetchAdapterChainMetrics: fetchAdapterChainMetricsMock
}))

vi.mock('~/containers/DimensionAdapters/queries', () => ({
	getDimensionAdapterOverviewOfAllChains: getDimensionAdapterOverviewOfAllChainsMock
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinAssetsApi: fetchStablecoinAssetsApiMock
}))

import { getChainsByCategory, getChainsByCategoryChartData } from '../queries'

const mockChainsChartResponse = () => {
	fetchChainsByCategoryMock.mockResolvedValue({
		stackedDataset: [
			[
				'1',
				{
					Ethereum: {
						t: 100,
						d: 20,
						l: 30,
						dl: 5,
						s: 10,
						b: 15
					}
				}
			]
		],
		tvlTypes: {
			tvl: 't',
			doublecounted: 'd',
			liquidstaking: 'l',
			dcAndLsOverlap: 'dl',
			staking: 's',
			borrowed: 'b'
		}
	})
}

describe('chains by category chart data', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockChainsChartResponse()
		getDimensionAdapterOverviewOfAllChainsMock.mockResolvedValue({})
		fetchAdapterChainMetricsMock.mockResolvedValue({ protocols: [] })
		fetchStablecoinAssetsApiMock.mockResolvedValue({ chains: [] })
		fetchChainsAssetsMock.mockResolvedValue({})
	})

	it('returns only normalized base TVL by default', async () => {
		const data = await getChainsByCategoryChartData({ category: 'All' })

		expect(data).toEqual({
			tvlChartsByChain: {
				tvl: {
					Ethereum: {
						1000: 55
					}
				}
			},
			totalTvlByDate: {
				tvl: {
					1000: 55
				}
			}
		})
	})

	it('returns only requested extra TVL chart series and their required overlap series', async () => {
		const data = await getChainsByCategoryChartData({
			category: 'All',
			extraTvlTypes: ['staking', 'doublecounted', 'liquidstaking']
		})

		expect(data.tvlChartsByChain.borrowed).toBeUndefined()
		expect(data.tvlChartsByChain).toEqual({
			tvl: {
				Ethereum: {
					1000: 55
				}
			},
			doublecounted: {
				Ethereum: {
					1000: 20
				}
			},
			liquidstaking: {
				Ethereum: {
					1000: 30
				}
			},
			dcAndLsOverlap: {
				Ethereum: {
					1000: 5
				}
			},
			staking: {
				Ethereum: {
					1000: 10
				}
			}
		})
	})

	it('keeps all extra TVL chart series for pages that still embed chart data', async () => {
		fetchChainsByCategoryMock.mockResolvedValue({
			categories: [],
			chainsUnique: ['Ethereum'],
			chainTvls: [
				{
					name: 'Ethereum',
					symbol: 'ETH',
					tvl: 100,
					tvlPrevDay: 90,
					tvlPrevWeek: 80,
					tvlPrevMonth: 70,
					mcap: null,
					mcaptvl: null,
					protocols: 1,
					extraTvl: {},
					change_1d: null,
					change_7d: null,
					change_1m: null
				}
			],
			chainsGroupbyParent: {},
			stackedDataset: [
				[
					'1',
					{
						Ethereum: {
							t: 100,
							s: 10,
							b: 15
						}
					}
				]
			],
			tvlTypes: {
				tvl: 't',
				staking: 's',
				borrowed: 'b'
			}
		})

		const data = await getChainsByCategory({
			chainMetadata: {},
			category: 'All'
		})

		expect(data.tvlChartsByChain.staking).toEqual({
			Ethereum: {
				1000: 10
			}
		})
		expect(data.tvlChartsByChain.borrowed).toEqual({
			Ethereum: {
				1000: 15
			}
		})
	})

	it('removes stale extra TVL entries when chart data is omitted from page props', async () => {
		fetchChainsByCategoryMock.mockResolvedValue({
			categories: [],
			chainsUnique: ['CosmosHub'],
			chainTvls: [
				{
					name: 'CosmosHub',
					symbol: 'ATOM',
					tvl: 100,
					tvlPrevDay: 100,
					tvlPrevWeek: 100,
					tvlPrevMonth: 100,
					mcap: null,
					mcaptvl: null,
					protocols: 1,
					extraTvl: {
						doublecounted: {
							tvl: 20,
							tvlPrevDay: 20,
							tvlPrevWeek: 20,
							tvlPrevMonth: 20
						},
						liquidstaking: {
							tvl: 30,
							tvlPrevDay: 30,
							tvlPrevWeek: 30,
							tvlPrevMonth: 30
						}
					},
					change_1d: null,
					change_7d: null,
					change_1m: null
				}
			],
			chainsGroupbyParent: {},
			stackedDataset: [
				[
					'1',
					{
						CosmosHub: {
							d: 20
						}
					}
				],
				[
					String(10 * 24 * 60 * 60),
					{
						CosmosHub: {
							t: 100,
							l: 30
						}
					}
				]
			],
			tvlTypes: {
				tvl: 't',
				doublecounted: 'd',
				liquidstaking: 'l'
			}
		})

		const data = await getChainsByCategory({
			chainMetadata: {},
			category: 'All',
			includeChartData: false
		})

		expect(data.tvlChartsByChain).toEqual({})
		expect(data.chains[0].extraTvl.doublecounted).toBeUndefined()
		expect(data.chains[0].extraTvl.liquidstaking?.tvl).toBe(30)
		expect(data.chains[0].tvl).toBe(70)
	})
})
