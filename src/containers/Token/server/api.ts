import { MARKETS_SERVER_URL } from '~/constants'
import { isHttpNotFoundMessage, MARKETS_CACHE_CONTROL } from '~/server/api/common'
import { queryString } from '~/server/api/params'
import { proxyJsonRoute } from '~/server/api/proxy'
import { badRequest, notFound } from '~/server/api/respond'

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
