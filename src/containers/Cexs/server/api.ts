import { fetchExchangeMarketsFromNetwork } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { isHttpNotFoundMessage, MARKETS_CACHE_CONTROL } from '~/server/api/common'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'

function resolveMarketsExchangeParam(exchange: string, marketsList: ExchangeMarketsListResponse): string | null {
	const normalizedExchange = exchange.toLowerCase()

	for (const venue of [marketsList.cex, marketsList.dex]) {
		for (const category in venue) {
			for (const entry of venue[category as keyof typeof venue]) {
				if (entry.exchange.toLowerCase() === normalizedExchange) return entry.exchange
			}
		}
	}

	return null
}

export const exchangeMarkets = defineApiRoute({
	route: '/api/public/markets/exchanges/[exchange]',
	cacheControl: MARKETS_CACHE_CONTROL,
	handle: async (req) => {
		const exchange = queryString(req.query, 'exchange')
		if (!exchange) {
			return badRequest('Missing exchange')
		}

		try {
			const { fetchExchangeMarketsList } = await import('~/containers/Cexs/server/dataset.markets')
			const marketsExchange = resolveMarketsExchangeParam(exchange, await fetchExchangeMarketsList())
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
