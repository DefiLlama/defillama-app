import { describe, expect, it } from 'vitest'
import {
	buildChainsByAdapterChartPresentation,
	normalizeChainsByAdapterChartState,
	type ChainsByAdapterChartState
} from './utils'

const toMs = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day)

const baseChartData = {
	dimensions: ['timestamp', 'Ethereum', 'Solana', 'Base'],
	source: [
		{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 0, Base: 0 },
		{ timestamp: toMs(2024, 1, 2), Ethereum: 10, Solana: 20, Base: 0 },
		{ timestamp: toMs(2024, 1, 3), Ethereum: 10, Solana: 0, Base: 30 }
	]
}

const baseChainRows = [
	{ name: 'Ethereum', logo: '', total24h: 40, total7d: null, total30d: null },
	{ name: 'Solana', logo: '', total24h: 0, total7d: null, total30d: null },
	{ name: 'Base', logo: '', total24h: 60, total7d: null, total30d: null }
]

describe('normalizeChainsByAdapterChartState', () => {
	it('returns the default bar state when no query params are present', () => {
		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: undefined,
				valueModeParam: undefined,
				barLayoutParam: undefined,
				groupByParam: undefined,
				legacyChartTypeParam: undefined
			})
		).toEqual({
			chartKind: 'bar',
			valueMode: 'absolute',
			barLayout: 'stacked',
			groupBy: 'daily'
		})
	})

	it('maps legacy dominance and cumulative URLs to line mode', () => {
		expect(
			normalizeChainsByAdapterChartState({
				legacyChartTypeParam: 'dominance'
			})
		).toEqual({ chartKind: 'line', groupBy: 'daily' })

		expect(
			normalizeChainsByAdapterChartState({
				groupByParam: 'cumulative'
			})
		).toEqual({ chartKind: 'line', groupBy: 'daily' })
	})

	it('ignores bar-only params for treemap and line modes', () => {
		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'treemap',
				valueModeParam: 'relative',
				barLayoutParam: 'separate',
				groupByParam: 'monthly'
			})
		).toEqual({ chartKind: 'treemap' })

		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'line',
				valueModeParam: 'absolute',
				barLayoutParam: 'separate',
				groupByParam: 'yearly'
			})
		).toEqual({ chartKind: 'line', groupBy: 'yearly' })
	})
})

describe('buildChainsByAdapterChartPresentation', () => {
	it('builds absolute stacked bars with totals enabled', () => {
		const state: ChainsByAdapterChartState = {
			chartKind: 'bar',
			valueMode: 'absolute',
			barLayout: 'stacked',
			groupBy: 'daily'
		}

		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state,
			latestChainRows: baseChainRows
		})

		expect(presentation.kind).toBe('bar')
		if (presentation.kind !== 'bar') return

		expect(presentation.showTotalInTooltip).toBe(true)
		expect(presentation.valueMode).toBe('absolute')
		expect(presentation.barLayout).toBe('stacked')
		expect(presentation.groupBy).toBe('daily')
		expect(presentation.charts.every((chart) => chart.stack === 'chain')).toBe(true)
		expect(presentation.dataset.source).toEqual([
			{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 0 },
			{ timestamp: toMs(2024, 1, 2), Ethereum: 10, Solana: 20 },
			{ timestamp: toMs(2024, 1, 3), Ethereum: 10, Solana: 0 }
		])
	})

	it('builds relative separate bars that sum to 100 per timestamp', () => {
		const state: ChainsByAdapterChartState = {
			chartKind: 'bar',
			valueMode: 'relative',
			barLayout: 'separate',
			groupBy: 'daily'
		}

		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state,
			latestChainRows: baseChainRows
		})

		expect(presentation.kind).toBe('bar')
		if (presentation.kind !== 'bar') return

		expect(presentation.showTotalInTooltip).toBe(false)
		expect(presentation.valueMode).toBe('relative')
		expect(presentation.barLayout).toBe('separate')
		expect(presentation.charts.every((chart) => chart.stack == null)).toBe(true)

		const [day1, day2, day3] = presentation.dataset.source
		expect(day1.Ethereum).toBe(100)
		expect(day1.Solana).toBe(0)
		expect(day2.Ethereum).toBeCloseTo(33.3333333333)
		expect(day2.Solana).toBeCloseTo(66.6666666667)
		expect(day3.Ethereum).toBe(100)
		expect(day3.Solana).toBe(0)
	})

	it('builds grouped relative lines normalized to share', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'line', groupBy: 'weekly' },
			latestChainRows: baseChainRows
		})

		expect(presentation.kind).toBe('line')
		if (presentation.kind !== 'line') return

		expect(presentation.groupBy).toBe('weekly')
		expect(presentation.charts.every((chart) => chart.type === 'line' && chart.hideAreaStyle == null)).toBe(true)

		const [week1] = presentation.dataset.source
		expect(week1.Ethereum).toBeCloseTo(60)
		expect(week1.Solana).toBeCloseTo(40)
	})

	it('builds treemap data from the latest timestamp using all selected chains', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana', 'Base'],
			state: { chartKind: 'treemap' },
			latestChainRows: baseChainRows
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Base', 'Ethereum'])
		expect(presentation.data[0].value).toBe(60)
		expect(presentation.data[0].share).toBe(60)
		expect(presentation.data[1].value).toBe(40)
		expect(presentation.data[1].share).toBe(40)
	})
})
