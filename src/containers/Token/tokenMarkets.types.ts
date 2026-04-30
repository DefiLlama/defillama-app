export type TokenMarketCategory = 'spot' | 'linear_perp' | 'inverse_perp'
export type TokenMarketVenue = 'dex' | 'cex'

export interface TokenMarketPair {
	exchange: string
	exchange_type: TokenMarketVenue
	market_type: string
	contract_type: string
	base: string
	quote: string
	pair_id: string
	market_id: string
	pair_url: string | null
	symbol: string
	price: number | null
	volume_24h: number | null
	oi: number | null
	oi_usd: number | null
	funding_rate_8h: number | null
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
	last_updated?: string
	exchange_count?: number
	market_count?: number
	total_oi_usd?: number | null
	total_volume_24h?: number | null
	cex: TokenMarketsByCategory
	dex: TokenMarketsByCategory
	totals: Record<TokenMarketVenue, TokenMarketsTotalsByCategory>
}
