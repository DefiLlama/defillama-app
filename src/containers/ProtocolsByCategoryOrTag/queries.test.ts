import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import type { ParentProtocolLite, ProtocolLite } from '~/containers/Protocols/api.types'
import type { ICategoriesAndTags } from '~/utils/metadata/types'

const {
	fetchProtocolsMock,
	fetchAdapterChainMetricsMock,
	fetchAdapterChainChartDataMock,
	fetchCategoryChartMock,
	fetchTagChartMock,
	fetchJsonMock
} = vi.hoisted(() => ({
	fetchProtocolsMock: vi.fn(),
	fetchAdapterChainMetricsMock: vi.fn(),
	fetchAdapterChainChartDataMock: vi.fn(),
	fetchCategoryChartMock: vi.fn(),
	fetchTagChartMock: vi.fn(),
	fetchJsonMock: vi.fn()
}))

vi.mock('~/containers/Protocols/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

vi.mock('~/containers/DimensionAdapters/api', () => ({
	fetchAdapterChainMetrics: fetchAdapterChainMetricsMock,
	fetchAdapterChainChartData: fetchAdapterChainChartDataMock
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('./api', () => ({
	fetchCategoriesSummary: vi.fn(),
	fetchCategoryChart: fetchCategoryChartMock,
	fetchTagChart: fetchTagChartMock
}))

import { buildCategoryCharts, getProtocolsByCategoryOrTag } from './queries'

const makeAdapterMetrics = (protocols: IAdapterChainMetrics['protocols']): IAdapterChainMetrics =>
	({
		breakdown24h: null,
		breakdown30d: null,
		chain: null,
		allChains: [],
		total24h: 0,
		total48hto24h: 0,
		total7d: 0,
		total14dto7d: 0,
		total60dto30d: 0,
		total30d: 0,
		total1y: 0,
		change_1d: 0,
		change_7d: 0,
		change_1m: 0,
		change_7dover7d: 0,
		change_30dover30d: 0,
		total7DaysAgo: 0,
		total30DaysAgo: 0,
		totalAllTime: 0,
		protocols
	}) as IAdapterChainMetrics

const makeAdapterProtocol = ({
	defillamaId,
	name,
	parentProtocol,
	total24h,
	total7d,
	total30d
}: {
	defillamaId: string
	name: string
	parentProtocol?: string
	total24h: number
	total7d: number
	total30d: number
}) =>
	({
		total24h,
		total48hto24h: 0,
		total7d,
		total14dto7d: 0,
		total60dto30d: 0,
		total30d,
		total1y: 0,
		totalAllTime: 0,
		average1y: 0,
		monthlyAverage1y: 0,
		change_1d: 0,
		change_7d: 0,
		change_1m: 0,
		change_7dover7d: 0,
		change_30dover30d: 0,
		breakdown24h: {},
		breakdown30d: {},
		total7DaysAgo: 0,
		total30DaysAgo: 0,
		defillamaId,
		name,
		displayName: name,
		module: name.toLowerCase(),
		category: 'Interface',
		logo: '',
		chains: ['Ethereum'],
		protocolType: 'protocol',
		methodologyURL: '',
		methodology: {},
		latestFetchIsOk: true,
		parentProtocol: parentProtocol ?? '',
		slug: name.toLowerCase().replace(/\s+/g, '-'),
		linkedProtocols: []
	}) as IAdapterChainMetrics['protocols'][number]

const makeProtocolLite = ({
	defillamaId,
	name,
	category = 'Interface',
	chains,
	chainTvls,
	parentProtocol
}: {
	defillamaId: string
	name: string
	category?: string
	chains: Array<string>
	chainTvls: ProtocolLite['chainTvls']
	parentProtocol?: string
}): ProtocolLite => ({
	name,
	symbol: name.slice(0, 3).toUpperCase(),
	logo: '',
	url: '',
	category,
	chains,
	chainTvls,
	tvl: Object.values(chainTvls).reduce((sum, point) => sum + (point.tvl ?? 0), 0),
	tvlPrevDay: 0,
	tvlPrevWeek: 0,
	tvlPrevMonth: 0,
	mcap: null,
	defillamaId,
	...(parentProtocol ? { parentProtocol } : {})
})

const categoriesAndTags: ICategoriesAndTags = {
	categories: ['Interface', 'Dexs'],
	tags: ['StableSwap'],
	tagCategoryMap: {
		StableSwap: 'Dexs'
	},
	configs: {
		Interface: {
			category: 'Interface',
			chains: ['ethereum'],
			slug: 'interface',
			fees: true,
			revenue: true,
			dexs: true,
			dexAggregators: true,
			perps: true,
			perpsAggregators: true,
			bridgeAggregators: true,
			normalizedVolume: true,
			openInterest: true,
			optionsPremiumVolume: true,
			optionsNotionalVolume: true
		},
		Dexs: {
			category: 'Dexs',
			chains: ['ethereum'],
			slug: 'dexs',
			dexs: true
		},
		StableSwap: {
			category: 'StableSwap',
			chains: ['ethereum'],
			slug: 'stableswap',
			fees: true
		}
	}
}

describe('ProtocolsByCategoryOrTag queries', () => {
	beforeEach(() => {
		const liteProtocols: ProtocolLite[] = []
		const parentProtocols: ParentProtocolLite[] = []

		fetchProtocolsMock.mockResolvedValue({
			protocols: liteProtocols,
			parentProtocols,
			chains: []
		})

		fetchCategoryChartMock.mockResolvedValue({
			tvl: { 1710000000: 100 }
		})
		fetchTagChartMock.mockResolvedValue({
			tvl: { 1710000000: 100 }
		})
		fetchJsonMock.mockResolvedValue({ Interface: ['Ethereum'], StableSwap: ['Ethereum'] })

		fetchAdapterChainMetricsMock.mockImplementation(async ({ adapterType, dataType, category }) => {
			if (adapterType === 'dexs') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 100,
						total7d: 700,
						total30d: 3000
					}),
					makeAdapterProtocol({
						defillamaId: 'child-a',
						name: 'Interface Child A',
						parentProtocol: 'parent#Interface Suite',
						total24h: 20,
						total7d: 140,
						total30d: 600
					}),
					makeAdapterProtocol({
						defillamaId: 'child-b',
						name: 'Interface Child B',
						parentProtocol: 'parent#Interface Suite',
						total24h: 30,
						total7d: 210,
						total30d: 900
					})
				])
			}

			if (adapterType === 'derivatives') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 40,
						total7d: 280,
						total30d: 1200
					}),
					makeAdapterProtocol({
						defillamaId: 'child-b',
						name: 'Interface Child B',
						parentProtocol: 'parent#Interface Suite',
						total24h: 10,
						total7d: 70,
						total30d: 300
					})
				])
			}

			if (adapterType === 'aggregators') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 60,
						total7d: 420,
						total30d: 1800
					}),
					makeAdapterProtocol({
						defillamaId: 'child-a',
						name: 'Interface Child A',
						parentProtocol: 'parent#Interface Suite',
						total24h: 6,
						total7d: 42,
						total30d: 180
					})
				])
			}

			if (adapterType === 'aggregator-derivatives') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 12,
						total7d: 84,
						total30d: 360
					}),
					makeAdapterProtocol({
						defillamaId: 'child-b',
						name: 'Interface Child B',
						parentProtocol: 'parent#Interface Suite',
						total24h: 3,
						total7d: 21,
						total30d: 90
					})
				])
			}

			if (adapterType === 'bridge-aggregators') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 7,
						total7d: 49,
						total30d: 210
					})
				])
			}

			if (adapterType === 'normalized-volume') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 50,
						total7d: 350,
						total30d: 1500
					})
				])
			}

			if (adapterType === 'open-interest') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 15,
						total7d: 105,
						total30d: 450
					}),
					makeAdapterProtocol({
						defillamaId: 'child-b',
						name: 'Interface Child B',
						parentProtocol: 'parent#Interface Suite',
						total24h: 5,
						total7d: 35,
						total30d: 150
					})
				])
			}

			if (adapterType === 'fees' && dataType === 'dailyRevenue') {
				if (category === 'interface') {
					return makeAdapterMetrics([
						makeAdapterProtocol({
							defillamaId: 'hybrid',
							name: 'Hybrid UI',
							total24h: 2,
							total7d: 14,
							total30d: 60
						})
					])
				}

				return makeAdapterMetrics([])
			}

			if (adapterType === 'fees') {
				if (category === 'interface') {
					return makeAdapterMetrics([
						makeAdapterProtocol({
							defillamaId: 'hybrid',
							name: 'Hybrid UI',
							total24h: 8,
							total7d: 56,
							total30d: 240
						}),
						makeAdapterProtocol({
							defillamaId: 'child-a',
							name: 'Interface Child A',
							parentProtocol: 'parent#Interface Suite',
							total24h: 3,
							total7d: 21,
							total30d: 90
						})
					])
				}

				if (category === 'stableswap') {
					return makeAdapterMetrics([
						makeAdapterProtocol({
							defillamaId: 'stable-fees',
							name: 'Stable Fees',
							total24h: 5,
							total7d: 50,
							total30d: 500
						})
					])
				}

				return makeAdapterMetrics([])
			}

			if (adapterType === 'options' && dataType === 'dailyPremiumVolume') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 4,
						total7d: 28,
						total30d: 120
					})
				])
			}

			if (adapterType === 'options' && dataType === 'dailyNotionalVolume') {
				return makeAdapterMetrics([
					makeAdapterProtocol({
						defillamaId: 'hybrid',
						name: 'Hybrid UI',
						total24h: 9,
						total7d: 63,
						total30d: 270
					})
				])
			}

			return makeAdapterMetrics([])
		})

		fetchAdapterChainChartDataMock.mockImplementation(async ({ adapterType }) => {
			if (adapterType === 'dexs') {
				return [
					[1710000000, 10],
					[1710086400, 20]
				]
			}

			if (adapterType === 'derivatives') {
				return [
					[1710000000, 4],
					[1710086400, 8]
				]
			}

			if (adapterType === 'aggregators') {
				return [
					[1710000000, 3],
					[1710086400, 6]
				]
			}

			if (adapterType === 'aggregator-derivatives') {
				return [
					[1710000000, 2],
					[1710086400, 4]
				]
			}

			if (adapterType === 'bridge-aggregators') {
				return [
					[1710000000, 1],
					[1710086400, 2]
				]
			}

			if (adapterType === 'normalized-volume') {
				return [
					[1710000000, 5],
					[1710086400, 10]
				]
			}

			if (adapterType === 'options') {
				return [
					[1710000000, 8],
					[1710086400, 16]
				]
			}

			return []
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('builds category charts with final category-aware metric names', () => {
		const chart = buildCategoryCharts({
			effectiveCategory: 'Interface',
			metrics: ['tvl', 'dexVolume', 'perpVolume'],
			tvlChartData: [[1710000000, 100]],
			dexVolumeChartData: [[1710000000, 10]],
			dexAggregatorsVolumeChartData: null,
			perpVolumeChartData: [[1710000000, 4]],
			perpsAggregatorsVolumeChartData: null,
			bridgeAggregatorsVolumeChartData: null,
			normalizedVolumeChartData: null,
			openInterestChartData: null,
			optionsPremiumVolumeChartData: null,
			optionsNotionalVolumeChartData: null,
			borrowedChartData: undefined,
			stakingChartData: undefined
		})

		expect(chart.dataset.dimensions).toEqual(['timestamp', 'TVL', 'Spot Volume', 'Perp Volume'])
		expect(chart.dataset.source).toEqual([{ timestamp: 1710000000000, TVL: 100, 'Spot Volume': 10, 'Perp Volume': 4 }])
		expect(chart.charts.map((series) => series.name)).toEqual(['TVL', 'Spot Volume', 'Perp Volume'])
	})

	it('merges adapter-only interface protocols and preserves independent metric families', async () => {
		const result = await getProtocolsByCategoryOrTag({
			kind: 'category',
			category: 'Interface',
			categoriesAndTags,
			chainMetadata: {}
		})

		expect(result).not.toBeNull()
		if (!result) return

		const hybrid = result.protocols.find((protocol) => protocol.name === 'Hybrid UI')
		expect(hybrid).toBeDefined()
		expect(hybrid?.tvl).toBeNull()
		expect(hybrid?.dexVolume?.total24h).toBe(100)
		expect(hybrid?.dexAggregatorsVolume?.total24h).toBe(60)
		expect(hybrid?.perpVolume?.total24h).toBe(40)
		expect(hybrid?.perpsAggregatorsVolume?.total24h).toBe(12)
		expect(hybrid?.bridgeAggregatorsVolume?.total24h).toBe(7)
		expect(hybrid?.normalizedVolume?.total24h).toBe(50)
		expect(hybrid?.optionsPremiumVolume?.total24h).toBe(4)
		expect(hybrid?.optionsNotionalVolume?.total24h).toBe(9)

		const parent = result.protocols.find((protocol) => protocol.name === 'Interface Suite')
		expect(parent?.subRows?.map((row) => row.name)).toEqual(['Interface Child A', 'Interface Child B'])
		expect(parent?.dexVolume?.total24h).toBe(50)
		expect(parent?.dexAggregatorsVolume?.total24h).toBe(6)
		expect(parent?.perpVolume?.total24h).toBe(10)
		expect(parent?.perpsAggregatorsVolume?.total24h).toBe(3)
		expect(result.summaryMetrics.fees?.total7d).toBe(77)
		expect(result.summaryMetrics.revenue?.total7d).toBe(14)
		expect(result.summaryMetrics.dexVolume?.total7d).toBe(1050)
		expect(result.summaryMetrics.dexAggregatorsVolume?.total7d).toBe(462)
		expect(result.summaryMetrics.perpVolume?.total7d).toBe(350)
		expect(result.summaryMetrics.perpsAggregatorsVolume?.total7d).toBe(105)
		expect(result.summaryMetrics.bridgeAggregatorsVolume?.total7d).toBe(49)
		expect(result.summaryMetrics.normalizedVolume?.total7d).toBe(350)
		expect(result.summaryMetrics.optionsPremiumVolume?.total7d).toBe(28)
		expect(result.summaryMetrics.optionsNotionalVolume?.total7d).toBe(63)
		expect(result.summaryMetrics.openInterest?.total30d).toBe(600)
		expect(result.summaryMetrics.dexAggregatorsVolume?.total7d).not.toBe(result.summaryMetrics.dexVolume?.total7d)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({ adapterType: 'aggregators', category: 'interface' })
		)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({ adapterType: 'aggregator-derivatives', category: 'interface' })
		)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({ adapterType: 'bridge-aggregators', category: 'interface' })
		)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				adapterType: 'normalized-volume',
				dataType: 'dailyNormalizedVolume',
				category: 'interface'
			})
		)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({ adapterType: 'options', dataType: 'dailyPremiumVolume', category: 'interface' })
		)
		expect(fetchAdapterChainMetricsMock).toHaveBeenCalledWith(
			expect.objectContaining({ adapterType: 'options', dataType: 'dailyNotionalVolume', category: 'interface' })
		)
		expect(result.chains).toEqual([
			{ label: 'All', to: '/protocols/interface' },
			{ label: 'Ethereum', to: '/protocols/interface/ethereum' }
		])
	})

	it('uses direct tag config capabilities instead of inheriting parent dex capabilities', async () => {
		const result = await getProtocolsByCategoryOrTag({
			kind: 'tag',
			tag: 'StableSwap',
			tagCategory: 'Dexs',
			categoriesAndTags,
			chainMetadata: {}
		})

		expect(result).not.toBeNull()
		if (!result) return

		expect(result.capabilities.dexVolume).toBe(false)
		expect(result.capabilities.fees).toBe(true)
		expect(fetchAdapterChainMetricsMock).not.toHaveBeenCalledWith(
			expect.objectContaining({
				adapterType: 'dexs',
				category: 'stableswap'
			})
		)
		expect(result.summaryMetrics.fees?.total7d).toBe(50)
	})

	it('aggregates parent rows from chain-filtered children on chain pages', async () => {
		fetchProtocolsMock.mockResolvedValue({
			protocols: [
				makeProtocolLite({
					defillamaId: 'child-a',
					name: 'Interface Child A',
					chains: ['Ethereum'],
					parentProtocol: 'parent#Interface Suite',
					chainTvls: {
						Ethereum: { tvl: 20, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }
					}
				}),
				makeProtocolLite({
					defillamaId: 'child-b',
					name: 'Interface Child B',
					chains: ['Arbitrum'],
					parentProtocol: 'parent#Interface Suite',
					chainTvls: {
						Arbitrum: { tvl: 30, tvlPrevDay: 0, tvlPrevWeek: 0, tvlPrevMonth: 0 }
					}
				})
			],
			parentProtocols: [
				{
					id: 'parent#Interface Suite',
					name: 'Interface Suite',
					chains: ['Ethereum', 'Arbitrum'],
					mcap: null
				}
			],
			chains: []
		})

		fetchAdapterChainMetricsMock.mockImplementation(async ({ adapterType, category }) => {
			if (adapterType === 'dexs' && category === 'interface') {
				return makeAdapterMetrics([
					{
						...makeAdapterProtocol({
							defillamaId: 'child-a',
							name: 'Interface Child A',
							parentProtocol: 'parent#Interface Suite',
							total24h: 20,
							total7d: 140,
							total30d: 600
						}),
						chains: ['Ethereum']
					},
					{
						...makeAdapterProtocol({
							defillamaId: 'child-b',
							name: 'Interface Child B',
							parentProtocol: 'parent#Interface Suite',
							total24h: 30,
							total7d: 210,
							total30d: 900
						}),
						chains: ['Arbitrum']
					}
				])
			}

			return makeAdapterMetrics([])
		})

		const result = await getProtocolsByCategoryOrTag({
			kind: 'category',
			category: 'Interface',
			chain: 'Ethereum',
			categoriesAndTags,
			chainMetadata: {
				ethereum: {
					name: 'Ethereum',
					id: '1',
					dexs: true
				}
			}
		})

		expect(result).not.toBeNull()
		if (!result) return

		expect(result.protocols.map((protocol) => protocol.name)).toEqual(['Interface Child A'])
		expect(result.protocols[0]?.subRows).toBeUndefined()
		expect(result.protocols[0]?.dexVolume?.total24h).toBe(20)
		expect(result.summaryMetrics.dexVolume?.total24h).toBe(20)
	})
})
