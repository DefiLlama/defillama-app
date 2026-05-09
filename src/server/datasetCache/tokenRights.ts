import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { findProtocolEntry } from '~/containers/TokenRights/utils'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'
import { isFileNotFoundError } from './indexKeys'
import { normalizeTokenRightsProtocolName } from './tokenRightsIndex'

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

	try {
		const byDefillamaId = await readJsonFile<Record<string, IRawTokenRightsEntry>>(
			`${getTokenRightsDomainDir()}/by-defillama-id.json`
		)
		return byDefillamaId[defillamaId] ?? null
	} catch (error) {
		if (!isFileNotFoundError(error)) {
			throw error
		}
	}

	const entries = await fetchTokenRightsEntriesFromCache()
	return findProtocolEntry(entries, defillamaId)
}

export async function fetchTokenRightsEntryByNameFromCache(protocolName: string): Promise<IRawTokenRightsEntry | null> {
	await readDatasetManifest()
	const normalizedName = normalizeTokenRightsProtocolName(protocolName)
	if (!normalizedName) {
		return null
	}

	try {
		const byProtocolName = await readJsonFile<Record<string, IRawTokenRightsEntry>>(
			`${getTokenRightsDomainDir()}/by-protocol-name.json`
		)
		return byProtocolName[normalizedName] ?? null
	} catch (error) {
		if (!isFileNotFoundError(error)) {
			throw error
		}
	}

	for (const entry of await fetchTokenRightsEntriesFromCache()) {
		if (normalizeTokenRightsProtocolName(entry['Protocol Name']) === normalizedName) {
			return entry
		}
	}

	return null
}
