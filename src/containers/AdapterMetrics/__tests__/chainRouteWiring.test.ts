import type { GetStaticPropsContext } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

const mocks = vi.hoisted(() => ({
	chainMetadata: {
		ethereum: {
			id: 'ethereum',
			name: 'Ethereum'
		}
	},
	getChainsByAdapterPageData: vi.fn(),
	maxAgeForNext: vi.fn(() => 22)
}))

vi.mock('~/containers/AdapterMetrics/ChainsByAdapter', () => ({
	ChainsByAdapter: () => null
}))

vi.mock('~/containers/AdapterMetrics/queries', () => ({
	getChainsByAdapterPageData: mocks.getChainsByAdapterPageData
}))

vi.mock('~/layout', () => ({
	default: () => null
}))

vi.mock('~/utils/maxAgeForNext', () => ({
	maxAgeForNext: mocks.maxAgeForNext
}))

vi.mock('~/utils/metadata', () => ({
	default: {
		chainMetadata: mocks.chainMetadata
	}
}))

vi.mock('~/utils/perf', () => ({
	withPerformanceLogging: <T extends (...args: Array<unknown>) => unknown>(_name: string, fn: T) => fn
}))

const adapterChainRankingRoutes = [
	{
		route: '/dexs/chains',
		adapterType: ADAPTER_TYPES.DEXS,
		dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
		includeChartData: false,
		loadPage: () => import('~/pages/dexs/chains')
	},
	{
		route: '/perps/chains',
		adapterType: ADAPTER_TYPES.PERPS,
		dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
		loadPage: () => import('~/pages/perps/chains')
	},
	{
		route: '/dex-aggregators/chains',
		adapterType: ADAPTER_TYPES.AGGREGATORS,
		dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
		loadPage: () => import('~/pages/dex-aggregators/chains')
	},
	{
		route: '/perps-aggregators/chains',
		adapterType: ADAPTER_TYPES.PERPS_AGGREGATOR,
		dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
		loadPage: () => import('~/pages/perps-aggregators/chains')
	},
	{
		route: '/options/premium-volume/chains',
		adapterType: ADAPTER_TYPES.OPTIONS,
		dataType: ADAPTER_DATA_TYPES.DAILY_PREMIUM_VOLUME,
		loadPage: () => import('~/pages/options/premium-volume/chains')
	},
	{
		route: '/options/notional-volume/chains',
		adapterType: ADAPTER_TYPES.OPTIONS,
		dataType: ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME,
		loadPage: () => import('~/pages/options/notional-volume/chains')
	},
	{
		route: '/bridge-aggregators/chains',
		adapterType: ADAPTER_TYPES.BRIDGE_AGGREGATORS,
		dataType: ADAPTER_DATA_TYPES.DAILY_BRIDGE_VOLUME,
		loadPage: () => import('~/pages/bridge-aggregators/chains')
	},
	{
		route: '/normalized-volume/chains',
		adapterType: ADAPTER_TYPES.NORMALIZED_VOLUME,
		dataType: ADAPTER_DATA_TYPES.DAILY_NORMALIZED_VOLUME,
		loadPage: () => import('~/pages/normalized-volume/chains')
	}
] as const

const staticPropsContext = {} as GetStaticPropsContext

describe('adapter metric chain ranking route wiring', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getChainsByAdapterPageData.mockResolvedValue({ chains: [] })
	})

	it.each(adapterChainRankingRoutes)('pins $route builder adapter and data type', async (row) => {
		const page = await row.loadPage()

		await page.getStaticProps(staticPropsContext)

		const expectedArgs = {
			adapterType: row.adapterType,
			dataType: row.dataType,
			chainMetadata: mocks.chainMetadata,
			...('includeChartData' in row ? { includeChartData: row.includeChartData } : null)
		}

		expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledTimes(1)
		expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledWith(expectedArgs)
	})

	it('keeps dailyVolume route families distinct by adapter type', () => {
		const volumeRoutes = adapterChainRankingRoutes.filter((row) => row.dataType === ADAPTER_DATA_TYPES.DAILY_VOLUME)

		expect(volumeRoutes.map((row) => row.adapterType)).toEqual([
			ADAPTER_TYPES.DEXS,
			ADAPTER_TYPES.PERPS,
			ADAPTER_TYPES.AGGREGATORS,
			ADAPTER_TYPES.PERPS_AGGREGATOR
		])
	})

	it('keeps options premium volume and notional volume route data types distinct', () => {
		const optionsRoutes = adapterChainRankingRoutes.filter((row) => row.adapterType === ADAPTER_TYPES.OPTIONS)

		expect(optionsRoutes.map((row) => row.dataType)).toEqual([
			ADAPTER_DATA_TYPES.DAILY_PREMIUM_VOLUME,
			ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME
		])
	})
})
