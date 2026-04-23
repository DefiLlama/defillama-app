import type { RawMultiChainTokenMap } from '~/containers/LiquidationsV2/api.types'

export function normalizeLiquidationsTokenSymbol(symbol: string | null | undefined): string | null {
	const normalizedSymbol = symbol?.trim().toUpperCase()
	return normalizedSymbol ? normalizedSymbol : null
}

export function extractLiquidationsTokenSymbols(tokens: RawMultiChainTokenMap): string[] {
	const symbols = new Set<string>()

	for (const chain in tokens) {
		const chainTokens = tokens[chain]

		for (const tokenAddress in chainTokens) {
			const token = chainTokens[tokenAddress]
			const normalizedSymbol = normalizeLiquidationsTokenSymbol(token.symbol)
			if (normalizedSymbol) {
				symbols.add(normalizedSymbol)
			}
		}
	}

	return Array.from(symbols).sort((a, b) => a.localeCompare(b))
}
