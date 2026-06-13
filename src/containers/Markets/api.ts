import { fetchJson } from '~/utils/async'
import type {
	MarketsCategoriesListResponse,
	MarketsCategoriesSeriesResponse,
	MarketsCategoryPageResponse,
	MarketsExchangeSeriesResponse,
	ExchangeMarketsListResponse,
	ExchangeMarketsResponse,
	TokenMarketsListResponse
} from './api.types'
import {
	completeCategoryPageData,
	groupCategoriesBySegment,
	groupTokensBySegment,
	mergeExchangeListBySegment
} from './normalizers'
import type { Segment } from './segments'
import {
	type CategoryPageData,
	type CategorySeriesRow,
	type CategoryStatsBySegment,
	type ExchangeListRow,
	type ExchangeSeriesRow,
	type SymbolStatsBySegment
} from './types'

/** Per-segment merged symbol stats (homepage movers / top-100 / sentiment). */
export async function fetchMarketsTokens(): Promise<SymbolStatsBySegment> {
	return groupTokensBySegment(await fetchJson<TokenMarketsListResponse>('/api/public/markets/tokens'))
}

/** Per-segment merged category stats (homepage category movers + table). */
export async function fetchMarketsCategories(): Promise<CategoryStatsBySegment> {
	return groupCategoriesBySegment(await fetchJson<MarketsCategoriesListResponse>('/api/public/markets/categories'))
}

/** 30d daily by-exchange rows (homepage by-exchange charts). */
export async function fetchMarketsExchangeSeries(): Promise<ExchangeSeriesRow[]> {
	return (await fetchJson<MarketsExchangeSeriesResponse>('/api/public/markets/exchanges/series')).series
}

/** Per-segment merged venue stats (homepage exchanges table). */
export async function fetchMarketsExchangesList(): Promise<Record<Segment, ExchangeListRow[]>> {
	return mergeExchangeListBySegment(await fetchJson<ExchangeMarketsListResponse>('/api/public/markets/exchanges'))
}

/** One venue's per-segment totals + pairs (exchange page). */
export async function fetchMarketsExchange(exchange: string): Promise<ExchangeMarketsResponse> {
	return fetchJson<ExchangeMarketsResponse>(
		`/api/public/markets/exchange/${encodeURIComponent(exchange.toLowerCase())}`
	)
}

/** 30d daily by-category rows (homepage by-category charts). */
export async function fetchMarketsCategorySeries(): Promise<CategorySeriesRow[]> {
	return (await fetchJson<MarketsCategoriesSeriesResponse>('/api/public/markets/categories/series')).series
}

/** Everything the category page needs in one fetch. */
export async function fetchMarketsCategoryPage(tag: string): Promise<CategoryPageData> {
	const data = await fetchJson<MarketsCategoryPageResponse>(
		`/api/public/markets/categories/${encodeURIComponent(tag.toLowerCase())}`
	)
	return completeCategoryPageData(data)
}
