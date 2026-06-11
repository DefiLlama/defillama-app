import { describe, expect, it } from 'vitest'
import { buildCompareProtocolsChartData } from '../chartData'

describe('buildCompareProtocolsChartData', () => {
	it('aggregates enabled chain tvl into sparse protocol comparison rows', () => {
		const result = buildCompareProtocolsChartData({
			protocolResponses: [
				{
					name: 'Aave',
					chainTvls: {
						Ethereum: {
							tvl: [
								{ date: 1, totalLiquidityUSD: 100 },
								{ date: 2, totalLiquidityUSD: 120 }
							]
						},
						borrowed: {
							tvl: [{ date: 1, totalLiquidityUSD: 999 }]
						},
						'staking-extra': {
							tvl: [{ date: 1, totalLiquidityUSD: 999 }]
						},
						offers: {
							tvl: [{ date: 1, totalLiquidityUSD: 999 }]
						}
					}
				},
				{
					name: 'Compound',
					chainTvls: {
						Ethereum: {
							tvl: [{ date: 2, totalLiquidityUSD: 50 }]
						}
					}
				}
			],
			extraTvlEnabled: { borrowed: false }
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Aave', 'Compound'],
			source: [
				{ timestamp: 1_000, Aave: 100 },
				{ timestamp: 2_000, Aave: 120, Compound: 50 }
			]
		})
		expect(result.charts.map((chart) => chart.name)).toEqual(['Aave', 'Compound'])
		expect(result.charts.every((chart) => chart.type === 'line')).toBe(true)
	})

	it('keeps enabled extra tvl chain sections in the selected protocol series', () => {
		const result = buildCompareProtocolsChartData({
			protocolResponses: [
				{
					name: 'Aave',
					chainTvls: {
						Ethereum: {
							tvl: [{ date: 1, totalLiquidityUSD: 100 }]
						},
						borrowed: {
							tvl: [{ date: 1, totalLiquidityUSD: 25 }]
						}
					}
				}
			],
			extraTvlEnabled: { borrowed: true }
		})

		expect(result.dataset.source).toEqual([{ timestamp: 1_000, Aave: 125 }])
	})
})
