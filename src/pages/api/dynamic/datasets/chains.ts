import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchChainsDatasetRows } from '~/containers/ProDashboard/server/datasetFetchers'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

export default withApiRouteTelemetry('/api/dynamic/datasets/chains', handler)
