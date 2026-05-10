import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { findProtocolEntry } from '~/containers/TokenRights/utils'
import { readDatasetDomainJson } from './core'
import { isFileNotFoundError } from './indexKeys'
import { normalizeTokenRightsProtocolName } from './tokenRightsIndex'

export async function fetchTokenRightsEntriesFromCache(): Promise<IRawTokenRightsEntry[]> {
	return readDatasetDomainJson<IRawTokenRightsEntry[]>('token-rights', 'full.json')
}

export async function fetchTokenRightsEntryFromCache(defillamaId: string): Promise<IRawTokenRightsEntry | null> {
	if (!defillamaId) {
		return null
	}

	try {
		const byDefillamaId = await readDatasetDomainJson<Record<string, IRawTokenRightsEntry>>(
			'token-rights',
			'by-defillama-id.json'
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
	const normalizedName = normalizeTokenRightsProtocolName(protocolName)
	if (!normalizedName) {
		return null
	}

	try {
		const byProtocolName = await readDatasetDomainJson<Record<string, IRawTokenRightsEntry>>(
			'token-rights',
			'by-protocol-name.json'
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
