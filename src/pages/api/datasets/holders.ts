import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELDS_SERVER_URL } from '~/constants'
import { validateSubscription } from '~/utils/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const upstream = await fetch(`${YIELDS_SERVER_URL}/holders`)
		if (!upstream.ok) {
			return res.status(502).json({ error: 'Upstream error' })
		}

		const data = await upstream.json()
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(200).json(data)
	} catch (error) {
		console.error('Holders proxy error:', error)
		return res.status(500).json({ error: 'Internal server error' })
	}
}
