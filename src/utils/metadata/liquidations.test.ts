import { describe, expect, it } from 'vitest'
import { extractLiquidationsTokenSymbols, normalizeLiquidationsTokenSymbol } from './liquidations'

describe('liquidations metadata helpers', () => {
	it('normalizes token symbols case-insensitively', () => {
		expect(normalizeLiquidationsTokenSymbol(' wstETH ')).toBe('WSTETH')
		expect(normalizeLiquidationsTokenSymbol('btc')).toBe('BTC')
		expect(normalizeLiquidationsTokenSymbol('')).toBeNull()
	})

	it('extracts a deduped sorted list of liquidation token symbols', () => {
		expect(
			extractLiquidationsTokenSymbols({
				ethereum: {
					'ethereum:wsteth': { symbol: 'wstETH', decimals: 18 },
					'ethereum:eth': { symbol: 'ETH', decimals: 18 }
				},
				base: {
					'base:wsteth': { symbol: 'WSTETH', decimals: 18 },
					'base:cbbtc': { symbol: 'cbbtc', decimals: 8 }
				}
			})
		).toEqual(['CBBTC', 'ETH', 'WSTETH'])
	})
})
