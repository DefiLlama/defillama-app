import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

const timestampMs = Date.UTC(2024, 0, 1)
const timestampSeconds = timestampMs / 1e3

const mocks = vi.hoisted(() => ({
	feesSettings: {
		bribes: false,
		tokentax: false
	},
	presentationInputs: [] as Array<{
		chartData: MultiSeriesChart2Dataset
		selectedChains: string[]
	}>,
	queryCalls: [] as Array<{ queryKey: unknown[]; enabled?: boolean }>
}))

vi.mock('next/router', () => ({
	useRouter: () => ({
		query: {},
		push: vi.fn()
	})
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => {
		mocks.queryCalls.push({ queryKey: options.queryKey, enabled: options.enabled })

		const metric = options.queryKey.at(-1)
		if (options.enabled && metric === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE) {
			return {
				data: [[timestampSeconds, { Base: 20, Ethereum: 5 }]],
				error: null,
				isLoading: false
			}
		}
		if (options.enabled && metric === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
			return {
				data: [[timestampSeconds, { Base: 3, Ignored: 100 }]],
				error: null,
				isLoading: false
			}
		}

		return { data: undefined, error: null, isLoading: false }
	}
}))

vi.mock('~/contexts/LocalStorage', () => ({
	useLocalStorageSettingsManager: () => [mocks.feesSettings]
}))

vi.mock('~/components/ButtonStyled/ChartExportButtons', () => ({
	ChartExportButtons: () => null
}))

vi.mock('~/components/ButtonStyled/ChartRestoreButton', () => ({
	ChartRestoreButton: () => null
}))

vi.mock('~/components/ECharts/ChartGroupingSelector', () => ({
	ChartGroupingSelector: () => null,
	DWMC_GROUPING_OPTIONS_LOWERCASE: [{ label: 'Daily', value: 'daily' }]
}))

vi.mock('~/components/ECharts/HBarChart', () => ({
	default: () => null
}))

vi.mock('~/components/ECharts/MultiSeriesChart2', () => ({
	default: () => null
}))

vi.mock('~/components/ECharts/TreeMapBuilderChart', () => ({
	default: () => null
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => null
}))

vi.mock('~/components/Select/Select', () => ({
	Select: () => null
}))

vi.mock('~/components/Select/SelectWithCombobox', () => ({
	SelectWithCombobox: () => null
}))

vi.mock('~/hooks/useGetChartInstance', () => ({
	useGetChartInstance: () => ({
		chartInstance: null,
		handleChartReady: () => {}
	})
}))

vi.mock('../utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../utils')>()

	return {
		...actual,
		buildChainsByAdapterChartPresentation: (input: {
			chartData: MultiSeriesChart2Dataset
			selectedChains: string[]
		}) => {
			mocks.presentationInputs.push({
				chartData: input.chartData,
				selectedChains: input.selectedChains
			})

			return {
				kind: 'bar',
				dataset: input.chartData,
				charts: [],
				valueMode: 'absolute',
				barLayout: 'stacked',
				showTotalInTooltip: true,
				groupBy: 'daily'
			}
		}
	}
})

import { ChainsByAdapterChart } from '../ChainChart'

const baseChartData: MultiSeriesChart2Dataset = {
	dimensions: ['timestamp', 'Base', 'Ethereum'],
	source: [{ timestamp: timestampMs, Base: 100, Ethereum: 50 }]
}

function renderChart({
	adapterType,
	dataType,
	chartName
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	chartName: string
}) {
	renderToStaticMarkup(
		<ChainsByAdapterChart
			adapterType={adapterType}
			dataType={dataType}
			chartData={baseChartData}
			allChains={['Base', 'Ethereum']}
			chartName={chartName}
		/>
	)

	expect(mocks.presentationInputs).toHaveLength(1)
	return mocks.presentationInputs[0].chartData
}

describe('ChainsByAdapterChart fee extras', () => {
	beforeEach(() => {
		mocks.feesSettings.bribes = false
		mocks.feesSettings.tokentax = false
		mocks.presentationInputs = []
		mocks.queryCalls = []
	})

	it('merges enabled bribes and token tax into holders revenue chain chart data', () => {
		mocks.feesSettings.bribes = true
		mocks.feesSettings.tokentax = true

		const chartData = renderChart({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE,
			chartName: 'Holders Revenue'
		})

		expect(chartData).toEqual({
			dimensions: ['timestamp', 'Base', 'Ethereum'],
			source: [{ timestamp: timestampMs, Base: 123, Ethereum: 55 }]
		})
		expect(
			mocks.queryCalls
				.filter((call) => call.queryKey[0] === 'adapter-chain-breakdown-chart')
				.map((call) => ({ metric: call.queryKey.at(-1), enabled: call.enabled }))
		).toEqual([
			{ metric: ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE, enabled: true },
			{ metric: ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES, enabled: true }
		])
	})

	it('does not merge fee extras into app fee chain chart data', () => {
		mocks.feesSettings.bribes = true
		mocks.feesSettings.tokentax = true

		const chartData = renderChart({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES,
			chartName: 'App Fees'
		})

		expect(chartData).toBe(baseChartData)
		expect(
			mocks.queryCalls
				.filter((call) => call.queryKey[0] === 'adapter-chain-breakdown-chart')
				.map((call) => ({ metric: call.queryKey.at(-1), enabled: call.enabled }))
		).toEqual([
			{ metric: ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE, enabled: false },
			{ metric: ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES, enabled: false }
		])
	})

	it('does not merge fee extras into non-fee adapter chain chart data', () => {
		mocks.feesSettings.bribes = true
		mocks.feesSettings.tokentax = true

		const chartData = renderChart({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chartName: 'DEX Volume'
		})

		expect(chartData).toBe(baseChartData)
		expect(
			mocks.queryCalls
				.filter((call) => call.queryKey[0] === 'adapter-chain-breakdown-chart')
				.map((call) => ({ metric: call.queryKey.at(-1), enabled: call.enabled }))
		).toEqual([
			{ metric: ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE, enabled: false },
			{ metric: ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES, enabled: false }
		])
	})
})
