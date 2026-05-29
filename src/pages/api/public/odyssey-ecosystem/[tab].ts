import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchJson } from '~/utils/async'

const BASE = process.env.IR_SERVER_URL
const ALLOWED = new Set(['metadata', 'tvl', 'revenue', 'incentives', 'yields', 'treasury', 'growth', 'pegs'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}
	const tab = String(req.query.tab || '')
	if (!ALLOWED.has(tab)) return res.status(404).json({ error: 'Unknown tab' })

	try {
		const data = await fetchJson(`${BASE}/api/odyssey-ecosystem/${tab}`, { timeout: 60_000 })
		res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
		return res.status(200).json(data)
	} catch (error) {
		console.error(`Odyssey Ecosystem proxy error (${tab}):`, error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
