import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import type { ParentProtocolLite, ProtocolLite } from '~/containers/Protocols/api.types'

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
		fetchJsonMock.mockResolvedValue({ Interface: ['Ethereum'] })

		fetchAdapterChainMetricsMock.mockImplementation(async ({ adapterType, dataType }) => {
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

			if (adapterType === 'fees' && dataType === 'dailyRevenue') {
				return makeAdapterMetrics([])
			}

			if (adapterType === 'fees') {
				return makeAdapterMetrics([])
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

	it('merges adapter-only interface protocols and preserves both dex and perp metrics', async () => {
		const result = await getProtocolsByCategoryOrTag({
			kind: 'category',
			category: 'Interface',
			chainMetadata: {}
		})

		expect(result).not.toBeNull()
		if (!result) return

		const hybrid = result.protocols.find((protocol) => protocol.name === 'Hybrid UI')
		expect(hybrid).toBeDefined()
		expect(hybrid?.tvl).toBeNull()
		expect(hybrid?.dexVolume?.total24h).toBe(100)
		expect(hybrid?.perpVolume?.total24h).toBe(40)

		const parent = result.protocols.find((protocol) => protocol.name === 'Interface Suite')
		expect(parent?.subRows?.map((row) => row.name)).toEqual(['Interface Child A', 'Interface Child B'])
		expect(parent?.dexVolume?.total24h).toBe(50)
		expect(parent?.perpVolume?.total24h).toBe(10)
	})
})
