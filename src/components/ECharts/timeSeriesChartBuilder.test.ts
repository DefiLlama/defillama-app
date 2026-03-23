import { describe, expect, it } from 'vitest'
import { buildTimeSeriesChart } from './timeSeriesChartBuilder'

const toMs = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day)

describe('buildTimeSeriesChart', () => {
	it('returns an empty chart spec for empty series input', () => {
		expect(buildTimeSeriesChart({ kind: 'periodBars', groupBy: 'weekly', series: [] })).toEqual({
			dataset: { source: [], dimensions: ['timestamp'] },
			charts: []
		})
	})

	it('sums values for periodBars buckets', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'periodBars',
				groupBy: 'weekly',
				series: [
					{
						name: 'Fees',
						color: '#111111',
						stack: 'volume',
						points: [
							[toMs(2024, 1, 15), 10],
							[toMs(2024, 1, 17), 5],
							[toMs(2024, 1, 22), 30]
						]
					}
				]
			})
		).toEqual({
			dataset: {
				source: [
					{ timestamp: toMs(2024, 1, 21), Fees: 15 },
					{ timestamp: toMs(2024, 1, 28), Fees: 30 }
				],
				dimensions: ['timestamp', 'Fees']
			},
			charts: [
				{
					type: 'bar',
					name: 'Fees',
					encode: { x: 'timestamp', y: 'Fees' },
					stack: 'volume',
					color: '#111111'
				}
			]
		})
	})

	it('keeps the last value for periodLines buckets', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'periodLines',
				groupBy: 'monthly',
				series: [
					{
						name: 'TVL',
						color: '#222222',
						points: [
							[toMs(2024, 3, 1), 10],
							[toMs(2024, 3, 15), 20],
							[toMs(2024, 3, 31), 30]
						]
					}
				]
			})
		).toEqual({
			dataset: {
				source: [{ timestamp: toMs(2024, 3, 1), TVL: 30 }],
				dimensions: ['timestamp', 'TVL']
			},
			charts: [
				{
					type: 'line',
					name: 'TVL',
					encode: { x: 'timestamp', y: 'TVL' },
					color: '#222222'
				}
			]
		})
	})

	it('builds cumulative lines without bucketting timestamps', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'cumulativeLines',
				series: [
					{
						name: 'Inflows',
						color: '#333333',
						points: [
							[toMs(2024, 1, 1), 10],
							[toMs(2024, 1, 2), 5],
							[toMs(2024, 1, 3), 15]
						]
					}
				]
			})
		).toEqual({
			dataset: {
				source: [
					{ timestamp: toMs(2024, 1, 1), Inflows: 10 },
					{ timestamp: toMs(2024, 1, 2), Inflows: 15 },
					{ timestamp: toMs(2024, 1, 3), Inflows: 30 }
				],
				dimensions: ['timestamp', 'Inflows']
			},
			charts: [
				{
					type: 'line',
					name: 'Inflows',
					encode: { x: 'timestamp', y: 'Inflows' },
					color: '#333333'
				}
			]
		})
	})

	it('fills missing series values with null in dense rows', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'periodBars',
				groupBy: 'daily',
				series: [
					{
						name: 'A',
						color: '#111111',
						stack: 'asset',
						points: [[toMs(2024, 1, 1), 10]]
					},
					{
						name: 'B',
						color: '#222222',
						stack: 'asset',
						points: [[toMs(2024, 1, 2), 20]]
					}
				]
			})
		).toEqual({
			dataset: {
				source: [
					{ timestamp: toMs(2024, 1, 1), A: 10, B: null },
					{ timestamp: toMs(2024, 1, 2), A: null, B: 20 }
				],
				dimensions: ['timestamp', 'A', 'B']
			},
			charts: [
				{
					type: 'bar',
					name: 'A',
					encode: { x: 'timestamp', y: 'A' },
					stack: 'asset',
					color: '#111111'
				},
				{
					type: 'bar',
					name: 'B',
					encode: { x: 'timestamp', y: 'B' },
					stack: 'asset',
					color: '#222222'
				}
			]
		})
	})

	it('preserves input order for dimensions and charts', () => {
		const result = buildTimeSeriesChart({
			kind: 'periodBars',
			groupBy: 'daily',
			series: [
				{
					name: 'Second',
					color: '#222222',
					stack: 'asset',
					points: [[toMs(2024, 1, 1), 2]]
				},
				{
					name: 'First',
					color: '#111111',
					stack: 'asset',
					points: [[toMs(2024, 1, 1), 1]]
				}
			]
		})

		expect(result.dataset.dimensions).toEqual(['timestamp', 'Second', 'First'])
		expect(result.charts.map((item) => item.name)).toEqual(['Second', 'First'])
	})

	it('sums duplicate timestamps before applying cumulative totals', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'cumulativeLines',
				series: [
					{
						name: 'Inflows',
						color: '#333333',
						points: [
							[toMs(2024, 1, 1), 10],
							[toMs(2024, 1, 1), 5],
							[toMs(2024, 1, 2), 7]
						]
					}
				]
			}).dataset.source
		).toEqual([
			{ timestamp: toMs(2024, 1, 1), Inflows: 15 },
			{ timestamp: toMs(2024, 1, 2), Inflows: 22 }
		])
	})

	it('carries cumulative totals across shared timestamps so lines do not gap', () => {
		expect(
			buildTimeSeriesChart({
				kind: 'cumulativeLines',
				series: [
					{
						name: 'Bitcoin',
						color: '#f97316',
						points: [
							[toMs(2024, 1, 1), 10],
							[toMs(2024, 1, 3), 5]
						]
					},
					{
						name: 'Ethereum',
						color: '#2563eb',
						points: [[toMs(2024, 1, 2), 7]]
					}
				]
			}).dataset.source
		).toEqual([
			{ timestamp: toMs(2024, 1, 1), Bitcoin: 10, Ethereum: 0 },
			{ timestamp: toMs(2024, 1, 2), Bitcoin: 10, Ethereum: 7 },
			{ timestamp: toMs(2024, 1, 3), Bitcoin: 15, Ethereum: 7 }
		])
	})

	it('throws for duplicate series names', () => {
		expect(() =>
			buildTimeSeriesChart({
				kind: 'periodBars',
				groupBy: 'daily',
				series: [
					{ name: 'A', color: '#111111', stack: 'asset', points: [[toMs(2024, 1, 1), 1]] },
					{ name: 'A', color: '#222222', stack: 'asset', points: [[toMs(2024, 1, 2), 2]] }
				]
			})
		).toThrow('Duplicate series name "A" is not allowed')
	})

	it('throws for unsorted point input', () => {
		expect(() =>
			buildTimeSeriesChart({
				kind: 'periodLines',
				groupBy: 'daily',
				series: [
					{
						name: 'TVL',
						color: '#111111',
						points: [
							[toMs(2024, 1, 2), 2],
							[toMs(2024, 1, 1), 1]
						]
					}
				]
			})
		).toThrow('Series "TVL" points must be sorted ascending by timestamp')
	})
})
