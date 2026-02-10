import type { NextApiRequest, NextApiResponse } from 'next'

const VOLATILITY_UPSTREAM = process.env.VOLATILITY_UPSTREAM_URL ?? 'https://yields.llama.fi/volatility'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const authHeader = req.headers.authorization
	if (!authHeader?.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Authentication required' })
	}

	try {
		const subResponse = await fetch('https://auth.llama.fi/subscription/status', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader
			}
		})

		if (!subResponse.ok) {
			return res.status(403).json({ error: 'Invalid subscription' })
		}

		const subData = await subResponse.json()
		if (subData?.subscription?.status !== 'active') {
			return res.status(403).json({ error: 'Active subscription required' })
		}

		const upstream = await fetch(VOLATILITY_UPSTREAM)
		if (!upstream.ok) {
			return res.status(502).json({ error: 'Upstream error' })
		}

		const data = await upstream.json()
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
		return res.status(200).json(data)
	} catch (error) {
		console.error('Volatility proxy error:', error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
