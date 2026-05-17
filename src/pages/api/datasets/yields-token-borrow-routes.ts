import type { NextApiRequest, NextApiResponse } from 'next'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

async function handler(req: NextApiRequest, res: NextApiResponse<TokenBorrowRoutesResponse | { error: string }>) {
	try {
		const tokenQuery = req.query.token
		const token =
			typeof tokenQuery === 'string'
				? tokenQuery.trim().toUpperCase()
				: Array.isArray(tokenQuery)
					? tokenQuery[0]?.trim().toUpperCase()
					: ''

		if (!token) {
			res.status(400).json({ error: 'Missing token query param' })
			return
		}

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? token))
		const { getTokenBorrowRoutes } = await import('~/server/datasetCache/runtime/yields')
		const data = await getTokenBorrowRoutes(token)

		res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch token borrow routes data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields-token-borrow-routes', handler)
