import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchChain } from '~/containers/CompareChains/chainFetcher'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'
import { withApiRouteTelemetry } from '~/utils/telemetry'

export async function chainCacheHandler(req: NextApiRequest, res: NextApiResponse) {
	const { chain } = req.query
	const chainParam = Array.isArray(chain) ? chain[0] : chain
	if (typeof chainParam !== 'string' || chainParam.length === 0) {
		return res.status(400).json({ error: 'Missing chain parameter' })
	}

	const [{ default: metadataCache }, { resolveChainParamFromMetadata }] = await Promise.all([
		import('~/utils/metadata'),
		import('~/server/routeCache/chains')
	])
	const chainRoute = resolveChainParamFromMetadata(chainParam, metadataCache)
	if (!chainRoute) {
		return res.status(404).json({ error: 'Chain not found' })
	}

	const canonicalChain = chainRoute.canonicalName
	const cacheKey = `object-chain-${chainRoute.canonicalSlug}`

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

export default withApiRouteTelemetry('/api/dynamic/cache/chain/[chain]', chainCacheHandler)
