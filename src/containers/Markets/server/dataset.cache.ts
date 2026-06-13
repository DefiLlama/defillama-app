import type { ExchangeMarketsListResponse, TokenMarketsListResponse } from '~/containers/Markets/api.types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import { readDatasetDomainJson } from '~/server/datasetCache/core'
import type { CexMarketsSlugIndex, TokenMarketsSymbolIndex } from './dataset.index'

const MARKETS_DOMAIN = 'markets'
const MARKET_FILES = DATASET_DOMAIN_ARTIFACTS[MARKETS_DOMAIN].files

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>(MARKETS_DOMAIN, MARKET_FILES.exchangesList)
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>(MARKETS_DOMAIN, MARKET_FILES.tokensList)
}

export async function fetchTokenMarketsSymbolIndexFromCache(): Promise<TokenMarketsSymbolIndex> {
	return readDatasetDomainJson<TokenMarketsSymbolIndex>(MARKETS_DOMAIN, MARKET_FILES.tokenSymbols)
}

export async function fetchCexMarketsSlugIndexFromCache(): Promise<CexMarketsSlugIndex> {
	return readDatasetDomainJson<CexMarketsSlugIndex>(MARKETS_DOMAIN, MARKET_FILES.cexByDefillamaSlug)
}
