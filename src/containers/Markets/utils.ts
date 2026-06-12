/**
 * Markets feature — pure presentation logic (no React, no IO).
 *
 * Ported from the reference implementation. Sentiment / mover thresholds are heuristics that
 * live entirely on the client — the server only ships raw now/prev pairs, so these can be tuned
 * freely without any backend change.
 */
import { formattedNum } from '~/utils'
import { type Segment, recordBySegment, SEGMENT_IDS } from './segments'
import type {
	CategorySeriesRow,
	CategoryStat,
	ExchangeSeriesRow,
	PairSeriesRow,
	SymbolStat,
	SymbolStatsBySegment
} from './types'

const SENT_VOL_T = 0.1
const SENT_OI_T = 0.05
/** Ignore dust rows (under $1M 24h volume) in the movers panels. */
const MOVER_MIN_VOL = 1_000_000
const MOVER_ROWS = 5
export const TOP_N = 100
/** Top N series kept in a breakdown chart (ranked by latest-day value); the rest are dropped. */
const SERIES_TOP = 25

/** Fractional change, e.g. 0.05 => +5%. Null when prev is missing/non-positive. */
export function pctChange(now: number | null | undefined, prev: number | null | undefined): number | null {
	if (now == null || prev == null || !(prev > 0)) return null
	return now / prev - 1
}

/** Convert a fraction (0.05) to a percent (5) for the <PercentChange> component. */
export function toPercent(fraction: number | null): number | null {
	return fraction == null ? null : fraction * 100
}

// ---------------------------------------------------------------------------
// Sentiment
// ---------------------------------------------------------------------------

export type Sentiment = 'rising' | 'churn' | 'building' | 'fading' | 'flat'

interface SentimentInput {
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
}

export function sentiment(row: SentimentInput, segment: Segment): Sentiment {
	const v = pctChange(row.volume_24h_usd, row.volume_prev_24h_usd)
	if (segment === 'spot') {
		if (v == null) return 'flat'
		if (v > SENT_VOL_T) return 'rising'
		if (v < -SENT_VOL_T) return 'fading'
		return 'flat'
	}
	const o = pctChange(row.oi_usd, row.oi_prev_usd)
	if (v == null || o == null) return 'flat'
	if (v > SENT_VOL_T && o > SENT_OI_T) return 'rising'
	if (v > SENT_VOL_T && o < -SENT_OI_T) return 'churn'
	if (v < -SENT_VOL_T && o > SENT_OI_T) return 'building'
	if (v < -SENT_VOL_T && o < -SENT_OI_T) return 'fading'
	return 'flat'
}

export const SENTIMENT_TITLE: Record<Sentiment, string> = {
	rising: 'volume ↑ + OI ↑ — interest building',
	churn: 'volume ↑ + OI ↓ — activity but positions closing',
	building: 'volume ↓ + OI ↑ — quiet position growth',
	fading: 'volume ↓ + OI ↓ — interest leaving',
	flat: 'no significant change'
}

/** Count rising / fading / churn / building / flat across the supplied rows. */
export function sentimentCounts(rows: SentimentInput[], segment: Segment): Record<Sentiment, number> {
	const counts: Record<Sentiment, number> = { rising: 0, churn: 0, building: 0, fading: 0, flat: 0 }
	for (const row of rows) counts[sentiment(row, segment)] += 1
	return counts
}

// ---------------------------------------------------------------------------
// Movers
// ---------------------------------------------------------------------------

export type MoverMetricKey = 'price' | 'volume' | 'oi'

export const MOVER_METRICS: ReadonlyArray<{ key: MoverMetricKey; label: string; perpOnly?: boolean }> = [
	{ key: 'price', label: 'Price Δ' },
	{ key: 'volume', label: 'Volume Δ' },
	{ key: 'oi', label: 'OI Δ', perpOnly: true }
]

interface MoverInput {
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	price_change_24h?: number | null
}

/** Fractional change for a given metric, or null when not computable. */
export function moverValue(row: MoverInput, key: MoverMetricKey): number | null {
	if (key === 'price') return row.price_change_24h ?? null
	if (key === 'volume') return pctChange(row.volume_24h_usd, row.volume_prev_24h_usd)
	return pctChange(row.oi_usd, row.oi_prev_usd)
}

interface Movers<T> {
	gainers: T[]
	losers: T[]
}

/** Top/bottom movers for a metric, ignoring dust and rows with no value. */
export function selectMovers<T extends MoverInput>(rows: T[], key: MoverMetricKey, count = MOVER_ROWS): Movers<T> {
	const eligible = rows
		.filter((row) => row.volume_24h_usd >= MOVER_MIN_VOL && moverValue(row, key) != null)
		.sort((a, b) => (moverValue(b, key) as number) - (moverValue(a, key) as number))
	return {
		gainers: eligible.slice(0, count),
		losers: eligible.slice(-count).reverse()
	}
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

interface SegmentTotals {
	volume_24h_usd: number
	volume_prev_24h_usd: number
	oi_usd: number
	oi_prev_usd: number
	market_count: number
	asset_count: number
}

export function segmentTotals(rows: SymbolStat[]): SegmentTotals {
	const totals: SegmentTotals = {
		volume_24h_usd: 0,
		volume_prev_24h_usd: 0,
		oi_usd: 0,
		oi_prev_usd: 0,
		market_count: 0,
		asset_count: rows.length
	}
	for (const r of rows) {
		totals.volume_24h_usd += r.volume_24h_usd
		totals.volume_prev_24h_usd += r.volume_prev_24h_usd ?? 0
		totals.oi_usd += r.oi_usd ?? 0
		totals.oi_prev_usd += r.oi_prev_usd ?? 0
		totals.market_count += r.market_count
	}
	return totals
}

/** Top N symbols by volume or open interest. */
export function topSymbols(rows: SymbolStat[], sortBy: 'volume' | 'oi', limit = TOP_N): SymbolStat[] {
	return rows
		.slice()
		.sort((a, b) => (sortBy === 'oi' ? (b.oi_usd ?? 0) - (a.oi_usd ?? 0) : b.volume_24h_usd - a.volume_24h_usd))
		.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Segment row helpers
// ---------------------------------------------------------------------------

export function availableSegmentsFromRows<T>(rowsBySegment: Record<Segment, readonly T[]>): Segment[] {
	const segments: Segment[] = []
	for (const segment of SEGMENT_IDS) {
		if (rowsBySegment[segment].length > 0) segments.push(segment)
	}
	return segments
}

export function segmentAssetSummaries(
	rowsBySegment: SymbolStatsBySegment
): Record<Segment, { assets: number; volume: number }> {
	const summaries = recordBySegment(() => ({ assets: 0, volume: 0 }))

	for (const segment of SEGMENT_IDS) {
		const rows = rowsBySegment[segment]
		let volume = 0
		for (const row of rows) volume += row.volume_24h_usd
		summaries[segment] = { assets: rows.length, volume }
	}

	return summaries
}

export function segmentSubtitles(rowsBySegment: SymbolStatsBySegment): Record<Segment, string> {
	const summaries = segmentAssetSummaries(rowsBySegment)
	return recordBySegment((segment) => {
		const summary = summaries[segment]
		return `${summary.assets} assets · ${formattedNum(summary.volume, true)}`
	})
}

export function filterRowsBySegment<T extends { segment: Segment }>(rows: T[], segment: Segment): T[] {
	const filtered: T[] = []
	for (const row of rows) {
		if (row.segment === segment) filtered.push(row)
	}
	return filtered
}

export function filterExchangeSeriesBySegment(
	rows: ExchangeSeriesRow[],
	segment: Segment,
	exchange: string
): ExchangeSeriesRow[] {
	const exchangeKey = exchange.toLowerCase()
	const filtered: ExchangeSeriesRow[] = []
	for (const row of rows) {
		if (row.exchange.toLowerCase() === exchangeKey && row.segment === segment) filtered.push(row)
	}
	return filtered
}

// ---------------------------------------------------------------------------
// Series pivot (for stacked area charts)
// ---------------------------------------------------------------------------

export interface PivotedSeries {
	/** `date` is unix SECONDS (AreaChart multiplies by 1e3 internally). */
	chartData: Array<Record<string, number>>
	stacks: string[]
}

export const EMPTY_PIVOTED_SERIES: PivotedSeries = { chartData: [], stacks: [] }

type SeriesMetric = 'volume' | 'oi' | 'markets'

interface PivotOptions<T> {
	keyOf: (row: T) => string
	valueOf: (row: T) => number
	dayMsOf: (row: T) => number
	top?: number
}

/**
 * Pivot flat (key, day, value) rows into chart columns: keep the top N keys ranked by their value
 * on the latest day and drop the rest (no "other" bucket), so a series that stopped trading recently
 * disappears instead of inflating an aggregate.
 */
export function pivotSeries<T>(
	rows: T[],
	{ keyOf, valueOf, dayMsOf, top = SERIES_TOP }: PivotOptions<T>
): PivotedSeries {
	if (rows.length === 0) return { chartData: [], stacks: [] }

	const byKey = new Map<string, Map<number, number>>()
	const totalByKey = new Map<string, number>()
	const days = new Set<number>()

	for (const row of rows) {
		const key = keyOf(row)
		const dayMs = dayMsOf(row)
		const value = valueOf(row)
		days.add(dayMs)
		let perDay = byKey.get(key)
		if (!perDay) {
			perDay = new Map()
			byKey.set(key, perDay)
		}
		perDay.set(dayMs, (perDay.get(dayMs) ?? 0) + value)
		totalByKey.set(key, (totalByKey.get(key) ?? 0) + value)
	}

	const sortedDays = [...days].sort((a, b) => a - b)
	const latestDay = sortedDays[sortedDays.length - 1]
	// Rank by latest-day value (tie-break on overall total so ordering stays stable).
	const ranked = [...byKey.keys()].sort((a, b) => {
		const aValues = byKey.get(a)!
		const bValues = byKey.get(b)!
		return (
			(bValues.get(latestDay) ?? 0) - (aValues.get(latestDay) ?? 0) ||
			(totalByKey.get(b) ?? 0) - (totalByKey.get(a) ?? 0)
		)
	})
	const topKeys = ranked.slice(0, top)

	const chartData = new Array<Record<string, number>>(sortedDays.length)
	for (let i = 0; i < sortedDays.length; i++) {
		const dayMs = sortedDays[i]
		const point: Record<string, number> = { date: Math.floor(dayMs / 1000) }
		for (const key of topKeys) point[key] = byKey.get(key)?.get(dayMs) ?? 0
		chartData[i] = point
	}

	return { chartData, stacks: topKeys }
}

function metricValue(metric: SeriesMetric, volume: number, oi: number | null, markets: number): number {
	if (metric === 'oi') return oi ?? 0
	if (metric === 'markets') return markets
	return volume
}

// Convenience pivots bound to the concrete series row shapes ----------------

export function pivotExchangeSeries(rows: ExchangeSeriesRow[], metric: SeriesMetric): PivotedSeries {
	return pivotSeries(rows, {
		keyOf: (r) => r.exchange,
		valueOf: (r) => metricValue(metric, r.volume_usd, r.oi_usd, r.market_count),
		dayMsOf: (r) => r.dayMs
	})
}

export function pivotCategorySeries(rows: CategorySeriesRow[], metric: SeriesMetric): PivotedSeries {
	return pivotSeries(rows, {
		keyOf: (r) => r.tag,
		valueOf: (r) => metricValue(metric, r.volume_usd, r.oi_usd, r.market_count),
		dayMsOf: (r) => r.dayMs
	})
}

export function pivotPairSeries(rows: PairSeriesRow[], metric: SeriesMetric): PivotedSeries {
	return pivotSeries(rows, {
		keyOf: (r) => r.pair,
		valueOf: (r) => metricValue(metric, r.volume_usd, r.oi_usd, r.market_count),
		dayMsOf: (r) => r.dayMs
	})
}

// Line-series conversion (for non-stacked charts like market-count trends) --

const SERIES_PALETTE_SIZE = 26

/** Deterministic muted categorical colour for series index `i`. */
function seriesColor(i: number): string {
	return `hsl(${((i * 360) / SERIES_PALETTE_SIZE + 210) % 360}, 45%, 55%)`
}

interface LineSeries {
	name: string
	type: 'line'
	color: string
	data: Array<[number, number]>
	/** `{ opacity: 0 }` keeps MultiSeriesChart from adding its default gradient fill (clean lines). */
	areaStyle: { opacity: number }
}

/** Convert pivoted columns into MultiSeriesChart (non-stacked, no-fill) line series. */
export function toLineSeries(pivoted: PivotedSeries): LineSeries[] {
	return pivoted.stacks.map((name, i) => ({
		name,
		type: 'line' as const,
		color: seriesColor(i),
		data: pivoted.chartData.map((point) => [point.date, point[name] ?? 0] as [number, number]),
		areaStyle: { opacity: 0 }
	}))
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

/** Derive per-category stats from symbol rows (fallback when categories/list is unavailable). */
export function aggregateCategories(rows: SymbolStat[]): CategoryStat[] {
	interface CategoryAccumulator {
		priceWeightedSum: number
		priceWeight: number
		volume_24h_usd: number
		volume_prev_24h_usd: number
		oi_usd: number
		oi_prev_usd: number
		hasOi: boolean
		hasOiPrev: boolean
		fundingWeightedSum: number
		fundingWeight: number
		leverage_min: number | null
		leverage_max: number | null
		token_count: number
		market_count: number
	}

	const byTag = new Map<string, CategoryAccumulator>()
	for (const row of rows) {
		for (const tag of row.tags.length ? row.tags : ['untagged']) {
			let acc = byTag.get(tag)
			if (!acc) {
				acc = {
					priceWeightedSum: 0,
					priceWeight: 0,
					volume_24h_usd: 0,
					volume_prev_24h_usd: 0,
					oi_usd: 0,
					oi_prev_usd: 0,
					hasOi: false,
					hasOiPrev: false,
					fundingWeightedSum: 0,
					fundingWeight: 0,
					leverage_min: null,
					leverage_max: null,
					token_count: 0,
					market_count: 0
				}
				byTag.set(tag, acc)
			}
			acc.volume_24h_usd += row.volume_24h_usd
			acc.volume_prev_24h_usd += row.volume_prev_24h_usd ?? 0
			if (row.oi_usd != null) {
				acc.hasOi = true
				acc.oi_usd += row.oi_usd
			}
			if (row.oi_prev_usd != null) {
				acc.hasOiPrev = true
				acc.oi_prev_usd += row.oi_prev_usd
			}
			if (row.price_change_24h != null && row.volume_24h_usd > 0) {
				acc.priceWeightedSum += row.price_change_24h * row.volume_24h_usd
				acc.priceWeight += row.volume_24h_usd
			}
			if (row.funding_avg_8h != null && row.volume_24h_usd > 0) {
				acc.fundingWeightedSum += row.funding_avg_8h * row.volume_24h_usd
				acc.fundingWeight += row.volume_24h_usd
			}
			if (row.leverage_min != null) {
				acc.leverage_min = acc.leverage_min == null ? row.leverage_min : Math.min(acc.leverage_min, row.leverage_min)
			}
			if (row.leverage_max != null) {
				acc.leverage_max = acc.leverage_max == null ? row.leverage_max : Math.max(acc.leverage_max, row.leverage_max)
			}
			acc.token_count += 1
			acc.market_count += row.market_count
		}
	}

	const out: CategoryStat[] = []
	for (const [tag, acc] of byTag) {
		out.push({
			tag,
			price_change_24h: acc.priceWeight > 0 ? acc.priceWeightedSum / acc.priceWeight : null,
			volume_24h_usd: acc.volume_24h_usd,
			volume_prev_24h_usd: acc.volume_prev_24h_usd,
			oi_usd: acc.hasOi ? acc.oi_usd : null,
			oi_prev_usd: acc.hasOiPrev ? acc.oi_prev_usd : null,
			funding_avg_8h: acc.fundingWeight > 0 ? acc.fundingWeightedSum / acc.fundingWeight : null,
			leverage_min: acc.leverage_min,
			leverage_max: acc.leverage_max,
			token_count: acc.token_count,
			market_count: acc.market_count
		})
	}
	return out.sort((a, b) => b.volume_24h_usd - a.volume_24h_usd)
}
