import type { NextApiRequest, NextApiResponse } from 'next'
import {
	fetchRWAAssetGroupBreakdownChartData,
	fetchRWAChainBreakdownChartData,
	fetchRWACategoryBreakdownChartData,
	fetchRWAPlatformBreakdownChartData
} from '~/containers/RWA/api'
import type { RWAChartMetricKey, RWAOverviewBreakdownRequest } from '~/containers/RWA/api.types'
import { toOverviewBreakdownChartDataset } from '~/containers/RWA/breakdownDataset'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

function assertNever(value: never): never {
	throw new Error(`Unknown breakdown: ${value}`)
}

function parseChartMetricKey(value: string | string[] | undefined): RWAChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'onChainMcap' || value === 'activeMcap' || value === 'defiActiveTvl') return value
	return null
}

function parseBooleanFlag(value: string | string[] | undefined): boolean | null {
	if (value == null) return false
	if (Array.isArray(value)) return null
	if (value === 'true') return true
	if (value === 'false') return false
	return null
}

export function parseOverviewBreakdownRequest(req: Pick<NextApiRequest, 'query'>): RWAOverviewBreakdownRequest | null {
	const breakdown = req.query.breakdown
	const key = parseChartMetricKey(req.query.key)
	if (Array.isArray(breakdown) || breakdown == null || key == null) return null

	const includeStablecoin = parseBooleanFlag(req.query.includeStablecoin)
	const includeGovernance = parseBooleanFlag(req.query.includeGovernance)
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
				req.url ?? '/api/rwa/overview-breakdown'
			)
		)
		return res.status(200).json(toOverviewBreakdownChartDataset(rows, request))
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}

export default withApiRouteTelemetry('/api/rwa/overview-breakdown', handler)
