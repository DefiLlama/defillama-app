import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCoinGeckoTokensListFromDataset } from '~/api/coingecko'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const { query } = req.query
	const searchQuery = typeof query === 'string' ? query.toLowerCase() : ''

	try {
		const allTokens = await fetchCoinGeckoTokensListFromDataset()

		let filteredTokens = allTokens
		if (searchQuery && searchQuery.length > 0) {
			filteredTokens = allTokens.filter(
				(token) => token.name?.toLowerCase().includes(searchQuery) || token.symbol?.toLowerCase().includes(searchQuery)
			)
		} else {
			filteredTokens = allTokens.slice(0, 20)
		}

		const options: { value: string; label: string; logo: string | null }[] = []
		for (const token of filteredTokens) {
			if (options.length >= 100) break
			if (!token.symbol) continue

			const name = token.name || token.symbol
			const logo = token.image || token.image2 || null
			options.push({
				value: token.symbol,
				label: `${name} (${token.symbol.toUpperCase()})`,
				logo: logo?.replace('/0/', '') ?? null
			})
		}

		res.status(200).json(options)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch token list' })
	}
}

export default withApiRouteTelemetry('/api/tokens/search', handler)
