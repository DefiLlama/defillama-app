import type { NextApiRequest, NextApiResponse } from 'next'
import { MARKETS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET')
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const url = `${MARKETS_SERVER_URL}/exchanges/list.json`
	try {
		const data = await fetchJson(url)
		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, max-age=60, s-maxage=300, stale-while-revalidate=300', req.url ?? url)
		)
		return res.status(200).json(data)
	} catch (error) {
		console.error(error)
		return res.status(502).json({ error: 'Failed to load exchanges list' })
	}
}

export default withApiRouteTelemetry('/api/public/markets/exchanges', handler)
