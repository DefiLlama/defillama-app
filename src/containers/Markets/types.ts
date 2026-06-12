/**
 * Markets feature types.
 *
 * Presentation types are consumed by the UI. Markets-server response DTOs live
 * in api.types.ts.
 */

export type Segment = 'spot' | 'linear_perp' | 'inverse_perp'

// ---------------------------------------------------------------------------
// Clean internal types
// ---------------------------------------------------------------------------

/** One base symbol, merged across every exchange in a segment. */
export interface SymbolStat {
	base: string
	tags: string[]
	price: number | null
	/** fraction, e.g. 0.05 => +5% */
	price_change_24h: number | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	funding_avg_8h: number | null
	leverage_min: number | null
	leverage_max: number | null
	market_count: number
	exchange_count: number
}

/** One category, merged across its tokens in a segment. */
export interface CategoryStat {
	tag: string
	/** volume-weighted mean of the category's token price changes */
	price_change_24h: number | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	/** volume-weighted across the category's tokens */
	funding_avg_8h: number | null
	leverage_min: number | null
	leverage_max: number | null
	token_count: number
	market_count: number
}

/** One venue's merged totals for a segment (homepage exchanges table). */
export interface ExchangeListRow {
	exchange: string
	exchange_type: 'cex' | 'dex'
	defillama_slug: string | null
	volume_24h_usd: number
	volume_prev_24h_usd: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	market_count: number
}

/** Daily 30d point for the by-exchange charts. `day` is unix milliseconds. */
export interface ExchangeSeriesRow {
	day: number
	exchange: string
	exchange_type: 'cex' | 'dex'
	segment: Segment
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

/** Daily 30d point for the by-category charts. `day` is unix milliseconds. */
export interface CategorySeriesRow {
	day: number
	segment: Segment
	tag: string
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

/** Daily 30d point for a single trading pair (category page by-pair charts). */
export interface PairSeriesRow {
	day: number
	segment: Segment
	pair: string
	volume_usd: number
	oi_usd: number | null
	market_count: number
}

export type SymbolStatsBySegment = Partial<Record<Segment, SymbolStat[]>>
export type CategoryStatsBySegment = Partial<Record<Segment, CategoryStat[]>>

export interface CategoryPageData {
	tag: string
	last_updated: string
	summaries: Partial<Record<Segment, CategoryStat>>
	tokens: SymbolStatsBySegment
	seriesByExchange: ExchangeSeriesRow[]
	seriesByPair: PairSeriesRow[]
	series: CategorySeriesRow[]
}
