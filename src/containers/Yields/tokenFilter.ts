import { extractPoolTokens, normalizeToken } from './utils'

export function matchesYieldPoolToken(poolSymbol: string, tokenSymbol: string): boolean {
	if (!poolSymbol || !tokenSymbol) return false

	const normalizedToken = normalizeToken(tokenSymbol)
	return extractPoolTokens(poolSymbol).some((poolToken) => poolToken.includes(normalizedToken))
}
