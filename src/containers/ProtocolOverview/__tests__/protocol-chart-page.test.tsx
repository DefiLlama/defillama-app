import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtocolChartPage from '~/pages/chart/protocol/[protocol]'

const mocks = vi.hoisted(() => ({
	routerState: {
		query: {} as Record<string, string | string[]>
	},
	useFetchProtocolChartData: vi.fn()
}))

vi.mock('next/router', () => ({
	useRouter: () => mocks.routerState
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => null
}))

vi.mock('~/containers/ProtocolOverview/Chart', () => ({
	default: () => null
}))

vi.mock('~/containers/ProtocolOverview/queries', () => ({
	getProtocolOverviewPageData: vi.fn()
}))

vi.mock('~/containers/ProtocolOverview/useFetchProtocolChartData', () => ({
	useFetchProtocolChartData: mocks.useFetchProtocolChartData
}))

vi.mock('~/utils/maxAgeForNext', () => ({
	maxAgeForNext: vi.fn(() => 22)
}))

vi.mock('~/utils/perf', () => ({
	withPerformanceLogging: <T extends (...args: Array<unknown>) => unknown>(_name: string, fn: T) => fn
}))

const createProps = () =>
	({
		name: 'Test Protocol',
		defaultToggledCharts: [],
		availableCharts: [],
		chartColors: {},
		hallmarks: null,
		token: { symbol: 'TEST' }
	}) as Parameters<typeof ProtocolChartPage>[0]

describe('chart/protocol/[protocol]', () => {
	beforeEach(() => {
		mocks.routerState.query = {}
		mocks.useFetchProtocolChartData.mockReset()
		mocks.useFetchProtocolChartData.mockReturnValue({
			finalCharts: {},
			valueSymbol: '$',
			loadingCharts: ''
		})
	})

	it('parses fee include query params as strict booleans', () => {
		mocks.routerState.query = {
			include_bribes_in_fees: 'false',
			include_tokentax_in_fees: 'true'
		}

		renderToStaticMarkup(<ProtocolChartPage {...createProps()} />)

		expect(mocks.useFetchProtocolChartData.mock.calls[0][0].feesSettings).toEqual({
			bribes: false,
			tokentax: true
		})
	})
})
