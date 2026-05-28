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
		const [tvl, fees, dexVolume, stablecoins, chainAssets] = await Promise.all([
			fetchJson(`${BASE}/api/sonic/tvl`, TIMEOUT),
			fetchJson(`${BASE}/api/sonic/fees`, TIMEOUT),
			fetchJson(`${BASE}/api/sonic/dex-volume`, TIMEOUT),
			fetchJson(`${BASE}/api/sonic/stablecoins`, TIMEOUT),
			fetchJson(`${BASE}/api/sonic/chain-assets`, TIMEOUT)
		])

		res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
		return res.status(200).json({ tvl, fees, dexVolume, stablecoins, chainAssets })
	} catch (error) {
		console.error('Sonic ecosystem proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
