import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenYieldsRows } from '~/server/datasetCache/runtime/yields'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, token } = req.query
		const tokenFilter = typeof token === 'string' ? token.trim() : Array.isArray(token) ? token[0]?.trim() : ''
		const rows = await getTokenYieldsRows(tokenFilter, chains)

		res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yields data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields', handler)
