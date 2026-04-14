import { describe, expect, it } from 'vitest'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { toBreakdownChartDataset } from './breakdownDataset'

describe('rwa breakdownDataset', () => {
	it.each([null, []])('returns an empty dataset when toBreakdownChartDataset receives %j', (rows) => {
		expect(toBreakdownChartDataset(rows)).toEqual({
			source: [],
			dimensions: ['timestamp']
		})
	})

	it('sorts chart rows chronologically before building the dataset', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1774569600000, Ethereum: 130 },
				{ timestamp: 1774483200000, Solana: 120 }
			])
		).toEqual({
			source: [
				{ timestamp: 1774483200000, Solana: 120 },
				{ timestamp: 1774569600000, Ethereum: 130 }
			],
			dimensions: ['timestamp', 'Ethereum', 'Solana']
		})
	})

	it('converts second timestamps to milliseconds before ensureChronologicalRows sorts rows', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1_774_576_000, Ethereum: 130 },
				{ timestamp: 1_774_489_600, Solana: 120 }
			])
		).toEqual({
			source: [
				{ timestamp: 1_774_489_600_000, Solana: 120 },
				{ timestamp: 1_774_576_000_000, Ethereum: 130 }
			],
			dimensions: ['timestamp', 'Ethereum', 'Solana']
		})
	})

	it('keeps single-row input unchanged through ensureChronologicalRows and builds the expected dataset', () => {
		const singleRow = [{ timestamp: 1_774_489_600_000, Ethereum: 120 }]

		expect(ensureChronologicalRows(singleRow)).toBe(singleRow)
		expect(toBreakdownChartDataset(singleRow)).toEqual({
			source: singleRow,
			dimensions: ['timestamp', 'Ethereum']
		})
	})
})
