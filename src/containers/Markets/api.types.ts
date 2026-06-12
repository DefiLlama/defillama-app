import type { Segment } from './types'

export interface MarketsTokenSegmentStat {
	exchange_count: number
	funding_rate_8h: number | null
	leverage_max: number | null
	leverage_min: number | null
	market_count: number
	oi_prev_usd: number | null
	oi_usd: number | null
	price: number | null
	price_change_24h: number | null
	volume_24h: number
	volume_prev_24h: number | null
}

interface MarketsTokenEntry {
	exchange_count: number
	market_count: number
	segments: Partial<Record<Segment, MarketsTokenSegmentStat>>
	symbol: string
	tags: string[]
	total_oi_usd: number | null
	total_volume_24h: number
}

export interface MarketsTokensListResponse {
	last_updated: string
	tokens: MarketsTokenEntry[]
}

export interface MarketsCategorySegmentStat {
	funding_rate_8h: number | null
	leverage_max: number | null
	leverage_min: number | null
	market_count: number
	oi_prev_usd: number | null
	oi_usd: number | null
	price_change_24h: number | null
	token_count: number
	volume_24h: number
	volume_prev_24h: number | null
}

interface MarketsCategoryEntry {
	category: string
	segments: Partial<Record<Segment, MarketsCategorySegmentStat>>
}

export interface MarketsCategoriesListResponse {
	categories: MarketsCategoryEntry[]
	last_updated: string
}

export interface MarketsExchangeListEntry {
	defillama_slug: string | null
	exchange: string
	market_count: number
	total_oi_prev_usd?: number | null
	total_oi_usd?: number | null
	total_volume_24h: number
	total_volume_prev_24h: number | null
}

interface MarketsExchangeListTotals {
	exchange_count: number
	total_oi_prev_usd: number | null
	total_oi_usd: number | null
	total_volume_24h: number
	total_volume_prev_24h: number | null
}

export interface MarketsExchangesListResponse {
	cex: Record<Segment, MarketsExchangeListEntry[]>
	dex: Record<Segment, MarketsExchangeListEntry[]>
	last_updated: string
	totals: Record<'cex' | 'dex', Record<Segment, MarketsExchangeListTotals>>
}

interface MarketsExchangeSeriesApiRow {
	day: number
	exchange: string
	exchange_type: 'cex' | 'dex'
	market_count: number
	oi_usd: number | null
	segment: Segment
	volume_24h: number
}

export interface MarketsExchangeSeriesResponse {
	days: number
	last_updated: string
	series: MarketsExchangeSeriesApiRow[]
}

interface MarketsCategorySeriesApiRow {
	category: string
	day: number
	market_count: number
	oi_usd: number | null
	segment: Segment
	volume_24h: number
}

export interface MarketsCategoriesSeriesResponse {
	days: number
	last_updated: string
	series: MarketsCategorySeriesApiRow[]
}

export interface MarketsCategoryPageSeriesApiRow {
	day: number
	market_count: number
	oi_usd: number | null
	segment: Segment
	volume_24h: number
}

export interface MarketsCategoryPageExchangeSeriesApiRow extends MarketsCategoryPageSeriesApiRow {
	exchange: string
	exchange_type: 'cex' | 'dex'
}

export interface MarketsCategoryPagePairSeriesApiRow extends MarketsCategoryPageSeriesApiRow {
	pair: string
}

export interface MarketsCategoryTokenRow extends MarketsTokenSegmentStat {
	symbol: string
	tags: string[]
}

export interface MarketsCategoryPageResponse {
	category: string
	last_updated: string
	segments: Partial<Record<Segment, MarketsCategorySegmentStat>>
	series: MarketsCategoryPageSeriesApiRow[]
	series_by_exchange: MarketsCategoryPageExchangeSeriesApiRow[]
	series_by_pair: MarketsCategoryPagePairSeriesApiRow[]
	tokens: Partial<Record<Segment, MarketsCategoryTokenRow[]>>
}
