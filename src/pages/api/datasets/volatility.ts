import type { NextApiRequest, NextApiResponse } from 'next'
import { validateSubscription } from '~/utils/apiAuth'
import { fetchWithPoolingOnServer } from '~/utils/http-client'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const VOLATILITY_UPSTREAM = process.env.VOLATILITY_UPSTREAM_URL ?? 'https://yields.llama.fi/volatility'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const upstream = await fetchWithPoolingOnServer(VOLATILITY_UPSTREAM)
		if (!upstream.ok) {
			return res.status(502).json({ error: 'Upstream error' })
		}

		const data = await upstream.json()
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/datasets/volatility', handler)
