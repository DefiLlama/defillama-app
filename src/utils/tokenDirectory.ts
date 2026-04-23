export type TokenDirectoryRecord = {
	name: string
	symbol: string
	token_nk?: string
	protocolId?: string
	chainId?: string
	route?: string
	tokenRights?: boolean
	is_yields?: boolean
	mcap_rank?: number
	logo?: string | null
}

export type TokenDirectory = Record<string, TokenDirectoryRecord>

export function findTokenDirectoryRecordByDefiLlamaId(
	tokens: TokenDirectory,
	defiLlamaId: string | null | undefined
): TokenDirectoryRecord | null {
	if (!defiLlamaId) return null

	for (const key in tokens) {
		const token = tokens[key]

		if (token.protocolId === defiLlamaId || token.chainId === defiLlamaId) {
			return token
		}
	}

	return null
}
