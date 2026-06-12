import { describe, expect, it } from 'vitest'
import type { ExchangeSeriesRow, SymbolStat, SymbolStatsBySegment } from '../types'
import {
	aggregateCategories,
	availableSegmentsFromRows,
	filterExchangeSeriesBySegment,
	filterRowsBySegment,
	moverValue,
	pctChange,
	pivotSeries,
	segmentAssetSummaries,
	segmentSubtitles,
	segmentTotals,
	selectMovers,
	sentiment,
	toLineSeries,
	topSymbols
} from '../utils'

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

describe('sentiment', () => {
	it('uses volume only on spot', () => {
		expect(sentiment(symbol({ volume_24h_usd: 130, volume_prev_24h_usd: 100 }), 'spot')).toBe('rising')
		expect(sentiment(symbol({ volume_24h_usd: 80, volume_prev_24h_usd: 100 }), 'spot')).toBe('fading')
		expect(sentiment(symbol({ volume_24h_usd: 105, volume_prev_24h_usd: 100 }), 'spot')).toBe('flat')
	})

	it('uses the volume/OI quadrant on perps', () => {
		const segment = 'linear_perp' as const
		const base = { volume_24h_usd: 130, volume_prev_24h_usd: 100, oi_usd: 110, oi_prev_usd: 100 }
		expect(sentiment(symbol(base), segment)).toBe('rising')
		expect(sentiment(symbol({ ...base, oi_usd: 90 }), segment)).toBe('churn')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 80 }), segment)).toBe('building')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 80, oi_usd: 90 }), segment)).toBe('fading')
		expect(sentiment(symbol({ ...base, volume_24h_usd: 101, oi_usd: 101 }), segment)).toBe('flat')
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

describe('segment row helpers', () => {
	it('finds available segments from complete segment records', () => {
		const rowsBySegment: SymbolStatsBySegment = {
			spot: [symbol({ base: 'spot-a' })],
			linear_perp: [],
			inverse_perp: [symbol({ base: 'inverse-a' })]
		}
		expect(availableSegmentsFromRows(rowsBySegment)).toEqual(['spot', 'inverse_perp'])
	})

	it('summarizes assets and volume for every segment', () => {
		const rowsBySegment: SymbolStatsBySegment = {
			spot: [symbol({ volume_24h_usd: 10 }), symbol({ volume_24h_usd: 15 })],
			linear_perp: [],
			inverse_perp: [symbol({ volume_24h_usd: 5 })]
		}
		expect(segmentAssetSummaries(rowsBySegment)).toEqual({
			spot: { assets: 2, volume: 25 },
			linear_perp: { assets: 0, volume: 0 },
			inverse_perp: { assets: 1, volume: 5 }
		})
	})

	it('formats segment subtitles from the same summaries', () => {
		const rowsBySegment: SymbolStatsBySegment = {
			spot: [symbol({ volume_24h_usd: 10 }), symbol({ volume_24h_usd: 15 })],
			linear_perp: [],
			inverse_perp: [symbol({ volume_24h_usd: 1_000_000 })]
		}
		expect(segmentSubtitles(rowsBySegment)).toEqual({
			spot: '2 assets · $25',
			linear_perp: '0 assets · $0',
			inverse_perp: '1 assets · $1m'
		})
	})

	it('filters series by segment without changing row order', () => {
		const rows = [
			{ segment: 'spot' as const, name: 'a' },
			{ segment: 'linear_perp' as const, name: 'b' },
			{ segment: 'spot' as const, name: 'c' }
		]
		expect(filterRowsBySegment(rows, 'spot').map((row) => row.name)).toEqual(['a', 'c'])
	})

	it('filters exchange series case-insensitively and excludes other segments', () => {
		const rows: ExchangeSeriesRow[] = [
			{
				dayMs: 1000,
				exchange: 'Binance',
				exchange_type: 'cex',
				segment: 'spot',
				volume_usd: 10,
				oi_usd: null,
				market_count: 1
			},
			{
				dayMs: 1000,
				exchange: 'binance',
				exchange_type: 'cex',
				segment: 'linear_perp',
				volume_usd: 20,
				oi_usd: 5,
				market_count: 2
			},
			{
				dayMs: 1000,
				exchange: 'okx',
				exchange_type: 'cex',
				segment: 'linear_perp',
				volume_usd: 30,
				oi_usd: 6,
				market_count: 3
			}
		]
		expect(filterExchangeSeriesBySegment(rows, 'linear_perp', 'BINANCE')).toEqual([rows[1]])
	})
})

describe('segmentTotals', () => {
	it('sums required fields directly and nullable fields when present', () => {
		const totals = segmentTotals([
			symbol({ volume_24h_usd: 10, volume_prev_24h_usd: null, oi_usd: null, oi_prev_usd: 3, market_count: 2 }),
			symbol({ volume_24h_usd: 20, volume_prev_24h_usd: 5, oi_usd: 7, oi_prev_usd: null, market_count: 4 })
		])
		expect(totals).toEqual({
			volume_24h_usd: 30,
			volume_prev_24h_usd: 5,
			oi_usd: 7,
			oi_prev_usd: 3,
			market_count: 6,
			asset_count: 2
		})
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
		expect(stacks).toEqual(['a', 'b'])
		expect(chartData).toHaveLength(2)
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

describe('toLineSeries', () => {
	it('preserves pivot dates and fills missing stack values with zero', () => {
		const series = toLineSeries({
			stacks: ['a'],
			chartData: [{ date: 1, a: 10 }, { date: 2 }]
		})
		expect(series).toHaveLength(1)
		expect(series[0]).toMatchObject({
			name: 'a',
			type: 'line',
			data: [
				[1, 10],
				[2, 0]
			],
			areaStyle: { opacity: 0 }
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
		expect(rwa.price_change_24h).toBeCloseTo(0.175)
		expect(rwa.funding_avg_8h).toBeCloseTo(0.025)
		expect(rwa.leverage_min).toBe(1)
		expect(rwa.leverage_max).toBe(50)
		expect(untagged.token_count).toBe(1)
	})
})
