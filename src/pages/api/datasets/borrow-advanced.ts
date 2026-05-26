import type { NextApiRequest, NextApiResponse } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { getBorrowAdvancedPageRows } = await import('~/server/datasetCache/runtime/yields')
		const rows = await getBorrowAdvancedPageRows(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/datasets/borrow-advanced'))
		res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch borrow advanced data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/borrow-advanced', handler)
