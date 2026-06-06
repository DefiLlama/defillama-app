import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { DATASET_DOMAIN_ARTIFACTS } from './artifacts'
import { readDatasetDomainJson } from './core'

const MARKET_FILES = DATASET_DOMAIN_ARTIFACTS.markets.files

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>('markets', MARKET_FILES.exchangesList)
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>('markets', MARKET_FILES.tokensList)
}
