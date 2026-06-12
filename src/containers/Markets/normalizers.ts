import type {
	MarketsCategoriesListResponse,
	MarketsCategoriesSeriesResponse,
	MarketsCategoryPageExchangeSeriesApiRow,
	MarketsCategoryPagePairSeriesApiRow,
	MarketsCategoryPageResponse,
	MarketsCategoryPageSeriesApiRow,
	MarketsCategorySegmentStat,
	MarketsCategoryTokenRow,
	MarketsExchangeListEntry,
	MarketsExchangesListResponse,
	MarketsExchangeSeriesResponse,
	MarketsTokenSegmentStat,
	MarketsTokensListResponse
} from './api.types'
import { SEGMENT_IDS } from './segments'
import type {
	CategoryPageData,
	CategorySeriesRow,
	CategoryStat,
	CategoryStatsBySegment,
	ExchangeListRow,
	ExchangeSeriesRow,
	PairSeriesRow,
	Segment,
	SymbolStat,
	SymbolStatsBySegment
} from './types'

function normalizeSymbolStat(base: string, tags: string[], raw: MarketsTokenSegmentStat): SymbolStat {
	return {
		base,
		tags,
		price: raw.price,
		price_change_24h: raw.price_change_24h,
		volume_24h_usd: raw.volume_24h,
		volume_prev_24h_usd: raw.volume_prev_24h,
		oi_usd: raw.oi_usd,
		oi_prev_usd: raw.oi_prev_usd,
		funding_avg_8h: raw.funding_rate_8h,
		leverage_min: raw.leverage_min,
		leverage_max: raw.leverage_max,
		market_count: raw.market_count,
		exchange_count: raw.exchange_count
	}
}

function normalizeCategoryTokenStat(raw: MarketsCategoryTokenRow): SymbolStat {
	return normalizeSymbolStat(raw.symbol, raw.tags, raw)
}

function normalizeCategoryStat(tag: string, raw: MarketsCategorySegmentStat): CategoryStat {
	return {
		tag,
		price_change_24h: raw.price_change_24h,
		volume_24h_usd: raw.volume_24h,
		volume_prev_24h_usd: raw.volume_prev_24h,
		oi_usd: raw.oi_usd,
		oi_prev_usd: raw.oi_prev_usd,
		funding_avg_8h: raw.funding_rate_8h,
		leverage_min: raw.leverage_min,
		leverage_max: raw.leverage_max,
		token_count: raw.token_count,
		market_count: raw.market_count
	}
}

/** tokens/list.json -> per-segment arrays of merged symbol stats. */
export function normalizeTokensList(raw: MarketsTokensListResponse): SymbolStatsBySegment {
	const out: SymbolStatsBySegment = {}
	for (const entry of raw.tokens) {
		for (const segment of SEGMENT_IDS) {
			const stat = entry.segments[segment]
			if (stat) (out[segment] ??= []).push(normalizeSymbolStat(entry.symbol, entry.tags, stat))
		}
	}
	return out
}

/** categories/list.json -> per-segment arrays of merged category stats. */
export function normalizeCategoriesList(raw: MarketsCategoriesListResponse): CategoryStatsBySegment {
	const out: CategoryStatsBySegment = {}
	for (const entry of raw.categories) {
		for (const segment of SEGMENT_IDS) {
			const stat = entry.segments[segment]
			if (stat) (out[segment] ??= []).push(normalizeCategoryStat(entry.category, stat))
		}
	}
	return out
}

/** exchanges/list.json -> per-segment arrays of venue rows (cex + dex merged). */
export function normalizeExchangesList(raw: MarketsExchangesListResponse): Partial<Record<Segment, ExchangeListRow[]>> {
	const out: Partial<Record<Segment, ExchangeListRow[]>> = {}
	for (const segment of SEGMENT_IDS) {
		const rows: ExchangeListRow[] = []
		const cexRows = raw.cex[segment]
		for (const entry of cexRows) rows.push(normalizeExchangeListRow(entry, 'cex'))
		const dexRows = raw.dex[segment]
		for (const entry of dexRows) rows.push(normalizeExchangeListRow(entry, 'dex'))
		out[segment] = rows
	}
	return out
}

function normalizeExchangeListRow(
	entry: MarketsExchangeListEntry,
	exchange_type: ExchangeListRow['exchange_type']
): ExchangeListRow {
	return {
		exchange: entry.exchange,
		exchange_type,
		defillama_slug: entry.defillama_slug,
		volume_24h_usd: entry.total_volume_24h,
		volume_prev_24h_usd: entry.total_volume_prev_24h,
		oi_usd: entry.total_oi_usd ?? null,
		oi_prev_usd: entry.total_oi_prev_usd ?? null,
		market_count: entry.market_count
	}
}

/** exchanges/series.json -> flat daily rows (day in ms). */
export function normalizeExchangeSeries(raw: MarketsExchangeSeriesResponse): ExchangeSeriesRow[] {
	const out: ExchangeSeriesRow[] = new Array(raw.series.length)
	for (let i = 0; i < raw.series.length; i++) out[i] = normalizeExchangeSeriesRow(raw.series[i])
	return out
}

/** categories/series.json -> flat daily rows (day in ms). */
export function normalizeCategorySeries(raw: MarketsCategoriesSeriesResponse): CategorySeriesRow[] {
	const out: CategorySeriesRow[] = new Array(raw.series.length)
	for (let i = 0; i < raw.series.length; i++) {
		const row = raw.series[i]
		out[i] = normalizeCategorySeriesRow(row, row.category)
	}
	return out
}

function normalizeCategoryPageSeries(rows: MarketsCategoryPageSeriesApiRow[], tag: string): CategorySeriesRow[] {
	const out: CategorySeriesRow[] = new Array(rows.length)
	for (let i = 0; i < rows.length; i++) out[i] = normalizeCategorySeriesRow(rows[i], tag)
	return out
}

function normalizeCategorySeriesRow(row: MarketsCategoryPageSeriesApiRow, tag: string): CategorySeriesRow {
	return {
		day: row.day * 1000,
		segment: row.segment,
		tag,
		volume_usd: row.volume_24h,
		oi_usd: row.oi_usd,
		market_count: row.market_count
	}
}

function normalizeCategoryExchangeSeries(rows: MarketsCategoryPageExchangeSeriesApiRow[]): ExchangeSeriesRow[] {
	const out: ExchangeSeriesRow[] = new Array(rows.length)
	for (let i = 0; i < rows.length; i++) out[i] = normalizeExchangeSeriesRow(rows[i])
	return out
}

function normalizeExchangeSeriesRow(
	row: MarketsExchangeSeriesResponse['series'][number] | MarketsCategoryPageExchangeSeriesApiRow
): ExchangeSeriesRow {
	return {
		day: row.day * 1000,
		exchange: row.exchange,
		exchange_type: row.exchange_type,
		segment: row.segment,
		volume_usd: row.volume_24h,
		oi_usd: row.oi_usd,
		market_count: row.market_count
	}
}

/** categories/<category>.json series_by_pair -> flat daily per-pair rows (day in ms). */
function normalizeCategoryPairSeries(rows: MarketsCategoryPagePairSeriesApiRow[]): PairSeriesRow[] {
	const out: PairSeriesRow[] = new Array(rows.length)
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i]
		out[i] = {
			day: row.day * 1000,
			segment: row.segment,
			pair: row.pair,
			volume_usd: row.volume_24h,
			oi_usd: row.oi_usd,
			market_count: row.market_count
		}
	}
	return out
}

/** categories/<category>.json -> everything the category page needs. */
export function normalizeCategoryPage(raw: MarketsCategoryPageResponse): CategoryPageData {
	const summaries: Partial<Record<Segment, CategoryStat>> = {}
	for (const segment of SEGMENT_IDS) {
		const stat = raw.segments[segment]
		if (stat) summaries[segment] = normalizeCategoryStat(raw.category, stat)
	}

	const tokens: SymbolStatsBySegment = {}
	for (const segment of SEGMENT_IDS) {
		const list = raw.tokens[segment]
		if (!list) continue
		const out: SymbolStat[] = new Array(list.length)
		for (let i = 0; i < list.length; i++) out[i] = normalizeCategoryTokenStat(list[i])
		tokens[segment] = out
	}

	return {
		tag: raw.category,
		last_updated: raw.last_updated,
		summaries,
		tokens,
		seriesByExchange: normalizeCategoryExchangeSeries(raw.series_by_exchange),
		seriesByPair: normalizeCategoryPairSeries(raw.series_by_pair),
		series: normalizeCategoryPageSeries(raw.series, raw.category)
	}
}
