import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('~/containers/Unlocks/api', () => ({
	fetchProtocolEmissionFromDatasets: vi.fn().mockResolvedValue(null)
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
				protocolLlamaswapDataset: {}
			})

			expect(fetchProtocolTvlChart).toHaveBeenCalledWith({ protocol: 'test-protocol', timeout: 10_000 })
			expect(data.availableCharts).toContain('TVL')
			expect(data.defaultToggledCharts).toEqual(['TVL'])
			expect(data.initialMultiSeriesChartData).toEqual({})
		} finally {
			logSpy.mockRestore()
		}
	})
})
