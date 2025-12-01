import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { email } = req.query

	if (!email || typeof email !== 'string') {
		return res.status(400).json({ error: 'URL parameter is required' })
	}

	try {
		const hmac = crypto.createHmac('sha256', process.env.FRONT_VERIFICATION_SECRET)
		const userHash = hmac.update(email).digest('hex')
		return res.status(200).send(userHash)
	} catch (error) {
		console.log('Error computing user hash:', error)
		res.status(500).send('Failed to compute hash')
	}
}
