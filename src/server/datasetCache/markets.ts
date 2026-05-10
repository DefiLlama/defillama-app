import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { readDatasetDomainJson } from './core'

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>('markets', 'exchanges-list.json')
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>('markets', 'tokens-list.json')
}
