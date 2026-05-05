import type { TokenMarketCategory, TokenMarketPair, TokenMarketVenue } from '~/containers/Token/tokenMarkets.types'

export type ExchangeMarketCategory = TokenMarketCategory
export type ExchangeMarketVenue = TokenMarketVenue
export type ExchangeMarketPair = TokenMarketPair

export interface ExchangeMarketsListEntry {
	defillama_slug: string | null
	exchange: string
	market_count: number
	supports_funding?: boolean
	supports_oi?: boolean
	total_oi_usd?: number | null
	total_volume_24h: number | null
}

export interface ExchangeMarketsListCategoryTotals {
	exchange_count: number
	total_oi_usd: number | null
	total_volume_24h: number | null
}

export type ExchangeMarketsListByCategory = Record<ExchangeMarketCategory, ExchangeMarketsListEntry[]>
export type ExchangeMarketsListTotalsByCategory = Record<ExchangeMarketCategory, ExchangeMarketsListCategoryTotals>

export interface ExchangeMarketsListResponse {
	last_updated?: string
	cex: ExchangeMarketsListByCategory
	dex: ExchangeMarketsListByCategory
	totals: Record<ExchangeMarketVenue, ExchangeMarketsListTotalsByCategory>
}

export interface ExchangeMarketCategoryData {
	market_count: number
	pairs: ExchangeMarketPair[]
	total_oi_usd: number | null
	total_volume_24h: number | null
}

export interface ExchangeMarketsResponse {
	categories: Partial<Record<ExchangeMarketCategory, ExchangeMarketCategoryData>>
	defillama_slug: string | null
	exchange: string
	exchange_type: ExchangeMarketVenue
	last_updated?: string
	market_count: number
	market_types: string[]
	supports_funding: boolean
	supports_oi: boolean
	total_oi_usd: number | null
	total_volume_24h: number | null
}
