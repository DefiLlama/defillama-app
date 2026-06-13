import { MARKETS_SERVER_URL } from '~/constants'
import { fetchExchangeMarketsFromNetwork } from '~/containers/Cexs/api'
import { isHttpNotFoundMessage, MARKETS_CACHE_CONTROL } from '~/server/api/common'
import { queryString } from '~/server/api/params'
import { proxyJsonRoute } from '~/server/api/proxy'
import { badRequest, notFound, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'
import { resolveMarketsExchangeByParam } from './dataset'

export const tokenMarkets = proxyJsonRoute({
	route: '/api/public/markets/[token]',
	cacheControl: MARKETS_CACHE_CONTROL,
	upstreamUrl: (req) => {
		const token = queryString(req.query, 'token')
		if (!token) {
			return badRequest('Missing token')
		}

		return `${MARKETS_SERVER_URL}/tokens/${encodeURIComponent(token.toLowerCase())}.json`
	},
	onError: (error) => (isHttpNotFoundMessage(error) ? notFound('Token not found') : null),
	upstreamErrorMessage: 'Failed to load token markets'
})

export const exchangeMarkets = defineApiRoute({
	route: '/api/public/markets/exchanges/[exchange]',
	cacheControl: MARKETS_CACHE_CONTROL,
	handle: async (req) => {
		const exchange = queryString(req.query, 'exchange')
		if (!exchange) {
			return badRequest('Missing exchange')
		}

		try {
			const marketsExchange = await resolveMarketsExchangeByParam(exchange)
			if (!marketsExchange) {
				return notFound('Exchange not found')
			}

			const data = await fetchExchangeMarketsFromNetwork(marketsExchange)
			return ok(data)
		} catch (error) {
			if (isHttpNotFoundMessage(error)) {
				return notFound('Exchange not found')
			}
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to load exchange markets')
		}
	}
})
