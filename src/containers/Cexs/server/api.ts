import { fetchExchangeMarketsFromNetwork } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { queryString } from '~/server/api/params'
import { badRequest, notFound, ok, upstreamError } from '~/server/api/respond'
import { defineApiRoute } from '~/server/api/types'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const MARKETS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=300'

function isNotFoundMessage(error: unknown, fallback: string): boolean {
	const message = error instanceof Error ? error.message : fallback
	return /\b404\b/.test(message)
}

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
			const { fetchExchangeMarketsListFromCache } = await import('~/server/datasetCache/markets')
			const marketsExchange = resolveMarketsExchangeParam(exchange, await fetchExchangeMarketsListFromCache())
			if (!marketsExchange) {
				return notFound('Exchange not found')
			}

			const data = await fetchExchangeMarketsFromNetwork(marketsExchange)
			return ok(data)
		} catch (error) {
			if (isNotFoundMessage(error, 'Failed to load exchange markets')) {
				return notFound('Exchange not found')
			}
			recordRouteRuntimeError(error, 'apiRoute')
			return upstreamError('Failed to load exchange markets')
		}
	}
})
