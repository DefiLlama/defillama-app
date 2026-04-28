import { Writable } from 'node:stream'
import { createElement, type ReactElement } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { getOverviewBreakdownRequestState, RWAOverviewBreakdownChart } from './OverviewBreakdownChart'

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

	it('uses the default chart legend and unstacked series', async () => {
		const dataset = {
			source: [{ timestamp: 1, Ethereum: 10, Solana: 5 }],
			dimensions: ['timestamp', 'Ethereum', 'Solana']
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
		expect(lastChartProps?.showTotalInTooltip).toBe(true)
		expect(Array.from(lastChartProps?.selectedCharts ?? [])).toEqual(['Ethereum', 'Solana'])
	})
})
