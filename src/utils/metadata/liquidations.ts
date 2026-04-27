import type { RawAllLiquidationsResponse } from '~/containers/LiquidationsV2/api.types'

export function normalizeLiquidationsTokenSymbol(symbol: string | null | undefined): string | null {
	const normalizedSymbol = symbol?.trim().toUpperCase()
	return normalizedSymbol ? normalizedSymbol : null
}

export function extractLiquidationsTokenSymbols(liquidationsResponse: RawAllLiquidationsResponse): string[] {
	const symbols = new Set<string>()

	for (const protocolId in liquidationsResponse.data) {
		const protocolData = liquidationsResponse.data[protocolId]

		for (const chainId in protocolData) {
			const chainTokens = liquidationsResponse.tokens[chainId]
			if (!chainTokens) {
				continue
			}

			for (const position of protocolData[chainId]) {
				const token = chainTokens[position.collateral]
				const normalizedSymbol = normalizeLiquidationsTokenSymbol(token?.symbol)
				if (normalizedSymbol) {
					symbols.add(normalizedSymbol)
				}
			}
		}
	}

	return Array.from(symbols).sort((a, b) => a.localeCompare(b))
}
