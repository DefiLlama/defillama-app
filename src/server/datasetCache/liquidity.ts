import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import { readDatasetDomainJson } from './core'

export async function fetchLiquidityEntryByProtocolIdFromCache(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	if (!protocolId) {
		return null
	}

	const payload = await readDatasetDomainJson<ProtocolLiquidityTokensResponse>('liquidity', 'full.json')
	for (const entry of payload) {
		if (entry.id === protocolId) {
			return entry
		}
	}
	return null
}
