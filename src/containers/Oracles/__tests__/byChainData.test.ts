import { describe, expect, it } from 'vitest'
import { buildOraclesByChainDominanceData, buildOraclesByChainTableAndPieData } from '../byChainData'
import type { OraclesByChainPageData } from '../types'

const tableData = [
	{
		name: 'Chainlink',
		tvl: 100,
		extraTvl: { doublecounted: 30, liquidstaking: 20, dcAndLsOverlap: 10 },
		protocolsSecured: 3,
		chains: ['Ethereum']
	},
	{
		name: 'Pyth',
		tvl: 120,
		extraTvl: {},
		protocolsSecured: 2,
		chains: ['Solana']
	}
] satisfies OraclesByChainPageData['tableData']

const extraTvlsEnabled = {
	doublecounted: true,
	liquidstaking: true
}

describe('buildOraclesByChainTableAndPieData', () => {
	it('returns original table rows when extras are disabled', () => {
		const result = buildOraclesByChainTableAndPieData({
			tableData,
			extraTvlsEnabled,
			hasEnabledExtras: false
		})

		expect(result.tableData).toBe(tableData)
		expect(result.pieData).toEqual([
			{ name: 'Pyth', value: 120 },
			{ name: 'Chainlink', value: 100 }
		])
	})

	it('adjusts table and pie tvs with enabled extra tvl settings', () => {
		const result = buildOraclesByChainTableAndPieData({
			tableData,
			extraTvlsEnabled,
			hasEnabledExtras: true
		})

		expect(result.tableData).toEqual([
			{ ...tableData[0], tvl: 140 },
			{ ...tableData[1], tvl: 120 }
		])
		expect(result.pieData).toEqual([
			{ name: 'Chainlink', value: 140 },
			{ name: 'Pyth', value: 120 }
		])
		expect(tableData[0].tvl).toBe(100)
	})
})

describe('buildOraclesByChainDominanceData', () => {
	it('uses base chart values while extra chart formatting is disabled or loading', () => {
		const result = buildOraclesByChainDominanceData({
			chartData: [{ timestamp: 1, Chainlink: 100, Pyth: 50 }],
			oracles: ['Chainlink', 'Pyth'],
			oraclesColors: { Chainlink: '#111', Pyth: '#222' },
			extraBreakdownsByApiKey: {
				doublecounted: [{ timestamp: 1, Chainlink: 1000 }]
			},
			extraTvlsEnabled,
			shouldApplyExtraTvlFormatting: false
		})

		expect(result.dominanceDataset).toEqual({
			dimensions: ['timestamp', 'Chainlink', 'Pyth'],
			source: [{ timestamp: 1_000, Chainlink: (100 / 150) * 100, Pyth: (50 / 150) * 100 }]
		})
	})

	it('applies extra chart breakdowns by timestamp and keeps missing extras at base tvs', () => {
		const result = buildOraclesByChainDominanceData({
			chartData: [
				{ timestamp: 1, Chainlink: 100, Pyth: 50 },
				{ timestamp: 2, Chainlink: 0, Pyth: 0 }
			],
			oracles: ['Chainlink', 'Pyth'],
			oraclesColors: { Chainlink: '#111', Pyth: '#222' },
			extraBreakdownsByApiKey: {
				doublecounted: [{ timestamp: 1, Chainlink: 30, Pyth: Number.NaN }],
				liquidstaking: [{ timestamp: 1, Chainlink: 20, Pyth: 10 }],
				dcAndLsOverlap: [{ timestamp: 1, Chainlink: 10 }]
			},
			extraTvlsEnabled,
			shouldApplyExtraTvlFormatting: true
		})

		expect(result.dominanceDataset).toEqual({
			dimensions: ['timestamp', 'Chainlink', 'Pyth'],
			source: [{ timestamp: 1_000, Chainlink: 70, Pyth: 30 }]
		})
		expect(result.dominanceCharts).toEqual([
			{
				type: 'line',
				name: 'Chainlink',
				encode: { x: 'timestamp', y: 'Chainlink' },
				color: '#111',
				stack: 'dominance'
			},
			{ type: 'line', name: 'Pyth', encode: { x: 'timestamp', y: 'Pyth' }, color: '#222', stack: 'dominance' }
		])
	})
})
