import { fetchBridgeTransactions } from '~/containers/Bridges/api'
import { queryString } from '~/server/api/params'
import { badRequest, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'

export const bridgeTransactions = defineApiRoute({
	route: '/api/public/bridges/transactions/[id]',
	cacheControl: 'public, s-maxage=300, stale-while-revalidate=60',
	handle: async (req) => {
		const idParam = queryString(req.query, 'id')
		const startParam = queryString(req.query, 'starttimestamp')
		const endParam = queryString(req.query, 'endtimestamp')

		if (!idParam) {
			return badRequest('id parameter is required')
		}

		const startTimestamp = Number(startParam)
		const endTimestamp = Number(endParam)

		if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
			return badRequest('starttimestamp and endtimestamp must be valid numbers')
		}

		if (startTimestamp >= endTimestamp) {
			return badRequest('starttimestamp must be less than endtimestamp')
		}

		try {
			// Single bounded upstream call; the observed multi-second latency lives
			// upstream, and payloads can be large (the pages adapter disables
			// responseLimit), so results are intentionally not memoized in-process.
			const data = await fetchBridgeTransactions(idParam, startTimestamp, endTimestamp)
			return ok(data)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to fetch bridge transactions')
		}
	}
})
