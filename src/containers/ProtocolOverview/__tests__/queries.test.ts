import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFastJsonTimeoutMs } from '~/utils/async'

const fetchAdapterProtocolChartData = vi.fn()
const fetchProtocolTvlChart = vi.fn().mockResolvedValue([])

vi.mock('~/api', () => ({
	fetchBlockExplorers: vi.fn().mockResolvedValue([]),
	fetchLiquidityTokensDataset: vi.fn().mockResolvedValue([])
}))

vi.mock('~/api/coingecko', () => ({
	fetchCoinGeckoChartByIdWithCacheFallback: vi.fn().mockResolvedValue(null)
}))

vi.mock('~/containers/Bridges/api', () => ({
	fetchBridgeVolumeBySlug: vi.fn().mockResolvedValue({ dailyVolumes: [] })
}))

vi.mock('~/containers/DimensionAdapters/api', () => ({
	fetchAdapterProtocolChartData,
	fetchAdapterProtocolMetrics: vi.fn().mockResolvedValue({})
}))

vi.mock('~/containers/Hacks/api', () => ({
	fetchHacks: vi.fn().mockResolvedValue([])
}))

vi.mock('~/containers/Incentives/queries', () => ({
	getProtocolIncentivesFromAggregatedEmissions: vi.fn().mockResolvedValue(null)
}))

vi.mock('~/containers/Oracles/api', () => ({
	fetchOracleMetrics: vi.fn().mockResolvedValue(null),
	fetchOracleProtocolChart: vi.fn().mockResolvedValue(null)
}))

vi.mock('~/containers/Protocols/api', () => ({
	fetchProtocols: vi.fn().mockResolvedValue({ protocols: [], chains: [], parentProtocols: [] })
}))

vi.mock('~/containers/Treasuries/api', () => ({
	fetchTreasuries: vi.fn().mockResolvedValue([])
}))

vi.mock('~/utils/async', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/utils/async')>()
	return {
		...actual,
		fetchJson: vi.fn().mockResolvedValue({ content_elements: [] })
	}
})

vi.mock('../api', () => ({
	fetchProtocolExpenses: vi.fn().mockResolvedValue([]),
	fetchProtocolOverviewMetrics: vi.fn().mockResolvedValue({
		id: 'test-protocol',
		name: 'Test Protocol',
		gecko_id: 'test-token',
		category: 'Dexes',
		chains: ['Ethereum'],
		currentChainTvls: {}
	}),
	fetchProtocolTvlChart
}))

vi.mock('../formatAdapterData', () => ({
	formatAdapterData: vi.fn().mockResolvedValue({
		totalAllTime: 1,
		defaultChartView: 'daily'
	})
}))

describe('getProtocolOverviewPageData', () => {
	afterEach(() => {
		fetchAdapterProtocolChartData.mockClear()
		fetchProtocolTvlChart.mockResolvedValue([])
		fetchProtocolTvlChart.mockClear()
	})

	it('default-toggles secondary charts without server-prefetching their series', async () => {
		const { getProtocolOverviewPageData } = await import('../queries')

		const data = await getProtocolOverviewPageData({
			protocolId: 'test-protocol',
			currentProtocolMetadata: {
				displayName: 'Test Protocol',
				fees: true
			} as never,
			chainMetadata: {},
			tokenlist: {},
			cgExchangeIdentifiers: [],
			emissionsSupplyMetrics: {},
			protocolLlamaswapDataset: {}
		})

		expect(data.availableCharts).toContain('Fees')
		expect(data.defaultToggledCharts).toContain('Fees')
		expect(data.initialMultiSeriesChartData).toEqual({})
		expect(fetchAdapterProtocolChartData).not.toHaveBeenCalled()
	})

	it('default-toggles seeded primary chart data', async () => {
		fetchProtocolTvlChart.mockResolvedValueOnce([
			[1_700_000_000_000, 10],
			[1_700_086_400_000, 12]
		])
		const { getProtocolOverviewPageData } = await import('../queries')

		const data = await getProtocolOverviewPageData({
			protocolId: 'test-protocol',
			currentProtocolMetadata: {
				displayName: 'Test Protocol',
				tvl: true
			} as never,
			chainMetadata: {},
			tokenlist: {},
			cgExchangeIdentifiers: [],
			emissionsSupplyMetrics: {},
			protocolLlamaswapDataset: {}
		})

		expect(data.defaultToggledCharts).toEqual(['TVL'])
		expect(data.initialMultiSeriesChartData).toEqual({
			TVL: [
				[1_700_000_000_000, 10],
				[1_700_086_400_000, 12]
			]
		})
	})

	it('builds protocol page data when the primary TVL chart seed fails', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		fetchProtocolTvlChart.mockRejectedValueOnce(new Error('chart timeout'))
		try {
			const { getProtocolOverviewPageData } = await import('../queries')

			const data = await getProtocolOverviewPageData({
				protocolId: 'test-protocol',
				currentProtocolMetadata: {
					displayName: 'Test Protocol',
					tvl: true
				} as never,
				chainMetadata: {},
				tokenlist: {},
				cgExchangeIdentifiers: [],
				emissionsSupplyMetrics: {},
				protocolLlamaswapDataset: {}
			})

			expect(fetchProtocolTvlChart).toHaveBeenCalledWith({ protocol: 'test-protocol', timeout: getFastJsonTimeoutMs() })
			expect(data.availableCharts).toContain('TVL')
			expect(data.defaultToggledCharts).toEqual(['TVL'])
			expect(data.initialMultiSeriesChartData).toEqual({})
		} finally {
			logSpy.mockRestore()
		}
	})

	it('calculates outstanding FDV from cached emissions supply metrics', async () => {
		const { getProtocolOverviewPageData } = await import('../queries')

		const data = await getProtocolOverviewPageData({
			protocolId: 'test-protocol',
			currentProtocolMetadata: {
				displayName: 'Test Protocol',
				emissions: true
			} as never,
			chainMetadata: {},
			tokenlist: {
				'test-token': {
					symbol: 'test',
					current_price: 2,
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
			},
			cgExchangeIdentifiers: [],
			emissionsSupplyMetrics: {
				'test-protocol': {
					name: 'Test Protocol',
					supplyMetrics: {
						maxSupply: 1000,
						adjustedSupply: 500,
						tbdAmount: 0,
						incentiveAmount: 0,
						nonIncentiveAmount: 500
					}
				}
			},
			protocolLlamaswapDataset: {}
		})

		expect(data.outstandingFDV).toBe(1000)
	})
})
