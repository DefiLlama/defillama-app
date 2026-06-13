import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import { readDatasetDomainJson } from '~/server/datasetCache/core'

const LIQUIDITY_FILES = DATASET_DOMAIN_ARTIFACTS.liquidity.files

export async function fetchLiquidityEntryByProtocolIdFromCache(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	if (!protocolId) {
		return null
	}

	const payload = await readDatasetDomainJson<ProtocolLiquidityTokensResponse>('liquidity', LIQUIDITY_FILES.full)
	for (const entry of payload) {
		if (entry.id === protocolId) {
			return entry
		}
	}
	return null
}
