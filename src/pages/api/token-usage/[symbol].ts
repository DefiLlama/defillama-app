import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { symbol } = req.query
	const tokenSymbol = typeof symbol === 'string' ? symbol : ''

	if (!tokenSymbol) {
		return res.status(400).json({ error: 'Missing symbol parameter' })
	}

	try {
		const upstream = await fetch(`${SERVER_URL}/tokenProtocols/${encodeURIComponent(tokenSymbol.toUpperCase())}`)
		if (!upstream.ok) {
			return res.status(upstream.status).json({ error: upstream.statusText })
		}
		const data = await upstream.json()
		res.status(200).json(data)
	} catch (error) {
		console.error(`Failed to fetch token protocols for ${tokenSymbol}:`, error)
		res.status(500).json({ error: 'Failed to fetch token usage data' })
	}
}
