import type { NextApiRequest, NextApiResponse } from 'next'
import { getRWAPerpsVenueBreakdownChartDataset } from '~/containers/RWA/Perps/queries'
import type {
	IRWAPerpsVenueBreakdownRequest,
	RWAPerpsChartMetricKey,
	RWAPerpsVenueBreakdown
} from '~/containers/RWA/Perps/types'

function parseChartMetricKey(value: string | string[] | undefined): RWAPerpsChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'openInterest' || value === 'volume24h' || value === 'markets') return value
	return null
}

function parseBreakdown(value: string | string[] | undefined): RWAPerpsVenueBreakdown | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'referenceAsset' || value === 'coin' || value === 'assetClass') {
		return value
	}

	return null
}

export function parseVenueBreakdownRequest(req: Pick<NextApiRequest, 'query'>): IRWAPerpsVenueBreakdownRequest | null {
	const venue = req.query.venue
	const breakdown = parseBreakdown(req.query.breakdown)
	const key = parseChartMetricKey(req.query.key)
	if (Array.isArray(venue) || typeof venue !== 'string' || venue.length === 0 || breakdown == null || key == null) {
		return null
	}

	return { venue, breakdown, key }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const request = parseVenueBreakdownRequest(req)
	if (request == null) {
		return res.status(400).json({ error: 'Invalid query parameters' })
	}

	try {
		const dataset = await getRWAPerpsVenueBreakdownChartDataset(request)
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(dataset)
	} catch (error) {
		console.error('RWA perps venue-breakdown proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}
