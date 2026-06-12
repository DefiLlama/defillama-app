export type TokenMarketCategory = 'spot' | 'linear_perp' | 'inverse_perp'
export type TokenMarketVenue = 'dex' | 'cex'

export interface TokenMarketSegmentSummary {
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

export interface TokenMarketPair {
	exchange: string
	exchange_type: TokenMarketVenue
	market_type: 'spot' | 'perpetual'
	contract_type: '' | 'linear' | 'inverse'
	base: string
	quote: string
	settle_asset: string | null
	pair_id: string
	market_id: string
	pair_url: string | null
	symbol: string
	price: number | null
	price_change_24h: number | null
	volume_24h: number | null
	volume_prev_24h: number | null
	oi: number | null
	oi_usd: number | null
	oi_prev_usd: number | null
	funding_rate_8h: number | null
	funding_period_h: number | null
	max_leverage: number | null
	maker_fee: number | null
	taker_fee: number | null
	amount_precision: number | null
	price_precision: number | null
	contract_size: number | null
	expiry_ts: number | null
	listed_ts: number | null
	min_order_cost: number | null
}

export interface TokenMarketCategoryTotals {
	pair_count: number
	total_volume_24h: number | null
	total_oi_usd: number | null
}

export type TokenMarketsByCategory = Record<TokenMarketCategory, TokenMarketPair[]>
export type TokenMarketsTotalsByCategory = Record<TokenMarketCategory, TokenMarketCategoryTotals>

export interface TokenMarketsResponse {
	symbol: string
	last_updated: string
	exchange_count: number
	market_count: number
	segments: Partial<Record<TokenMarketCategory, TokenMarketSegmentSummary>>
	tags: string[]
	total_oi_usd: number | null
	total_volume_24h: number
	cex: TokenMarketsByCategory
	dex: TokenMarketsByCategory
	totals: Record<TokenMarketVenue, TokenMarketsTotalsByCategory>
}

export interface TokenMarketsListEntry {
	exchange_count: number
	market_count: number
	segments: Partial<Record<TokenMarketCategory, TokenMarketSegmentSummary>>
	symbol: string
	tags: string[]
	total_oi_usd: number | null
	total_volume_24h: number
}

export interface TokenMarketsListResponse {
	last_updated: string
	tokens: TokenMarketsListEntry[]
}
