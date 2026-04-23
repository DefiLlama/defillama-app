import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { findProtocolEntry } from '~/containers/TokenRights/utils'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getTokenRightsDomainDir(): string {
	return getDatasetDomainDir('token-rights')
}

export async function fetchTokenRightsEntriesFromCache(): Promise<IRawTokenRightsEntry[]> {
	await readDatasetManifest()
	return readJsonFile(`${getTokenRightsDomainDir()}/full.json`)
}

export async function fetchTokenRightsEntryFromCache(defillamaId: string): Promise<IRawTokenRightsEntry | null> {
	await readDatasetManifest()
	if (!defillamaId) {
		return null
	}

	const entries = await fetchTokenRightsEntriesFromCache()
	return findProtocolEntry(entries, defillamaId)
}
