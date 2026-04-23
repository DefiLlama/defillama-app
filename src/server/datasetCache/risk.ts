import type { TokenRiskBorrowCapacityResponse, TokenRiskBorrowCapacityTokenEntry } from '~/containers/Token/api.types'
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
	const indexedTokens = new Map<string, TokenRiskBorrowCapacityTokenEntry[]>(
		Object.entries(payload.indexedTokens ?? {})
	)

	return {
		data: payload.data,
		indexedTokens
	}
}
