import type { RawRaise } from '~/containers/Raises/api.types'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import { readDatasetDomainJson } from '~/server/datasetCache/core'

const RAISES_FILES = DATASET_DOMAIN_ARTIFACTS.raises.files

export async function fetchRaisesFromCache(): Promise<RawRaise[]> {
	const payload = await readDatasetDomainJson<{ raises: RawRaise[] }>('raises', RAISES_FILES.full)
	return payload.raises
}

export async function fetchRaisesByDefillamaIdFromCache(defillamaId: string): Promise<RawRaise[]> {
	if (!defillamaId) {
		return []
	}

	const raises = await fetchRaisesFromCache()
	return raises.filter((raise) => raise.defillamaId === defillamaId)
}
