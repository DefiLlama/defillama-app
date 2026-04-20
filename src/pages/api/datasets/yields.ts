import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenYieldsRows } from '~/containers/Token/tokenYields.server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, token } = req.query
		const tokenFilter = typeof token === 'string' ? token.trim() : Array.isArray(token) ? token[0]?.trim() : ''
		const rows = await getTokenYieldsRows(tokenFilter, chains)

		res.status(200).json(rows)
	} catch (error) {
		console.log('Error fetching yields data:', error)
		res.status(500).json({ error: 'Failed to fetch yields data' })
	}
}
