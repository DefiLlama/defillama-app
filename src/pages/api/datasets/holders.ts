import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELDS_SERVER_URL } from '~/constants'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
	try {
		const upstream = await fetch(`${YIELDS_SERVER_URL}/holders`)
		if (!upstream.ok) {
			return res.status(502).json({ error: 'Upstream error' })
		}

		const data = await upstream.json()
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')
		return res.status(200).json(data)
	} catch (error) {
		console.error('Holders proxy error:', error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
