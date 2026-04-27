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
		const upstream = await fetchWithPoolingOnServer(`${SERVER_URL}/emission/${encodeURIComponent(protocolName)}`)
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

export default withApiRouteTelemetry('/api/emission/[protocol]', handler)
