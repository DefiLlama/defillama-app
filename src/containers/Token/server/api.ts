import { MARKETS_SERVER_URL } from '~/constants'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const MARKETS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=300'

function isNotFoundMessage(error: unknown, fallback: string): boolean {
	const message = error instanceof Error ? error.message : fallback
	return /\b404\b/.test(message)
}

export const tokenMarkets = defineApiRoute({
	route: '/api/public/markets/[token]',
	cacheControl: MARKETS_CACHE_CONTROL,
	handle: async (req) => {
		const token = queryString(req.query, 'token')
		if (!token) {
			return badRequest('Missing token')
		}

		const url = `${MARKETS_SERVER_URL}/tokens/${encodeURIComponent(token.toLowerCase())}.json`
		try {
			const data = await fetchJson(url)
			return ok(data)
		} catch (error) {
			if (isNotFoundMessage(error, 'Failed to load token markets')) {
				return notFound('Token not found')
			}
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to load token markets')
		}
	}
})
