import { queryBoolean, queryFilterMode, queryIntClamped, queryList, queryString } from '~/server/api/params'
import { ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { getProtocolChainBreakdownData } from './breakdowns/byChain'
import { getTvlBreakdownData } from './breakdowns/tvl'

const BREAKDOWN_RESULT_TTL_MS = 10 * 60 * 1000
const BREAKDOWN_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=1200'

export const protocolTvlBreakdown = defineApiRoute({
	route: '/api/public/protocols/breakdowns/tvl',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const topN = queryIntClamped(req.query, 'limit', 10, 1, 20)
		const categories = queryList(req.query, 'categories').map((cat) => cat.toLowerCase())
		const groupByParent = queryBoolean(req.query, 'groupByParent')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const categoryMode = queryFilterMode(req.query, 'categoryFilterMode', 'filterMode')

		let chains = queryList(req.query, 'chains')
		if (chains.some((c) => c.toLowerCase() === 'all')) chains = []

		try {
			const cacheKey = JSON.stringify([chains, categories, topN, groupByParent, chainMode, categoryMode])
			const result = await cachedResult(
				'protocols-breakdown-tvl',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() => getTvlBreakdownData(chains, categories, topN, groupByParent, chainMode, categoryMode)
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
})

export const protocolTvlByChainBreakdown = defineApiRoute({
	route: '/api/public/protocols/breakdowns/by-chain/tvl',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const rawChains = queryList(req.query, 'chains')
		const chains = rawChains.includes('All') ? [] : rawChains
		const chainCategories = queryList(req.query, 'chainCategories')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const chainCategoryMode = queryFilterMode(req.query, 'chainCategoryFilterMode', 'filterMode')
		const topN = queryIntClamped(req.query, 'limit', 5, 1, 20)
		const protocol = queryString(req.query, 'protocol')

		try {
			const cacheKey = JSON.stringify([
				protocol ?? 'all',
				'tvl',
				chains,
				topN,
				chainMode,
				chainCategoryMode,
				chainCategories
			])
			const result = await cachedResult(
				'protocols-breakdown-chain-tvl',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getProtocolChainBreakdownData({
						protocol,
						metric: 'tvl',
						chains,
						topN,
						chainFilterMode: chainMode,
						chainCategoryFilterMode: chainCategoryMode,
						chainCategories
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
