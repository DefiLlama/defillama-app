import { fetchLiquidityTokensDatasetFromNetwork } from '~/api'
import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import { fetchLiquidityEntryByProtocolIdFromCache } from '../liquidity'
import { readThroughDatasetCache } from './source'

async function fetchLiquidityEntryByProtocolIdFromNetwork(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	if (!protocolId) {
		return null
	}

	for (const entry of await fetchLiquidityTokensDatasetFromNetwork()) {
		if (entry.id === protocolId) {
			return entry
		}
	}
	return null
}

export function fetchLiquidityEntryByProtocolId(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	return readThroughDatasetCache({
		domain: 'liquidity',
		readCache: () => fetchLiquidityEntryByProtocolIdFromCache(protocolId),
		readNetwork: () => fetchLiquidityEntryByProtocolIdFromNetwork(protocolId)
	})
}
