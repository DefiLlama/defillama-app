import { slug } from '~/utils'
import { fetchExchangeMarketsListFromCache } from './dataset.markets.cache'

export async function getCexMarketSlugsFromCache(): Promise<string[]> {
	const marketsList = await fetchExchangeMarketsListFromCache()
	const marketCexSlugs = new Set<string>()

	for (const entries of Object.values(marketsList.cex)) {
		for (const entry of entries) {
			const cexSlug = slug(entry.defillama_slug ?? '')
			if (cexSlug) marketCexSlugs.add(cexSlug)
		}
	}

	return [...marketCexSlugs]
}
