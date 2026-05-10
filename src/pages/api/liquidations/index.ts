import type { NextApiRequest, NextApiResponse } from 'next'
import { getLiquidationsOverviewPageData } from '~/server/datasetCache/runtime/liquidations'
import { validateSubscription } from '~/utils/apiAuth'
import metadataCache from '~/utils/metadata'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', 'private, no-store')

	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const data = await getLiquidationsOverviewPageData({
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata
		})

		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch liquidations overview data' })
	}
}

export default withApiRouteTelemetry('/api/liquidations', handler)
