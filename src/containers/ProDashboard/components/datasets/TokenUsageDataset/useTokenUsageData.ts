import { useQuery } from '@tanstack/react-query'
import { PROTOCOLS_BY_TOKEN_API } from '~/constants'

interface TokenUsageData {
	name: string
	category: string
	amountUsd: number
	amountUsdByChain?: Record<string, number>
	logo?: string
	misrepresentedTokens?: boolean
	tokens?: Record<string, number>
}

export function useTokenUsageData(tokenSymbols: string[], includeCex: boolean = false) {
	return useQuery<TokenUsageData[]>({
		queryKey: ['token-usage', tokenSymbols.map((t) => t?.toUpperCase()).sort(), includeCex],
		queryFn: async () => {
			if (!tokenSymbols || tokenSymbols.length === 0) {
				return []
			}

			try {
				const promises = tokenSymbols.map(async (symbol) => {
					const response = await fetch(`${PROTOCOLS_BY_TOKEN_API}/${symbol.toUpperCase()}`)
					if (!response.ok) {
						throw new Error(`Failed to fetch data for ${symbol}`)
					}
					const data = await response.json()
					return { symbol, data }
				})

				const results = await Promise.all(promises)

				const protocolMap = new Map<string, TokenUsageData>()

				results.forEach(({ symbol, data }) => {
					data?.forEach((p: any) => {
						const key = p.name

						if (protocolMap.has(key)) {
							const existing = protocolMap.get(key)!
							existing.tokens = existing.tokens || {}
							existing.tokens[symbol] = Object.values(p.amountUsd as Record<string, number>).reduce(
								(s: number, a: number) => s + a,
								0
							)
							existing.amountUsd += existing.tokens[symbol]
						} else {
							const tokenAmount = Object.values(p.amountUsd as Record<string, number>).reduce(
								(s: number, a: number) => s + a,
								0
							)
							protocolMap.set(key, {
								...p,
								amountUsdByChain: p.amountUsd,
								amountUsd: tokenAmount,
								tokens: { [symbol]: tokenAmount }
							})
						}
					})
				})

				const processed = Array.from(protocolMap.values())

				return processed.filter(
					(protocol: TokenUsageData) =>
						!protocol.misrepresentedTokens && (protocol.category?.toLowerCase() === 'cex' ? includeCex : true)
				)
			} catch (error) {
				console.error('Error fetching token usage data:', error)
				throw error
			}
		},
		enabled: tokenSymbols.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchInterval: 5 * 60 * 1000
	})
}
