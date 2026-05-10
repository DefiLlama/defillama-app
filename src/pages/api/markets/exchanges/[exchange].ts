import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchExchangeMarketsFromNetwork } from '~/containers/Cexs/api'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET')
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { exchange } = req.query
	if (typeof exchange !== 'string' || exchange.length === 0) {
		return res.status(400).json({ error: 'Missing exchange' })
	}

	try {
		const data = await fetchExchangeMarketsFromNetwork(exchange)
		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, max-age=60, s-maxage=300, stale-while-revalidate=300', req.url ?? exchange)
		)
		return res.status(200).json(data)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load exchange markets'
		const isNotFound = /\b404\b/.test(message)
		console.error(error)
		return res
			.status(isNotFound ? 404 : 502)
			.json({ error: isNotFound ? 'Exchange not found' : 'Failed to load exchange markets' })
	}
}

export default withApiRouteTelemetry('/api/markets/exchanges/[exchange]', handler)
