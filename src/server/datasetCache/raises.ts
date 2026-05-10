import type { RawRaise } from '~/containers/Raises/api.types'
import { readDatasetDomainJson } from './core'

export async function fetchRaisesByDefillamaIdFromCache(defillamaId: string): Promise<RawRaise[]> {
	if (!defillamaId) {
		return []
	}

	const payload = await readDatasetDomainJson<{ raises: RawRaise[] }>('raises', 'full.json')
	return payload.raises.filter((raise) => raise.defillamaId === defillamaId)
}
