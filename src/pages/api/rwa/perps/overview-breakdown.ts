import type { NextApiRequest, NextApiResponse } from 'next'
import { getRWAPerpsBreakdownChartDataset } from '~/containers/RWA/Perps/queries'
import type { IRWAPerpsOverviewBreakdownRequest, RWAPerpsChartMetricKey } from '~/containers/RWA/Perps/types'

function parseChartMetricKey(value: string | string[] | undefined): RWAPerpsChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'openInterest' || value === 'volume24h' || value === 'markets') return value
	return null
}

export function parseOverviewBreakdownRequest(
	req: Pick<NextApiRequest, 'query'>
): IRWAPerpsOverviewBreakdownRequest | null {
	const breakdown = req.query.breakdown
	const key = parseChartMetricKey(req.query.key)
	if (Array.isArray(breakdown) || breakdown == null || key == null) return null

	if (breakdown === 'venue' || breakdown === 'assetClass' || breakdown === 'referenceAsset' || breakdown === 'coin') {
		return { breakdown, key }
	}

	return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const request = parseOverviewBreakdownRequest(req)
	if (request == null) {
		return res.status(400).json({ error: 'Invalid query parameters' })
	}

	try {
		const dataset = await getRWAPerpsBreakdownChartDataset(request)
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(dataset)
	} catch (error) {
		console.error('RWA perps overview-breakdown proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}
