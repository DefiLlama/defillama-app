import type { RawRaise } from '~/containers/Raises/api.types'
import { readDatasetDomainJson } from './core'
import { DATASET_DOMAIN_ARTIFACTS } from './registry'

const RAISES_FILES = DATASET_DOMAIN_ARTIFACTS.raises.files

export async function fetchRaisesByDefillamaIdFromCache(defillamaId: string): Promise<RawRaise[]> {
	if (!defillamaId) {
		return []
	}

	const payload = await readDatasetDomainJson<{ raises: RawRaise[] }>('raises', RAISES_FILES.full)
	return payload.raises.filter((raise) => raise.defillamaId === defillamaId)
}
