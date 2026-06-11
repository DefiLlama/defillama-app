import { describe, expect, it } from 'vitest'
import { buildComputedBreakdownResult } from '../useProtocolBreakdownCharts'

const DAY_MS = 24 * 60 * 60 * 1e3
const HOUR_MS = 60 * 60 * 1e3

describe('ProtocolOverview breakdown chart computation', () => {
	it('keeps aligned totals, labels, USD inflows, token inflows, and latest token filtering exact', () => {
		const result = buildComputedBreakdownResult({
			tvlCharts: [
				[
					[DAY_MS, 100],
					[DAY_MS * 2, 200]
				],
				[
					[DAY_MS, 10],
					[DAY_MS * 2 + HOUR_MS, 20]
				]
			],
			chainBreakdownCharts: [
				[
					[DAY_MS, { Ethereum: 100 }],
					[DAY_MS * 2, { Ethereum: 200 }]
				],
				[
					[DAY_MS, { Arbitrum: 10 }],
					[DAY_MS * 2 + HOUR_MS, { Arbitrum: 20 }]
				]
			],
			tokenBreakdownUsdCharts: [
				[
					[DAY_MS, { USDC: 100, ETH: 200, UNKNOWN0: 50 }],
					[DAY_MS * 2, { USDC: 110, ETH: 220, UNKNOWN0: 60 }]
				]
			],
			tokenBreakdownRawCharts: [
				[
					[DAY_MS, { USDC: 100, ETH: 2, MISSING: 1, ZERO: 1 }],
					[DAY_MS * 2, { USDC: 105, ETH: 2.5, MISSING: 2, ZERO: 2 }]
				]
			],
			valueSeriesName: 'Total',
			inflows: true
		})

		expect(result.valueDataset).toEqual({
			source: [
				{ timestamp: DAY_MS, Total: 110 },
				{ timestamp: DAY_MS * 2 + HOUR_MS, Total: 220 }
			],
			dimensions: ['timestamp', 'Total']
		})
		expect(result.chainsUnique).toEqual(['Ethereum', 'Arbitrum'])
		expect(result.chainsDataset).toEqual({
			source: [
				{ timestamp: DAY_MS, Ethereum: 100, Arbitrum: 10 },
				{ timestamp: DAY_MS * 2 + HOUR_MS, Ethereum: 200, Arbitrum: 20 }
			],
			dimensions: ['timestamp', 'Ethereum', 'Arbitrum']
		})
		expect(result.usdInflowsDataset).toEqual({
			source: [{ timestamp: DAY_MS * 2 + HOUR_MS, 'USD Inflows': 110 }],
			dimensions: ['timestamp', 'USD Inflows']
		})
		expect(result.tokensUnique).toEqual(['ETH', 'USDC', 'UNKNOWN0'])
		expect(result.tokenBreakdownLatest).toEqual({ USDC: 110, ETH: 220 })
		expect(result.tokenInflowsDataset?.dimensions).toEqual(['timestamp', 'ETH', 'USDC', 'UNKNOWN0'])
		expect(result.tokenInflowsDataset?.source).toEqual([{ timestamp: DAY_MS * 2, ETH: 44, USDC: 5.238095238095238 }])
		expect(result.tokenInflowsCharts.map((chart) => chart.name)).toEqual(['ETH', 'USDC', 'UNKNOWN0'])
	})

	it('omits token and inflow datasets when inflows are disabled', () => {
		const result = buildComputedBreakdownResult({
			tvlCharts: [
				[
					[DAY_MS, 100],
					[DAY_MS * 2, 125]
				]
			],
			chainBreakdownCharts: [],
			tokenBreakdownUsdCharts: [
				[
					[DAY_MS, { USDC: 100 }],
					[DAY_MS * 2, { USDC: 125 }]
				]
			],
			tokenBreakdownRawCharts: [
				[
					[DAY_MS, { USDC: 100 }],
					[DAY_MS * 2, { USDC: 125 }]
				]
			],
			valueSeriesName: 'Treasury',
			inflows: false
		})

		expect(result.valueDataset?.dimensions).toEqual(['timestamp', 'Treasury'])
		expect(result.tokenUSDDataset).toBeNull()
		expect(result.tokenRawDataset).toBeNull()
		expect(result.usdInflowsDataset).toBeNull()
		expect(result.tokenInflowsDataset).toBeNull()
	})
})
