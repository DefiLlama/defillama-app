import type { NextApiRequest, NextApiResponse } from 'next'
import { getLiquidationsProtocolPageData } from '~/server/datasetCache/runtime/liquidations'
import { validateSubscription } from '~/utils/apiAuth'
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

	const protocol = typeof req.query.protocol === 'string' ? req.query.protocol : ''
	if (!protocol) {
		return res.status(400).json({ error: 'Missing protocol parameter' })
	}

	try {
		const auth = await validateSubscription(req.headers.authorization)
		if (auth.valid === false) {
			return res.status(auth.status).json({ error: auth.error })
		}

		const metadataModule = await import('~/utils/metadata')

		const data = await getLiquidationsProtocolPageData(protocol, {
			chainMetadata: metadataModule.default.chainMetadata,
			protocolMetadata: metadataModule.default.protocolMetadata
		})

		if (!data) {
			return res.status(404).json({ error: 'Liquidations protocol not found' })
		}

		return res.status(200).json(data)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch liquidations protocol data' })
	}
}

export default withApiRouteTelemetry('/api/liquidations/[protocol]', handler)
