import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchChain } from '~/containers/CompareChains/chainFetcher'
import { slug } from '~/utils'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import { withApiRouteTelemetry } from '~/utils/telemetry'

export async function chainCacheHandler(req: NextApiRequest, res: NextApiResponse) {
	const { chain } = req.query
	const chainParam = Array.isArray(chain) ? chain[0] : chain
	if (typeof chainParam !== 'string' || chainParam.length === 0) {
		return res.status(404).json({ error: 'Chain not found' })
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const chainSlug = slug(chainParam)
	const chainMetadata = metadataCache.chainMetadata[chainSlug]
	if (!chainMetadata) {
		return res.status(404).json({ error: 'Chain not found' })
	}

	const canonicalChain = chainMetadata.name
	const cacheKey = `object-chain-${chainSlug}`

	const cachedData = await getObjectCache(cacheKey)
	if (cachedData) {
		return res.json(cachedData)
	}

	const chainData = await fetchChain({
		chain: canonicalChain,
		chainMetadata: metadataCache.chainMetadata,
		categoriesAndTagsMetadata: metadataCache.categoriesAndTags,
		protocolMetadata: metadataCache.protocolMetadata
	})
	const response = { chain: chainData }

	await setObjectCache(cacheKey, response)
	return res.json(response)
}

export default withApiRouteTelemetry('/api/cache/chain/[chain]', chainCacheHandler)
