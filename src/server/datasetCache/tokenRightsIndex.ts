import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'

export type TokenRightsIndexes = {
	byDefillamaId: Record<string, IRawTokenRightsEntry>
	byProtocolName: Record<string, IRawTokenRightsEntry>
}

export function normalizeTokenRightsProtocolName(name: string): string {
	return name.toLowerCase().replace(/ /g, '-').replace(/'/g, '')
}

export function buildTokenRightsIndexes(entries: IRawTokenRightsEntry[]): TokenRightsIndexes {
	const byDefillamaId: Record<string, IRawTokenRightsEntry> = {}
	const byProtocolName: Record<string, IRawTokenRightsEntry> = {}

	for (const entry of entries) {
		const defillamaId = entry['DefiLlama ID']
		if (defillamaId) {
			byDefillamaId[defillamaId] = entry
		}

		const protocolName = entry['Protocol Name']
		if (protocolName) {
			byProtocolName[normalizeTokenRightsProtocolName(protocolName)] = entry
		}
	}

	return { byDefillamaId, byProtocolName }
}
