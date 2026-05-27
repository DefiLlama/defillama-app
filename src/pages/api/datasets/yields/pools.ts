import type { NextApiRequest, NextApiResponse } from 'next'
import type { YieldPoolsPageResponse } from '~/containers/Yields/pools.types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<YieldPoolsPageResponse | { error: string }>) {
	try {
		const { getYieldPoolsPage } = await import('~/server/datasetCache/runtime/yields')
		const result = await getYieldPoolsPage(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/datasets/yields/pools'))
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yield pools data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields/pools', handler)
