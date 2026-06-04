import type { RawProtocolTokenUsageEntry } from '~/containers/TokenUsage/api.types'

export type TokenUsageSectionRow = {
	name: string
	amountUsd: number
	category?: string
	logo?: string
	slug?: string
	misrepresentedTokens?: boolean
}

export function buildTokenUsageRows(data: RawProtocolTokenUsageEntry[]): TokenUsageSectionRow[] {
	return data.map((entry) => {
		let amountUsd = 0
		const amountUsdByChain = entry.amountUsd ?? {}

		for (const chain in amountUsdByChain) {
			const amount = amountUsdByChain[chain]
			if (typeof amount === 'number') {
				amountUsd += amount
			}
		}

		return {
			name: entry.name,
			category: entry.category,
			logo: typeof entry.logo === 'string' ? entry.logo : undefined,
			slug: typeof entry.slug === 'string' ? entry.slug : undefined,
			misrepresentedTokens: entry.misrepresentedTokens,
			amountUsd
		}
	})
}

export function filterTokenUsageRows(
	rows: TokenUsageSectionRow[],
	includeCentralizedExchanges: boolean
): TokenUsageSectionRow[] {
	return rows.filter((row) => {
		if (row.misrepresentedTokens) return false
		if (row.category?.toLowerCase() === 'cex' && !includeCentralizedExchanges) return false
		return true
	})
}
