import type { NextApiRequest, NextApiResponse } from 'next'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { RWA_SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { toUnixMsTimestamp } from '~/containers/RWA/api'
import type { IRWAChartDataByTicker } from '~/containers/RWA/api.types'
import { rwaSlug } from '~/containers/RWA/rwaSlug'

function buildUpstreamUrl(chain?: string, category?: string, platform?: string): string | null {
	if (chain) return `${RWA_SERVER_URL}/chart/chain/${encodeURIComponent(rwaSlug(chain))}/ticker-breakdown`
	if (category) return `${RWA_SERVER_URL}/chart/category/${encodeURIComponent(rwaSlug(category))}/ticker-breakdown`
	if (platform) return `${RWA_SERVER_URL}/chart/platform/${encodeURIComponent(rwaSlug(platform))}/ticker-breakdown`
	return `${RWA_SERVER_URL}/chart/chain/all/ticker-breakdown`
}

function normalizeChartData(raw: IRWAChartDataByTicker): IRWAChartDataByTicker {
	const normalize = (rows: IRWAChartDataByTicker['onChainMcap']) =>
		ensureChronologicalRows(
			(rows ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) }))
		)

	return {
		onChainMcap: normalize(raw.onChainMcap),
		activeMcap: normalize(raw.activeMcap),
		defiActiveTvl: normalize(raw.defiActiveTvl)
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const chain = typeof req.query.chain === 'string' ? req.query.chain : undefined
	const category = typeof req.query.category === 'string' ? req.query.category : undefined
	const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined

	const paramCount = Number(!!chain) + Number(!!category) + Number(!!platform)
	if (paramCount > 1) {
		return res.status(400).json({ error: 'Provide at most one of chain, category, or platform' })
	}

	const url = buildUpstreamUrl(chain, category, platform)
	if (!url) {
		return res.status(400).json({ error: 'Invalid parameters' })
	}

	try {
		const raw = await fetchJson<IRWAChartDataByTicker>(url, { timeout: 30_000 })
		const normalized = normalizeChartData(raw)

		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(normalized)
	} catch (error) {
		console.error('RWA chart-data proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream chart data' })
	}
}
