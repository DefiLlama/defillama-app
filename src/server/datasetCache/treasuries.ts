import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { readDatasetDomainJson } from './core'

export async function fetchTreasuryByIdFromCache(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	if (!treasuryId) {
		return null
	}

	const payload = await readDatasetDomainJson<RawTreasuriesResponse>('treasuries', 'full.json')
	for (const treasury of payload) {
		if (treasury.id === treasuryId) {
			return treasury
		}
	}
	return null
}
