import { fetchYieldTokenCategoriesApi } from '../api'
import type { YieldFetchOptions } from '../api.types'
import type { YieldPageProps } from '../types'
import { yieldPriceChainMapping } from './rewardTokens'

export async function enrichYieldTokenCategories(
	data: YieldPageProps,
	options: YieldFetchOptions = {}
): Promise<YieldPageProps> {
	try {
		const tokenCategories = await fetchYieldTokenCategoriesApi(options)
		data.tokenCategories = tokenCategories && typeof tokenCategories === 'object' ? tokenCategories : {}

		const categoryTokens: Array<{ name: string; symbol: string; logo: null; fallbackLogo: null }> = []
		const categorySymbols: string[] = []
		for (const [slug, categoryData] of Object.entries(data.tokenCategories)) {
			if (slug === 'meme-token') continue
			const { label, filterKey } = categoryData as { label: string; filterKey: string }
			if (filterKey && label) {
				categoryTokens.push({
					name: label,
					symbol: filterKey,
					logo: null,
					fallbackLogo: null
				})
				categorySymbols.push(filterKey)
			}
		}
		data.tokens.splice(2, 0, ...categoryTokens)
		data.tokenSymbolsList.splice(2, 0, ...categorySymbols)
	} catch {
		data.tokenCategories = {}
	}

	try {
		const memeTokenData = data.tokenCategories?.['meme-token']
		if (memeTokenData) {
			const memeAddresses = new Set(memeTokenData.addresses || [])
			const memeSymbols = new Set(memeTokenData.symbols || [])

			data.pools = data.pools.map((pool) => {
				let hasMemeToken = false
				if (!pool.symbol) return { ...pool, hasMemeToken }

				const chain = yieldPriceChainMapping[pool.chain?.toLowerCase()] ?? pool.chain?.toLowerCase()
				const underlyingTokens = pool.underlyingTokens ?? []

				if (underlyingTokens.length > 0 && memeAddresses.size > 0) {
					hasMemeToken = underlyingTokens.some(
						(address: string) => address && memeAddresses.has(`${chain}:${address.toLowerCase().replaceAll('/', ':')}`)
					)
				}

				if (!hasMemeToken && memeSymbols.size > 0) {
					const tokensInPool = pool.symbol.split('-').map((symbol: string) => symbol.toLowerCase())
					hasMemeToken = tokensInPool.some((symbol: string) => memeSymbols.has(symbol))
				}

				return { ...pool, hasMemeToken }
			})
		}
	} catch {
		// Meme token detection failed; pools keep hasMemeToken as undefined.
	}

	return data
}
