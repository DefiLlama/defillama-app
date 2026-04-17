import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { validateSubscription } from '~/utils/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { symbol } = req.query
	const tokenSymbol = typeof symbol === 'string' ? symbol : ''

	if (!tokenSymbol) {
		return res.status(400).json({ error: 'Missing symbol parameter' })
	}

	const auth = await validateSubscription(req.headers.authorization)
	if (auth.valid === false) {
		return res.status(auth.status).json({ error: auth.error })
	}

	try {
		const upstream = await fetch(`${SERVER_URL}/tokenProtocols/${encodeURIComponent(tokenSymbol.toUpperCase())}`)
		if (!upstream.ok) {
			return res.status(upstream.status).json({ error: upstream.statusText })
		}
		const data = await upstream.json()
		res.setHeader('Cache-Control', 'private, no-store')
		res.status(200).json(data)
	} catch (error) {
		console.error(`Failed to fetch token protocols for ${tokenSymbol}:`, error)
		res.status(500).json({ error: 'Failed to fetch token usage data' })
	}
}
