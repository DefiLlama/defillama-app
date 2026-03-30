import { describe, expect, it } from 'vitest'
import type { IProtocol } from './types'
import {
	buildAdapterByChainBreakdownPresentation,
	buildAdapterByChainLatestValuePresentation,
	buildChainsByAdapterChartPresentation,
	getCategoryProtocolNameFilterForChart,
	leafProtocolNamesFromTableRows,
	mergeBreakdownCharts,
	mergeNamedDimensionChartDataset,
	mergeSingleDimensionChartDataset,
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

const nonMidnightDailyChartData = {
	dimensions: ['timestamp', 'Ethereum', 'Solana'],
	source: [
		{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 20 },
		{ timestamp: toMs(2024, 1, 2) + 12 * 60 * 60 * 1000, Ethereum: 30, Solana: 40 }
	]
}

const shortGapDailyChartData = {
	dimensions: ['timestamp', 'Ethereum', 'Solana'],
	source: [
		{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 20 },
		{ timestamp: toMs(2024, 1, 1) + 22 * 60 * 60 * 1000, Ethereum: 30, Solana: 40 }
	]
}

const singlePointDailyChartData = {
	dimensions: ['timestamp', 'Ethereum', 'Solana'],
	source: [{ timestamp: toMs(2024, 1, 1) + 12 * 60 * 60 * 1000, Ethereum: 30, Solana: 40 }]
}

const sparseChartData = {
	dimensions: ['timestamp', 'Ethereum', 'Solana'],
	source: [
		{ timestamp: toMs(2024, 1, 1), Ethereum: 10 },
		{ timestamp: toMs(2024, 1, 2), Ethereum: 10, Solana: 20 }
	]
}

const adapterBreakdownChartData = {
	dimensions: ['timestamp', 'Hyperliquid Perps', 'dYdX', 'GMX'],
	source: [
		{ timestamp: toMs(2024, 1, 1), 'Hyperliquid Perps': 10, dYdX: 20, GMX: 0 },
		{ timestamp: toMs(2024, 1, 2), 'Hyperliquid Perps': 20, dYdX: 10, GMX: 10 },
		{ timestamp: toMs(2024, 1, 3), 'Hyperliquid Perps': 30, dYdX: 0, GMX: 10 }
	]
}

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

	it('maps legacy dominance URLs to line mode and preserves cumulative grouping', () => {
		expect(
			normalizeChainsByAdapterChartState({
				legacyChartTypeParam: 'dominance'
			})
		).toEqual({ chartKind: 'line', groupBy: 'daily' })

		expect(
			normalizeChainsByAdapterChartState({
				groupByParam: 'cumulative'
			})
		).toEqual({
			chartKind: 'bar',
			valueMode: 'absolute',
			barLayout: 'stacked',
			groupBy: 'cumulative'
		})

		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'line',
				groupByParam: 'cumulative'
			})
		).toEqual({ chartKind: 'line', groupBy: 'cumulative' })
	})

	it('ignores bar-only params for treemap and line modes', () => {
		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'treemap',
				valueModeParam: 'relative',
				barLayoutParam: 'separate',
				groupByParam: 'monthly'
			})
		).toEqual({ chartKind: 'treemap', groupBy: 'monthly' })

		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'line',
				valueModeParam: 'absolute',
				barLayoutParam: 'separate',
				groupByParam: 'yearly'
			})
		).toEqual({ chartKind: 'line', groupBy: 'yearly' })

		expect(
			normalizeChainsByAdapterChartState({
				chartKindParam: 'hbar',
				valueModeParam: 'relative',
				barLayoutParam: 'separate',
				groupByParam: 'monthly'
			})
		).toEqual({ chartKind: 'hbar', groupBy: 'monthly' })
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
			state
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
			state
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

	it('keeps missing chain values null so tooltips do not show fake zeroes', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: sparseChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: {
				chartKind: 'bar',
				valueMode: 'absolute',
				barLayout: 'stacked',
				groupBy: 'daily'
			}
		})

		expect(presentation.kind).toBe('bar')
		if (presentation.kind !== 'bar') return

		expect(presentation.dataset.source).toEqual([
			{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: null },
			{ timestamp: toMs(2024, 1, 2), Ethereum: 10, Solana: 20 }
		])
	})

	it('builds grouped relative lines normalized to share', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'line', groupBy: 'weekly' }
		})

		expect(presentation.kind).toBe('line')
		if (presentation.kind !== 'line') return

		expect(presentation.groupBy).toBe('weekly')
		expect(presentation.charts.every((chart) => chart.type === 'line' && chart.hideAreaStyle == null)).toBe(true)

		const [week1] = presentation.dataset.source
		expect(week1.Ethereum).toBeCloseTo(60)
		expect(week1.Solana).toBeCloseTo(40)
	})

	it('builds treemap data from the last complete daily chart timestamp', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana', 'Base'],
			state: { chartKind: 'treemap', groupBy: 'daily' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Base', 'Ethereum'])
		expect(presentation.data[0].value).toBe(30)
		expect(presentation.data[0].share).toBe(75)
		expect(presentation.data[1].value).toBe(10)
		expect(presentation.data[1].share).toBe(25)
	})

	it('falls back to the previous daily timestamp when the latest point is not at UTC midnight', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: nonMidnightDailyChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'hbar', groupBy: 'daily' }
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Solana', 'Ethereum'])
		expect(presentation.data[0].value).toBe(20)
		expect(presentation.data[1].value).toBe(10)
	})

	it('falls back to the previous daily timestamp when the latest gap is less than 23 hours', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: shortGapDailyChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'treemap', groupBy: 'daily' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Solana', 'Ethereum'])
		expect(presentation.data[0].value).toBe(20)
		expect(presentation.data[1].value).toBe(10)
	})

	it('uses the last available daily timestamp when there is only one point', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: singlePointDailyChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'hbar', groupBy: 'daily' }
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Solana', 'Ethereum'])
		expect(presentation.data[0].value).toBe(40)
		expect(presentation.data[1].value).toBe(30)
	})

	it('builds hbar data from the latest-value ranking and groups overflow into Others', () => {
		const extendedChainChartData = {
			dimensions: ['timestamp', ...Array.from({ length: 11 }, (_, index) => `Chain ${index + 1}`)],
			source: [
				{
					timestamp: toMs(2024, 1, 1),
					'Chain 1': 100,
					'Chain 2': 90,
					'Chain 3': 80,
					'Chain 4': 70,
					'Chain 5': 60,
					'Chain 6': 50,
					'Chain 7': 40,
					'Chain 8': 30,
					'Chain 9': 20,
					'Chain 10': 10,
					'Chain 11': 5
				}
			]
		}
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: extendedChainChartData,
			selectedChains: Array.from({ length: 11 }, (_, index) => `Chain ${index + 1}`),
			state: { chartKind: 'hbar', groupBy: 'daily' }
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data.map((item) => item.name)).toEqual([
			'Chain 1',
			'Chain 2',
			'Chain 3',
			'Chain 4',
			'Chain 5',
			'Chain 6',
			'Chain 7',
			'Chain 8',
			'Chain 9',
			'Others'
		])
		expect(presentation.data[0].value).toBe(100)
		expect(presentation.data[8].value).toBe(20)
		expect(presentation.data[9].value).toBe(15)
		expect(presentation.data[9].share).toBeCloseTo((15 / 555) * 100)
	})

	it('builds treemap from rolling weekly sums (last 7 days from latest row)', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana', 'Base'],
			state: { chartKind: 'treemap', groupBy: 'weekly' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Ethereum', 'Base', 'Solana'])
		expect(presentation.data[0].value).toBe(30)
		expect(presentation.data[1].value).toBe(30)
		expect(presentation.data[2].value).toBe(20)
	})

	it('builds cumulative latest-value treemap data from running totals', () => {
		const presentation = buildChainsByAdapterChartPresentation({
			chartData: baseChartData,
			selectedChains: ['Ethereum', 'Solana', 'Base'],
			state: { chartKind: 'treemap', groupBy: 'cumulative' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Ethereum', 'Base', 'Solana'])
		expect(presentation.data[0].value).toBe(30)
		expect(presentation.data[1].value).toBe(30)
		expect(presentation.data[2].value).toBe(20)
	})

	it('sums rolling-window values for line-backed latest-value charts (weekly = last 7 days)', () => {
		const lineBackedChartData = {
			dimensions: ['timestamp', 'Hyperliquid', 'dYdX'],
			source: [
				{ timestamp: toMs(2024, 1, 1), Hyperliquid: 10, dYdX: 5 },
				{ timestamp: toMs(2024, 1, 2), Hyperliquid: 20, dYdX: 15 },
				{ timestamp: toMs(2024, 1, 3), Hyperliquid: 15, dYdX: 25 }
			]
		}

		const presentation = buildAdapterByChainLatestValuePresentation({
			chartKind: 'hbar',
			selectedProtocols: ['Hyperliquid', 'dYdX'],
			groupBy: 'weekly',
			chartData: lineBackedChartData,
			seriesType: 'line'
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data).toHaveLength(2)
		expect(presentation.data.map((item) => item.name).toSorted()).toEqual(['Hyperliquid', 'dYdX'])
		expect(presentation.data.every((item) => item.value === 45)).toBe(true)
	})

	it('excludes protocols with no data in the yearly rolling window from treemap', () => {
		const latest = toMs(2026, 3, 15)
		const olderThanOneYear = latest - 400 * 24 * 60 * 60 * 1000
		const yearlyStoppedProtocolChartData = {
			dimensions: ['timestamp', 'Active', 'StoppedLongAgo'],
			source: [
				{ timestamp: olderThanOneYear, Active: 1, StoppedLongAgo: 999 },
				{ timestamp: latest, Active: 100 }
			]
		}

		const presentation = buildChainsByAdapterChartPresentation({
			chartData: yearlyStoppedProtocolChartData,
			selectedChains: ['Active', 'StoppedLongAgo'],
			state: { chartKind: 'treemap', groupBy: 'yearly' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Active'])
		expect(presentation.data[0].value).toBe(100)
	})

	it('sums only points inside the yearly rolling window for treemap', () => {
		const t0 = toMs(2025, 1, 1)
		const t1 = toMs(2025, 6, 1)
		const t2 = toMs(2026, 3, 1)
		const yearlyRollingChartData = {
			dimensions: ['timestamp', 'Ethereum', 'Solana'],
			source: [
				{ timestamp: t0, Ethereum: 10, Solana: 5 },
				{ timestamp: t1, Ethereum: 20, Solana: 10 },
				{ timestamp: t2, Ethereum: 30, Solana: 15 }
			]
		}

		const presentation = buildChainsByAdapterChartPresentation({
			chartData: yearlyRollingChartData,
			selectedChains: ['Ethereum', 'Solana'],
			state: { chartKind: 'treemap', groupBy: 'yearly' }
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		const cutoff = t2 - 365 * 24 * 60 * 60 * 1000
		const ethereumSum = (t0 >= cutoff ? 10 : 0) + (t1 >= cutoff ? 20 : 0) + (t2 >= cutoff ? 30 : 0)
		const solanaSum = (t0 >= cutoff ? 5 : 0) + (t1 >= cutoff ? 10 : 0) + (t2 >= cutoff ? 15 : 0)

		const eth = presentation.data.find((d) => d.name === 'Ethereum')
		const sol = presentation.data.find((d) => d.name === 'Solana')
		expect(eth?.value).toBe(ethereumSum)
		expect(sol?.value).toBe(solanaSum)
	})
})

describe('buildAdapterByChainBreakdownPresentation', () => {
	it('builds relative separate bars from selected protocol breakdown series', () => {
		const presentation = buildAdapterByChainBreakdownPresentation({
			chartData: adapterBreakdownChartData,
			selectedProtocols: ['Hyperliquid Perps', 'dYdX'],
			state: {
				chartKind: 'bar',
				valueMode: 'relative',
				barLayout: 'separate',
				groupBy: 'daily'
			}
		})

		expect(presentation.kind).toBe('bar')
		if (presentation.kind !== 'bar') return

		expect(presentation.charts.every((chart) => chart.stack == null)).toBe(true)
		expect(presentation.dataset.source).toEqual([
			{ timestamp: toMs(2024, 1, 1), 'Hyperliquid Perps': 33.33333333333333, dYdX: 66.66666666666666 },
			{ timestamp: toMs(2024, 1, 2), 'Hyperliquid Perps': 66.66666666666666, dYdX: 33.33333333333333 },
			{ timestamp: toMs(2024, 1, 3), 'Hyperliquid Perps': 100, dYdX: 0 }
		])
	})

	it('ranks visible protocol series by the latest selected window instead of lifetime totals', () => {
		const recentLeaderChartData = {
			dimensions: ['timestamp', ...Array.from({ length: 10 }, (_, index) => `Protocol ${index + 1}`), 'Hyperliquid'],
			source: [
				Object.assign(
					{ timestamp: toMs(2024, 1, 1), Hyperliquid: 0 },
					Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`Protocol ${index + 1}`, 100]))
				),
				Object.assign(
					{ timestamp: toMs(2024, 1, 2), Hyperliquid: 50 },
					Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`Protocol ${index + 1}`, 1]))
				)
			]
		}

		const presentation = buildAdapterByChainBreakdownPresentation({
			chartData: recentLeaderChartData,
			selectedProtocols: ['Hyperliquid', ...Array.from({ length: 10 }, (_, index) => `Protocol ${index + 1}`)],
			state: {
				chartKind: 'bar',
				valueMode: 'absolute',
				barLayout: 'stacked',
				groupBy: 'daily'
			}
		})

		expect(presentation.kind).toBe('bar')
		if (presentation.kind !== 'bar') return

		expect(presentation.charts.map((chart) => chart.name)).toContain('Hyperliquid')
		expect(presentation.charts.map((chart) => chart.name)).toContain('Others')
		expect(presentation.dataset.source.at(-1)?.Hyperliquid).toBe(50)
		expect(presentation.dataset.source.at(-1)?.Others).toBe(1)
	})

	it('ranks cumulative line series by cumulative totals before applying the top-series cap', () => {
		const cumulativeLineChartData = {
			dimensions: ['timestamp', 'History Giant', ...Array.from({ length: 10 }, (_, index) => `Protocol ${index + 1}`)],
			source: [
				Object.assign(
					{ timestamp: toMs(2024, 1, 1), 'History Giant': 100 },
					Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`Protocol ${index + 1}`, 0]))
				),
				Object.assign(
					{ timestamp: toMs(2024, 1, 2), 'History Giant': 1 },
					Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`Protocol ${index + 1}`, 10]))
				)
			]
		}

		const presentation = buildAdapterByChainBreakdownPresentation({
			chartData: cumulativeLineChartData,
			selectedProtocols: ['History Giant', ...Array.from({ length: 10 }, (_, index) => `Protocol ${index + 1}`)],
			state: {
				chartKind: 'line',
				groupBy: 'cumulative'
			}
		})

		expect(presentation.kind).toBe('line')
		if (presentation.kind !== 'line') return

		expect(presentation.charts.map((chart) => chart.name)).toContain('History Giant')
		expect(presentation.charts.map((chart) => chart.name)).toContain('Others')
		expect(presentation.dataset.source.at(-1)?.['History Giant']).toBeCloseTo((101 / 191) * 100)
		expect(presentation.dataset.source.at(-1)?.Others).toBeCloseTo((10 / 191) * 100)
	})
})

describe('buildAdapterByChainLatestValuePresentation', () => {
	it('uses the last complete daily chart timestamp', () => {
		const chartData = {
			dimensions: ['timestamp', 'Hyperliquid', 'dYdX', 'GMX'],
			source: [
				{ timestamp: toMs(2024, 1, 1), Hyperliquid: 20, dYdX: 10, GMX: 0 },
				{ timestamp: toMs(2024, 1, 2), Hyperliquid: 70, dYdX: 30, GMX: 10 }
			]
		}

		const presentation = buildAdapterByChainLatestValuePresentation({
			chartKind: 'treemap',
			selectedProtocols: ['Hyperliquid', 'dYdX'],
			groupBy: 'daily',
			chartData
		})

		expect(presentation.kind).toBe('treemap')
		if (presentation.kind !== 'treemap') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Hyperliquid', 'dYdX'])
		expect(presentation.data[0].value).toBe(70)
		expect(presentation.data[1].value).toBe(30)
	})

	it('returns no rows when selected protocols are missing from the chosen daily timestamp', () => {
		const chartData = {
			dimensions: ['timestamp', 'Hyperliquid', 'dYdX'],
			source: [{ timestamp: toMs(2024, 1, 2), Hyperliquid: 70, dYdX: 30 }]
		}

		const presentation = buildAdapterByChainLatestValuePresentation({
			chartKind: 'hbar',
			selectedProtocols: [],
			groupBy: 'daily',
			chartData
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data).toEqual([])
	})

	it('builds hbar data from selected protocols and groups overflow into Others', () => {
		const manyProtocolChartData = {
			dimensions: ['timestamp', ...Array.from({ length: 11 }, (_, index) => `Protocol ${index + 1}`)],
			source: [
				Object.assign(
					{ timestamp: toMs(2024, 1, 2) },
					Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`Protocol ${index + 1}`, 110 - index * 10]))
				)
			]
		}

		const presentation = buildAdapterByChainLatestValuePresentation({
			chartKind: 'hbar',
			selectedProtocols: Array.from({ length: 11 }, (_, index) => `Protocol ${index + 1}`),
			groupBy: 'daily',
			chartData: manyProtocolChartData
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data.at(-1)?.name).toBe('Others')
		expect(presentation.data.at(-1)?.value).toBe(30)
	})

	it('uses the selected daily chart protocols directly', () => {
		const chartData = {
			dimensions: ['timestamp', 'Hyperliquid', 'dYdX', 'GMX'],
			source: [{ timestamp: toMs(2024, 1, 2), Hyperliquid: 70, dYdX: 30, GMX: 10 }]
		}

		const presentation = buildAdapterByChainLatestValuePresentation({
			chartKind: 'hbar',
			selectedProtocols: ['Hyperliquid', 'dYdX', 'GMX'],
			groupBy: 'daily',
			chartData
		})

		expect(presentation.kind).toBe('hbar')
		if (presentation.kind !== 'hbar') return

		expect(presentation.data.map((item) => item.name)).toEqual(['Hyperliquid', 'dYdX', 'GMX'])
		expect(presentation.data[0].value).toBe(70)
		expect(presentation.data[1].value).toBe(30)
		expect(presentation.data[2].value).toBe(10)
	})
})

describe('mergeSingleDimensionChartDataset', () => {
	it('adds bribes and token tax data into the base series', () => {
		expect(
			mergeSingleDimensionChartDataset({
				chartData: {
					dimensions: ['timestamp', 'Fees'],
					source: [
						{ timestamp: toMs(2024, 1, 1), Fees: 10 },
						{ timestamp: toMs(2024, 1, 2), Fees: 20 }
					]
				},
				extraCharts: [
					[
						[Math.floor(toMs(2024, 1, 1) / 1e3), 1],
						[Math.floor(toMs(2024, 1, 2) / 1e3), 2]
					],
					[
						[Math.floor(toMs(2024, 1, 1) / 1e3), 3],
						[Math.floor(toMs(2024, 1, 2) / 1e3), 4]
					]
				]
			}).source
		).toEqual([
			{ timestamp: toMs(2024, 1, 1), Fees: 14 },
			{ timestamp: toMs(2024, 1, 2), Fees: 26 }
		])
	})
})

describe('mergeBreakdownCharts', () => {
	it('adds extra protocol values by timestamp and protocol name', () => {
		expect(
			mergeBreakdownCharts({
				chart: [
					[1, { A: 10, B: 20 }],
					[2, { A: 30 }]
				],
				extraCharts: [
					[
						[1, { A: 1, C: 2 }],
						[2, { B: 3 }]
					],
					[[2, { A: 4 }]]
				]
			})
		).toEqual([
			[1, { A: 11, B: 20, C: 2 }],
			[2, { A: 34, B: 3 }]
		])
	})
})

describe('mergeNamedDimensionChartDataset', () => {
	it('adds extra chain values into the matching named dimensions', () => {
		expect(
			mergeNamedDimensionChartDataset({
				chartData: {
					dimensions: ['timestamp', 'Ethereum', 'Solana'],
					source: [
						{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 20 },
						{ timestamp: toMs(2024, 1, 2), Ethereum: 30, Solana: 40 }
					]
				},
				extraCharts: [
					[
						[Math.floor(toMs(2024, 1, 1) / 1e3), { ethereum: 1, solana: 2 }],
						[Math.floor(toMs(2024, 1, 2) / 1e3), { Ethereum: 3 }]
					],
					[[Math.floor(toMs(2024, 1, 2) / 1e3), { Solana: 4 }]]
				]
			}).source
		).toEqual([
			{ timestamp: toMs(2024, 1, 1), Ethereum: 10, Solana: 20 },
			{ timestamp: toMs(2024, 1, 2), Ethereum: 33, Solana: 44 }
		])
	})
})

const protocol = (name: string, category: string | null): IProtocol =>
	({
		name,
		slug: name.toLowerCase(),
		logo: '',
		chains: [],
		category,
		total24h: null,
		total7d: null,
		total30d: null,
		total1y: null,
		totalAllTime: null,
		mcap: null
	}) as IProtocol

describe('getCategoryProtocolNameFilterForChart', () => {
	it('returns unrestricted when the page has no categories', () => {
		expect(
			getCategoryProtocolNameFilterForChart({
				categories: [],
				protocols: [protocol('Uniswap', 'Dex')],
				categoryParam: undefined,
				excludeCategoryParam: undefined,
				hasCategoryParam: false
			})
		).toEqual({ kind: 'unrestricted' })
	})

	it('returns restricted names matching selected categories (parent + children)', () => {
		const parent = {
			...protocol('Parent', 'Dex'),
			childProtocols: [protocol('Child A', 'Lending'), protocol('Child B', 'Dex')]
		} as IProtocol

		const result = getCategoryProtocolNameFilterForChart({
			categories: ['Dex', 'Lending'],
			protocols: [parent],
			categoryParam: 'Lending',
			excludeCategoryParam: undefined,
			hasCategoryParam: true
		})

		expect(result.kind).toBe('restricted')
		if (result.kind === 'restricted') {
			expect([...result.names].sort()).toEqual(['Child A'])
		}
	})

	it('returns no-rows when category param clears the selection', () => {
		expect(
			getCategoryProtocolNameFilterForChart({
				categories: ['Dex'],
				protocols: [protocol('A', 'Dex')],
				categoryParam: '',
				excludeCategoryParam: undefined,
				hasCategoryParam: true
			})
		).toEqual({ kind: 'no-rows' })
	})

	it('returns restricted leaf names when the filtered row is a parent with all children matching', () => {
		const parent = {
			...protocol('Parent', 'Dex'),
			childProtocols: [protocol('Child A', 'Dex'), protocol('Child B', 'Lending')]
		} as IProtocol

		const result = getCategoryProtocolNameFilterForChart({
			categories: ['Dex', 'Lending'],
			protocols: [parent],
			categoryParam: undefined,
			excludeCategoryParam: undefined,
			hasCategoryParam: false
		})

		expect(result.kind).toBe('restricted')
		if (result.kind === 'restricted') {
			expect([...result.names].sort()).toEqual(['Child A', 'Child B'])
		}
	})
})

describe('leafProtocolNamesFromTableRows', () => {
	it('returns each standalone protocol name', () => {
		expect(leafProtocolNamesFromTableRows([protocol('A', 'Dex')])).toEqual(['A'])
	})

	it('returns child names sorted by total24h descending', () => {
		const parent = {
			...protocol('Parent', 'Dex'),
			childProtocols: [
				{ ...protocol('C1', 'Dex'), total24h: 10 },
				{ ...protocol('C2', 'Dex'), total24h: 100 }
			]
		} as IProtocol
		expect(leafProtocolNamesFromTableRows([parent])).toEqual(['C2', 'C1'])
	})
})
