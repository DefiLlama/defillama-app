import type { NextApiRequest, NextApiResponse } from 'next'
import { SERVER_URL } from '~/constants'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { protocol } = req.query
	const protocolName = typeof protocol === 'string' ? protocol : ''

	if (!protocolName) {
		return res.status(400).json({ error: 'Missing protocol parameter' })
	}

	try {
		const [metadataCache, { resolveProtocolParamFromMetadata }] = await Promise.all([
			import('~/utils/metadata').then((m) => m.default),
			import('~/containers/ProtocolOverview/server/routes')
		])
		const protocolRoute = resolveProtocolParamFromMetadata(protocolName, metadataCache)
		if (!protocolRoute || !metadataCache.emissionsProtocolsList.includes(protocolRoute.canonicalSlug)) {
			return res.status(404).json({ error: 'Protocol emissions not found' })
		}

		const upstream = await fetchWithPoolingOnServer(
			`${SERVER_URL}/emission/${encodeURIComponent(protocolRoute.canonicalSlug)}`
		)
		if (!upstream.ok) {
			return res.status(upstream.status).json({ error: upstream.statusText })
		}
		const data = await upstream.json()
		res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch emission data' })
	}
}

export default withApiRouteTelemetry('/api/dynamic/emission/[protocol]', handler)
