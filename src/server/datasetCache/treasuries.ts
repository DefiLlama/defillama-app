import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getTreasuriesDomainDir(): string {
	return getDatasetDomainDir('treasuries')
}

export async function fetchTreasuryByIdFromCache(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	await readDatasetManifest()
	if (!treasuryId) {
		return null
	}

	const payload = await readJsonFile<RawTreasuriesResponse>(`${getTreasuriesDomainDir()}/full.json`)
	for (const treasury of payload) {
		if (treasury.id === treasuryId) {
			return treasury
		}
	}
	return null
}
