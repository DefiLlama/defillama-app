import type { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolEmissons, isEmptyProtocolEmissionResult } from '~/containers/Unlocks/queries'
import { requireSubscription } from '~/server/api/requireSubscription'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const PRIVATE_NO_STORE_CACHE_CONTROL = 'private, no-store'

function setPrivateNoStore(res: NextApiResponse) {
	res.setHeader('Cache-Control', PRIVATE_NO_STORE_CACHE_CONTROL)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	setPrivateNoStore(res)

	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const auth = await requireSubscription(req.headers.authorization, res)
		if (!auth) return

		const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
		if (!protocol) {
			return res.status(400).json({ error: 'Missing protocol parameter' })
		}

		const [metadataModule, { resolveProtocolParamFromMetadata }] = await Promise.all([
			import('~/utils/metadata'),
			import('~/server/routeCache/protocols')
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
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/private/token-unlocks/[protocol]', handler)
