import type { NextApiRequest, NextApiResponse } from 'next'
import type { YieldLoopPageResponse } from '~/containers/Yields/yieldsTableQuery'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<YieldLoopPageResponse | { error: string }>) {
	try {
		const { getYieldLoopPage } = await import('~/server/datasetCache/runtime/yields')
		const result = await getYieldLoopPage(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/datasets/yields/loop'))
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yield loop data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields/loop', handler)
