import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse, TokenMarketsListResponse } from '~/containers/Markets/api.types'
import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import { fetchExchangeMarketsListFromCache, fetchTokenMarketsListFromCache } from '../markets'
import { readThroughDatasetCache } from './source'

export function fetchExchangeMarketsList(): Promise<ExchangeMarketsListResponse> {
	return readThroughDatasetCache({
		domain: 'markets',
		readCache: fetchExchangeMarketsListFromCache,
		readNetwork: fetchExchangeMarketsListFromNetwork
	})
}

export function fetchTokenMarketsList(): Promise<TokenMarketsListResponse> {
	return readThroughDatasetCache({
		domain: 'markets',
		readCache: fetchTokenMarketsListFromCache,
		readNetwork: fetchTokenMarketsListFromNetwork
	})
}
