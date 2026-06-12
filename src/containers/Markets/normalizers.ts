import type {
	ExchangeMarketsListResponse,
	MarketsCategoriesListResponse,
	MarketsCategoryPageResponse,
	TokenMarketsListResponse
} from './api.types'
import { recordBySegment, SEGMENT_IDS, type Segment } from './segments'
import type { CategoryPageData, CategoryStatsBySegment, ExchangeListRow, SymbolStatsBySegment } from './types'

function emptySymbolStatsBySegment(): SymbolStatsBySegment {
	return recordBySegment(() => [])
}

function emptyCategoryStatsBySegment(): CategoryStatsBySegment {
	return recordBySegment(() => [])
}

/** tokens/list.json -> per-segment arrays with token identity attached. */
export function groupTokensBySegment(raw: TokenMarketsListResponse): SymbolStatsBySegment {
	const out = emptySymbolStatsBySegment()
	for (const entry of raw.tokens) {
		for (const segment of SEGMENT_IDS) {
			const stat = entry.segments[segment]
			if (stat) out[segment].push({ symbol: entry.symbol, tags: entry.tags, ...stat })
		}
	}
	return out
}

/** categories/list.json -> per-segment arrays with category identity attached. */
export function groupCategoriesBySegment(raw: MarketsCategoriesListResponse): CategoryStatsBySegment {
	const out = emptyCategoryStatsBySegment()
	for (const entry of raw.categories) {
		for (const segment of SEGMENT_IDS) {
			const stat = entry.segments[segment]
			if (stat) out[segment].push({ category: entry.category, ...stat })
		}
	}
	return out
}

/** exchanges/list.json -> per-segment arrays of venue rows (cex + dex merged). */
export function mergeExchangeListBySegment(raw: ExchangeMarketsListResponse): Record<Segment, ExchangeListRow[]> {
	return recordBySegment((segment) => {
		const rows: ExchangeListRow[] = []
		for (const entry of raw.cex[segment]) rows.push({ ...entry, exchange_type: 'cex' })
		for (const entry of raw.dex[segment]) rows.push({ ...entry, exchange_type: 'dex' })
		return rows
	})
}

/** categories/<category>.json -> complete segment records without renaming backend fields. */
export function completeCategoryPageData(raw: MarketsCategoryPageResponse): CategoryPageData {
	return {
		...raw,
		segments: recordBySegment((segment) => raw.segments[segment] ?? null),
		tokens: recordBySegment((segment) => raw.tokens[segment] ?? [])
	}
}
