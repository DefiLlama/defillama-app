import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import { readDatasetDomainJson } from '~/server/datasetCache/core'

const TOKEN_MARKETS_DOMAIN = 'token-markets'
const TOKEN_MARKETS_FILES = DATASET_DOMAIN_ARTIFACTS[TOKEN_MARKETS_DOMAIN].files

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	return readDatasetDomainJson<TokenMarketsListResponse>(TOKEN_MARKETS_DOMAIN, TOKEN_MARKETS_FILES.tokensList)
}
