import { fetchRaisesByDefillamaId as fetchRaisesByDefillamaIdFromNetwork } from '~/containers/Raises/api'
import type { RawRaise } from '~/containers/Raises/api.types'
import { readThroughDatasetCache } from '~/server/datasetCache/runtime/source'
import { fetchRaisesByDefillamaIdFromCache } from './dataset.cache'

export function fetchRaisesByDefillamaId(defillamaId: string): Promise<RawRaise[]> {
	return readThroughDatasetCache({
		domain: 'raises',
		readCache: () => fetchRaisesByDefillamaIdFromCache(defillamaId),
		readNetwork: () => fetchRaisesByDefillamaIdFromNetwork(defillamaId)
	})
}
