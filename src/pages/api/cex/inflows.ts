import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { validateSubscription } from '~/utils/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const { slug, start, end, tokensToExclude } = req.query
	if (typeof slug !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
		return res.status(400).json({ error: 'Missing required parameters: slug, start, end' })
	}

	const startNum = Number(start)
	const endNum = Number(end)
	if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
		return res.status(400).json({ error: 'start and end must be valid numbers' })
	}

	const auth = await validateSubscription(req.headers.authorization)
	if (auth.valid === false) {
		return res.status(auth.status).json({ error: auth.error })
	}

	try {
		const upstreamUrl = `${SERVER_URL}/inflows/${encodeURIComponent(slug)}/${startNum}?end=${endNum}&tokensToExclude=${encodeURIComponent(typeof tokensToExclude === 'string' ? tokensToExclude : '')}`
		const upstream = await fetch(upstreamUrl)

		if (!upstream.ok) {
			return res.status(upstream.status).json({ error: `Upstream API returned ${upstream.status}` })
		}

		const data = await upstream.json()
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(200).json(data)
	} catch (error) {
		console.error('CEX inflows proxy error:', error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
