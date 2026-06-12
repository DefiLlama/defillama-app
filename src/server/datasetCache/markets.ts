import type { ExchangeMarketsListResponse, TokenMarketsListResponse } from '~/containers/Markets/api.types'
import { SEGMENT_IDS } from '~/containers/Markets/segments'
import { slug } from '~/utils'
import { DATASET_DOMAIN_ARTIFACTS } from './artifacts'
import { readDatasetDomainJson } from './core'

const MARKET_FILES = DATASET_DOMAIN_ARTIFACTS.markets.files

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

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>('markets', MARKET_FILES.exchangesList)
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>('markets', MARKET_FILES.tokensList)
}

export async function fetchTokenMarketsSymbolIndexFromCache(): Promise<TokenMarketsSymbolIndex> {
	return readDatasetDomainJson<TokenMarketsSymbolIndex>('markets', MARKET_FILES.tokenSymbols)
}

export async function fetchCexMarketsSlugIndexFromCache(): Promise<CexMarketsSlugIndex> {
	return readDatasetDomainJson<CexMarketsSlugIndex>('markets', MARKET_FILES.cexByDefillamaSlug)
}
