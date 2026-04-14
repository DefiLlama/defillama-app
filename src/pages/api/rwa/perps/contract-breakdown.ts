import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchRWAPerpsContractBreakdownChartData } from '~/containers/RWA/Perps/api'
import { toRWAPerpsBreakdownChartDataset } from '~/containers/RWA/Perps/breakdownDataset'
import { parseChartMetricKey } from '~/containers/RWA/Perps/requestParsers'
import type { IRWAPerpsContractBreakdownRequest } from '~/containers/RWA/Perps/types'

function parseOptionalTarget(value: string | string[] | undefined): string | null | undefined {
	if (value == null) return undefined
	if (Array.isArray(value)) return null
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

export function parseContractBreakdownRequest(
	req: Pick<NextApiRequest, 'query'>
): IRWAPerpsContractBreakdownRequest | null {
	const key = parseChartMetricKey(req.query.key)
	if (key == null) return null

	const venue = parseOptionalTarget(req.query.venue)
	const assetGroup = parseOptionalTarget(req.query.assetGroup)
	if (venue === null || assetGroup === null) return null
	if (venue && assetGroup) return null

	return {
		key,
		...(venue ? { venue } : {}),
		...(assetGroup ? { assetGroup } : {})
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const request = parseContractBreakdownRequest(req)
	if (request == null) {
		return res.status(400).json({ error: 'Invalid query parameters' })
	}

	try {
		const rows = await fetchRWAPerpsContractBreakdownChartData(request)
		if (rows == null) {
			return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
		}

		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(toRWAPerpsBreakdownChartDataset(rows))
	} catch (error) {
		console.error('RWA perps contract-breakdown proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}
