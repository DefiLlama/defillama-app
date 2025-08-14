import { NextApiRequest, NextApiResponse } from 'next'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { category } = req.query
		let categoryParam = typeof category === 'string' ? category : 'All'

		if (categoryParam === 'Layer 2') {
			categoryParam = 'Rollup'
		}


		const data = await getChainsByCategory({
			category: categoryParam,
			sampledChart: true
		})

	

		const chains = data.chains || []
		const chainAssets = data.chainAssets || {}

		const formattedChains = chains.map((chain: any) => {
			const assets = chainAssets[chain.name]

			return {
				name: chain.name,
				icon: chain.icon || null,
				protocols: chain.protocols || 0,
				users: chain.users || null,
				change_1d: chain.change_1d || null,
				change_7d: chain.change_7d || null,
				change_1m: chain.change_1m || null,
				tvl: chain.tvl || 0,
				stablesMcap: chain.stablesMcap || null,
				totalVolume24h: chain.totalVolume24h || null,
				totalFees24h: chain.totalFees24h || null,
				totalRevenue24h: chain.totalRevenue24h || null,
				totalAppRevenue24h: chain.totalAppRevenue24h || null,
				mcaptvl: chain.mcaptvl || null,
				nftVolume: chain.nftVolume || null,
				mcap: chain.mcap || null,
				symbol: chain.symbol || null,
				extraTvl: chain.extraTvl || null
			}
		})

		const sortedChains = formattedChains
			.filter((chain: any) => chain.tvl > 0)
			.sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))

		res.status(200).json(sortedChains)
	} catch (error) {
		console.error('Error fetching chains data:', error)
		res.status(500).json({ error: 'Failed to fetch chains data' })
	}
}
