import type { TokenRiskBorrowCapacityResponse, TokenRiskBorrowCapacityTokenEntry } from '~/containers/Token/api.types'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

type IndexedBorrowCapacityJson = {
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: Record<string, TokenRiskBorrowCapacityTokenEntry[]>
}

function getRiskDomainDir(): string {
	return getDatasetDomainDir('risk')
}

export async function getIndexedTokenRiskBorrowCapacityFromCache(): Promise<{
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: Map<string, TokenRiskBorrowCapacityTokenEntry[]>
}> {
	await readDatasetManifest()
	const payload = await readJsonFile<IndexedBorrowCapacityJson>(`${getRiskDomainDir()}/indexed.json`)

	return {
		data: payload.data,
		indexedTokens: indexBorrowCapacityByAssetKey(payload.data.tokens)
	}
}
