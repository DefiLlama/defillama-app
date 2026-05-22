import { fetchTreasuryById as fetchTreasuryByIdFromNetwork } from '~/containers/Treasuries/api'
import type { RawTreasuriesResponse } from '~/containers/Treasuries/api.types'
import { fetchTreasuryByIdFromCache } from '../treasuries'
import { readThroughDatasetCache } from './source'

export function fetchTreasuryById(treasuryId: string): Promise<RawTreasuriesResponse[number] | null> {
	return readThroughDatasetCache({
		domain: 'treasuries',
		readCache: () => fetchTreasuryByIdFromCache(treasuryId),
		readNetwork: () => fetchTreasuryByIdFromNetwork(treasuryId)
	})
}
