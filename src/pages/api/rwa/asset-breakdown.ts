import type { NextApiRequest, NextApiResponse } from 'next'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { toUnixMsTimestamp } from '~/containers/RWA/api'
import type {
	IRWAChartDataByAsset,
	IRWAChartMetricRows,
	RWAChartMetricKey,
	RWAAssetChartTarget
} from '~/containers/RWA/api.types'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchJson } from '~/utils/async'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type RWAAssetBreakdownRequest = {
	target: RWAAssetChartTarget
	key: RWAChartMetricKey
	includeStablecoin: boolean
	includeGovernance: boolean
}

export function buildAssetBreakdownUrl(request: RWAAssetBreakdownRequest): string {
	let pathname: string

	switch (request.target.kind) {
		case 'all':
			pathname = `${RWA_SERVER_URL}/chart/chain/all/asset-breakdown`
			break
		case 'chain':
			pathname = `${RWA_SERVER_URL}/chart/chain/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'category':
			pathname = `${RWA_SERVER_URL}/chart/category/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'platform':
			pathname = `${RWA_SERVER_URL}/chart/platform/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		case 'assetGroup':
			pathname = `${RWA_SERVER_URL}/chart/assetGroup/${encodeURIComponent(rwaSlug(request.target.slug))}/asset-breakdown`
			break
		default:
			return assertNever(request.target)
	}

	const searchParams = new URLSearchParams({
		includeStablecoin: String(request.includeStablecoin),
		includeGovernance: String(request.includeGovernance)
	})

	return `${pathname}?${searchParams.toString()}`
}

export function normalizeAssetBreakdownRows(rows: IRWAChartMetricRows): IRWAChartMetricRows {
	return ensureChronologicalRows((rows ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) })))
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

function parseChartMetricKey(value: string | string[] | undefined): RWAChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'onChainMcap' || value === 'activeMcap' || value === 'defiActiveTvl') return value
	return null
}

function parseTarget(req: Pick<NextApiRequest, 'query'>): RWAAssetChartTarget | null {
	const rawChain = req.query.chain
	const rawCategory = req.query.category
	const rawPlatform = req.query.platform
	const rawAssetGroup = req.query.assetGroup

	if (
		Array.isArray(rawChain) ||
		Array.isArray(rawCategory) ||
		Array.isArray(rawPlatform) ||
		Array.isArray(rawAssetGroup)
	) {
		return null
	}

	const targets = [
		rawChain ? ({ kind: 'chain', slug: rawChain } as const) : null,
		rawCategory ? ({ kind: 'category', slug: rawCategory } as const) : null,
		rawPlatform ? ({ kind: 'platform', slug: rawPlatform } as const) : null,
		rawAssetGroup ? ({ kind: 'assetGroup', slug: rawAssetGroup } as const) : null
	].filter((target) => target !== null)

	if (targets.length > 1) return null
	return targets[0] ?? { kind: 'all' }
}

function parseBooleanFlag(value: string | string[] | undefined): boolean | null {
	if (value == null) return null
	if (Array.isArray(value)) return null
	if (value === 'true') return true
	if (value === 'false') return false
	return null
}

export function parseAssetBreakdownRequest(req: Pick<NextApiRequest, 'query'>): RWAAssetBreakdownRequest | null {
	const target = parseTarget(req)
	const key = parseChartMetricKey(req.query.key)
	const includeStablecoin = parseBooleanFlag(req.query.includeStablecoin)
	const includeGovernance = parseBooleanFlag(req.query.includeGovernance)

	if (target == null || key == null || includeStablecoin == null || includeGovernance == null) {
		return null
	}

	return {
		target,
		key,
		includeStablecoin,
		includeGovernance
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const request = parseAssetBreakdownRequest(req)

	if (request == null) {
		return res.status(400).json({ error: 'Invalid query parameters' })
	}

	try {
		const raw = await fetchJson<IRWAChartDataByAsset>(buildAssetBreakdownUrl(request), {
			timeout: 30_000
		})
		const rows = normalizeAssetBreakdownRows(raw[request.key] ?? [])

		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}

export default withApiRouteTelemetry('/api/rwa/asset-breakdown', handler)
