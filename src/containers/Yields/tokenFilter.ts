import { extractPoolTokens, normalizeToken } from './utils'

// Wrapper prefixes that should still match the underlying token symbol.
const WRAPPER_PREFIXES = ['st', 'cb', 'w', 'r', 't'] as const

function normalizeYieldTokenSymbol(token: string): string {
	const normalizedToken = token.normalize('NFKC').trim().toLowerCase()
	if (!normalizedToken) return ''
	if (normalizedToken === 't') return 't'
	if (normalizedToken === 'tether') return 'usdt'
	return normalizeToken(normalizedToken)
}

function stripWrapperPrefix(token: string): string {
	for (const prefix of WRAPPER_PREFIXES) {
		if (token.length > prefix.length && token.startsWith(prefix)) {
			return token.slice(prefix.length)
		}
	}

	return token
}

function getYieldTokenVariants(token: string): string[] {
	const normalizedToken = normalizeYieldTokenSymbol(token)
	if (!normalizedToken) return []

	const strippedToken = stripWrapperPrefix(normalizedToken)

	return strippedToken === normalizedToken ? [normalizedToken] : [normalizedToken, strippedToken]
}

export function getYieldTokenVariantSet(token: string): Set<string> {
	return new Set(getYieldTokenVariants(token))
}

export function getYieldPoolTokenVariantSet(poolSymbol: string): Set<string> {
	const variants = new Set<string>()

	for (const poolToken of extractPoolTokens(poolSymbol)) {
		for (const variant of getYieldTokenVariants(poolToken)) {
			variants.add(variant)
		}
	}

	return variants
}

export function matchesYieldPoolToken(poolSymbol: string, tokenSymbol: string): boolean {
	if (!poolSymbol || !tokenSymbol) return false

	const tokenVariants = getYieldTokenVariantSet(tokenSymbol)
	const poolTokenVariants = getYieldPoolTokenVariantSet(poolSymbol)

	for (const tokenVariant of tokenVariants) {
		if (poolTokenVariants.has(tokenVariant)) return true
	}

	return false
}
