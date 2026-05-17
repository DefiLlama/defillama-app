import type { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolEmissons, isEmptyProtocolEmissionResult } from '~/containers/Unlocks/queries'
import { slug } from '~/utils'
import { validateSubscription } from '~/utils/apiAuth'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const NO_STORE_CACHE_CONTROL = 'no-store'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
	if (!protocol) {
		res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
		return res.status(400).json({ error: 'Missing protocol parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			res.setHeader('Cache-Control', 'private, no-store')
			return res.status(auth.status).json({ error: auth.error })
		}

		const data = await getProtocolEmissons(slug(protocol), { skipAvailabilityCheck: true })
		if (isEmptyProtocolEmissionResult(data)) {
			res.setHeader('Cache-Control', 'private, no-store')
			return res.status(404).json({ error: 'Protocol emissions not found' })
		}
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.setHeader('Cache-Control', 'private, no-store')
		return res.status(500).json({ error: 'Internal server error' })
	}
}

export default withApiRouteTelemetry('/api/token-unlocks/[protocol]', handler)
