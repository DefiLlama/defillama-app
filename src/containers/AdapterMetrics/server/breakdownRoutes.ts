import { queryBoolean, queryFilterMode, queryIntClamped, queryList, queryString } from '~/server/api/params'
import { badRequest, ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS } from '~/utils/breakdownMetrics'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { getAdapterMetricChainSeries } from './breakdowns/chainSeries'
import { DIMENSIONS_API_METRIC_CONFIG } from './breakdowns/config'
import { getAdapterMetricProtocolSeries } from './breakdowns/protocolSeries'

const BREAKDOWN_RESULT_TTL_MS = 10 * 60 * 1000
const BREAKDOWN_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=1200'

export const adapterMetricBreakdown = defineApiRoute({
	route: '/api/public/adapter-metrics/breakdowns/[metric]',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const metric = queryString(req.query, 'metric') ?? ''
		const topN = queryIntClamped(req.query, 'limit', 10, 1, 20)
		const categories = queryList(req.query, 'categories').map((cat) => cat.toLowerCase())
		const groupByParent = queryBoolean(req.query, 'groupByParent')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const categoryMode = queryFilterMode(req.query, 'categoryFilterMode', 'filterMode')

		if (!DIMENSIONS_API_METRIC_CONFIG[metric]) {
			return badRequest(`Unsupported metric: ${metric}`)
		}

		const chains = queryList(req.query, 'chains')
		const chainsOrAll = chains.length > 0 ? chains : ['all']

		try {
			const cacheKey = JSON.stringify([metric, chainsOrAll, categories, topN, groupByParent, chainMode, categoryMode])
			const result = await cachedResult(
				'adapter-metrics-breakdown-dimensions',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getAdapterMetricProtocolSeries({
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

export const adapterMetricByChainBreakdown = defineApiRoute({
	route: '/api/public/adapter-metrics/breakdowns/by-chain/[metric]',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const metric = queryString(req.query, 'metric') ?? ''
		const protocol = queryString(req.query, 'protocol')

		if (NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS.has(metric) || !DIMENSIONS_API_METRIC_CONFIG[metric]) {
			return badRequest(`Unsupported metric: ${metric}`)
		}

		const rawChains = queryList(req.query, 'chains')
		const chains = rawChains.includes('All') ? [] : rawChains
		const chainCategories = queryList(req.query, 'chainCategories')
		const protocolCategories = queryList(req.query, 'protocolCategories')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const chainCategoryMode = queryFilterMode(req.query, 'chainCategoryFilterMode', 'filterMode')
		const protocolCategoryMode = queryFilterMode(req.query, 'protocolCategoryFilterMode', 'filterMode')
		const topN = queryIntClamped(req.query, 'limit', 5, 1, 20)

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
				'adapter-metrics-breakdown-chain',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getAdapterMetricChainSeries({
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
