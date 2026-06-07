import type { GetStaticPropsContext } from 'next'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { feeRevenueMetrics } from '~/metrics/feesRevenue'
import defillamaPages from '~/public/pages.json'
import { ADAPTER_TYPES } from '../constants'

type CapturedLayoutProps = {
	canonicalUrl?: string
	metricFilters?: unknown
	metricFiltersLabel?: string
}

const mocks = vi.hoisted(() => ({
	chainMetadata: {
		ethereum: {
			id: 'ethereum',
			name: 'Ethereum'
		}
	},
	feesOptions: [
		{ name: 'Bribes', key: 'bribes', help: null },
		{ name: 'Token Tax', key: 'tokentax', help: null }
	],
	getChainsByAdapterPageData: vi.fn(),
	getChainsByFeesAdapterPageData: vi.fn(),
	getChainsByREVPageData: vi.fn(),
	layoutProps: [] as Array<CapturedLayoutProps>,
	maxAgeForNext: vi.fn(() => 22)
}))

vi.mock('~/components/Filters/options', () => ({
	feesOptions: mocks.feesOptions
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
	default: (props: CapturedLayoutProps) => {
		mocks.layoutProps.push(props)
		return null
	}
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
const chainRankingPageProps = {
	adapterType: ADAPTER_TYPES.FEES,
	chartData: { dimensions: ['timestamp'], source: [] },
	chains: [],
	allChains: []
}

describe('fees and revenue page semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.layoutProps = []
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
		const ranking = row.metric.ranking

		await page.getStaticProps(staticPropsContext)

		switch (ranking.builder) {
			case 'chain-native':
				expect(mocks.getChainsByFeesAdapterPageData).toHaveBeenCalledWith({
					adapterType: ADAPTER_TYPES.FEES,
					dataType: ranking.dataType,
					chainMetadata: mocks.chainMetadata
				})
				expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
				expect(mocks.getChainsByREVPageData).not.toHaveBeenCalled()
				break
			case 'app-aggregation':
				expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledWith({
					adapterType: ADAPTER_TYPES.FEES,
					dataType: ranking.dataType,
					chainMetadata: mocks.chainMetadata,
					includeChartData: false
				})
				expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
				expect(mocks.getChainsByREVPageData).not.toHaveBeenCalled()
				break
			case 'rev':
				expect(mocks.getChainsByREVPageData).toHaveBeenCalledWith({
					chainMetadata: mocks.chainMetadata
				})
				expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
				expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
				break
			default: {
				const exhaustiveCheck: never = ranking
				throw new Error(`Unhandled fee/revenue ranking builder: ${exhaustiveCheck}`)
			}
		}
	})

	it('pins which chain ranking pages expose fee extra controls', async () => {
		const metricFilterLabelsByRoute = new Map<string, string>([
			[feeRevenueMetrics.appFees.ranking.route, 'Include in App Fees'],
			[feeRevenueMetrics.appRevenue.ranking.route, 'Include in App Revenue']
		])

		for (const row of rankingPageRows) {
			const page = await row.loadPage()
			const Page = page.default as unknown as ComponentType<Record<string, unknown>>
			const expectedMetricFiltersLabel = metricFilterLabelsByRoute.get(row.route)

			mocks.layoutProps = []
			renderToStaticMarkup(
				createElement(
					Page,
					row.metric.ranking.builder === 'rev'
						? { chains: [] }
						: { ...chainRankingPageProps, dataType: row.metric.ranking.dataType }
				)
			)

			expect(mocks.layoutProps).toHaveLength(1)

			if (expectedMetricFiltersLabel) {
				expect(mocks.layoutProps[0]).toMatchObject({
					canonicalUrl: row.route,
					metricFilters: mocks.feesOptions,
					metricFiltersLabel: expectedMetricFiltersLabel
				})
			} else {
				expect(mocks.layoutProps[0]).toMatchObject({
					canonicalUrl: row.route
				})
				expect(mocks.layoutProps[0].metricFilters).toBeUndefined()
				expect(mocks.layoutProps[0].metricFiltersLabel).toBeUndefined()
			}
		}
	})
})
