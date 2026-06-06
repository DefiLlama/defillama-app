import type { GetStaticPropsContext } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import defillamaPages from '~/public/pages.json'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

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

vi.mock('~/containers/DimensionAdapters/ChainsByAdapter', () => ({
	ChainsByAdapter: () => null
}))

vi.mock('~/containers/DimensionAdapters/queries', () => ({
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
	{
		label: 'Chain Fees',
		route: '/fees/chains',
		name: 'Fees by Chain',
		tab: 'Chains',
		totalTrackedKey: 'chainFees.chains',
		descriptionIncludes: ['using the chain']
	},
	{
		label: 'Chain Revenue',
		route: '/revenue/chains',
		name: 'Revenue by Chain',
		tab: 'Chains',
		totalTrackedKey: 'chainRevenue.chains',
		descriptionIncludes: ['chain collects for itself']
	},
	{
		label: 'App Fees',
		route: '/app-fees/chains',
		name: 'App Fees by Chain',
		tab: 'Chains',
		totalTrackedKey: 'fees.chains',
		descriptionIncludes: ['apps on the chain', 'Excludes', 'gas fees']
	},
	{
		label: 'App Revenue',
		route: '/app-revenue/chains',
		name: 'App Revenue by Chain',
		tab: 'Chains',
		totalTrackedKey: 'revenue.chains',
		descriptionIncludes: ['apps on the chain', 'Excludes', 'gas fees']
	},
	{
		label: 'REV',
		route: '/rev/chains',
		name: 'REV by Chain',
		tab: 'Chains',
		totalTrackedKey: 'chainFees.chains',
		descriptionIncludes: ['chain fees and MEV tips']
	}
] as const

const rankingPageRows = [
	{
		route: '/fees/chains',
		loadPage: () => import('~/pages/fees/chains'),
		builder: 'chain-native',
		dataType: ADAPTER_DATA_TYPES.DAILY_FEES
	},
	{
		route: '/revenue/chains',
		loadPage: () => import('~/pages/revenue/chains'),
		builder: 'chain-native',
		dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE
	},
	{
		route: '/app-fees/chains',
		loadPage: () => import('~/pages/app-fees/chains'),
		builder: 'app-aggregation',
		dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES
	},
	{
		route: '/app-revenue/chains',
		loadPage: () => import('~/pages/app-revenue/chains'),
		builder: 'app-aggregation',
		dataType: ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
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

	it.each(rankingPageRows)('pins $route ranking page data builder semantics', async (row) => {
		const page = await row.loadPage()

		await page.getStaticProps(staticPropsContext)

		if (row.builder === 'chain-native') {
			expect(mocks.getChainsByFeesAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.dataType,
				chainMetadata: mocks.chainMetadata
			})
			expect(mocks.getChainsByAdapterPageData).not.toHaveBeenCalled()
		} else {
			expect(mocks.getChainsByAdapterPageData).toHaveBeenCalledWith({
				adapterType: ADAPTER_TYPES.FEES,
				dataType: row.dataType,
				chainMetadata: mocks.chainMetadata,
				includeChartData: false
			})
			expect(mocks.getChainsByFeesAdapterPageData).not.toHaveBeenCalled()
		}
	})
})
