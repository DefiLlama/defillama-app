import { fetchTreasuryById as fetchTreasuryByIdFromNetwork } from '~/containers/Treasuries/api'
import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { readThroughDatasetCache } from '~/server/datasetCache/runtime/source'
import { fetchTreasuryByIdFromCache } from './dataset.cache'

export function fetchTreasuryById(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	return readThroughDatasetCache({
		domain: 'treasuries',
		readCache: () => fetchTreasuryByIdFromCache(treasuryId),
		readNetwork: () => fetchTreasuryByIdFromNetwork(treasuryId)
	})
}
