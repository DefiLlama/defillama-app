import type { ProtocolLiquidityTokensResponse } from '~/api/types'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getLiquidityDomainDir(): string {
	return getDatasetDomainDir('liquidity')
}

export async function fetchLiquidityEntryByProtocolIdFromCache(
	protocolId: string
): Promise<ProtocolLiquidityTokensResponse[number] | null> {
	await readDatasetManifest()
	if (!protocolId) {
		return null
	}

	const payload = await readJsonFile<ProtocolLiquidityTokensResponse>(`${getLiquidityDomainDir()}/full.json`)
	for (const entry of payload) {
		if (entry.id === protocolId) {
			return entry
		}
	}
	return null
}
