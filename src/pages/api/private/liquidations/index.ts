import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'

export const config = {
	api: {
		responseLimit: false
	}
}

export default withSubscriptionJsonRoute({
	route: '/api/private/liquidations',
	errorMessage: 'Failed to fetch liquidations overview data',
	async handler(_req, res) {
		const [{ getLiquidationsOverviewPageData }, { default: metadataCache }] = await Promise.all([
			import('~/server/datasetCache/runtime/liquidations'),
			import('~/utils/metadata')
		])
		const data = await getLiquidationsOverviewPageData({
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata
		})

		return res.status(200).json(data)
	}
})
