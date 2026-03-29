import type { NextApiRequest, NextApiResponse } from 'next'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { toUnixMsTimestamp } from '~/containers/RWA/api'
import type {
	IRWAChartDataByTicker,
	IRWAChartMetricRows,
	RWAChartMetricKey,
	RWATickerChartTarget
} from '~/containers/RWA/api.types'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchJson } from '~/utils/async'

function buildTickerBreakdownUrl(target: RWATickerChartTarget): string {
	switch (target.kind) {
		case 'all':
			return `${RWA_SERVER_URL}/chart/chain/all/ticker-breakdown`
		case 'chain':
			return `${RWA_SERVER_URL}/chart/chain/${encodeURIComponent(rwaSlug(target.slug))}/ticker-breakdown`
		case 'category':
			return `${RWA_SERVER_URL}/chart/category/${encodeURIComponent(rwaSlug(target.slug))}/ticker-breakdown`
		case 'platform':
			return `${RWA_SERVER_URL}/chart/platform/${encodeURIComponent(rwaSlug(target.slug))}/ticker-breakdown`
		case 'assetGroup':
			return `${RWA_SERVER_URL}/chart/assetGroup/${encodeURIComponent(rwaSlug(target.slug))}/ticker-breakdown`
		default:
			return assertNever(target)
	}
}

function normalizeTickerBreakdownData(raw: IRWAChartDataByTicker): IRWAChartDataByTicker {
	const normalize = (rows: IRWAChartDataByTicker['onChainMcap']) =>
		ensureChronologicalRows((rows ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) })))

	return {
		onChainMcap: normalize(raw.onChainMcap),
		activeMcap: normalize(raw.activeMcap),
		defiActiveTvl: normalize(raw.defiActiveTvl)
	}
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

function parseChartMetricKey(value: string | string[] | undefined): RWAChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'onChainMcap' || value === 'activeMcap' || value === 'defiActiveTvl') return value
	return null
}

function parseTarget(req: NextApiRequest): RWATickerChartTarget | null {
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

function getMetricRows(data: IRWAChartDataByTicker, key: RWAChartMetricKey): IRWAChartMetricRows {
	switch (key) {
		case 'onChainMcap':
			return data.onChainMcap
		case 'activeMcap':
			return data.activeMcap
		case 'defiActiveTvl':
			return data.defiActiveTvl
		default:
			return assertNever(key)
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const target = parseTarget(req)
	const key = parseChartMetricKey(req.query.key)

	if (target == null) {
		return res.status(400).json({ error: 'Provide at most one of chain, category, platform, or assetGroup' })
	}
	if (key == null) return res.status(400).json({ error: 'Missing or invalid key' })

	try {
		const raw = await fetchJson<IRWAChartDataByTicker>(buildTickerBreakdownUrl(target), {
			timeout: 30_000
		})
		const normalized = normalizeTickerBreakdownData(raw)
		const rows = getMetricRows(normalized, key)

		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(rows)
	} catch (error) {
		console.error('RWA ticker-breakdown proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}
