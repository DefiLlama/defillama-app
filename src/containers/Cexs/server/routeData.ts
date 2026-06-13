import { fetchExchangeMarketsListFromCache } from '~/containers/Markets/server/dataset.cache'
import { slug } from '~/utils'

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
