import { describe, expect, it } from 'vitest'
import type { LiquidationsDistributionChartData } from './api.types'
import {
	buildCumulativeLiquidationsChartView,
	getLiquidationsChartBreakdownMode,
	getLiquidationsChartBreakdownQueryPatch,
	getLiquidationsChartMetric,
	getLiquidationsChartMetricQueryPatch,
	getLiquidationsChartMode,
	getLiquidationsChartModeQueryPatch,
	getLiquidationsChartTokenQueryPatch,
	getTooltipValue,
	getLiquidationsChartView,
	resolveLiquidationsChartTokenKey
} from './LiquidationsDistributionChart'

const chart: LiquidationsDistributionChartData = {
	tokens: [
		{
			key: 'WBTC',
			label: 'WBTC',
			totalUsd: 60,
			breakdowns: {
				total: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'WBTC',
							label: 'WBTC',
							usd: [10, 20, 30],
							amount: [1, 2, 3],
							totalUsd: 60
						}
					]
				},
				protocol: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'Aave',
							label: 'Aave',
							usd: [10, 20, 30],
							amount: [1, 2, 3],
							totalUsd: 60
						}
					]
				},
				chain: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'Ethereum',
							label: 'Ethereum',
							usd: [10, 20, 30],
							amount: [1, 2, 3],
							totalUsd: 60
						}
					]
				}
			}
		},
		{
			key: 'ethereum:eth',
			label: 'ethereum:eth',
			totalUsd: 30,
			breakdowns: {
				total: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'ethereum:eth',
							label: 'ethereum:eth',
							usd: [5, 10, 15],
							amount: [0.5, 1, 1.5],
							totalUsd: 30
						}
					]
				},
				protocol: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'Sky',
							label: 'Sky',
							usd: [5, 10, 15],
							amount: [0.5, 1, 1.5],
							totalUsd: 30
						}
					]
				},
				chain: {
					bins: [0, 10, 20],
					series: [
						{
							key: 'Ethereum',
							label: 'Ethereum',
							usd: [5, 10, 15],
							amount: [0.5, 1, 1.5],
							totalUsd: 30
						}
					]
				}
			}
		}
	]
}

describe('LiquidationsDistributionChart helpers', () => {
	it('defaults to the top collateral token when no query param is present', () => {
		expect(resolveLiquidationsChartTokenKey(chart, undefined)).toBe('WBTC')
	})

	it('supports exact and slugged token query params', () => {
		expect(resolveLiquidationsChartTokenKey(chart, 'ethereum:eth')).toBe('ethereum:eth')
		expect(resolveLiquidationsChartTokenKey(chart, 'ethereum-eth')).toBe('ethereum:eth')
	})

	it('falls back to the top collateral token when the query param is invalid', () => {
		expect(resolveLiquidationsChartTokenKey(chart, 'not-a-token')).toBe('WBTC')
	})

	it('filters the chart down to the selected token', () => {
		expect(getLiquidationsChartView(chart, 'ethereum:eth', 'total')).toEqual({
			bins: [0, 10, 20],
			series: [chart.tokens[1].breakdowns.total.series[0]]
		})
	})

	it('trims empty price bins around the selected token', () => {
		expect(
			getLiquidationsChartView(
				{
					tokens: [
						{
							key: 'WETH',
							label: 'WETH',
							totalUsd: 15,
							breakdowns: {
								total: {
									bins: [0, 10, 20, 30, 40],
									series: [
										{
											key: 'WETH',
											label: 'WETH',
											usd: [0, 5, 10, 0, 0],
											amount: [0, 1, 2, 0, 0],
											totalUsd: 15
										}
									]
								},
								protocol: { bins: [0, 10, 20, 30, 40], series: [] },
								chain: { bins: [0, 10, 20, 30, 40], series: [] }
							}
						}
					]
				},
				'WETH',
				'total'
			)
		).toEqual({
			bins: [10, 20],
			series: [
				{
					key: 'WETH',
					label: 'WETH',
					usd: [5, 10],
					amount: [1, 2],
					totalUsd: 15
				}
			]
		})
	})

	it('returns the selected breakdown for a token', () => {
		expect(getLiquidationsChartView(chart, 'WBTC', 'protocol')).toEqual(chart.tokens[0].breakdowns.protocol)
	})

	it('builds cumulative liquidation totals from right to left across price buckets', () => {
		expect(
			buildCumulativeLiquidationsChartView({
				bins: [0, 10, 20],
				series: [
					{
						key: 'Aave',
						label: 'Aave',
						usd: [10, 20, 30],
						amount: [1, 2, 3],
						totalUsd: 60
					},
					{
						key: 'Compound',
						label: 'Compound',
						usd: [5, 0, 15],
						amount: [0.5, 0, 1.5],
						totalUsd: 20
					}
				]
			})
		).toEqual({
			bins: [0, 10, 20],
			series: [
				{
					key: 'Aave',
					label: 'Aave',
					usd: [60, 50, 30],
					amount: [6, 5, 3],
					totalUsd: 60
				},
				{
					key: 'Compound',
					label: 'Compound',
					usd: [20, 15, 15],
					amount: [2, 1.5, 1.5],
					totalUsd: 20
				}
			]
		})
	})

	it('normalizes metric and breakdown query state', () => {
		expect(getLiquidationsChartMetric(undefined)).toBe('usd')
		expect(getLiquidationsChartMetric('amount')).toBe('amount')
		expect(getLiquidationsChartMode(undefined)).toBe('cumulative')
		expect(getLiquidationsChartMode('distribution')).toBe('distribution')
		expect(getLiquidationsChartMode('invalid')).toBe('cumulative')
		expect(getLiquidationsChartMode(undefined, 'distribution')).toBe('distribution')
		expect(getLiquidationsChartBreakdownMode(undefined)).toBe('total')
		expect(getLiquidationsChartBreakdownMode('protocol')).toBe('protocol')
		expect(getLiquidationsChartBreakdownMode('protocol', ['total', 'chain'])).toBe('total')
		expect(getLiquidationsChartBreakdownMode(undefined, ['chain'])).toBe('chain')
		expect(getLiquidationsChartBreakdownMode(undefined, ['total', 'chain'], 'chain')).toBe('chain')
		expect(getLiquidationsChartBreakdownMode(undefined, ['total', 'chain'], 'protocol')).toBe('total')
	})

	it('drops default chart state from query patches', () => {
		expect(getLiquidationsChartMetricQueryPatch('usd')).toEqual({ metric: undefined })
		expect(getLiquidationsChartMetricQueryPatch('amount')).toEqual({ metric: 'amount' })
		expect(getLiquidationsChartModeQueryPatch('cumulative')).toEqual({ view: undefined })
		expect(getLiquidationsChartModeQueryPatch('distribution')).toEqual({ view: 'distribution' })
		expect(getLiquidationsChartModeQueryPatch('distribution', 'distribution')).toEqual({ view: undefined })
		expect(getLiquidationsChartModeQueryPatch('cumulative', 'distribution')).toEqual({ view: 'cumulative' })
		expect(getLiquidationsChartBreakdownQueryPatch('total')).toEqual({ breakdown: undefined })
		expect(getLiquidationsChartBreakdownQueryPatch('chain')).toEqual({ breakdown: 'chain' })
		expect(getLiquidationsChartBreakdownQueryPatch('total', 'chain')).toEqual({ breakdown: 'total' })
		expect(getLiquidationsChartBreakdownQueryPatch('chain', 'chain')).toEqual({ breakdown: undefined })
		expect(getLiquidationsChartTokenQueryPatch('WBTC', 'WBTC')).toEqual({ token: undefined })
		expect(getLiquidationsChartTokenQueryPatch('ethereum:eth', 'WBTC')).toEqual({ token: 'ethereum:eth' })
	})

	it('reads tooltip values using the encoded dataset key before label-based fallbacks', () => {
		expect(
			getTooltipValue({
				seriesName: 'Ethereum',
				encode: { y: 'ethereum-mainnet' },
				data: {
					'ethereum-mainnet': 123,
					Ethereum: 456
				}
			})
		).toBe(123)
	})

	it('falls back to object-shaped tooltip values and series id when needed', () => {
		expect(
			getTooltipValue({
				seriesName: 'Ethereum',
				seriesId: 'series-ethereum',
				encode: { y: ['missing-key'] },
				value: {
					'series-ethereum': 789
				}
			})
		).toBe(789)
	})
})
