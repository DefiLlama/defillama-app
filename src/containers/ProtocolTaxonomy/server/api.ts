import { getProtocolsCategoriesChartData } from '~/containers/ProtocolTaxonomy/queries'
import { ok, upstreamError } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { PAGE_DATA_CACHE_CONTROL } from '~/server/pageData/cache'
import { getCommaSeparatedQueryParam } from '~/server/pageData/query'
import { recordRouteRuntimeError } from '~/utils/telemetry'

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
