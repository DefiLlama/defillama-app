import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'

export const config = {
	api: {
		responseLimit: false
	}
}

export default withSubscriptionJsonRoute<{ protocol: string; chain: string }>({
	route: '/api/private/liquidations/[protocol]/[chain]',
	errorMessage: 'Failed to fetch liquidations chain data',
	getRouteParams(req, res) {
		const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
		const chain = typeof req.query.chain === 'string' ? req.query.chain : ''

		if (!protocol || !chain) {
			res.status(400).json({ error: 'Missing protocol or chain parameter' })
			return null
		}

		return { protocol, chain }
	},
	async handler(_req, res, { protocol, chain }) {
		const { resolveLiquidationsChainParams } = await import('~/containers/LiquidationsV2/server/routes')
		const route = await resolveLiquidationsChainParams(protocol, chain)
		if (!route) {
			return res.status(404).json({ error: 'Liquidations chain not found' })
		}

		const { getLiquidationsChainPageData } = await import('~/containers/LiquidationsV2/server/dataset')
		const data = await getLiquidationsChainPageData(route.protocolId, route.chainId, {
			chainMetadata: route.metadataCache.chainMetadata,
			protocolMetadata: route.metadataCache.protocolMetadata
		})

		if (!data) {
			return res.status(404).json({ error: 'Liquidations chain not found' })
		}

		return res.status(200).json(data)
	}
})
