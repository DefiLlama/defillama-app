import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchRWAPerpsContractBreakdownChartData } from '~/containers/RWA/Perps/api'
import { toRWAPerpsBreakdownChartDataset } from '~/containers/RWA/Perps/breakdownDataset'
import { parseChartMetricKey, parseOptionalTarget } from '~/containers/RWA/Perps/requestParsers'
import type { IRWAPerpsContractBreakdownRequest } from '~/containers/RWA/Perps/types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader(
				'public, s-maxage=3600, stale-while-revalidate=1800',
				req.url ?? '/api/rwa/perps/contract-breakdown'
			)
		)
		return res.status(200).json(toRWAPerpsBreakdownChartDataset(rows))
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}

export default withApiRouteTelemetry('/api/rwa/perps/contract-breakdown', handler)
