import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { readDatasetDomainJson } from './core'
import { DATASET_DOMAIN_ARTIFACTS } from './registry'

const TREASURIES_FILES = DATASET_DOMAIN_ARTIFACTS.treasuries.files

export async function fetchTreasuryByIdFromCache(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	if (!treasuryId) {
		return null
	}

	const payload = await readDatasetDomainJson<RawTreasuriesResponse>('treasuries', TREASURIES_FILES.full)
	for (const treasury of payload) {
		if (treasury.id === treasuryId) {
			return treasury
		}
	}
	return null
}
