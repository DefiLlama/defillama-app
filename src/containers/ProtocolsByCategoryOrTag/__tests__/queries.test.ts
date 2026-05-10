import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IAdapterChainMetrics } from '~/containers/DimensionAdapters/api.types'
import type { ParentProtocolLite, ProtocolLite } from '~/containers/Protocols/api.types'

const {
	fetchProtocolsMock,
	fetchAdapterChainMetricsMock,
	fetchAdapterChainChartDataMock,
	fetchCategoriesSummaryMock,
	fetchCategoryChartMock,
	fetchTagChartMock,
	fetchJsonMock
} = vi.hoisted(() => ({
	fetchProtocolsMock: vi.fn(),
	fetchAdapterChainMetricsMock: vi.fn(),
	fetchAdapterChainChartDataMock: vi.fn(),
	fetchCategoriesSummaryMock: vi.fn(),
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

vi.mock('../api', () => ({
	fetchCategoriesSummary: fetchCategoriesSummaryMock,
	fetchCategoryChart: fetchCategoryChartMock,
	fetchTagChart: fetchTagChartMock
}))

import { buildCategoryCharts, getProtocolsByCategoryOrTag, getProtocolsCategoriesPageData } from '../queries'

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

describe('getProtocolsCategoriesPageData EVM filter', () => {
	const makeChainTvlPoint = (tvl: number) => ({
		tvl,
		tvlPrevDay: tvl,
		tvlPrevWeek: tvl,
		tvlPrevMonth: tvl
	})

	const SPECIAL_KEYS = new Set(['borrowed', 'staking', 'pool2', 'doublecounted', 'liquidstaking', 'dcAndLsOverlap'])
	const makeProtocol = ({
		defillamaId,
		name,
		category,
		chainTvls,
		chains
	}: {
		defillamaId: string
		name: string
		category: string
		chainTvls: ProtocolLite['chainTvls']
		chains: string[]
	}): ProtocolLite => {
		const tvl = Object.entries(chainTvls).reduce((sum, [key, point]) => {
			if (SPECIAL_KEYS.has(key) || key.includes('-')) return sum
			return sum + (point.tvl ?? 0)
		}, 0)
		return {
			name,
			symbol: '',
			logo: '',
			url: '',
			category,
			tags: [],
			chains,
			chainTvls,
			tvl,
			tvlPrevDay: tvl,
			tvlPrevWeek: tvl,
			tvlPrevMonth: tvl,
			mcap: null,
			defillamaId
		}
	}

	beforeEach(() => {
		fetchAdapterChainMetricsMock.mockResolvedValue(null)
		fetchCategoriesSummaryMock.mockResolvedValue({
			chart: {},
			categories: ['DEX', 'Lending']
		})
		fetchJsonMock.mockImplementation(async (url: string) => {
			if (url.endsWith('/chains')) {
				return [
					{ name: 'Ethereum', chainId: 1 },
					{ name: 'BSC', chainId: 56 },
					{ name: 'Solana', chainId: null },
					{ name: 'Bitcoin', chainId: null }
				]
			}
			return null
		})

		fetchProtocolsMock.mockResolvedValue({
			protocols: [
				makeProtocol({
					defillamaId: 'evm-only',
					name: 'EVM Only DEX',
					category: 'DEX',
					chainTvls: {
						Ethereum: makeChainTvlPoint(100),
						BSC: makeChainTvlPoint(50)
					},
					chains: ['Ethereum', 'BSC']
				}),
				makeProtocol({
					defillamaId: 'non-evm-only',
					name: 'Solana DEX',
					category: 'DEX',
					chainTvls: {
						Solana: makeChainTvlPoint(80)
					},
					chains: ['Solana']
				}),
				makeProtocol({
					defillamaId: 'mixed',
					name: 'Mixed Lending',
					category: 'Lending',
					chainTvls: {
						Ethereum: makeChainTvlPoint(40),
						Bitcoin: makeChainTvlPoint(60),
						borrowed: makeChainTvlPoint(999),
						'Ethereum-borrowed': makeChainTvlPoint(999)
					},
					chains: ['Ethereum', 'Bitcoin']
				})
			],
			parentProtocols: [],
			chains: []
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('splits per-protocol TVL across EVM and non-EVM tables and skips special chainTvl keys', async () => {
		const result = await getProtocolsCategoriesPageData()

		const findRow = (rows: typeof result.tableData, name: string) => rows.find((row) => row.name === name)

		expect(findRow(result.tableData, 'DEX')?.tvl).toBe(230)
		expect(findRow(result.tableData, 'Lending')?.tvl).toBe(100)

		expect(findRow(result.tableDataEvm, 'DEX')?.tvl).toBe(150)
		expect(findRow(result.tableDataEvm, 'DEX')?.protocols).toBe(1)
		expect(findRow(result.tableDataEvm, 'Lending')?.tvl).toBe(40)
		expect(findRow(result.tableDataEvm, 'Lending')?.protocols).toBe(1)

		expect(findRow(result.tableDataNonEvm, 'DEX')?.tvl).toBe(80)
		expect(findRow(result.tableDataNonEvm, 'DEX')?.protocols).toBe(1)
		expect(findRow(result.tableDataNonEvm, 'Lending')?.tvl).toBe(60)
		expect(findRow(result.tableDataNonEvm, 'Lending')?.protocols).toBe(1)
	})

	it('keeps EVM and non-EVM tables sorted by TVL desc and includes every category key', async () => {
		const result = await getProtocolsCategoriesPageData()

		// EVM: DEX=150, Lending=40
		expect(result.tableDataEvm.map((row) => row.name)).toEqual(['DEX', 'Lending'])
		// Non-EVM: DEX=80, Lending=60
		expect(result.tableDataNonEvm.map((row) => row.name)).toEqual(['DEX', 'Lending'])
	})
})

describe('getProtocolsCategoriesPageData revenue allocation', () => {
	const makeChainTvlPoint = (tvl: number) => ({
		tvl,
		tvlPrevDay: tvl,
		tvlPrevWeek: tvl,
		tvlPrevMonth: tvl
	})

	const buildProtocol = ({
		defillamaId,
		name,
		category,
		chainTvls,
		chains
	}: {
		defillamaId: string
		name: string
		category: string
		chainTvls: ProtocolLite['chainTvls']
		chains: string[]
	}): ProtocolLite => ({
		name,
		symbol: '',
		logo: '',
		url: '',
		category,
		tags: [],
		chains,
		chainTvls,
		tvl: 0,
		tvlPrevDay: 0,
		tvlPrevWeek: 0,
		tvlPrevMonth: 0,
		mcap: null,
		defillamaId
	})

	beforeEach(() => {
		fetchCategoriesSummaryMock.mockResolvedValue({
			chart: {},
			categories: ['Service']
		})
		fetchJsonMock.mockImplementation(async (url: string) => {
			if (url.endsWith('/chains')) {
				return [
					{ name: 'Ethereum', chainId: 1 },
					{ name: 'BSC', chainId: 56 },
					{ name: 'Solana', chainId: null }
				]
			}
			return null
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('reconciles revenue across EVM and non-EVM tables by chain-count fallback when TVL split is zero', async () => {
		fetchAdapterChainMetricsMock.mockImplementation(async ({ adapterType, dataType }) => {
			if (adapterType === 'fees' && dataType === 'dailyRevenue') {
				return {
					protocols: [
						{
							defillamaId: 'service',
							total24h: 100
						} as IAdapterChainMetrics['protocols'][number]
					]
				} as IAdapterChainMetrics
			}
			return null
		})

		fetchProtocolsMock.mockResolvedValue({
			protocols: [
				buildProtocol({
					defillamaId: 'service',
					name: 'Revenue-Only Service',
					category: 'Service',
					chainTvls: {},
					chains: ['Ethereum', 'BSC', 'Solana']
				})
			],
			parentProtocols: [],
			chains: []
		})

		const result = await getProtocolsCategoriesPageData()
		const findRow = (rows: typeof result.tableData, name: string) => rows.find((row) => row.name === name)

		const total = findRow(result.tableData, 'Service')?.revenue ?? 0
		const evm = findRow(result.tableDataEvm, 'Service')?.revenue ?? 0
		const nonEvm = findRow(result.tableDataNonEvm, 'Service')?.revenue ?? 0

		// 2 EVM chains, 1 non-EVM → revenue splits 2/3 vs 1/3
		expect(total).toBe(100)
		expect(evm).toBeCloseTo((2 / 3) * 100, 6)
		expect(nonEvm).toBeCloseTo((1 / 3) * 100, 6)
		expect(evm + nonEvm).toBeCloseTo(total, 6)
	})

	it('splits revenue by TVL share when TVL is available and reconciles to the total', async () => {
		fetchAdapterChainMetricsMock.mockImplementation(async ({ adapterType, dataType }) => {
			if (adapterType === 'fees' && dataType === 'dailyRevenue') {
				return {
					protocols: [
						{
							defillamaId: 'mixed-rev',
							total24h: 90
						} as IAdapterChainMetrics['protocols'][number]
					]
				} as IAdapterChainMetrics
			}
			return null
		})

		fetchProtocolsMock.mockResolvedValue({
			protocols: [
				buildProtocol({
					defillamaId: 'mixed-rev',
					name: 'Mixed Revenue Protocol',
					category: 'Service',
					chainTvls: {
						Ethereum: makeChainTvlPoint(200),
						Solana: makeChainTvlPoint(100)
					},
					chains: ['Ethereum', 'Solana']
				})
			],
			parentProtocols: [],
			chains: []
		})

		const result = await getProtocolsCategoriesPageData()
		const findRow = (rows: typeof result.tableData, name: string) => rows.find((row) => row.name === name)

		const total = findRow(result.tableData, 'Service')?.revenue ?? 0
		const evm = findRow(result.tableDataEvm, 'Service')?.revenue ?? 0
		const nonEvm = findRow(result.tableDataNonEvm, 'Service')?.revenue ?? 0

		// TVL share 200/300 EVM vs 100/300 non-EVM
		expect(total).toBe(90)
		expect(evm).toBeCloseTo(60, 6)
		expect(nonEvm).toBeCloseTo(30, 6)
		expect(evm + nonEvm).toBeCloseTo(total, 6)
	})
})
