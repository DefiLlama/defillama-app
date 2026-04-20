import { describe, expect, it } from 'vitest'
import { getRWAPerpsBreakdownChartSnapshotTotals, toRWAPerpsBreakdownChartDataset } from './breakdownDataset'

describe('rwa perps breakdownDataset', () => {
	it('sorts chart rows chronologically before building the dataset', () => {
		expect(
			toRWAPerpsBreakdownChartDataset([
				{ timestamp: 1774569600000, NVIDIA: 130 },
				{ timestamp: 1774483200000, Meta: 120 }
			])
		).toEqual({
			source: [
				{ timestamp: 1774483200000, Meta: 120 },
				{ timestamp: 1774569600000, NVIDIA: 130 }
			],
			dimensions: ['timestamp', 'NVIDIA', 'Meta']
		})
	})

	it('orders series dimensions by latest available value descending', () => {
		expect(
			toRWAPerpsBreakdownChartDataset([
				{ timestamp: 1774483200000, alpha: 100, beta: 80, gamma: 60 },
				{ timestamp: 1774569600000, alpha: 90, beta: 90 }
			]).dimensions
		).toEqual(['timestamp', 'alpha', 'beta', 'gamma'])
	})

	it('uses the newest timestamps for snapshot totals even when rows are unsorted', () => {
		expect(
			getRWAPerpsBreakdownChartSnapshotTotals(
				[
					{ timestamp: 1774569600000, Equities: 130, Commodities: 100 },
					{ timestamp: 1774483200000, Equities: 120 }
				],
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toEqual({
			latestTotal: 230,
			previousTotal: 120
		})
	})

	it('returns null changes when today or yesterday data is missing', () => {
		expect(
			getRWAPerpsBreakdownChartSnapshotTotals(
				[{ timestamp: 1774310400000, Equities: 120 }],
				new Date('2026-03-27T12:00:00Z').getTime()
			)
		).toEqual({
			latestTotal: null,
			previousTotal: null
		})
	})
})
