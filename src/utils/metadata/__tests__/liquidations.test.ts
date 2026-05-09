import { describe, expect, it } from 'vitest'
import { extractLiquidationsTokenSymbols, normalizeLiquidationsTokenSymbol } from '../liquidations'

describe('liquidations metadata helpers', () => {
	it('normalizes token symbols case-insensitively', () => {
		expect(normalizeLiquidationsTokenSymbol(' wstETH ')).toBe('WSTETH')
		expect(normalizeLiquidationsTokenSymbol('btc')).toBe('BTC')
		expect(normalizeLiquidationsTokenSymbol('')).toBeNull()
	})

	it('extracts a deduped sorted list of liquidation token symbols', () => {
		expect(
			extractLiquidationsTokenSymbols({
				timestamp: 1,
				validThresholds: ['all'],
				tokens: {
					ethereum: {
						'ethereum:wsteth': { symbol: 'wstETH', decimals: 18 },
						'ethereum:eth': { symbol: 'ETH', decimals: 18 },
						'ethereum:ldo': { symbol: 'LDO', decimals: 18 }
					},
					base: {
						'base:wsteth': { symbol: 'WSTETH', decimals: 18 },
						'base:cbbtc': { symbol: 'cbbtc', decimals: 8 }
					}
				},
				data: {
					'aave-v3': {
						ethereum: [
							{
								owner: '0x1',
								liqPrice: 1,
								collateral: 'ethereum:wsteth',
								collateralAmount: 1,
								collateralAmountUsd: 100
							},
							{
								owner: '0x2',
								liqPrice: 1,
								collateral: 'ethereum:eth',
								collateralAmount: 1,
								collateralAmountUsd: 100
							}
						],
						base: [
							{
								owner: '0x3',
								liqPrice: 1,
								collateral: 'base:cbbtc',
								collateralAmount: 1,
								collateralAmountUsd: 100
							}
						]
					},
					'compound-v3': {
						base: [
							{
								owner: '0x4',
								liqPrice: 1,
								collateral: 'base:wsteth',
								collateralAmount: 1,
								collateralAmountUsd: 100
							}
						]
					}
				}
			})
		).toEqual(['CBBTC', 'ETH', 'WSTETH'])
	})
})
