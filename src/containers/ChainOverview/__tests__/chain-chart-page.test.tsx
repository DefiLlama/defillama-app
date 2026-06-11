import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'
import ChainChartPage from '~/pages/chart/chain/[chain]'

const mocks = vi.hoisted(() => ({
	routerState: {
		query: {} as Record<string, string | string[]>,
		isReady: true
	},
	useFetchChainChartData: vi.fn()
}))

vi.mock('next/router', () => ({
	useRouter: () => mocks.routerState
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => null
}))

vi.mock('~/containers/ChainOverview/Chart', () => ({
	default: () => null
}))

vi.mock('~/containers/ChainOverview/queries.server', () => ({
	getChainOverviewData: vi.fn()
}))

vi.mock('~/containers/ChainOverview/useFetchChainChartData', () => ({
	useFetchChainChartData: mocks.useFetchChainChartData
}))

vi.mock('~/hooks/useIsClient', () => ({
	useIsClient: () => true
}))

vi.mock('~/utils/maxAgeForNext', () => ({
	maxAgeForNext: vi.fn(() => 22)
}))

vi.mock('~/utils/perf', () => ({
	withPerformanceLogging: <T extends (...args: Array<unknown>) => unknown>(_name: string, fn: T) => fn
}))

const makeExtraTvlCharts = (
	overrides: Partial<IChainOverviewData['extraTvlCharts']> = {}
): IChainOverviewData['extraTvlCharts'] => ({
	staking: {},
	borrowed: {},
	pool2: {},
	vesting: {},
	offers: {},
	doublecounted: {},
	liquidstaking: {},
	dcAndLsOverlap: {},
	...overrides
})

const createProps = (extraTvlCharts: IChainOverviewData['extraTvlCharts']) =>
	({
		metadata: {
			id: 'test-chain',
			name: 'Test Chain'
		},
		charts: ['TVL'],
		tvlChart: [[1_700_000_000, 100]],
		tvlChartSummary: {
			totalValueUSD: 100,
			tvlPrevDay: 90,
			valueChange24hUSD: 10,
			change24h: 11.11
		},
		extraTvlCharts,
		chainTokenInfo: null
	}) as unknown as IChainOverviewData

describe('chart/chain/[chain]', () => {
	beforeEach(() => {
		mocks.routerState.query = {}
		mocks.routerState.isReady = true
		mocks.useFetchChainChartData.mockReset()
		mocks.useFetchChainChartData.mockReturnValue({
			finalCharts: {},
			valueSymbol: '$',
			isFetchingChartData: false
		})
	})

	it('passes chain overview extra TVL charts through to the chart data hook', () => {
		const extraTvlCharts = makeExtraTvlCharts({
			staking: {
				'1700000000': 12
			}
		})

		renderToStaticMarkup(<ChainChartPage {...createProps(extraTvlCharts)} />)

		expect(mocks.useFetchChainChartData).toHaveBeenCalledWith(
			expect.objectContaining({
				extraTvlCharts
			})
		)
		expect(mocks.useFetchChainChartData.mock.calls[0][0].extraTvlCharts).toBe(extraTvlCharts)
	})

	it('passes empty extra TVL chart buckets through without substituting undefined', () => {
		const extraTvlCharts = makeExtraTvlCharts()

		renderToStaticMarkup(<ChainChartPage {...createProps(extraTvlCharts)} />)

		expect(mocks.useFetchChainChartData.mock.calls[0][0].extraTvlCharts).toBe(extraTvlCharts)
	})

	it('passes fee include query params through to the chart data hook', () => {
		mocks.routerState.query = {
			include_staking_in_tvl: 'yes',
			include_pool2_in_tvl: 'false',
			include_bribes_in_fees: '1',
			include_tokentax_in_fees: 'false'
		}

		renderToStaticMarkup(<ChainChartPage {...createProps(makeExtraTvlCharts())} />)

		expect(mocks.useFetchChainChartData.mock.calls[0][0].tvlSettings).toMatchObject({
			staking: true,
			pool2: false
		})
		expect(mocks.useFetchChainChartData.mock.calls[0][0].feesSettings).toEqual({
			bribes: true,
			tokentax: false
		})
	})
})
