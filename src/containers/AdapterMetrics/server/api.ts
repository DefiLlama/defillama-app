import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { getChainsByAdapterAllChains, getChainsByAdapterChartData } from '~/containers/AdapterMetrics/queries'
import { badRequest, ok, upstreamError } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { PAGE_DATA_CACHE_CONTROL } from '~/server/pageData/cache'
import { getFirstQueryParam } from '~/server/pageData/query'
import { recordRouteRuntimeError } from '~/utils/telemetry'

// These chart endpoints fan out to several upstream calls and rebuild
// multi-series datasets in JS (chains/charts averages ~3s), so results are
// memoized by the full raw param set and concurrent identical requests share
// one computation.
const PAGE_DATA_RESULT_TTL_MS = 10 * 60 * 1000

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
