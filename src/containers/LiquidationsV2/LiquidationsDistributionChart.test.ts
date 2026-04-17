import { describe, expect, it } from 'vitest'
import type { LiquidationsDistributionChartData } from './api.types'
import {
	getLiquidationsChartBreakdownMode,
	getLiquidationsChartBreakdownQueryPatch,
	getLiquidationsChartMetric,
	getLiquidationsChartMetricQueryPatch,
	getLiquidationsChartTokenQueryPatch,
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

	it('normalizes metric and breakdown query state', () => {
		expect(getLiquidationsChartMetric(undefined)).toBe('usd')
		expect(getLiquidationsChartMetric('amount')).toBe('amount')
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
		expect(getLiquidationsChartBreakdownQueryPatch('total')).toEqual({ breakdown: undefined })
		expect(getLiquidationsChartBreakdownQueryPatch('chain')).toEqual({ breakdown: 'chain' })
		expect(getLiquidationsChartTokenQueryPatch('WBTC', 'WBTC')).toEqual({ token: undefined })
		expect(getLiquidationsChartTokenQueryPatch('ethereum:eth', 'WBTC')).toEqual({ token: 'ethereum:eth' })
	})
})
