import type { NextApiRequest, NextApiResponse } from 'next'
import type { BorrowPageRowsResponse } from '~/containers/Yields/borrowSimple'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<BorrowPageRowsResponse | { error: string }>) {
	try {
		const { getBorrowPageRows } = await import('~/server/datasetCache/runtime/yields')
		const rows = await getBorrowPageRows(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/public/datasets/borrow'))
		res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch borrow data' })
	}
}

export default withApiRouteTelemetry('/api/public/datasets/borrow', handler)
