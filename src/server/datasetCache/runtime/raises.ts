import { fetchRaisesByDefillamaId as fetchRaisesByDefillamaIdFromNetwork } from '~/containers/Raises/api'
import type { RawRaise } from '~/containers/Raises/api.types'
import { fetchRaisesByDefillamaIdFromCache } from '../raises'
import { readThroughDatasetCache } from './source'

export function fetchRaisesByDefillamaId(defillamaId: string): Promise<RawRaise[]> {
	return readThroughDatasetCache({
		domain: 'raises',
		readCache: () => fetchRaisesByDefillamaIdFromCache(defillamaId),
		readNetwork: () => fetchRaisesByDefillamaIdFromNetwork(defillamaId)
	})
}
