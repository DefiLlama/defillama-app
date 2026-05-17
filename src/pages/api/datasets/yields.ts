import type { NextApiRequest, NextApiResponse } from 'next'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, token } = req.query
		const tokenFilter = typeof token === 'string' ? token.trim() : Array.isArray(token) ? token[0]?.trim() : ''
		const { getTokenYieldsRows } = await import('~/server/datasetCache/runtime/yields')
		const rows = await getTokenYieldsRows(tokenFilter, chains)

		res.setHeader('Cache-Control', jitterCacheControlHeader(CACHE_CONTROL, req.url ?? tokenFilter))
		res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yields data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields', handler)
