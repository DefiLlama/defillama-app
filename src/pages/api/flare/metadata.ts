import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchJson } from '~/utils/async'

const BASE = process.env.IR_SERVER_URL
const TIMEOUT = { timeout: 30_000 }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const metadata = await fetchJson(`${BASE}/api/flare/metadata`, TIMEOUT)
		res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
		return res.status(200).json(metadata)
	} catch (error) {
		console.error('Flare metadata proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
