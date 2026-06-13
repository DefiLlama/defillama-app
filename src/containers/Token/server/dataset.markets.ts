import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { readThroughDatasetCache } from '~/server/datasetCache/runtime/source'
import { fetchTokenMarketsListFromCache } from './dataset.markets.cache'

export function fetchTokenMarketsList(): Promise<TokenMarketsListResponse> {
	return readThroughDatasetCache({
		domain: 'token-markets',
		readCache: fetchTokenMarketsListFromCache,
		readNetwork: fetchTokenMarketsListFromNetwork
	})
}
