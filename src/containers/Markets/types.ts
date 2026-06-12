/**
 * Markets feature read-model types.
 *
 * Backend DTOs in api.types.ts are the source of truth. The aliases below only
 * describe structural shapes the UI derives for faster segment/table access.
 */

import type {
	MarketVenue,
	MarketsCategoryPageResponse,
	MarketsCategorySegmentStat,
	MarketsCategorySeriesApiRow,
	MarketsCategoryTokenRow,
	MarketsCategoryPagePairSeriesApiRow,
	MarketsExchangeListEntry,
	MarketsExchangeSeriesApiRow
} from './api.types'
import type { Segment } from './segments'

/** One base symbol, merged across every exchange in a segment. */
export type SymbolStat = MarketsCategoryTokenRow

/** One category, merged across its tokens in a segment. */
export type CategoryStat = MarketsCategorySegmentStat & { category: string }

/** One venue's merged totals for a segment, with venue kind attached. */
export type ExchangeListRow = MarketsExchangeListEntry & { exchange_type: MarketVenue }

export type ExchangeSeriesRow = MarketsExchangeSeriesApiRow
export type CategorySeriesRow = MarketsCategorySeriesApiRow
export type PairSeriesRow = MarketsCategoryPagePairSeriesApiRow

export type SymbolStatsBySegment = Record<Segment, SymbolStat[]>
export type CategoryStatsBySegment = Record<Segment, CategoryStat[]>

export type CategoryPageData = Omit<MarketsCategoryPageResponse, 'segments' | 'tokens'> & {
	segments: Record<Segment, MarketsCategorySegmentStat | null>
	tokens: SymbolStatsBySegment
}
