import type { ExchangeMarketsResponse } from '~/containers/Cexs/markets.types'
import { fetchJson } from '~/utils/async'
import {
	type CategoryPageData,
	type CategorySeriesRow,
	type CategoryStatsBySegment,
	type ExchangeListRow,
	type ExchangeSeriesRow,
	normalizeCategoriesList,
	normalizeCategoryPage,
	normalizeCategorySeries,
	normalizeExchangesList,
	normalizeExchangeSeries,
	normalizeTokensList,
	type Segment,
	type SymbolStatsBySegment
} from './types'

/** Per-segment merged symbol stats (homepage movers / top-100 / sentiment). */
export async function fetchMarketsTokens(): Promise<SymbolStatsBySegment> {
	return normalizeTokensList(await fetchJson('/api/public/markets/tokens'))
}

/** Per-segment merged category stats (homepage category movers + table). */
export async function fetchMarketsCategories(): Promise<CategoryStatsBySegment> {
	return normalizeCategoriesList(await fetchJson('/api/public/markets/categories'))
}

/** 30d daily by-exchange rows (homepage by-exchange charts). */
export async function fetchMarketsExchangeSeries(): Promise<ExchangeSeriesRow[]> {
	return normalizeExchangeSeries(await fetchJson('/api/public/markets/exchanges/series'))
}

/** Per-segment merged venue stats (homepage exchanges table). */
export async function fetchMarketsExchangesList(): Promise<Partial<Record<Segment, ExchangeListRow[]>>> {
	return normalizeExchangesList(await fetchJson('/api/public/markets/exchanges'))
}

/** One venue's per-segment totals + pairs (exchange page). */
export async function fetchMarketsExchange(exchange: string): Promise<ExchangeMarketsResponse> {
	return fetchJson<ExchangeMarketsResponse>(
		`/api/public/markets/exchange/${encodeURIComponent(exchange.toLowerCase())}`
	)
}

/** 30d daily by-category rows (homepage by-category charts). */
export async function fetchMarketsCategorySeries(): Promise<CategorySeriesRow[]> {
	return normalizeCategorySeries(await fetchJson('/api/public/markets/categories/series'))
}

/** Everything the category page needs in one fetch. */
export async function fetchMarketsCategoryPage(tag: string): Promise<CategoryPageData> {
	const data = await fetchJson(`/api/public/markets/categories/${encodeURIComponent(tag.toLowerCase())}`)
	return normalizeCategoryPage(data, tag)
}
