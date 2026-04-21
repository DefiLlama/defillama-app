import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenBorrowRoutesData } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<TokenBorrowRoutesResponse | { error: string }>
) {
	try {
		const tokenQuery = req.query.token
		const token =
			typeof tokenQuery === 'string'
				? tokenQuery.trim().toUpperCase()
				: Array.isArray(tokenQuery)
					? tokenQuery[0]?.trim().toUpperCase()
					: ''

		if (!token) {
			res.status(400).json({ error: 'Missing token query param' })
			return
		}

		res.setHeader('Cache-Control', CACHE_CONTROL)
		const data = await getTokenBorrowRoutesData(token)

		res.status(200).json(data)
	} catch (error) {
		console.error('Error fetching token borrow routes data:', error)
		res.status(500).json({ error: 'Failed to fetch token borrow routes data' })
	}
}
