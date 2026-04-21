import type { RawMultiChainTokenMap } from '~/containers/LiquidationsV2/api.types'

export function normalizeLiquidationsTokenSymbol(symbol: string | null | undefined): string | null {
	const normalizedSymbol = symbol?.trim().toUpperCase()
	return normalizedSymbol ? normalizedSymbol : null
}

export function extractLiquidationsTokenSymbols(tokens: RawMultiChainTokenMap): string[] {
	const symbols = new Set<string>()

	for (const chainTokens of Object.values(tokens)) {
		for (const token of Object.values(chainTokens)) {
			const normalizedSymbol = normalizeLiquidationsTokenSymbol(token.symbol)
			if (normalizedSymbol) {
				symbols.add(normalizedSymbol)
			}
		}
	}

	return Array.from(symbols).sort((a, b) => a.localeCompare(b))
}
