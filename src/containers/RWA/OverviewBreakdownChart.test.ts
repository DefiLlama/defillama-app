import { Writable } from 'node:stream'
import { createElement, type ReactElement } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import {
	buildOverviewBreakdownChartSeries,
	getOverviewBreakdownChartDatasetForSelectedStacks,
	getOverviewBreakdownRequestState,
	RWAOverviewBreakdownChart
} from './OverviewBreakdownChart'

let routerQuery: Record<string, string | string[]> = {}
let queryState: { data: any; isLoading: boolean; error: any } = {
	data: null,
	isLoading: false,
	error: null
}
let lastChartProps: IMultiSeriesChart2Props | null = null

vi.mock('next/router', () => ({
	useRouter: () => ({ query: routerQuery })
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => queryState
}))

vi.mock('~/components/ButtonStyled/ChartExportButtons', () => ({
	ChartExportButtons: () => null
}))

vi.mock('~/components/ECharts/MultiSeriesChart2', () => ({
	default: (props: IMultiSeriesChart2Props) => {
		lastChartProps = props
		return null
	}
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

function renderAll(element: ReactElement) {
	return new Promise<void>((resolve, reject) => {
		let settled = false
		const out = new Writable({
			write(_chunk, _encoding, callback) {
				callback()
			}
		})
		const stream = renderToPipeableStream(element, {
			onAllReady() {
				stream.pipe(out)
			},
			onError(error) {
				if (!settled) {
					settled = true
					reject(error)
				}
			}
		})

		out.on('finish', () => {
			if (!settled) {
				settled = true
				resolve()
			}
		})
	})
}

beforeEach(() => {
	routerQuery = {}
	queryState = { data: null, isLoading: false, error: null }
	lastChartProps = null
})

describe('getOverviewBreakdownRequestState', () => {
	it('uses the platform default state when there are no query params', () => {
		expect(getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'platform',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})
	})

	it('reads both inclusion flags for platforms', () => {
		expect(
			getOverviewBreakdownRequestState({ kind: 'platform' }, 'activeMcap', {
				includeStablecoins: 'true',
				includeGovernance: 'true'
			})
		).toEqual({
			request: {
				breakdown: 'platform',
				key: 'activeMcap',
				includeStablecoin: true,
				includeGovernance: true
			},
			isDefaultState: false
		})
	})

	it('uses the same default state for categories and asset groups', () => {
		expect(getOverviewBreakdownRequestState({ kind: 'category' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'category',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})

		expect(getOverviewBreakdownRequestState({ kind: 'assetGroup' }, 'activeMcap', {})).toEqual({
			request: {
				breakdown: 'assetGroup',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			},
			isDefaultState: true
		})
	})

	it('renders supplied total series with requested aggregate breakdown charts', async () => {
		const dataset = {
			source: [{ timestamp: 1, 'Total Active Mcap': 15, Ethereum: 10, Solana: 5 }],
			dimensions: ['timestamp', 'Total Active Mcap', 'Ethereum', 'Solana']
		}

		await renderAll(
			createElement(RWAOverviewBreakdownChart, {
				page: { kind: 'chain' },
				initialChartDataset: dataset,
				stackLabel: 'Chains'
			})
		)

		expect(lastChartProps?.dataset).toBe(dataset)
		expect(lastChartProps?.hideDefaultLegend).toBe(false)
		expect(lastChartProps?.stacked).toBeUndefined()
		expect(lastChartProps?.showTotalInTooltip).toBe(false)
		expect(Array.from(lastChartProps?.selectedCharts ?? [])).toEqual(['Total Active Mcap', 'Ethereum', 'Solana'])
		expect(lastChartProps?.charts?.[0]).toMatchObject({
			name: 'Total Active Mcap',
			hideAreaStyle: true,
			excludeFromTooltipTotal: true
		})
	})

	it('leaves category breakdown charts unchanged', async () => {
		const dataset = {
			source: [{ timestamp: 1, Treasuries: 10, Credit: 5 }],
			dimensions: ['timestamp', 'Treasuries', 'Credit']
		}

		await renderAll(
			createElement(RWAOverviewBreakdownChart, {
				page: { kind: 'category' },
				initialChartDataset: dataset,
				stackLabel: 'Categories'
			})
		)

		expect(lastChartProps?.dataset).toBe(dataset)
		expect(Array.from(lastChartProps?.selectedCharts ?? [])).toEqual(['Treasuries', 'Credit'])
	})

	it('slices selected stack charts to the first non-null selected value', async () => {
		routerQuery = { stacks: 'PreStocks' }
		const dataset = {
			source: [
				{ timestamp: 1, 'Total Active Mcap': 10, PreStocks: null, Securitize: 10 },
				{ timestamp: 2, 'Total Active Mcap': 11, PreStocks: null, Securitize: 11 },
				{ timestamp: 3, 'Total Active Mcap': 23, PreStocks: 12, Securitize: 11 },
				{ timestamp: 4, 'Total Active Mcap': 11, PreStocks: 0, Securitize: 11 }
			],
			dimensions: ['timestamp', 'Total Active Mcap', 'PreStocks', 'Securitize']
		}

		await renderAll(
			createElement(RWAOverviewBreakdownChart, {
				page: { kind: 'platform' },
				initialChartDataset: dataset,
				stackLabel: 'Platforms'
			})
		)

		expect(lastChartProps?.dataset.source).toEqual([
			{ timestamp: 3, 'Total Active Mcap': 23, PreStocks: 12, Securitize: 11 },
			{ timestamp: 4, 'Total Active Mcap': 11, PreStocks: 0, Securitize: 11 }
		])
		expect(Array.from(lastChartProps?.selectedCharts ?? [])).toEqual(['PreStocks'])
	})
})

describe('getOverviewBreakdownChartDatasetForSelectedStacks', () => {
	const dataset = {
		source: [
			{ timestamp: 1, PreStocks: null, Securitize: 10 },
			{ timestamp: 2, PreStocks: 12, Securitize: 11 },
			{ timestamp: 3, PreStocks: 0, Securitize: 12 }
		],
		dimensions: ['timestamp', 'PreStocks', 'Securitize']
	}

	it('keeps the full dataset when all stacks are selected', () => {
		expect(
			getOverviewBreakdownChartDatasetForSelectedStacks(
				dataset,
				['PreStocks', 'Securitize'],
				['PreStocks', 'Securitize']
			)
		).toBe(dataset)
	})

	it('preserves zero values after the selected stack starts', () => {
		expect(
			getOverviewBreakdownChartDatasetForSelectedStacks(dataset, ['PreStocks'], ['PreStocks', 'Securitize']).source
		).toEqual([
			{ timestamp: 2, PreStocks: 12, Securitize: 11 },
			{ timestamp: 3, PreStocks: 0, Securitize: 12 }
		])
	})
})

describe('buildOverviewBreakdownChartSeries', () => {
	it('uses total-series styling without excluding normal series', () => {
		expect(buildOverviewBreakdownChartSeries(['timestamp', 'Total Active Mcap', 'Ethereum'])).toEqual([
			expect.objectContaining({
				name: 'Total Active Mcap',
				hideAreaStyle: true,
				excludeFromTooltipTotal: true
			}),
			expect.objectContaining({
				name: 'Ethereum'
			})
		])
	})
})
