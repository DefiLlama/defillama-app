import { describe, expect, it } from 'vitest'
import { findExchangeMarketsListEntry } from './markets'
import type { ExchangeMarketsListResponse } from './markets.types'

const emptyCategory = {
	spot: [],
	linear_perp: [],
	inverse_perp: []
}

describe('findExchangeMarketsListEntry', () => {
	it('matches cex entries by DefiLlama slug', () => {
		const list: ExchangeMarketsListResponse = {
			last_updated: '2026-05-03T00:00:01.000Z',
			cex: {
				spot: [
					{
						defillama_slug: 'Binance-CEX',
						exchange: 'binance',
						market_count: 10,
						total_volume_24h: 100
					}
				],
				linear_perp: [],
				inverse_perp: []
			},
			dex: emptyCategory,
			totals: {
				cex: {
					spot: { exchange_count: 1, total_oi_usd: null, total_volume_24h: 100 },
					linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 }
				},
				dex: {
					spot: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 }
				}
			}
		}

		expect(findExchangeMarketsListEntry(list, 'binance-cex')?.exchange).toBe('binance')
	})

	it('falls through to perp categories', () => {
		const list: ExchangeMarketsListResponse = {
			cex: {
				spot: [],
				linear_perp: [
					{
						defillama_slug: 'Bybit',
						exchange: 'bybit',
						market_count: 10,
						total_oi_usd: 200,
						total_volume_24h: 100
					}
				],
				inverse_perp: []
			},
			dex: emptyCategory,
			totals: {
				cex: {
					spot: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					linear_perp: { exchange_count: 1, total_oi_usd: 200, total_volume_24h: 100 },
					inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 }
				},
				dex: {
					spot: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 },
					inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: 0 }
				}
			}
		}

		expect(findExchangeMarketsListEntry(list, 'bybit')?.exchange).toBe('bybit')
	})
})
