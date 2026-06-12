import { describe, expect, it } from 'vitest'
import type {
	ExchangeMarketsListResponse,
	MarketsExchangeListEntry,
	TokenMarketsListResponse
} from '~/containers/Markets/api.types'
import { buildCexMarketsSlugIndex, buildTokenMarketsSymbolIndex, resolveMarketsExchangeFromList } from '../markets'

function exchangeEntry(overrides: Partial<MarketsExchangeListEntry> = {}): MarketsExchangeListEntry {
	return {
		defillama_slug: null,
		exchange: 'binance',
		market_count: 1,
		total_volume_24h: 1,
		total_volume_prev_24h: null,
		...overrides
	}
}

const emptyExchangeTotal = {
	exchange_count: 0,
	total_oi_prev_usd: null,
	total_oi_usd: null,
	total_volume_24h: 0,
	total_volume_prev_24h: null
}

describe('markets dataset indexes', () => {
	it('indexes token symbols by lowercase symbol', () => {
		const tokensList: TokenMarketsListResponse = {
			last_updated: '2026-06-10T00:00:00Z',
			tokens: [
				{
					exchange_count: 1,
					market_count: 1,
					segments: {},
					symbol: 'BTC',
					tags: [],
					total_oi_usd: null,
					total_volume_24h: 1
				},
				{
					exchange_count: 1,
					market_count: 1,
					segments: {},
					symbol: 'wETH',
					tags: [],
					total_oi_usd: null,
					total_volume_24h: 1
				}
			]
		}

		const index = buildTokenMarketsSymbolIndex(tokensList)
		expect(Object.getPrototypeOf(index)).toBeNull()
		expect(index.btc).toBe(true)
		expect(index.weth).toBe(true)
	})

	it('indexes CEX entries by normalized DefiLlama slug', () => {
		const exchangesList: ExchangeMarketsListResponse = {
			last_updated: '2026-06-10T00:00:00Z',
			cex: {
				spot: [exchangeEntry({ exchange: 'cryptocom', defillama_slug: 'Crypto com' })],
				linear_perp: [],
				inverse_perp: []
			},
			dex: {
				spot: [],
				linear_perp: [],
				inverse_perp: []
			},
			totals: {
				cex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal },
				dex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal }
			}
		}

		const index = buildCexMarketsSlugIndex(exchangesList)
		expect(Object.getPrototypeOf(index)).toBeNull()
		expect(index['crypto-com']).toEqual({ exchange: 'cryptocom', defillama_slug: 'Crypto com' })
	})

	it('preserves spot-first CEX priority across repeated slugs', () => {
		const exchangesList: ExchangeMarketsListResponse = {
			last_updated: '2026-06-10T00:00:00Z',
			cex: {
				spot: [exchangeEntry({ exchange: 'spot-id', defillama_slug: 'Shared Slug' })],
				linear_perp: [exchangeEntry({ exchange: 'linear-id', defillama_slug: 'Shared Slug' })],
				inverse_perp: [exchangeEntry({ exchange: 'inverse-id', defillama_slug: 'Shared Slug' })]
			},
			dex: {
				spot: [exchangeEntry({ exchange: 'dex-id', defillama_slug: 'Shared Slug' })],
				linear_perp: [],
				inverse_perp: []
			},
			totals: {
				cex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal },
				dex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal }
			}
		}

		expect(buildCexMarketsSlugIndex(exchangesList)['shared-slug']).toEqual({
			exchange: 'spot-id',
			defillama_slug: 'Shared Slug'
		})
	})

	it('supports valid symbols and slugs that collide with Object prototype names', () => {
		const tokenIndex = buildTokenMarketsSymbolIndex({
			last_updated: '2026-06-10T00:00:00Z',
			tokens: [
				{
					exchange_count: 1,
					market_count: 1,
					segments: {},
					symbol: '__PROTO__',
					tags: [],
					total_oi_usd: null,
					total_volume_24h: 1
				}
			]
		})
		expect(tokenIndex['__proto__']).toBe(true)

		const cexIndex = buildCexMarketsSlugIndex({
			last_updated: '2026-06-10T00:00:00Z',
			cex: {
				spot: [exchangeEntry({ exchange: 'constructor-id', defillama_slug: 'constructor' })],
				linear_perp: [],
				inverse_perp: []
			},
			dex: {
				spot: [],
				linear_perp: [],
				inverse_perp: []
			},
			totals: {
				cex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal },
				dex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal }
			}
		})
		expect(cexIndex['constructor']).toEqual({ exchange: 'constructor-id', defillama_slug: 'constructor' })
	})

	it('resolves route exchange params to backend exchange ids', () => {
		const exchangesList: ExchangeMarketsListResponse = {
			last_updated: '2026-06-10T00:00:00Z',
			cex: {
				spot: [exchangeEntry({ exchange: 'binance', defillama_slug: 'Binance CEX' })],
				linear_perp: [],
				inverse_perp: []
			},
			dex: {
				spot: [exchangeEntry({ exchange: 'hyperliquid', defillama_slug: 'Hyperliquid' })],
				linear_perp: [],
				inverse_perp: []
			},
			totals: {
				cex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal },
				dex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal }
			}
		}

		expect(resolveMarketsExchangeFromList('Binance', exchangesList)).toBe('binance')
		expect(resolveMarketsExchangeFromList('hyperliquid', exchangesList)).toBe('hyperliquid')
		expect(resolveMarketsExchangeFromList('missing', exchangesList)).toBeNull()
	})
})
