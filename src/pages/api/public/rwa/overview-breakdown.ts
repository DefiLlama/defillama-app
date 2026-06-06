import type { NextApiRequest, NextApiResponse } from 'next'
import {
	fetchRWAAssetGroupBreakdownChartData,
	fetchRWAChainBreakdownChartData,
	fetchRWACategoryBreakdownChartData,
	fetchRWAPlatformBreakdownChartData
} from '~/containers/RWA/api'
import type { RWAChartMetricKey, RWAOverviewBreakdownRequest } from '~/containers/RWA/api.types'
import { toOverviewBreakdownChartDataset } from '~/containers/RWA/breakdownDataset'
import { parseBooleanQueryFlag, parseEnumQueryValue } from '~/containers/RWA/requestParsers'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

function assertNever(value: never): never {
	throw new Error(`Unknown breakdown: ${value}`)
}
const RWA_CHART_METRIC_KEYS = ['onChainMcap', 'activeMcap', 'defiActiveTvl'] as const
const RWA_OVERVIEW_BREAKDOWNS = ['chain', 'category', 'platform', 'assetGroup'] as const

function parseChartMetricKey(value: string | string[] | undefined): RWAChartMetricKey | null {
	return parseEnumQueryValue(value, RWA_CHART_METRIC_KEYS)
}

export function parseOverviewBreakdownRequest(req: Pick<NextApiRequest, 'query'>): RWAOverviewBreakdownRequest | null {
	const breakdown = parseEnumQueryValue(req.query.breakdown, RWA_OVERVIEW_BREAKDOWNS)
	const key = parseChartMetricKey(req.query.key)
	if (breakdown == null || key == null) return null

	const includeStablecoin = parseBooleanQueryFlag(req.query.includeStablecoin, false)
	const includeGovernance = parseBooleanQueryFlag(req.query.includeGovernance, false)
	if (includeStablecoin == null || includeGovernance == null) return null

	if (breakdown === 'chain') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'category') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'platform') {
		return { breakdown, key, includeStablecoin, includeGovernance }
	}

	if (breakdown === 'assetGroup') {
		return { breakdown, key, includeStablecoin, includeGovernance }
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
		const rows = await (() => {
			switch (request.breakdown) {
				case 'chain':
					return fetchRWAChainBreakdownChartData(request)
				case 'category':
					return fetchRWACategoryBreakdownChartData(request)
				case 'platform':
					return fetchRWAPlatformBreakdownChartData(request)
				case 'assetGroup':
					return fetchRWAAssetGroupBreakdownChartData(request)
				default:
					return assertNever(request)
			}
		})()
		if (rows == null) {
			return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
		}

		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader(
				'public, s-maxage=3600, stale-while-revalidate=1800',
				req.url ?? '/api/public/rwa/overview-breakdown'
			)
		)
		return res.status(200).json(toOverviewBreakdownChartDataset(rows, request))
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/rwa/overview-breakdown', handler)
