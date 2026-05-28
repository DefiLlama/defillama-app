import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchJson } from '~/utils/async'

const UPSTREAM_URL = `${process.env.IR_SERVER_URL}/api/spark/distribution`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const data = await fetchJson(UPSTREAM_URL, { timeout: 30_000 })
		res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
		return res.status(200).json(data)
	} catch (error) {
		console.error('Spark distribution rewards proxy error:', error)
		return res.status(502).json({ error: 'Failed to fetch upstream data' })
	}
}
