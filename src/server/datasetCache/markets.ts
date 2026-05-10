import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { readDatasetDomainJson } from './core'
import { DATASET_DOMAIN_ARTIFACTS } from './registry'

const MARKET_FILES = DATASET_DOMAIN_ARTIFACTS.markets.files

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>('markets', MARKET_FILES.exchangesList)
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>('markets', MARKET_FILES.tokensList)
}
