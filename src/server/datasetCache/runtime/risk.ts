import { getTokenRiskBorrowCapacityFromNetwork } from '~/containers/Token/api'
import type { TokenRiskBorrowCapacityResponse, TokenRiskBorrowCapacityTokenEntry } from '~/containers/Token/api.types'
import { indexBorrowCapacityByAssetKey } from '~/containers/Token/tokenRisk.utils'
import { getIndexedTokenRiskBorrowCapacityFromCache } from '../risk'
import { readThroughDatasetCache } from './source'

type IndexedTokenRiskBorrowCapacity = {
	data: TokenRiskBorrowCapacityResponse
	indexedTokens: Map<string, TokenRiskBorrowCapacityTokenEntry[]>
}

async function getIndexedTokenRiskBorrowCapacityFromNetwork(): Promise<IndexedTokenRiskBorrowCapacity> {
	const data = await getTokenRiskBorrowCapacityFromNetwork()
	return {
		data,
		indexedTokens: indexBorrowCapacityByAssetKey(data.tokens)
	}
}

export function getIndexedTokenRiskBorrowCapacity(): Promise<IndexedTokenRiskBorrowCapacity> {
	return readThroughDatasetCache({
		domain: 'risk',
		readCache: getIndexedTokenRiskBorrowCapacityFromCache,
		readNetwork: getIndexedTokenRiskBorrowCapacityFromNetwork
	})
}
