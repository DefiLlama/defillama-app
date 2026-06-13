import type { NextApiRequest, NextApiResponse } from 'next'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import { fetchChainsDatasetRows } from './dataset'

async function chainsDatasetHandler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { category, limit } = req.query
		const categoryParam = typeof category === 'string' ? category : 'All'
		const limitValue = typeof limit === 'string' ? parseInt(limit, 10) : null

		const finalChains = await fetchChainsDatasetRows({ category: categoryParam, limit: limitValue })

		res.status(200).json(finalChains)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch chains data' })
	}
}

export const chainsDatasetApiHandler = withApiRouteTelemetry('/api/dynamic/chains', chainsDatasetHandler)
