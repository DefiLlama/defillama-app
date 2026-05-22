import type { NextApiRequest, NextApiResponse } from 'next'
import { YIELDS_SERVER_URL } from '~/constants'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { configID } = req.query
		if (typeof configID !== 'string' || !/^[\da-f-]{36}$/i.test(configID)) {
			return res.status(400).json({ error: 'Invalid configID' })
		}

		const upstream = await fetchWithPoolingOnServer(`${YIELDS_SERVER_URL}/holders/${configID}`)
		if (!upstream.ok) {
			return res.status(502).json({ error: 'Upstream error' })
		}

		const data = await upstream.json()
		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, s-maxage=3600, stale-while-revalidate=600', req.url ?? configID)
		)
		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/datasets/holders/[configID]', handler)
