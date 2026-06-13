import type { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolEmissons, isEmptyProtocolEmissionResult } from '~/containers/Unlocks/queries'
import { withSubscriptionJsonRoute } from '~/server/api/withSubscriptionJsonRoute'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
	if (!protocol) {
		return res.status(400).json({ error: 'Missing protocol parameter' })
	}

	const [metadataModule, { resolveProtocolParamFromMetadata }] = await Promise.all([
		import('~/utils/metadata'),
		import('~/containers/ProtocolOverview/server/routes')
	])
	const protocolRoute = resolveProtocolParamFromMetadata(protocol, metadataModule.default)
	if (!protocolRoute || !metadataModule.default.emissionsProtocolsList.includes(protocolRoute.canonicalSlug)) {
		return res.status(404).json({ error: 'Protocol emissions not found' })
	}

	metadataModule.refreshMetadataInBackgroundIfStale('token_unlocks_api')
	const data = await getProtocolEmissons(protocolRoute.canonicalSlug, {
		skipAvailabilityCheck: true,
		tokenlist: metadataModule.default.tokenlist
	})
	if (isEmptyProtocolEmissionResult(data)) {
		return res.status(404).json({ error: 'Protocol emissions not found' })
	}
	return res.status(200).json(data)
}

export default withSubscriptionJsonRoute({
	route: '/api/private/token-unlocks/[protocol]',
	errorMessage: 'Internal server error',
	handler
})
