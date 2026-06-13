import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChainChartLabels } from '../constants'

const mocks = vi.hoisted(() => ({
	fetchJson: vi.fn(),
	useQuery: vi.fn(),
	lastResult: null as ReturnType<typeof import('../useFetchChainChartData').useFetchChainChartData> | null
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: mocks.useQuery
}))

vi.mock('~/containers/Bridges/queries.client', () => ({
	useGetBridgeChartDataByChain: () => ({ data: null, isLoading: false })
}))

vi.mock('~/containers/Stablecoins/queries.client', () => ({
	useGetStabelcoinsChartDataByChain: () => ({ data: null, isLoading: false })
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

import { useFetchChainChartData } from '../useFetchChainChartData'

const feeRevenueChartRows: Array<{ label: ChainChartLabels; expectedUrl: string }> = [
	{
		label: 'Chain Fees',
		expectedUrl: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base'
	},
	{
		label: 'Chain Revenue',
		expectedUrl:
			'/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyRevenue'
	},
	{
		label: 'App Fees',
		expectedUrl: '/api/public/chains/charts?kind=adapter-chain&adapterType=fees&chain=Base&dataType=dailyAppFees'
	},
	{
		label: 'App Revenue',
		expectedUrl: '/api/public/chains/charts?kind=adapter-chain&adapterType=fees&chain=Base&dataType=dailyAppRevenue'
	}
]

function Probe({
	toggledCharts,
	feesSettings = {}
}: {
	toggledCharts: ChainChartLabels[]
	feesSettings?: { bribes?: boolean; tokentax?: boolean }
}) {
	mocks.lastResult = useFetchChainChartData({
		denomination: 'USD',
		selectedChain: 'Base',
		tvlChart: [],
		tvlChartSummary: {
			totalValueUSD: null,
			tvlPrevDay: null,
			valueChange24hUSD: null,
			change24h: null
		},
		extraTvlCharts: {},
		tvlSettings: {},
		feesSettings,
		toggledCharts,
		groupBy: 'daily'
	})

	return null
}

describe('ChainOverview chart metric semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.fetchJson.mockResolvedValue([])
		mocks.useQuery.mockImplementation((options: { enabled?: boolean; queryFn: () => unknown }) => {
			if (options.enabled !== false) {
				options.queryFn()
			}
			return { data: null, isLoading: false }
		})
	})

	it.each(feeRevenueChartRows)('builds the current $label chart API URL', ({ label, expectedUrl }) => {
		renderToStaticMarkup(<Probe toggledCharts={[label]} />)

		expect(mocks.fetchJson).toHaveBeenCalledTimes(1)
		expect(mocks.fetchJson).toHaveBeenCalledWith(expectedUrl)
	})

	it('fetches chain-native fee extras for Chain Fees charts', () => {
		renderToStaticMarkup(<Probe toggledCharts={['Chain Fees']} feesSettings={{ bribes: true, tokentax: true }} />)

		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base'
		)
		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyBribesRevenue'
		)
		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyTokenTaxes'
		)
		expect(mocks.fetchJson).toHaveBeenCalledTimes(3)
	})

	it('fetches app aggregation fee extras for App Fees charts', () => {
		renderToStaticMarkup(<Probe toggledCharts={['App Fees']} feesSettings={{ bribes: true, tokentax: true }} />)

		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-chain&adapterType=fees&chain=Base&dataType=dailyAppFees'
		)
		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-chain&adapterType=fees&chain=Base&dataType=dailyBribesRevenue'
		)
		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'/api/public/chains/charts?kind=adapter-chain&adapterType=fees&chain=Base&dataType=dailyTokenTaxes'
		)
		expect(mocks.fetchJson).toHaveBeenCalledTimes(3)
	})

	it('does not merge cached disabled fee extras into Chain Fees charts', () => {
		const timestamp = Date.UTC(2024, 0, 1) / 1e3
		mocks.useQuery.mockImplementation((options: { queryKey: unknown[]; enabled?: boolean; queryFn: () => unknown }) => {
			if (options.queryKey[1] === 'chain-fees') {
				return { data: [[timestamp, 100]], isLoading: false }
			}
			if (options.queryKey[1] === 'chain-native-fee-extra' && options.queryKey[2] === 'dailyBribesRevenue') {
				return { data: [[timestamp, 20]], isLoading: false }
			}
			return { data: null, isLoading: false }
		})

		renderToStaticMarkup(<Probe toggledCharts={['Chain Fees']} feesSettings={{ bribes: false }} />)

		expect(mocks.lastResult?.finalCharts['Chain Fees']).toEqual([[timestamp * 1e3, 100]])
	})

	it('keeps Chain Fees visible and reports failed enabled fee-extra chart fetches', () => {
		const timestamp = Date.UTC(2024, 0, 1) / 1e3
		mocks.useQuery.mockImplementation((options: { queryKey: unknown[]; enabled?: boolean; queryFn: () => unknown }) => {
			if (options.queryKey[1] === 'chain-fees') {
				return { data: [[timestamp, 100]], isLoading: false }
			}
			if (options.queryKey[1] === 'chain-native-fee-extra' && options.queryKey[2] === 'dailyBribesRevenue') {
				return { data: undefined, isLoading: false, error: new Error('bribes failed') }
			}
			return { data: null, isLoading: false }
		})

		renderToStaticMarkup(<Probe toggledCharts={['Chain Fees']} feesSettings={{ bribes: true }} />)

		expect(mocks.lastResult?.finalCharts['Chain Fees']).toEqual([[timestamp * 1e3, 100]])
		expect(mocks.lastResult?.failedMetrics).toEqual(['Chain Fees'])
	})
})
