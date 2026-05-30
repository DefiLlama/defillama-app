import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'

export const config = {
	api: {
		responseLimit: false
	}
}

export default withSubscriptionJsonRoute<{ protocol: string }>({
	route: '/api/private/liquidations/[protocol]',
	errorMessage: 'Failed to fetch liquidations protocol data',
	getRouteParams(req, res) {
		const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
		if (!protocol) {
			res.status(400).json({ error: 'Missing protocol parameter' })
			return null
		}
		return { protocol }
	},
	async handler(_req, res, { protocol }) {
		const { resolveLiquidationsProtocolParam } = await import('~/server/routeCache/liquidations')
		const protocolId = await resolveLiquidationsProtocolParam(protocol)
		if (!protocolId) {
			return res.status(404).json({ error: 'Liquidations protocol not found' })
		}

		const [{ getLiquidationsProtocolPageData }, { default: metadataCache }] = await Promise.all([
			import('~/server/datasetCache/runtime/liquidations'),
			import('~/utils/metadata')
		])
		const data = await getLiquidationsProtocolPageData(protocolId, {
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata
		})

		if (!data) {
			return res.status(404).json({ error: 'Liquidations protocol not found' })
		}

		return res.status(200).json(data)
	}
})
