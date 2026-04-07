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
		const [intents, ecosystem, tokenEconomics] = await Promise.all([
			fetchJson(`${BASE}/api/near/intents`, TIMEOUT),
			fetchJson(`${BASE}/api/near/ecosystem`, TIMEOUT),
			fetchJson(`${BASE}/api/near/tokenEconomics`, TIMEOUT)
		])

		res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
		return res.status(200).json({ intents, ecosystem, tokenEconomics })
	} catch (error) {
		console.error('NEAR Ecosystem proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
