import type { NextApiRequest, NextApiResponse } from 'next'
import { MARKETS_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { token } = req.query
	if (typeof token !== 'string' || token.length === 0) {
		return res.status(400).json({ error: 'Missing token' })
	}

	const url = `${MARKETS_SERVER_URL}/tokens/${encodeURIComponent(token.toLowerCase())}.json`
	try {
		const data = await fetchJson(url)
		res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300')
		return res.status(200).json(data)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load token markets'
		const isNotFound = /\b404\b/.test(message)
		return res.status(isNotFound ? 404 : 502).json({ error: message })
	}
}

export default withApiRouteTelemetry('/api/markets/[token]', handler)
