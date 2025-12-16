import { NextApiRequest, NextApiResponse } from 'next'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { chainIconUrl } from '~/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { category, limit } = req.query
		let categoryParam = typeof category === 'string' ? category : 'All'
		const limitValue = typeof limit === 'string' ? parseInt(limit, 10) : null
		const normalizedLimit =
			typeof limitValue === 'number' && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null

		if (categoryParam === 'Layer 2') {
			categoryParam = 'Rollup'
		}

		const data = await getChainsByCategory({
			category: categoryParam,
			sampledChart: true
		})

		const chains = data.chains || []

		const formattedChains = chains.map((chain) => {
			return {
				name: chain.name,
				icon: chainIconUrl(chain.name),
				protocols: chain.protocols || 0,
				users: chain.users || null,
				change_1d: chain.change_1d || null,
				change_7d: chain.change_7d || null,
				change_1m: chain.change_1m || null,
				tvl: chain.tvl || 0,
				stablesMcap: chain.stablesMcap || null,
				totalVolume24h: chain.totalVolume24h || null,
				totalVolume7d: (chain as any)?.totalVolume7d ?? null,
				totalVolume30d: chain.totalVolume30d || null,
				totalFees24h: chain.totalFees24h || null,
				totalFees7d: (chain as any)?.totalFees7d ?? null,
				totalFees30d: chain.totalFees30d || null,
				totalRevenue24h: chain.totalRevenue24h || null,
				totalRevenue7d: (chain as any)?.totalRevenue7d ?? null,
				totalRevenue30d: chain.totalRevenue30d || null,
				totalAppRevenue24h: chain.totalAppRevenue24h || null,
				totalAppRevenue7d: (chain as any)?.totalAppRevenue7d ?? null,
				totalAppRevenue30d: chain.totalAppRevenue30d || null,
				bridgedTvl: chain.bridgedTvl ?? chain.chainAssets?.total?.total ?? null,
				mcaptvl: chain.mcaptvl || null,
				nftVolume: chain.nftVolume || null,
				mcap: chain.mcap || null,
				symbol: chain.symbol || null,
				extraTvl: chain.extraTvl || null
			}
		})

		const sortedChains = formattedChains.filter((chain) => chain.tvl > 0).sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const finalChains = normalizedLimit !== null ? sortedChains.slice(0, normalizedLimit) : sortedChains

		res.status(200).json(finalChains)
	} catch (error) {
		console.log('Error fetching chains data:', error)
		res.status(500).json({ error: 'Failed to fetch chains data' })
	}
}
