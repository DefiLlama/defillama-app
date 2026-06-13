import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { getChainsByAdapterAllChains, getChainsByAdapterChartData } from '~/containers/AdapterMetrics/queries'
import { getChainsByCategoryChartData } from '~/containers/ChainsByCategory/queries'
import { getProtocolsCategoriesChartData } from '~/containers/ProtocolTaxonomy/queries'
import { PAGE_DATA_CACHE_CONTROL } from '~/server/pageData/cache'
import { getCommaSeparatedQueryParam, getFirstQueryParam } from '~/server/pageData/query'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { badRequest, ok, upstreamError } from '../respond'
import { cachedResult } from '../resultCache'
import { defineApiRoute } from '../types'

// These chart endpoints fan out to several upstream calls and rebuild
// multi-series datasets in JS (chains/charts averages ~3s), so results are
// memoized by the full raw param set and concurrent identical requests share
// one computation.
const PAGE_DATA_RESULT_TTL_MS = 10 * 60 * 1000

export const categoriesCharts = defineApiRoute({
	route: '/api/public/page-data/categories/charts',
	cacheControl: PAGE_DATA_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const chartData = await cachedResult(
				'page-data-categories-charts',
				JSON.stringify(req.query.extraTvlTypes ?? null),
				{ ttlMs: PAGE_DATA_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getProtocolsCategoriesChartData({
						extraTvlTypes: getCommaSeparatedQueryParam(req.query.extraTvlTypes)
					})
			)
			return ok(chartData)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch categories chart data')
		}
	}
})

export const chainsCharts = defineApiRoute({
	route: '/api/public/page-data/chains/charts',
	cacheControl: PAGE_DATA_CACHE_CONTROL,
	handle: async (req) => {
		try {
			const cacheKey = JSON.stringify([
				req.query.category ?? null,
				req.query.sampledChart ?? null,
				req.query.extraTvlTypes ?? null
			])
			const body = await cachedResult(
				'page-data-chains-charts',
				cacheKey,
				{ ttlMs: PAGE_DATA_RESULT_TTL_MS, ttlJitter: 0.2 },
				async () => {
					const data = await getChainsByCategoryChartData({
						category: getFirstQueryParam(req.query.category) ?? 'All',
						sampledChart: getFirstQueryParam(req.query.sampledChart) === 'true',
						extraTvlTypes: getCommaSeparatedQueryParam(req.query.extraTvlTypes)
					})
					return {
						tvlChartsByChain: data.tvlChartsByChain,
						totalTvlByDate: data.totalTvlByDate
					}
				}
			)
			return ok(body)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch chains chart data')
		}
	}
})

const ADAPTER_TYPE_VALUES = new Set<string>(Object.values(ADAPTER_TYPES))
const ADAPTER_DATA_TYPE_VALUES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))

export const dimensionAdapterChainsChart = defineApiRoute({
	route: '/api/public/page-data/dimension-adapters/chains-chart',
	cacheControl: PAGE_DATA_CACHE_CONTROL,
	handle: async (req) => {
		const adapterType = getFirstQueryParam(req.query.adapterType)
		const dataType = getFirstQueryParam(req.query.dataType)
		if (!adapterType || !dataType) {
			return badRequest('adapterType and dataType parameters are required')
		}
		if (!ADAPTER_TYPE_VALUES.has(adapterType) || !ADAPTER_DATA_TYPE_VALUES.has(dataType)) {
			return badRequest('unsupported adapterType or dataType')
		}

		try {
			const chartData = await cachedResult(
				'page-data-dimension-adapters-chains-chart',
				JSON.stringify([adapterType, dataType]),
				{ ttlMs: PAGE_DATA_RESULT_TTL_MS, ttlJitter: 0.2 },
				async () => {
					// Build the chain universe from adapter metadata so this endpoint only
					// asks upstream for chains that expose the requested metric.
					const metadataCache = await import('~/utils/metadata').then((m) => m.default)
					const allChains = getChainsByAdapterAllChains({
						adapterType: adapterType as `${ADAPTER_TYPES}`,
						dataType: dataType as `${ADAPTER_DATA_TYPES}`,
						chainMetadata: metadataCache.chainMetadata
					})
					return getChainsByAdapterChartData({
						adapterType: adapterType as `${ADAPTER_TYPES}`,
						dataType: dataType as `${ADAPTER_DATA_TYPES}`,
						allChains
					})
				}
			)
			return ok({ chartData })
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch dimension adapter chart data')
		}
	}
})
