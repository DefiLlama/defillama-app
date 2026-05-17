import type { NextApiRequest, NextApiResponse } from 'next'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { chainIconUrl } from '~/utils/icons'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { category, limit } = req.query
		let categoryParam = typeof category === 'string' ? category : 'All'
		const limitValue = typeof limit === 'string' ? parseInt(limit, 10) : null
		const normalizedLimit =
			typeof limitValue === 'number' && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null

		if (categoryParam === 'Layer 2') {
			categoryParam = 'Rollup'
		}

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		const data = await getChainsByCategory({
			category: categoryParam,
			chainMetadata: metadataCache.chainMetadata,
			sampledChart: true
		})

		const chains = data.chains || []

		const formattedChains = chains.map((chain) => {
			return {
				name: chain.name,
				icon: chainIconUrl(chain.name),
				protocols: chain.protocols || 0,
				users: chain.activeUsers24h ?? null,
				change_1d: chain.change_1d ?? null,
				change_7d: chain.change_7d ?? null,
				change_1m: chain.change_1m ?? null,
				tvl: chain.tvl ?? null,
				stablesMcap: chain.stablesMcap ?? null,
				totalVolume24h: chain.dexVolume24h ?? null,
				totalVolume7d: chain.dexVolume7d ?? null,
				totalVolume30d: chain.dexVolume30d ?? null,
				totalFees24h: chain.fees24h ?? null,
				totalFees7d: chain.fees7d ?? null,
				totalFees30d: chain.fees30d ?? null,
				totalRevenue24h: chain.revenue24h ?? null,
				totalRevenue7d: chain.revenue7d ?? null,
				totalRevenue30d: chain.revenue30d ?? null,
				totalAppRevenue24h: chain.appRevenue24h ?? null,
				totalAppRevenue7d: chain.appRevenue7d ?? null,
				totalAppRevenue30d: chain.appRevenue30d ?? null,
				bridgedTvl: chain.bridgedTvl ?? chain.chainAssets?.total?.total ?? null,
				mcaptvl: chain.mcaptvl ?? null,
				nftVolume: chain.nftVolume24h ?? null,
				mcap: chain.mcap ?? null,
				symbol: chain.symbol ?? null,
				extraTvl: chain.extraTvl ?? null
			}
		})

		const sortedChains = formattedChains.filter((chain) => chain.tvl > 0).sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const finalChains = normalizedLimit !== null ? sortedChains.slice(0, normalizedLimit) : sortedChains

		res.status(200).json(finalChains)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch chains data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/chains', handler)
