import { slug } from '~/utils'
import type { ExchangeMarketsListEntry, ExchangeMarketsListResponse } from './markets.types'

export function findExchangeMarketsListEntry(
	list: ExchangeMarketsListResponse,
	defillamaSlug: string
): ExchangeMarketsListEntry | null {
	const normalizedSlug = slug(defillamaSlug)
	for (const entry of list.cex.spot) {
		if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedSlug) return entry
	}
	for (const entry of list.cex.linear_perp) {
		if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedSlug) return entry
	}
	for (const entry of list.cex.inverse_perp) {
		if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedSlug) return entry
	}
	return null
}
