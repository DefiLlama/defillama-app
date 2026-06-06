import type { GetStaticPropsContext } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { feeRevenueMetrics } from '~/metrics/feesRevenue'
import defillamaPages from '~/public/pages.json'
import { ADAPTER_TYPES } from '../constants'

const mocks = vi.hoisted(() => ({
	chainMetadata: {
		ethereum: {
			id: 'ethereum',
			name: 'Ethereum'
		}
	},
	getChainsByAdapterPageData: vi.fn(),
	getChainsByFeesAdapterPageData: vi.fn(),
	getChainsByREVPageData: vi.fn(),
	maxAgeForNext: vi.fn(() => 22)
}))

vi.mock('~/components/Filters/options', () => ({
	feesOptions: []
}))

vi.mock('~/containers/AdapterMetrics/ChainsByAdapter', () => ({
	ChainsByAdapter: () => null
}))

vi.mock('~/containers/AdapterMetrics/queries', () => ({
	getChainsByAdapterPageData: mocks.getChainsByAdapterPageData,
	getChainsByFeesAdapterPageData: mocks.getChainsByFeesAdapterPageData,
	getChainsByREVPageData: mocks.getChainsByREVPageData
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

const feeRevenueMetricRegistry = Object.values(feeRevenueMetrics)

const rankingPageRows = [
	{
		route: feeRevenueMetrics.chainFees.ranking.route,
		metric: feeRevenueMetrics.chainFees,
		loadPage: () => import('~/pages/fees/chains')
	},
	{
		route: feeRevenueMetrics.chainRevenue.ranking.route,
		metric: feeRevenueMetrics.chainRevenue,
		loadPage: () => import('~/pages/revenue/chains')
	},
	{
		route: feeRevenueMetrics.appFees.ranking.route,
		metric: feeRevenueMetrics.appFees,
		loadPage: () => import('~/pages/app-fees/chains')
	},
	{
		route: feeRevenueMetrics.appRevenue.ranking.route,
		metric: feeRevenueMetrics.appRevenue,
		loadPage: () => import('~/pages/app-revenue/chains')
	},
	{
		route: feeRevenueMetrics.rev.ranking.route,
		metric: feeRevenueMetrics.rev,
		loadPage: () => import('~/pages/rev/chains')
	}
] as const

const staticPropsContext = {} as GetStaticPropsContext

describe('fees and revenue page semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getChainsByAdapterPageData.mockResolvedValue({ chains: [] })
		mocks.getChainsByFeesAdapterPageData.mockResolvedValue({ chains: [] })
		mocks.getChainsByREVPageData.mockResolvedValue({ chains: [] })
	})

	it('keeps every fees/revenue chain ranking page represented in the registry', () => {
		const pagesJsonRoutes = defillamaPages.Metrics.filter(
			(page) => page.category === 'Fees & Revenue' && page.tab === 'Chains'
		).map((page) => page.route)
		const registryRoutes = feeRevenueMetricRegistry.map((metric) => metric.ranking.route)

		expect([...pagesJsonRoutes].sort()).toEqual([...registryRoutes].sort())
	})

	it.each(feeRevenueMetricRegistry)('pins public page glossary semantics for $label', (metric) => {
		const matchingPages = defillamaPages.Metrics.filter((page) => page.route === metric.ranking.route)

		expect(matchingPages).toHaveLength(1)
		expect(matchingPages[0]).toMatchObject({
			name: metric.ranking.name,
			category: 'Fees & Revenue',
			tab: metric.ranking.tab,
			totalTrackedKey: metric.ranking.totalTrackedKey
		})

		for (const expectedText of metric.ranking.descriptionIncludes) {
			expect(matchingPages[0].description).toContain(expectedText)
		}
	})

	it.each(rankingPageRows)('pins $route ranking page data builder semantics', async (row) => {
		const page = await row.loadPage()

		await page.getStaticProps(staticPropsContext)

		if (row.metric.ranking.builder === 'chain-native') {
			expect(mocks.getChainsByFeesAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.metric.ranking.dataType,
				chainMetadata: mocks.chainMetadata
			})
			expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
			expect(mocks.getChainsByREVPageData).not.toHaveBeenCalled()
		} else if (row.metric.ranking.builder === 'app-aggregation') {
			expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.metric.ranking.dataType,
				chainMetadata: mocks.chainMetadata,
				includeChartData: false
			})
			expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
			expect(mocks.getChainsByREVPageData).not.toHaveBeenCalled()
		} else {
			expect(mocks.getChainsByREVPageData).toHaveBeenCalledWith({
				chainMetadata: mocks.chainMetadata
			})
			expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
			expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
		}
	})
})
