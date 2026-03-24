import type { NextApiRequest, NextApiResponse } from 'next'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { toUnixMsTimestamp } from '~/containers/RWA/api'
import type { IRWAChartDataByTicker, IRWAChartMetricRows, RWAChartMetricKey } from '~/containers/RWA/api.types'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { fetchJson } from '~/utils/async'

function buildTickerBreakdownUrl(chain?: string, category?: string, platform?: string): string {
	if (chain) return `${RWA_SERVER_URL}/chart/chain/${encodeURIComponent(rwaSlug(chain))}/ticker-breakdown`
	if (category) return `${RWA_SERVER_URL}/chart/category/${encodeURIComponent(rwaSlug(category))}/ticker-breakdown`
	if (platform) return `${RWA_SERVER_URL}/chart/platform/${encodeURIComponent(rwaSlug(platform))}/ticker-breakdown`
	return `${RWA_SERVER_URL}/chart/chain/all/ticker-breakdown`
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

	const rawChain = req.query.chain
	const rawCategory = req.query.category
	const rawPlatform = req.query.platform

	if (Array.isArray(rawChain) || Array.isArray(rawCategory) || Array.isArray(rawPlatform)) {
		return res.status(400).json({ error: 'Duplicate query parameters are not allowed' })
	}

	const chain = typeof rawChain === 'string' ? rawChain : undefined
	const category = typeof rawCategory === 'string' ? rawCategory : undefined
	const platform = typeof rawPlatform === 'string' ? rawPlatform : undefined
	const key = parseChartMetricKey(req.query.key)

	const paramCount = Number(!!chain) + Number(!!category) + Number(!!platform)
	if (paramCount > 1) return res.status(400).json({ error: 'Provide at most one of chain, category, or platform' })
	if (key == null) return res.status(400).json({ error: 'Missing or invalid key' })

	try {
		const raw = await fetchJson<IRWAChartDataByTicker>(buildTickerBreakdownUrl(chain, category, platform), {
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
