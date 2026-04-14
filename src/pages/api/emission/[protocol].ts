import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { protocol } = req.query
	const protocolName = typeof protocol === 'string' ? protocol : ''

	if (!protocolName) {
		return res.status(400).json({ error: 'Missing protocol parameter' })
	}

	try {
		const upstream = await fetch(`${SERVER_URL}/emission/${encodeURIComponent(protocolName)}`)
		if (!upstream.ok) {
			return res.status(upstream.status).json({ error: upstream.statusText })
		}
		const data = await upstream.json()
		res.status(200).json(data)
	} catch (error) {
		console.error(`Failed to fetch emission for ${protocolName}:`, error)
		res.status(500).json({ error: 'Failed to fetch emission data' })
	}
}
