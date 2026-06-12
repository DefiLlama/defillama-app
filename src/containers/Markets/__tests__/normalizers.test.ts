import { describe, expect, it } from 'vitest'
import type { MarketSegmentSummary, MarketsCategorySegmentStat, MarketsExchangeListEntry } from '../api.types'
import {
	completeCategoryPageData,
	groupCategoriesBySegment,
	groupTokensBySegment,
	mergeExchangeListBySegment
} from '../normalizers'

function tokenSegment(overrides: Partial<MarketSegmentSummary> = {}): MarketSegmentSummary {
	return {
		exchange_count: 0,
		funding_rate_8h: null,
		leverage_max: null,
		leverage_min: null,
		market_count: 0,
		oi_prev_usd: null,
		oi_usd: null,
		price: null,
		price_change_24h: null,
		volume_24h: 0,
		volume_prev_24h: null,
		...overrides
	}
}

function categorySegment(overrides: Partial<MarketsCategorySegmentStat> = {}): MarketsCategorySegmentStat {
	return {
		funding_rate_8h: null,
		leverage_max: null,
		leverage_min: null,
		market_count: 0,
		oi_prev_usd: null,
		oi_usd: null,
		price_change_24h: null,
		token_count: 0,
		volume_24h: 0,
		volume_prev_24h: null,
		...overrides
	}
}

function exchangeEntry(overrides: Partial<MarketsExchangeListEntry> = {}): MarketsExchangeListEntry {
	return {
		defillama_slug: null,
		exchange: 'binance',
		market_count: 0,
		total_volume_24h: 0,
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

describe('groupTokensBySegment', () => {
	it('expands per-segment stats from the tokens list response and fills missing segments', () => {
		const result = groupTokensBySegment({
			last_updated: '2026-06-10T00:00:00Z',
			tokens: [
				{
					exchange_count: 3,
					market_count: 5,
					symbol: 'btc',
					tags: ['layer1'],
					total_oi_usd: 200,
					total_volume_24h: 1500,
					segments: {
						spot: tokenSegment({
							price: 100,
							volume_24h: 1000,
							volume_prev_24h: 800,
							market_count: 5,
							exchange_count: 3
						}),
						linear_perp: tokenSegment({
							price: 100,
							volume_24h: 500,
							oi_usd: 200,
							oi_prev_usd: 150,
							funding_rate_8h: 0.0001,
							leverage_max: 100
						})
					}
				}
			]
		})
		expect(result.spot).toHaveLength(1)
		expect(result.spot[0]).toMatchObject({
			symbol: 'btc',
			tags: ['layer1'],
			volume_24h: 1000,
			volume_prev_24h: 800
		})
		expect(result.linear_perp[0]).toMatchObject({
			oi_usd: 200,
			oi_prev_usd: 150,
			funding_rate_8h: 0.0001,
			leverage_max: 100
		})
		expect(result.inverse_perp).toEqual([])
	})
})

describe('groupCategoriesBySegment', () => {
	it('handles the categories list response and fills missing segments', () => {
		const result = groupCategoriesBySegment({
			last_updated: '2026-06-10T00:00:00Z',
			categories: [
				{ category: 'rwa', segments: { spot: categorySegment({ volume_24h: 10, token_count: 4, market_count: 9 }) } }
			]
		})
		expect(result.spot[0]).toMatchObject({ category: 'rwa', volume_24h: 10, token_count: 4, market_count: 9 })
		expect(result.linear_perp).toEqual([])
		expect(result.inverse_perp).toEqual([])
	})

	it('keeps backend funding_rate_8h unchanged', () => {
		const result = groupCategoriesBySegment({
			last_updated: '2026-06-10T00:00:00Z',
			categories: [
				{ category: 'ai', segments: { linear_perp: categorySegment({ volume_24h: 1, funding_rate_8h: 0.00012 }) } }
			]
		})
		expect(result.linear_perp[0].funding_rate_8h).toBeCloseTo(0.00012)
	})
})

describe('mergeExchangeListBySegment', () => {
	it('merges cex + dex per segment with prev-day fields and fills missing segment rows', () => {
		const result = mergeExchangeListBySegment({
			last_updated: '2026-06-10T00:00:00Z',
			cex: {
				spot: [],
				linear_perp: [
					exchangeEntry({
						exchange: 'binance',
						defillama_slug: 'Binance-CEX',
						market_count: 662,
						total_volume_24h: 100,
						total_volume_prev_24h: 80,
						total_oi_usd: 50,
						total_oi_prev_usd: 40
					})
				],
				inverse_perp: []
			},
			dex: {
				spot: [],
				linear_perp: [exchangeEntry({ exchange: 'hyperliquid', market_count: 200, total_volume_24h: 60 })],
				inverse_perp: []
			},
			totals: {
				cex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal },
				dex: { spot: emptyExchangeTotal, linear_perp: emptyExchangeTotal, inverse_perp: emptyExchangeTotal }
			}
		})
		const rows = result.linear_perp
		expect(rows).toHaveLength(2)
		const binance = rows.find((r) => r.exchange === 'binance')!
		expect(binance).toMatchObject({
			exchange_type: 'cex',
			total_volume_24h: 100,
			total_volume_prev_24h: 80,
			total_oi_usd: 50,
			total_oi_prev_usd: 40,
			market_count: 662
		})
		expect(rows.find((r) => r.exchange === 'hyperliquid')!.exchange_type).toBe('dex')
		expect(result.spot).toEqual([])
		expect(result.inverse_perp).toEqual([])
	})
})

describe('completeCategoryPageData', () => {
	it('keeps backend series fields and completes segment-keyed records', () => {
		const page = completeCategoryPageData({
			category: 'rwa',
			last_updated: '2026-06-10T00:00:00Z',
			segments: { spot: categorySegment({ volume_24h: 100, token_count: 2 }) },
			tokens: { spot: [{ symbol: 'ondo', tags: ['rwa'], ...tokenSegment({ volume_24h: 60, price: 1 }) }] },
			series: [{ day: 1_700_000_000, segment: 'spot', volume_24h: 9, oi_usd: null, market_count: 2 }],
			series_by_exchange: [
				{
					day: 1_700_000_000,
					exchange: 'binance',
					exchange_type: 'cex',
					segment: 'spot',
					volume_24h: 4,
					oi_usd: null,
					market_count: 1
				}
			],
			series_by_pair: [
				{
					day: 1_700_000_000,
					pair: 'ondo-usdt',
					segment: 'spot',
					volume_24h: 3,
					oi_usd: null,
					market_count: 1
				}
			]
		})
		expect(page.category).toBe('rwa')
		expect(page.segments.spot).toMatchObject({ volume_24h: 100, token_count: 2 })
		expect(page.segments.linear_perp).toBeNull()
		expect(page.segments.inverse_perp).toBeNull()
		expect(page.tokens.spot[0]).toMatchObject({ symbol: 'ondo', tags: ['rwa'], volume_24h: 60 })
		expect(page.tokens.linear_perp).toEqual([])
		expect(page.tokens.inverse_perp).toEqual([])
		expect(page.series[0]).toMatchObject({ segment: 'spot', volume_24h: 9, day: 1_700_000_000 })
		expect(page.series_by_exchange[0]).toMatchObject({ exchange: 'binance', volume_24h: 4, day: 1_700_000_000 })
		expect(page.series_by_pair[0]).toMatchObject({ pair: 'ondo-usdt', volume_24h: 3, day: 1_700_000_000 })
	})
})
