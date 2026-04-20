import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenStrategiesData } from '~/containers/Token/tokenStrategies.server'
import type { TokenStrategiesResponse } from '~/containers/Token/tokenStrategies.types'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<TokenStrategiesResponse | { error: string }>
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
		const data = await getTokenStrategiesData(token)

		res.status(200).json(data)
	} catch (error) {
		console.error('Error fetching token strategies data:', error)
		res.status(500).json({ error: 'Failed to fetch token strategies data' })
	}
}
