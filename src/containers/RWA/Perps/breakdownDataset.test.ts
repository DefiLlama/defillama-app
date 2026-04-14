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
			dimensions: ['timestamp', 'Meta', 'NVIDIA']
		})
	})

	it('uses the newest timestamps for snapshot totals even when rows are unsorted', () => {
		expect(
			getRWAPerpsBreakdownChartSnapshotTotals([
				{ timestamp: 1774569600000, Equities: 130, Commodities: 100 },
				{ timestamp: 1774483200000, Equities: 120 }
			])
		).toEqual({
			latestTotal: 230,
			previousTotal: 120
		})
	})
})
