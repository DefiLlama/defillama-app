import type { TokenRiskBorrowCapacityResponse, TokenRiskBorrowCapacityTokenEntry } from '~/containers/Token/api.types'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import { readDatasetDomainJson } from './core'
import { DATASET_DOMAIN_ARTIFACTS } from './registry'

const RISK_FILES = DATASET_DOMAIN_ARTIFACTS.risk.files

type IndexedBorrowCapacityJson = {
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: Record<string, TokenRiskBorrowCapacityTokenEntry[]>
}

export async function getIndexedTokenRiskBorrowCapacityFromCache(): Promise<{
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: Map<string, TokenRiskBorrowCapacityTokenEntry[]>
}> {
	const payload = await readDatasetDomainJson<IndexedBorrowCapacityJson>('risk', RISK_FILES.indexed)

	return {
		data: payload.data,
		indexedTokens: indexBorrowCapacityByAssetKey(payload.data.tokens)
	}
}
