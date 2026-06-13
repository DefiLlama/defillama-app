import { fetchChain } from '~/containers/CompareChains/chainFetcher'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { getObjectCache, setObjectCache } from '~/utils/cache-client'

// fetchChain fans out to many upstream calls and averages multiple seconds,
// so on top of the shared object cache the assembled response is memoized in
// process (keyed by the raw chain param) and concurrent identical requests
// share one computation.
const CHAIN_RESULT_TTL_MS = 5 * 60 * 1000

export const chainCache = defineApiRoute({
	route: '/api/dynamic/cache/chain/[chain]',
	handle: async (req) => {
		const chainParam = queryString(req.query, 'chain')
		if (typeof chainParam !== 'string' || chainParam.length === 0) {
			return badRequest('Missing chain parameter')
		}

		const [{ default: metadataCache }, { resolveChainParamFromMetadata }] = await Promise.all([
			import('~/utils/metadata'),
			import('~/containers/ChainOverview/server/routes')
		])
		const chainRoute = resolveChainParamFromMetadata(chainParam, metadataCache)
		if (!chainRoute) {
			return notFound('Chain not found')
		}

		const response = await cachedResult(
			'chain-cache',
			chainParam,
			{ ttlMs: CHAIN_RESULT_TTL_MS, ttlJitter: 0.2 },
			async () => {
				const cacheKey = `object-chain-${chainRoute.canonicalSlug}`

				const cachedData = await getObjectCache(cacheKey)
				if (cachedData) {
					return cachedData
				}

				const chainData = await fetchChain({
					chain: chainRoute.canonicalName,
					chainMetadata: metadataCache.chainMetadata,
					categoriesAndTagsMetadata: metadataCache.categoriesAndTags,
					protocolMetadata: metadataCache.protocolMetadata
				})
				const freshData = { chain: chainData }

				await setObjectCache(cacheKey, freshData)
				return freshData
			}
		)
		return ok(response)
	}
})
