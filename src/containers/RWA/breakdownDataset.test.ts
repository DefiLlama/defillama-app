import { describe, expect, it } from 'vitest'
import { toBreakdownChartDataset } from './breakdownDataset'

describe('rwa breakdownDataset', () => {
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
})
