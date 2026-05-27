import type { NextApiRequest, NextApiResponse } from 'next'
import type { YieldHalalPageResponse } from '~/containers/Yields/yieldsTableQuery'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<YieldHalalPageResponse | { error: string }>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET')
		res.status(405).json({ error: 'Method not allowed' })
		return
	}

	try {
		const { getYieldHalalPage } = await import('~/server/datasetCache/runtime/yields')
		const result = await getYieldHalalPage(req.query)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? '/api/datasets/yields/halal'))
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch halal yield data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields/halal', handler)
