import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { readThroughDatasetCache } from '~/server/datasetCache/runtime/source'
import { fetchExchangeMarketsListFromCache } from './dataset.markets.cache'

export function fetchExchangeMarketsList(): Promise<ExchangeMarketsListResponse> {
	return readThroughDatasetCache({
		domain: 'cex-markets',
		readCache: fetchExchangeMarketsListFromCache,
		readNetwork: fetchExchangeMarketsListFromNetwork
	})
}
