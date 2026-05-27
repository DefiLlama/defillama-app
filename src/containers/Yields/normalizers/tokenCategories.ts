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
		for (const slug in data.tokenCategories) {
			if (slug === 'meme-token') continue
			const { label, filterKey } = data.tokenCategories[slug]
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
			const memeAddresses = new Set<string>()
			for (const address of memeTokenData.addresses || []) {
				memeAddresses.add(address.trim().toLowerCase().replaceAll('/', ':'))
			}
			const memeSymbols = new Set<string>()
			for (const symbol of memeTokenData.symbols || []) {
				memeSymbols.add(symbol.trim().toLowerCase())
			}

			const pools = []
			for (const pool of data.pools) {
				let hasMemeToken = false
				if (!pool.symbol) {
					pools.push({ ...pool, hasMemeToken })
					continue
				}

				const chain = yieldPriceChainMapping[pool.chain?.toLowerCase()] ?? pool.chain?.toLowerCase()
				const underlyingTokens = pool.underlyingTokens ?? []

				if (underlyingTokens.length > 0 && memeAddresses.size > 0) {
					for (const address of underlyingTokens) {
						if (memeAddresses.has(`${chain}:${address.trim().toLowerCase().replaceAll('/', ':')}`)) {
							hasMemeToken = true
							break
						}
					}
				}

				if (!hasMemeToken && memeSymbols.size > 0) {
					for (const symbol of pool.symbol.split('-')) {
						if (memeSymbols.has(symbol.toLowerCase())) {
							hasMemeToken = true
							break
						}
					}
				}

				pools.push({ ...pool, hasMemeToken })
			}
			data.pools = pools
		}
	} catch {
		// Meme token detection failed; pools keep hasMemeToken as undefined.
	}

	return data
}
