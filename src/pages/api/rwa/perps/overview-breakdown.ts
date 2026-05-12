import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchRWAPerpsOverviewBreakdownChartData } from '~/containers/RWA/Perps/api'
import { toRWAPerpsBreakdownChartDataset } from '~/containers/RWA/Perps/breakdownDataset'
import { parseChartMetricKey, parseOptionalTarget } from '~/containers/RWA/Perps/requestParsers'
import type { IRWAPerpsOverviewBreakdownRequest } from '~/containers/RWA/Perps/types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ParsedOverviewBreakdownRequest = IRWAPerpsOverviewBreakdownRequest & {
	venue?: string
	assetGroup?: string
	assetClass?: string
	excludeAssetClass?: string
}

export function parseOverviewBreakdownRequest(
	req: Pick<NextApiRequest, 'query'>
): ParsedOverviewBreakdownRequest | null {
	const breakdown = req.query.breakdown
	const key = parseChartMetricKey(req.query.key)
	if (Array.isArray(breakdown) || breakdown == null || key == null || breakdown === 'contract') return null

	const venue = parseOptionalTarget(req.query.venue)
	const assetGroup = parseOptionalTarget(req.query.assetGroup)
	const assetClass = parseOptionalTarget(req.query.assetClass)
	const excludeAssetClass = parseOptionalTarget(req.query.excludeAssetClass)
	if (venue === null || assetGroup === null || assetClass === null || excludeAssetClass === null) return null
	const targetCount =
		Number(Boolean(venue)) +
		Number(Boolean(assetGroup)) +
		Number(Boolean(assetClass)) +
		Number(Boolean(excludeAssetClass))
	if (targetCount > 1) return null

	if (breakdown === 'venue' || breakdown === 'assetClass' || breakdown === 'assetGroup' || breakdown === 'baseAsset') {
		return {
			breakdown,
			key,
			...(venue ? { venue } : {}),
			...(assetGroup ? { assetGroup } : {}),
			...(assetClass ? { assetClass } : {}),
			...(excludeAssetClass ? { excludeAssetClass } : {})
		}
	}

	return null
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const request = parseOverviewBreakdownRequest(req)
	if (request == null) {
		return res.status(400).json({ error: 'Invalid query parameters' })
	}

	try {
		const rows = await fetchRWAPerpsOverviewBreakdownChartData(request)
		if (rows == null) {
			return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
		}

		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader(
				'public, s-maxage=3600, stale-while-revalidate=1800',
				req.url ?? '/api/rwa/perps/overview-breakdown'
			)
		)
		return res.status(200).json(toRWAPerpsBreakdownChartDataset(rows))
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}

export default withApiRouteTelemetry('/api/rwa/perps/overview-breakdown', handler)
