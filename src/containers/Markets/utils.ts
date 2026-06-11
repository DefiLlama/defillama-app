/**
 * Markets feature — pure presentation logic (no React, no IO).
 *
 * Ported from the reference implementation. Sentiment / mover thresholds are heuristics that
 * live entirely on the client — the server only ships raw now/prev pairs, so these can be tuned
 * freely without any backend change.
 */
import type { CategorySeriesRow, CategoryStat, ExchangeSeriesRow, PairSeriesRow, Segment, SymbolStat } from './types'

export const SENT_VOL_T = 0.1
export const SENT_OI_T = 0.05
/** Ignore dust rows (under $1M 24h volume) in the movers panels. */
export const MOVER_MIN_VOL = 1_000_000
export const MOVER_ROWS = 5
export const TOP_N = 100
/** Top N series kept in a breakdown chart (ranked by latest-day value); the rest are dropped. */
export const SERIES_TOP = 25

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

export interface Movers<T> {
	gainers: T[]
	losers: T[]
}

/** Top/bottom movers for a metric, ignoring dust and rows with no value. */
export function selectMovers<T extends MoverInput>(rows: T[], key: MoverMetricKey, count = MOVER_ROWS): Movers<T> {
	const eligible = rows
		.filter((r) => r.volume_24h_usd >= MOVER_MIN_VOL && moverValue(r, key) != null)
		.sort((a, b) => (moverValue(b, key) as number) - (moverValue(a, key) as number))
	return {
		gainers: eligible.slice(0, count),
		losers: eligible.slice(-count).reverse()
	}
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface SegmentTotals {
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
		totals.volume_24h_usd += r.volume_24h_usd || 0
		totals.volume_prev_24h_usd += r.volume_prev_24h_usd || 0
		totals.oi_usd += r.oi_usd || 0
		totals.oi_prev_usd += r.oi_prev_usd || 0
		totals.market_count += r.market_count || 0
	}
	return totals
}

/** Top N symbols by volume or open interest. */
export function topSymbols(rows: SymbolStat[], sortBy: 'volume' | 'oi', limit = TOP_N): SymbolStat[] {
	return rows
		.slice()
		.sort((a, b) =>
			sortBy === 'oi' ? (b.oi_usd ?? 0) - (a.oi_usd ?? 0) : (b.volume_24h_usd ?? 0) - (a.volume_24h_usd ?? 0)
		)
		.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Series pivot (for stacked area charts)
// ---------------------------------------------------------------------------

export interface PivotedSeries {
	/** `date` is unix SECONDS (AreaChart multiplies by 1e3 internally). */
	chartData: Array<Record<string, number>>
	stacks: string[]
}

export type SeriesMetric = 'volume' | 'oi' | 'markets'

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
	const days = new Set<number>()

	for (const row of rows) {
		const key = keyOf(row)
		const dayMs = dayMsOf(row)
		const value = valueOf(row) || 0
		days.add(dayMs)
		let perDay = byKey.get(key)
		if (!perDay) {
			perDay = new Map()
			byKey.set(key, perDay)
		}
		perDay.set(dayMs, (perDay.get(dayMs) ?? 0) + value)
	}

	const sortedDays = [...days].sort((a, b) => a - b)
	const latestDay = sortedDays[sortedDays.length - 1]
	// Rank by latest-day value (tie-break on overall total so ordering stays stable).
	const totalOf = (m: Map<number, number>) => [...m.values()].reduce((a, b) => a + b, 0)
	const ranked = [...byKey.entries()]
		.sort((a, b) => (b[1].get(latestDay) ?? 0) - (a[1].get(latestDay) ?? 0) || totalOf(b[1]) - totalOf(a[1]))
		.map(([k]) => k)
	const topKeys = ranked.slice(0, top)

	const chartData = sortedDays.map((dayMs) => {
		const point: Record<string, number> = { date: Math.floor(dayMs / 1000) }
		for (const key of topKeys) point[key] = byKey.get(key)?.get(dayMs) ?? 0
		return point
	})

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
		dayMsOf: (r) => r.day
	})
}

export function pivotCategorySeries(rows: CategorySeriesRow[], metric: SeriesMetric): PivotedSeries {
	return pivotSeries(rows, {
		keyOf: (r) => r.tag,
		valueOf: (r) => metricValue(metric, r.volume_usd, r.oi_usd, r.market_count),
		dayMsOf: (r) => r.day
	})
}

export function pivotPairSeries(rows: PairSeriesRow[], metric: SeriesMetric): PivotedSeries {
	return pivotSeries(rows, {
		keyOf: (r) => r.pair,
		valueOf: (r) => metricValue(metric, r.volume_usd, r.oi_usd, r.market_count),
		dayMsOf: (r) => r.day
	})
}

// Line-series conversion (for non-stacked charts like market-count trends) --

const SERIES_PALETTE_SIZE = 26

/** Deterministic muted categorical colour for series index `i`. */
export function seriesColor(i: number): string {
	return `hsl(${((i * 360) / SERIES_PALETTE_SIZE + 210) % 360}, 45%, 55%)`
}

export interface LineSeries {
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

/** Volume-weighted mean of a per-token field, skipping null values and zero-volume rows. */
function volumeWeightedMean(rows: SymbolStat[], valueOf: (r: SymbolStat) => number | null): number | null {
	let weightedSum = 0
	let weight = 0
	for (const r of rows) {
		const value = valueOf(r)
		if (value == null || !(r.volume_24h_usd > 0)) continue
		weightedSum += value * r.volume_24h_usd
		weight += r.volume_24h_usd
	}
	return weight > 0 ? weightedSum / weight : null
}

/** Volume-weighted mean of token price changes (used when the server omits it). */
export function volumeWeightedPriceChange(rows: SymbolStat[]): number | null {
	return volumeWeightedMean(rows, (r) => r.price_change_24h)
}

/** Leverage min/max across a set of rows. */
export function leverageRange(rows: Array<{ leverage_min: number | null; leverage_max: number | null }>): {
	min: number | null
	max: number | null
} {
	let min: number | null = null
	let max: number | null = null
	for (const r of rows) {
		if (r.leverage_min != null) min = min == null ? r.leverage_min : Math.min(min, r.leverage_min)
		if (r.leverage_max != null) max = max == null ? r.leverage_max : Math.max(max, r.leverage_max)
	}
	return { min, max }
}

/** Derive per-category stats from symbol rows (fallback when categories/list is unavailable). */
export function aggregateCategories(rows: SymbolStat[]): CategoryStat[] {
	const byTag = new Map<string, SymbolStat[]>()
	for (const row of rows) {
		for (const tag of row.tags.length ? row.tags : ['untagged']) {
			let list = byTag.get(tag)
			if (!list) {
				list = []
				byTag.set(tag, list)
			}
			list.push(row)
		}
	}

	const out: CategoryStat[] = []
	for (const [tag, list] of byTag) {
		const lev = leverageRange(list)
		out.push({
			tag,
			price_change_24h: volumeWeightedPriceChange(list),
			volume_24h_usd: list.reduce((a, r) => a + (r.volume_24h_usd || 0), 0),
			volume_prev_24h_usd: list.reduce((a, r) => a + (r.volume_prev_24h_usd || 0), 0),
			oi_usd: list.some((r) => r.oi_usd != null) ? list.reduce((a, r) => a + (r.oi_usd || 0), 0) : null,
			oi_prev_usd: list.some((r) => r.oi_prev_usd != null) ? list.reduce((a, r) => a + (r.oi_prev_usd || 0), 0) : null,
			funding_avg_8h: volumeWeightedMean(list, (r) => r.funding_avg_8h),
			leverage_min: lev.min,
			leverage_max: lev.max,
			token_count: list.length,
			market_count: list.reduce((a, r) => a + (r.market_count || 0), 0)
		})
	}
	return out.sort((a, b) => b.volume_24h_usd - a.volume_24h_usd)
}
