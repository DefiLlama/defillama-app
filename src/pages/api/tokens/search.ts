import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllCGTokensList } from '~/api'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const { query } = req.query
	const searchQuery = typeof query === 'string' ? query.toLowerCase() : ''

	try {
		const allTokens = await getAllCGTokensList()

		let filteredTokens = allTokens
		if (searchQuery && searchQuery.length > 0) {
			filteredTokens = allTokens.filter(
				(token) => token.name?.toLowerCase().includes(searchQuery) || token.symbol?.toLowerCase().includes(searchQuery)
			)
		} else {
			filteredTokens = allTokens.slice(0, 20)
		}

		const options = filteredTokens
			.slice(0, 100)
			.map((token) => ({
				value: token.symbol,
				label: `${token.name} (${token.symbol.toUpperCase()})`,
				logo: token.image || token.image2 || null
			}))
			.map((t) => ({ ...t, logo: t?.logo?.replace('/0/', '') }))
			.filter((token) => token.value && token.label)

		res.status(200).json(options)
	} catch (error) {
		console.error('Error fetching token list:', error)
		res.status(500).json({ error: 'Failed to fetch token list' })
	}
}
