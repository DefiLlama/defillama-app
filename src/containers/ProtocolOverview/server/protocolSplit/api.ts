import { queryBoolean, queryFilterMode, queryIntClamped, queryList, queryString } from '~/server/api/params'
import { badRequest, ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { DIMENSIONS_METRIC_CONFIG, getDimensionsSplitData } from './dimensionsSplit'
import { CHAIN_ONLY_METRICS, getProtocolChainSplitData } from './protocolChainService'
import { getTvlSplitData } from './tvlSplit'

// These aggregations rebuild multi-chain chart breakdowns in JS and can hold
// the event loop for seconds, so results are memoized and concurrent
// identical requests share one computation.
const SPLIT_RESULT_TTL_MS = 10 * 60 * 1000
const SPLIT_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=1200'

export const protocolsSplit = defineApiRoute({
	route: '/api/public/protocols/split/[dataType]',
	cacheControl: SPLIT_CACHE_CONTROL,
	handle: async (req) => {
		const metric = queryString(req.query, 'dataType') ?? ''
		const topN = queryIntClamped(req.query, 'limit', 10, 1, 20)
		const categories = queryList(req.query, 'categories').map((cat) => cat.toLowerCase())
		const groupByParent = queryBoolean(req.query, 'groupByParent')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const categoryMode = queryFilterMode(req.query, 'categoryFilterMode', 'filterMode')

		if (metric === 'tvl') {
			let chains = queryList(req.query, 'chains')
			if (chains.some((c) => c.toLowerCase() === 'all')) chains = []

			try {
				const cacheKey = JSON.stringify([chains, categories, topN, groupByParent, chainMode, categoryMode])
				const result = await cachedResult(
					'protocols-split-tvl',
					cacheKey,
					{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
					() => getTvlSplitData(chains, categories, topN, groupByParent, chainMode, categoryMode)
				)
				return ok(result)
			} catch (error) {
				recordRouteRuntimeError(error, 'apiRoute')
				return {
					status: 500,
					body: { error: 'Failed to fetch TVL data', message: error instanceof Error ? error.message : 'Unknown error' }
				}
			}
		}

		if (!DIMENSIONS_METRIC_CONFIG[metric]) {
			return badRequest(`Unsupported metric: ${metric}`)
		}

		const chains = queryList(req.query, 'chains')
		const chainsOrAll = chains.length > 0 ? chains : ['all']

		try {
			const cacheKey = JSON.stringify([metric, chainsOrAll, categories, topN, groupByParent, chainMode, categoryMode])
			const result = await cachedResult(
				'protocols-split-dimensions',
				cacheKey,
				{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getDimensionsSplitData({
						metric,
						chains: chainsOrAll,
						categories,
						topN,
						groupByParent,
						chainFilterMode: chainMode,
						categoryFilterMode: categoryMode
					})
			)
			return ok(result)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return {
				status: 500,
				body: {
					error: `Failed to fetch protocol ${metric} data`,
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			}
		}
	}
})

export const protocolChainSplit = defineApiRoute({
	route: '/api/public/protocols/split/protocol-chain',
	cacheControl: SPLIT_CACHE_CONTROL,
	handle: async (req) => {
		const metric = queryString(req.query, 'metric') ?? 'tvl'
		const rawChains = queryList(req.query, 'chains')
		const chains = rawChains.includes('All') ? [] : rawChains
		const chainCategories = queryList(req.query, 'chainCategories')
		const protocolCategories = queryList(req.query, 'protocolCategories')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const chainCategoryMode = queryFilterMode(req.query, 'chainCategoryFilterMode', 'filterMode')
		const protocolCategoryMode = queryFilterMode(req.query, 'protocolCategoryFilterMode', 'filterMode')
		const topN = queryIntClamped(req.query, 'limit', 5, 1, 20)
		const protocol = queryString(req.query, 'protocol')
		const isProtocolAll = !protocol || protocol.toLowerCase() === 'all'

		if (CHAIN_ONLY_METRICS.has(metric) && !isProtocolAll) {
			return badRequest(`${metric} metric is only available when protocol=All`)
		}

		try {
			const cacheKey = JSON.stringify([
				protocol ?? 'all',
				metric,
				chains,
				topN,
				chainMode,
				chainCategoryMode,
				protocolCategoryMode,
				chainCategories,
				protocolCategories
			])
			const result = await cachedResult(
				'protocols-split-chain',
				cacheKey,
				{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getProtocolChainSplitData({
						protocol,
						metric,
						chains,
						topN,
						chainFilterMode: chainMode,
						chainCategoryFilterMode: chainCategoryMode,
						protocolCategoryFilterMode: protocolCategoryMode,
						chainCategories,
						protocolCategories
					})
			)
			return ok(result)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return {
				status: 500,
				body: {
					error: 'Failed to fetch protocol chain data',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			}
		}
	}
})
