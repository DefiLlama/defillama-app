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

export function findTokenDirectoryRecordByGeckoId(
	tokens: TokenDirectory,
	geckoId: string | null | undefined
): TokenDirectoryRecord | null {
	if (!geckoId) return null

	const tokenNk = `coingecko:${geckoId.toLowerCase()}`

	for (const key in tokens) {
		const token = tokens[key]

		if (token.token_nk?.toLowerCase() === tokenNk) {
			return token
		}
	}

	return null
}

export function findTokenDirectoryRecordByDefillamaId(
	tokens: TokenDirectory,
	defillamaId: string
): TokenDirectoryRecord | null {
	for (const key in tokens) {
		const token = tokens[key]

		if (token.protocolId === defillamaId || token.chainId === defillamaId) {
			return token
		}
	}

	return null
}
