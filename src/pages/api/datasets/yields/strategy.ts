import type { NextApiRequest, NextApiResponse } from 'next'
import type { YieldStrategyPageResponse } from '~/containers/Yields/yieldsTableQuery'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<YieldStrategyPageResponse | { error: string }>) {
	try {
		const { getYieldStrategyPage } = await import('~/server/datasetCache/runtime/yields')
		const result = await getYieldStrategyPage(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/datasets/yields/strategy'))
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yield strategy data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields/strategy', handler)
