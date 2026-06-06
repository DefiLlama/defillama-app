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
	getChainsByFeesAdapterPageData: mocks.getChainsByFeesAdapterPageData
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

const semanticsRows = [
	{ label: feeRevenueMetrics.chainFees.label, ...feeRevenueMetrics.chainFees.ranking },
	{ label: feeRevenueMetrics.chainRevenue.label, ...feeRevenueMetrics.chainRevenue.ranking },
	{ label: feeRevenueMetrics.appFees.label, ...feeRevenueMetrics.appFees.ranking },
	{ label: feeRevenueMetrics.appRevenue.label, ...feeRevenueMetrics.appRevenue.ranking },
	{ label: feeRevenueMetrics.rev.label, ...feeRevenueMetrics.rev.ranking }
] as const

const rankingPageRows = [
	{
		metric: feeRevenueMetrics.chainFees,
		loadPage: () => import('~/pages/fees/chains')
	},
	{
		metric: feeRevenueMetrics.chainRevenue,
		loadPage: () => import('~/pages/revenue/chains')
	},
	{
		metric: feeRevenueMetrics.appFees,
		loadPage: () => import('~/pages/app-fees/chains')
	},
	{
		metric: feeRevenueMetrics.appRevenue,
		loadPage: () => import('~/pages/app-revenue/chains')
	}
] as const

const staticPropsContext = {} as GetStaticPropsContext

describe('fees and revenue page semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getChainsByAdapterPageData.mockResolvedValue({ chains: [] })
		mocks.getChainsByFeesAdapterPageData.mockResolvedValue({ chains: [] })
	})

	it.each(semanticsRows)('pins public page glossary semantics for $label', (row) => {
		const matchingPages = defillamaPages.Metrics.filter((page) => page.route === row.route)

		expect(matchingPages).toHaveLength(1)
		expect(matchingPages[0]).toMatchObject({
			name: row.name,
			tab: row.tab,
			totalTrackedKey: row.totalTrackedKey
		})

		for (const expectedText of row.descriptionIncludes) {
			expect(matchingPages[0].description).toContain(expectedText)
		}
	})

	it.each(rankingPageRows)('pins $metric.ranking.route ranking page data builder semantics', async (row) => {
		const page = await row.loadPage()

		await page.getStaticProps(staticPropsContext)

		if (row.metric.ranking.builder === 'chain-native') {
			expect(mocks.getChainsByFeesAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.metric.ranking.dataType,
				chainMetadata: mocks.chainMetadata
			})
			expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
		} else {
			expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.metric.ranking.dataType,
				chainMetadata: mocks.chainMetadata,
				includeChartData: false
			})
			expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
		}
	})
})
