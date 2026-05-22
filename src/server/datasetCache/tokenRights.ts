import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import { readDatasetDomainJson } from './core'
import { DATASET_DOMAIN_ARTIFACTS } from './registry'
import { normalizeTokenRightsProtocolName } from './tokenRightsIndex'

const TOKEN_RIGHTS_FILES = DATASET_DOMAIN_ARTIFACTS['token-rights'].files

export async function fetchTokenRightsEntriesFromCache(): Promise<IRawTokenRightsEntry[]> {
	return readDatasetDomainJson<IRawTokenRightsEntry[]>('token-rights', TOKEN_RIGHTS_FILES.full)
}

export async function fetchTokenRightsEntryFromCache(defillamaId: string): Promise<IRawTokenRightsEntry | null> {
	if (!defillamaId) {
		return null
	}

	const byDefillamaId = await readDatasetDomainJson<Record<string, IRawTokenRightsEntry>>(
		'token-rights',
		TOKEN_RIGHTS_FILES.byDefillamaId
	)
	return byDefillamaId[defillamaId] ?? null
}

export async function fetchTokenRightsEntryByNameFromCache(protocolName: string): Promise<IRawTokenRightsEntry | null> {
	const normalizedName = normalizeTokenRightsProtocolName(protocolName)
	if (!normalizedName) {
		return null
	}

	const byProtocolName = await readDatasetDomainJson<Record<string, IRawTokenRightsEntry>>(
		'token-rights',
		TOKEN_RIGHTS_FILES.byProtocolName
	)
	return byProtocolName[normalizedName] ?? null
}
