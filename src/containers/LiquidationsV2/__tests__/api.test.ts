import { describe, expect, it } from 'vitest'
import { fetchTokenLiquidationsForAliases } from '../api'
import type { TokenLiquidationsSectionData } from '../api.types'

function makeTokenLiquidationsPart(symbol: string, firstUsd: number, secondUsd: number): TokenLiquidationsSectionData {
	const totalUsd = firstUsd + secondUsd

	return {
		tokenSymbol: symbol,
		timestamp: totalUsd,
		positionCount: 1,
		protocolCount: 1,
		chainCount: 1,
		totalCollateralUsd: totalUsd,
		distributionChart: {
			tokens: [
				{
					key: 'WBTC',
					label: 'WBTC',
					totalUsd,
					breakdowns: {
						total: {
							bins: [0, 1],
							series: [{ key: 'WBTC', label: 'WBTC', usd: [firstUsd, secondUsd], amount: [1, 2], totalUsd }]
						},
						protocol: {
							bins: [0, 1],
							series: [{ key: 'Aave', label: 'Aave', usd: [firstUsd, secondUsd], amount: [1, 2], totalUsd }]
						},
						chain: {
							bins: [0, 1],
							series: [{ key: 'Ethereum', label: 'Ethereum', usd: [firstUsd, secondUsd], amount: [1, 2], totalUsd }]
						}
					}
				}
			]
		},
		protocolRows: [
			{
				id: 'aave',
				name: 'Aave',
				slug: 'aave',
				positionCount: 1,
				chainCount: 1,
				collateralCount: 1,
				totalCollateralUsd: totalUsd
			}
		],
		chainRows: [
			{
				id: 'ethereum',
				name: 'Ethereum',
				slug: 'ethereum',
				positionCount: 1,
				protocolCount: 1,
				collateralCount: 1,
				totalCollateralUsd: totalUsd
			}
		]
	}
}

describe('fetchTokenLiquidationsForAliases', () => {
	it('uses the canonical alias symbol and merges duplicate chart tokens', async () => {
		const parts = new Map([
			['BTC', makeTokenLiquidationsPart('BTC', 10, 20)],
			['WBTC', makeTokenLiquidationsPart('WBTC', 30, 40)]
		])
		const fetchFn = async (url: string) => {
			const symbol = decodeURIComponent(url.slice(url.lastIndexOf('/') + 1))
			const part = parts.get(symbol)
			if (!part) throw new Error(`No fixture for ${symbol}`)
			return new Response(JSON.stringify(part), { status: 200 })
		}

		const result = await fetchTokenLiquidationsForAliases('wbtc', fetchFn)

		expect(result?.tokenSymbol).toBe('BTC')
		expect(result?.distributionChart.tokens).toHaveLength(1)
		expect(result?.distributionChart.tokens[0]).toMatchObject({
			key: 'WBTC',
			label: 'WBTC',
			totalUsd: 100
		})
		expect(result?.distributionChart.tokens[0]?.breakdowns.total.series[0]).toMatchObject({
			key: 'WBTC',
			usd: [40, 60],
			amount: [2, 4],
			totalUsd: 100
		})
		expect(result?.totalCollateralUsd).toBe(100)
	})

	it('throws when every alias request fails', async () => {
		const fetchFn = async () => {
			throw new Error('upstream unavailable')
		}

		await expect(fetchTokenLiquidationsForAliases('wbtc', fetchFn)).rejects.toThrow(
			/Failed to fetch token liquidations for BTC: upstream unavailable/
		)
	})
})
