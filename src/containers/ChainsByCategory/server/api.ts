import { getChainsByCategoryChartData } from '~/containers/ChainsByCategory/queries'
import { ok, upstreamError } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { PAGE_DATA_CACHE_CONTROL } from '~/server/pageData/cache'
import { getCommaSeparatedQueryParam, getFirstQueryParam } from '~/server/pageData/query'
import { recordRouteRuntimeError } from '~/utils/telemetry'

// These chart endpoints fan out to several upstream calls and rebuild
// multi-series datasets in JS (chains/charts averages ~3s), so results are
// memoized by the full raw param set and concurrent identical requests share
// one computation.
const PAGE_DATA_RESULT_TTL_MS = 10 * 60 * 1000

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
