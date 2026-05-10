import { fetchTokenRightsDataFromNetwork } from '~/containers/TokenRights/api'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { findProtocolEntry } from '~/containers/TokenRights/utils'
import { slug } from '~/utils'
import {
	fetchTokenRightsEntriesFromCache,
	fetchTokenRightsEntryByNameFromCache,
	fetchTokenRightsEntryFromCache
} from '../tokenRights'
import { readThroughDatasetCache } from './source'

export function fetchTokenRightsEntries(): Promise<IRawTokenRightsEntry[]> {
	return readThroughDatasetCache({
		domain: 'token-rights',
		readCache: fetchTokenRightsEntriesFromCache,
		readNetwork: fetchTokenRightsDataFromNetwork
	})
}

export function fetchTokenRightsEntryByDefillamaId(defillamaId: string): Promise<IRawTokenRightsEntry | null> {
	return readThroughDatasetCache({
		domain: 'token-rights',
		readCache: () => fetchTokenRightsEntryFromCache(defillamaId),
		readNetwork: async () => findProtocolEntry(await fetchTokenRightsDataFromNetwork(), defillamaId)
	})
}

export function fetchTokenRightsEntryByName(protocolName: string): Promise<IRawTokenRightsEntry | null> {
	return readThroughDatasetCache({
		domain: 'token-rights',
		readCache: () => fetchTokenRightsEntryByNameFromCache(protocolName),
		readNetwork: async () => {
			const normalizedName = slug(protocolName)
			for (const entry of await fetchTokenRightsDataFromNetwork()) {
				if (slug(entry['Protocol Name']) === normalizedName) return entry
			}
			return null
		}
	})
}
