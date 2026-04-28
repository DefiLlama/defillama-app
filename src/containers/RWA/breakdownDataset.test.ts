import { describe, expect, it } from 'vitest'
import {
	appendOverviewBreakdownTotalSeries,
	toBreakdownChartDataset,
	toOverviewBreakdownChartDataset
} from './breakdownDataset'

describe('rwa breakdownDataset', () => {
	for (const rows of [null, []] as Array<Parameters<typeof toBreakdownChartDataset>[0]>) {
		it(`returns an empty dataset when toBreakdownChartDataset receives ${JSON.stringify(rows)}`, () => {
			expect(toBreakdownChartDataset(rows)).toEqual({
				source: [],
				dimensions: ['timestamp']
			})
		})
	}

	it('keeps server row order while building the dataset', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1774569600000, Ethereum: 130 },
				{ timestamp: 1774483200000, Solana: 120 }
			])
		).toEqual({
			source: [
				{ timestamp: 1774569600000, Ethereum: 130 },
				{ timestamp: 1774483200000, Solana: 120 }
			],
			dimensions: ['timestamp', 'Ethereum', 'Solana']
		})
	})

	it('converts second timestamps to milliseconds', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1_774_576_000, Ethereum: 130 },
				{ timestamp: 1_774_489_600, Solana: 120 }
			])
		).toEqual({
			source: [
				{ timestamp: 1_774_576_000_000, Ethereum: 130 },
				{ timestamp: 1_774_489_600_000, Solana: 120 }
			],
			dimensions: ['timestamp', 'Ethereum', 'Solana']
		})
	})

	it('keeps single-row input unchanged and builds the expected dataset', () => {
		const singleRow = [{ timestamp: 1_774_489_600_000, Ethereum: 120 }]

		expect(toBreakdownChartDataset(singleRow)).toEqual({
			source: singleRow,
			dimensions: ['timestamp', 'Ethereum']
		})
	})

	it('converts leading zero values to null until a series has data', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1, PreStocks: 0, Securitize: 10 },
				{ timestamp: 2, PreStocks: 0, Securitize: 11 },
				{ timestamp: 3, PreStocks: 12, Securitize: 12 },
				{ timestamp: 4, PreStocks: 0, Securitize: 13 }
			])
		).toEqual({
			source: [
				{ timestamp: 1_000, PreStocks: null, Securitize: 10 },
				{ timestamp: 2_000, PreStocks: null, Securitize: 11 },
				{ timestamp: 3_000, PreStocks: 12, Securitize: 12 },
				{ timestamp: 4_000, PreStocks: 0, Securitize: 13 }
			],
			dimensions: ['timestamp', 'PreStocks', 'Securitize']
		})
	})

	it('drops all-zero placeholder series from dimensions', () => {
		expect(
			toBreakdownChartDataset([
				{ timestamp: 1, Placeholder: 0, Securitize: 10 },
				{ timestamp: 2, Placeholder: 0, Securitize: 11 }
			])
		).toEqual({
			source: [
				{ timestamp: 1_000, Placeholder: null, Securitize: 10 },
				{ timestamp: 2_000, Placeholder: null, Securitize: 11 }
			],
			dimensions: ['timestamp', 'Securitize']
		})
	})

	it('adds a metric-specific total as the first visible overview breakdown series', () => {
		expect(
			appendOverviewBreakdownTotalSeries(
				{
					source: [
						{ timestamp: 1, Ethereum: 10, Solana: 5, PreStocks: null },
						{ timestamp: 2, Ethereum: 7, Solana: 8 }
					],
					dimensions: ['timestamp', 'Ethereum', 'Solana', 'PreStocks']
				},
				'onChainMcap'
			)
		).toEqual({
			source: [
				{ timestamp: 1, 'Total Onchain Mcap': 15, Ethereum: 10, Solana: 5, PreStocks: null },
				{ timestamp: 2, 'Total Onchain Mcap': 15, Ethereum: 7, Solana: 8 }
			],
			dimensions: ['timestamp', 'Total Onchain Mcap', 'Ethereum', 'Solana', 'PreStocks']
		})
	})

	it('does not add a second total line', () => {
		const dataset = {
			source: [{ timestamp: 1, 'Total DeFi Active TVL': 15, Ethereum: 10, Solana: 5 }],
			dimensions: ['timestamp', 'Total DeFi Active TVL', 'Ethereum', 'Solana']
		}

		expect(appendOverviewBreakdownTotalSeries(dataset, 'defiActiveTvl')).toBe(dataset)
	})

	it('adds overview totals only for the requested aggregate pages', () => {
		const rows = [{ timestamp: 1, Ethereum: 10, Solana: 5 }]

		expect(
			toOverviewBreakdownChartDataset(rows, {
				breakdown: 'chain',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			}).dimensions
		).toEqual(['timestamp', 'Total Active Mcap', 'Ethereum', 'Solana'])

		expect(
			toOverviewBreakdownChartDataset(rows, {
				breakdown: 'category',
				key: 'activeMcap',
				includeStablecoin: false,
				includeGovernance: false
			}).dimensions
		).toEqual(['timestamp', 'Ethereum', 'Solana'])
	})
})
