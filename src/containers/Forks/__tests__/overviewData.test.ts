import { describe, expect, it } from 'vitest'
import { CHART_COLORS } from '~/constants/colors'
import { buildForksOverviewDisplayData, mergeForkOverviewChartData } from '../overviewData'
import type { ForkOverviewPageData } from '../types'

const basePageData = {
	forks: ['Uniswap', 'Curve'],
	forkColors: { Uniswap: '#111111', Curve: '#222222' },
	baseTableData: [
		{ name: 'Uniswap', tvl: 80, forkedProtocols: 3, parentTvl: 1_000, ftot: 8 },
		{ name: 'Curve', tvl: 120, forkedProtocols: 2, parentTvl: 400, ftot: 30 }
	],
	chartData: [
		{ timestamp: 10, Uniswap: 100, Curve: 50, EmptyFork: 0 },
		{ timestamp: 20, Uniswap: 80, Curve: 120, NewFork: 30 }
	]
} satisfies Pick<ForkOverviewPageData, 'forks' | 'forkColors'> & {
	baseTableData: ForkOverviewPageData['tableData']
	chartData: ForkOverviewPageData['chartData']
}

describe('mergeForkOverviewChartData', () => {
	it('returns base chart data while extra series are disabled or loading', () => {
		const extraBreakdownByTimestamp = new Map([[20, { Uniswap: 5 }]])

		expect(
			mergeForkOverviewChartData({
				chartData: basePageData.chartData,
				extraBreakdownByTimestamp,
				shouldApplyExtraSeries: false
			})
		).toBe(basePageData.chartData)
	})

	it('merges extra values by timestamp and keeps extra-only timestamps sorted', () => {
		const merged = mergeForkOverviewChartData({
			chartData: basePageData.chartData,
			extraBreakdownByTimestamp: new Map([
				[20, { Uniswap: 5, Curve: 10 }],
				[15, { ExtraOnly: 7 }]
			]),
			shouldApplyExtraSeries: true
		})

		expect(merged).toEqual([
			{ timestamp: 10, Uniswap: 100, Curve: 50, EmptyFork: 0 },
			{ timestamp: 15, ExtraOnly: 7 },
			{ timestamp: 20, Uniswap: 85, Curve: 130, NewFork: 30 }
		])
		expect(basePageData.chartData[1].Uniswap).toBe(80)
	})
})

describe('buildForksOverviewDisplayData', () => {
	it('builds table, pie, colors, and dominance data from latest chart values', () => {
		const display = buildForksOverviewDisplayData(basePageData)

		expect(display.tableData).toEqual([
			{ name: 'Curve', forkedProtocols: 2, parentTvl: 400, tvl: 120, ftot: 30 },
			{ name: 'Uniswap', forkedProtocols: 3, parentTvl: 1_000, tvl: 80, ftot: 8 },
			{ name: 'NewFork', forkedProtocols: 0, parentTvl: null, tvl: 30, ftot: null },
			{ name: 'EmptyFork', forkedProtocols: 0, parentTvl: null, tvl: 0, ftot: null }
		])

		expect(display.tokenTvls).toEqual([
			{ name: 'Curve', value: 120 },
			{ name: 'Uniswap', value: 80 },
			{ name: 'NewFork', value: 30 }
		])

		expect(display.chartColors).toMatchObject({
			Uniswap: '#111111',
			Curve: '#222222',
			NewFork: CHART_COLORS[2],
			EmptyFork: CHART_COLORS[3]
		})

		expect(display.dominanceDataset.dimensions).toEqual(['timestamp', 'Curve', 'Uniswap', 'NewFork', 'EmptyFork'])
		expect(display.dominanceDataset.source[0]).toEqual({
			timestamp: 10_000,
			Uniswap: (100 / 150) * 100,
			Curve: (50 / 150) * 100
		})
		expect(display.dominanceDataset.source[1]).toEqual({
			timestamp: 20_000,
			Curve: (120 / 230) * 100,
			Uniswap: (80 / 230) * 100,
			NewFork: (30 / 230) * 100
		})
		expect(display.dominanceCharts.map((chart) => chart.name)).toEqual(['Curve', 'Uniswap', 'NewFork', 'EmptyFork'])
	})

	it('keeps fork rows with zero tvl when base chart data is empty', () => {
		const display = buildForksOverviewDisplayData({
			...basePageData,
			chartData: []
		})

		expect(display.tableData).toEqual([
			{ name: 'Uniswap', forkedProtocols: 3, parentTvl: 1_000, tvl: 0, ftot: 0 },
			{ name: 'Curve', forkedProtocols: 2, parentTvl: 400, tvl: 0, ftot: 0 }
		])
		expect(display.tokenTvls).toEqual([])
		expect(display.dominanceDataset).toEqual({
			source: [],
			dimensions: ['timestamp', 'Uniswap', 'Curve']
		})
	})
})
