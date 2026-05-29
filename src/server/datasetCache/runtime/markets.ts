import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
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
