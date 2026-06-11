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

	const { category } = req.query
	if (typeof category !== 'string' || category.length === 0) {
		return res.status(400).json({ error: 'Missing category' })
	}

	const url = `${MARKETS_SERVER_URL}/categories/${encodeURIComponent(category.toLowerCase())}.json`
	try {
		const data = await fetchJson(url)
		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, max-age=60, s-maxage=300, stale-while-revalidate=300', req.url ?? category)
		)
		return res.status(200).json(data)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load category markets'
		const isNotFound = /\b404\b/.test(message)
		console.error(error)
		return res
			.status(isNotFound ? 404 : 502)
			.json({ error: isNotFound ? 'Category not found' : 'Failed to load category markets' })
	}
}

export default withApiRouteTelemetry('/api/public/markets/categories/[category]', handler)
