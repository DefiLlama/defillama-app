import { fetchCoinGeckoChartByIdWithCacheFallback } from '~/api/coingecko'
import { CACHE_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { queryString } from '~/server/api/params'
import { badRequest, ok } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'

const CHART_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

// ---------------------------------------------------------------------------
// /api/public/charts/coingecko/[geckoId]
// ---------------------------------------------------------------------------

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && error.message.includes('[404]')
}

async function fetchTokenTotalSupply(geckoId: string): Promise<number | null> {
	try {
		const data = await fetchJson<{ data?: { total_supply?: number | null } }>(`${CACHE_SERVER}/supply/${geckoId}`)
		const rawSupply = data?.data?.total_supply ?? null
		return rawSupply != null && Number.isFinite(rawSupply) ? rawSupply : null
	} catch (error) {
		if (isNotFoundError(error)) return null
		throw error
	}
}

export const coingeckoChart = defineApiRoute({
	route: '/api/public/charts/coingecko/[geckoId]',
	cacheControl: CHART_CACHE_CONTROL,
	handle: async (req) => {
		const geckoId = queryString(req.query, 'geckoId')
		if (!geckoId) {
			return badRequest('geckoId parameter is required')
		}

		const kind = queryString(req.query, 'kind')

		try {
			if (kind === 'supply') {
				// Supply is not part of the CoinGecko chart payload; it comes from the
				// cache-server supply snapshot while price charts use the CG cache path.
				const totalSupply = await fetchTokenTotalSupply(geckoId)
				if (totalSupply === null) {
					return ok({ totalSupply }, NO_STORE_HEADERS)
				}
				return ok({ totalSupply })
			}

			const fullChart = queryString(req.query, 'fullChart') !== 'false'
			const chart = await fetchCoinGeckoChartByIdWithCacheFallback(geckoId, { fullChart })
			if (!chart) {
				return ok(null, NO_STORE_HEADERS)
			}

			return ok(chart)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			// Legacy recorded 500; the status and body are pinned by
			// src/api/__tests__/charts-coingecko.test.ts.
			return { status: 500, body: { error: 'Failed to load coingecko chart data' } }
		}
	}
})
