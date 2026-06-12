import { describe, expect, it } from 'vitest'
import type { MarketsCategorySegmentStat, MarketsExchangeListEntry, MarketsTokenSegmentStat } from '../api.types'
import {
	normalizeCategoriesList,
	normalizeCategoryPage,
	normalizeCategorySeries,
	normalizeExchangeSeries,
	normalizeExchangesList,
	normalizeTokensList
} from '../normalizers'
import { resolveSegment } from '../segments'
import type { SymbolStat } from '../types'
import { aggregateCategories, moverValue, pctChange, pivotSeries, selectMovers, sentiment, topSymbols } from '../utils'

function symbol(overrides: Partial<SymbolStat> = {}): SymbolStat {
	return {
		base: 'tok',
		tags: [],
		price: 1,
		price_change_24h: 0,
		volume_24h_usd: 0,
		volume_prev_24h_usd: 0,
		oi_usd: null,
		oi_prev_usd: null,
		funding_avg_8h: null,
		leverage_min: null,
		leverage_max: null,
		market_count: 1,
		exchange_count: 1,
		...overrides
	}
}

function tokenSegment(overrides: Partial<MarketsTokenSegmentStat> = {}): MarketsTokenSegmentStat {
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

describe('pctChange', () => {
	it('computes a fractional change', () => {
		expect(pctChange(150, 100)).toBeCloseTo(0.5)
	})
	it('returns null on missing or non-positive prev', () => {
		expect(pctChange(100, 0)).toBeNull()
		expect(pctChange(100, null)).toBeNull()
		expect(pctChange(null, 100)).toBeNull()
		expect(pctChange(100, -5)).toBeNull()
	})
})

describe('resolveSegment', () => {
	it('keeps an available requested segment', () => {
		expect(resolveSegment('linear_perp', ['spot', 'linear_perp'])).toBe('linear_perp')
	})

	it('falls back to the first available segment and preserves requested when none are available', () => {
		expect(resolveSegment('inverse_perp', ['spot', 'linear_perp'])).toBe('spot')
		expect(resolveSegment('inverse_perp', [])).toBe('inverse_perp')
	})
})

describe('sentiment', () => {
	it('uses volume only on spot', () => {
		expect(sentiment(symbol({ volume_24h_usd: 130, volume_prev_24h_usd: 100 }), 'spot')).toBe('rising')
		expect(sentiment(symbol({ volume_24h_usd: 80, volume_prev_24h_usd: 100 }), 'spot')).toBe('fading')
		expect(sentiment(symbol({ volume_24h_usd: 105, volume_prev_24h_usd: 100 }), 'spot')).toBe('flat')
	})
	it('uses the volume/OI quadrant on perps', () => {
		const seg = 'linear_perp' as const
		const base = { volume_24h_usd: 130, volume_prev_24h_usd: 100, oi_usd: 110, oi_prev_usd: 100 }
		expect(sentiment(symbol(base), seg)).toBe('rising')
		expect(sentiment(symbol({ ...base, oi_usd: 90 }), seg)).toBe('churn')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 80 }), seg)).toBe('building')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 80, oi_usd: 90 }), seg)).toBe('fading')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 101, oi_usd: 101 }), seg)).toBe('flat')
	})
	it('is flat when OI data is missing on perps', () => {
		expect(sentiment(symbol({ volume_24h_usd: 130, volume_prev_24h_usd: 100 }), 'linear_perp')).toBe('flat')
	})
})

describe('movers', () => {
	it('ignores dust rows below the volume floor', () => {
		const rows = [
			symbol({ base: 'big', volume_24h_usd: 5_000_000, price_change_24h: 0.2 }),
			symbol({ base: 'dust', volume_24h_usd: 1000, price_change_24h: 0.9 })
		]
		const { gainers } = selectMovers(rows, 'price')
		expect(gainers.map((r) => r.base)).toEqual(['big'])
	})
	it('sorts gainers desc and losers asc', () => {
		const rows = [
			symbol({ base: 'a', volume_24h_usd: 2_000_000, price_change_24h: 0.3 }),
			symbol({ base: 'b', volume_24h_usd: 2_000_000, price_change_24h: -0.4 }),
			symbol({ base: 'c', volume_24h_usd: 2_000_000, price_change_24h: 0.1 })
		]
		const { gainers, losers } = selectMovers(rows, 'price', 2)
		expect(gainers.map((r) => r.base)).toEqual(['a', 'c'])
		expect(losers.map((r) => r.base)).toEqual(['b', 'c'])
	})
	it('keeps the previous full-sort tie ordering for gainers and losers', () => {
		const rows = [
			symbol({ base: 'a', volume_24h_usd: 2_000_000, price_change_24h: 0.2 }),
			symbol({ base: 'b', volume_24h_usd: 2_000_000, price_change_24h: 0.2 }),
			symbol({ base: 'c', volume_24h_usd: 2_000_000, price_change_24h: -0.1 }),
			symbol({ base: 'd', volume_24h_usd: 2_000_000, price_change_24h: -0.1 })
		]
		const { gainers, losers } = selectMovers(rows, 'price', 2)
		expect(gainers.map((r) => r.base)).toEqual(['a', 'b'])
		expect(losers.map((r) => r.base)).toEqual(['d', 'c'])
	})
	it('moverValue maps each metric', () => {
		const row = symbol({
			volume_24h_usd: 120,
			volume_prev_24h_usd: 100,
			oi_usd: 110,
			oi_prev_usd: 100,
			price_change_24h: 0.05
		})
		expect(moverValue(row, 'price')).toBeCloseTo(0.05)
		expect(moverValue(row, 'volume')).toBeCloseTo(0.2)
		expect(moverValue(row, 'oi')).toBeCloseTo(0.1)
	})
})

describe('topSymbols', () => {
	it('sorts by volume or oi and caps the count', () => {
		const rows = [
			symbol({ base: 'a', volume_24h_usd: 10, oi_usd: 1 }),
			symbol({ base: 'b', volume_24h_usd: 5, oi_usd: 9 }),
			symbol({ base: 'c', volume_24h_usd: 7, oi_usd: 3 })
		]
		expect(topSymbols(rows, 'volume', 2).map((r) => r.base)).toEqual(['a', 'c'])
		expect(topSymbols(rows, 'oi', 2).map((r) => r.base)).toEqual(['b', 'c'])
	})

	it('keeps the previous full-sort tie ordering when capped', () => {
		const rows = [
			symbol({ base: 'a', volume_24h_usd: 10 }),
			symbol({ base: 'b', volume_24h_usd: 10 }),
			symbol({ base: 'c', volume_24h_usd: 9 })
		]
		expect(topSymbols(rows, 'volume', 2).map((r) => r.base)).toEqual(['a', 'b'])
	})
})

describe('pivotSeries', () => {
	it('keeps the top N keys ranked by latest-day value, drops the rest, and emits seconds', () => {
		const rows = [
			{ key: 'a', day: 1_000_000_000_000, value: 100 },
			{ key: 'b', day: 1_000_000_000_000, value: 50 },
			{ key: 'c', day: 1_000_000_000_000, value: 10 },
			{ key: 'a', day: 1_000_086_400_000, value: 200 }
		]
		const { chartData, stacks } = pivotSeries(rows, {
			keyOf: (r) => r.key,
			valueOf: (r) => r.value,
			dayMsOf: (r) => r.day,
			top: 2
		})
		// latest day has only `a`; the rest tie at 0 and break on total (b > c). No "other" bucket.
		expect(stacks).toEqual(['a', 'b'])
		expect(chartData).toHaveLength(2)
		// date is unix seconds, sorted ascending
		expect(chartData[0].date).toBe(1_000_000_000)
		expect(chartData[1].date).toBe(1_000_086_400)
		expect(chartData[0].a).toBe(100)
		expect(chartData[0].b).toBe(50)
		expect(chartData[1].a).toBe(200)
		expect(chartData[1].b).toBe(0)
		expect(chartData[0]).not.toHaveProperty('c')
	})
	it('ranks by the latest day, not the 30d total', () => {
		const rows = [
			// `old` dominated early but is gone on the latest day; `new` leads now.
			{ key: 'old', day: 1_000_000_000_000, value: 1000 },
			{ key: 'new', day: 1_000_000_000_000, value: 1 },
			{ key: 'new', day: 1_000_086_400_000, value: 500 },
			{ key: 'old', day: 1_000_086_400_000, value: 0 }
		]
		const { stacks } = pivotSeries(rows, {
			keyOf: (r) => r.key,
			valueOf: (r) => r.value,
			dayMsOf: (r) => r.day,
			top: 1
		})
		expect(stacks).toEqual(['new'])
	})
	it('sums duplicate key/day points before charting and ranking', () => {
		const rows = [
			{ key: 'a', day: 1_000_000_000_000, value: 100 },
			{ key: 'a', day: 1_000_000_000_000, value: 25 },
			{ key: 'b', day: 1_000_000_000_000, value: 80 },
			{ key: 'a', day: 1_000_086_400_000, value: 10 },
			{ key: 'b', day: 1_000_086_400_000, value: 20 }
		]
		const { chartData, stacks } = pivotSeries(rows, {
			keyOf: (r) => r.key,
			valueOf: (r) => r.value,
			dayMsOf: (r) => r.day,
			top: 2
		})
		expect(stacks).toEqual(['b', 'a'])
		expect(chartData).toEqual([
			{ date: 1_000_000_000, b: 80, a: 125 },
			{ date: 1_000_086_400, b: 20, a: 10 }
		])
	})
	it('returns empty output for empty input', () => {
		expect(pivotSeries([], { keyOf: () => '', valueOf: () => 0, dayMsOf: () => 0 })).toEqual({
			chartData: [],
			stacks: []
		})
	})
})

describe('aggregateCategories', () => {
	it('buckets by tag, defaults untagged, and volume-weights price change', () => {
		const rows = [
			symbol({
				base: 'x',
				tags: ['rwa'],
				volume_24h_usd: 100,
				volume_prev_24h_usd: 80,
				oi_usd: 10,
				oi_prev_usd: 8,
				funding_avg_8h: 0.01,
				leverage_min: 2,
				leverage_max: 20,
				price_change_24h: 0.1,
				market_count: 2
			}),
			symbol({
				base: 'y',
				tags: ['rwa'],
				volume_24h_usd: 300,
				volume_prev_24h_usd: 240,
				oi_usd: 30,
				oi_prev_usd: 24,
				funding_avg_8h: 0.03,
				leverage_min: 1,
				leverage_max: 50,
				price_change_24h: 0.2,
				market_count: 3
			}),
			symbol({ base: 'z', tags: [], volume_24h_usd: 50, price_change_24h: -0.5, market_count: 1 })
		]
		const cats = aggregateCategories(rows)
		const rwa = cats.find((c) => c.tag === 'rwa')!
		const untagged = cats.find((c) => c.tag === 'untagged')!
		expect(rwa.token_count).toBe(2)
		expect(rwa.market_count).toBe(5)
		expect(rwa.volume_24h_usd).toBe(400)
		expect(rwa.volume_prev_24h_usd).toBe(320)
		expect(rwa.oi_usd).toBe(40)
		expect(rwa.oi_prev_usd).toBe(32)
		// (0.1*100 + 0.2*300) / 400 = 0.175
		expect(rwa.price_change_24h).toBeCloseTo(0.175)
		// (0.01*100 + 0.03*300) / 400 = 0.025
		expect(rwa.funding_avg_8h).toBeCloseTo(0.025)
		expect(rwa.leverage_min).toBe(1)
		expect(rwa.leverage_max).toBe(50)
		expect(untagged.token_count).toBe(1)
	})
})

describe('normalizeTokensList', () => {
	it('expands per-segment stats from the tokens list response', () => {
		const result = normalizeTokensList({
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
		expect(result.spot![0]).toMatchObject({
			base: 'btc',
			tags: ['layer1'],
			volume_24h_usd: 1000,
			volume_prev_24h_usd: 800
		})
		expect(result.linear_perp![0]).toMatchObject({
			oi_usd: 200,
			oi_prev_usd: 150,
			funding_avg_8h: 0.0001,
			leverage_max: 100
		})
	})
})

describe('normalizeCategoriesList', () => {
	it('handles the categories list response', () => {
		const result = normalizeCategoriesList({
			last_updated: '2026-06-10T00:00:00Z',
			categories: [
				{ category: 'rwa', segments: { spot: categorySegment({ volume_24h: 10, token_count: 4, market_count: 9 }) } }
			]
		})
		expect(result.spot![0]).toMatchObject({ tag: 'rwa', volume_24h_usd: 10, token_count: 4, market_count: 9 })
	})
	it('maps funding_rate_8h to funding_avg_8h', () => {
		const result = normalizeCategoriesList({
			last_updated: '2026-06-10T00:00:00Z',
			categories: [
				{ category: 'ai', segments: { linear_perp: categorySegment({ volume_24h: 1, funding_rate_8h: 0.00012 }) } }
			]
		})
		expect(result.linear_perp![0].funding_avg_8h).toBeCloseTo(0.00012)
	})
})

describe('normalizeExchangesList', () => {
	it('merges cex + dex per segment with prev-day fields', () => {
		const result = normalizeExchangesList({
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
		const rows = result.linear_perp!
		expect(rows).toHaveLength(2)
		const binance = rows.find((r) => r.exchange === 'binance')!
		expect(binance).toMatchObject({
			exchange_type: 'cex',
			volume_24h_usd: 100,
			volume_prev_24h_usd: 80,
			oi_usd: 50,
			oi_prev_usd: 40,
			market_count: 662
		})
		expect(rows.find((r) => r.exchange === 'hyperliquid')!.exchange_type).toBe('dex')
	})
})

describe('normalizeExchangeSeries', () => {
	it('reads an explicit segment', () => {
		const rows = normalizeExchangeSeries({
			days: 30,
			last_updated: '2026-06-10T00:00:00Z',
			series: [
				{
					day: 1_700_000_000,
					exchange: 'binance',
					exchange_type: 'cex',
					segment: 'linear_perp',
					volume_24h: 10,
					oi_usd: 5,
					market_count: 12
				}
			]
		})
		expect(rows[0]).toMatchObject({
			exchange: 'binance',
			exchange_type: 'cex',
			segment: 'linear_perp',
			volume_usd: 10,
			oi_usd: 5
		})
		expect(rows[0].day).toBe(1_700_000_000_000)
	})
})

describe('normalizeCategorySeries', () => {
	it('maps category series days to ms', () => {
		const rows = normalizeCategorySeries({
			days: 30,
			last_updated: '2026-06-10T00:00:00Z',
			series: [{ day: 1_700_000_000, category: 'rwa', segment: 'spot', volume_24h: 3, oi_usd: null, market_count: 2 }]
		})
		expect(rows[0]).toMatchObject({ tag: 'rwa', segment: 'spot', volume_usd: 3 })
		expect(rows[0].day).toBe(1_700_000_000_000)
	})
})

describe('normalizeCategoryPage', () => {
	it('reads summaries, segment-keyed tokens, and both series', () => {
		const page = normalizeCategoryPage({
			category: 'rwa',
			last_updated: '2026-06-10T00:00:00Z',
			segments: { spot: categorySegment({ volume_24h: 100, token_count: 2 }) },
			tokens: { spot: [{ symbol: 'ondo', tags: ['rwa'], ...tokenSegment({ volume_24h: 60, price: 1 }) }] },
			// the per-category page's own series omits the category (implied by the file)
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
		expect(page.tag).toBe('rwa')
		expect(page.summaries.spot).toMatchObject({ volume_24h_usd: 100, token_count: 2 })
		expect(page.tokens.spot![0]).toMatchObject({ base: 'ondo', tags: ['rwa'], volume_24h_usd: 60 })
		// tag is injected from the file name even though the rows omit it
		expect(page.series[0]).toMatchObject({ tag: 'rwa', segment: 'spot', volume_usd: 9 })
		expect(page.seriesByExchange[0]).toMatchObject({ exchange: 'binance', volume_usd: 4 })
		expect(page.seriesByPair[0]).toMatchObject({ pair: 'ondo-usdt', volume_usd: 3 })
	})
})
