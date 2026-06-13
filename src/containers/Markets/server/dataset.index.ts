import type { ExchangeMarketsListResponse, TokenMarketsListResponse } from '~/containers/Markets/api.types'
import { SEGMENT_IDS } from '~/containers/Markets/segments'
import { slug } from '~/utils'

export type TokenMarketsSymbolIndex = Record<string, true>
export type CexMarketsSlugIndexEntry = { exchange: string; defillama_slug: string }
export type CexMarketsSlugIndex = Record<string, CexMarketsSlugIndexEntry>

export function buildTokenMarketsSymbolIndex(tokensList: TokenMarketsListResponse): TokenMarketsSymbolIndex {
	const index = Object.create(null) as TokenMarketsSymbolIndex
	for (const token of tokensList.tokens) index[token.symbol.toLowerCase()] = true
	return index
}

export function buildCexMarketsSlugIndex(exchangesList: ExchangeMarketsListResponse): CexMarketsSlugIndex {
	const index = Object.create(null) as CexMarketsSlugIndex
	for (const segment of SEGMENT_IDS) {
		for (const entry of exchangesList.cex[segment]) {
			if (!entry.defillama_slug) continue
			const key = slug(entry.defillama_slug)
			if (!Object.hasOwn(index, key)) index[key] = { exchange: entry.exchange, defillama_slug: entry.defillama_slug }
		}
	}
	return index
}

export function resolveMarketsExchangeFromList(
	exchange: string,
	exchangesList: ExchangeMarketsListResponse
): string | null {
	const normalizedExchange = exchange.toLowerCase()

	for (const venue of [exchangesList.cex, exchangesList.dex]) {
		for (const category in venue) {
			for (const entry of venue[category as keyof typeof venue]) {
				if (entry.exchange.toLowerCase() === normalizedExchange) return entry.exchange
			}
		}
	}

	return null
}
