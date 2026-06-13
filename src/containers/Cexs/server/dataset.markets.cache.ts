import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import { readDatasetDomainJson } from '~/server/datasetCache/core'

const CEX_MARKETS_DOMAIN = 'cex-markets'
const CEX_MARKETS_FILES = DATASET_DOMAIN_ARTIFACTS[CEX_MARKETS_DOMAIN].files

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	return readDatasetDomainJson<ExchangeMarketsListResponse>(CEX_MARKETS_DOMAIN, CEX_MARKETS_FILES.exchangesList)
}
