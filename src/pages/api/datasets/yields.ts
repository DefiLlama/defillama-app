import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenYieldsRowsFromNetwork } from '~/containers/Token/tokenYields.server'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, token } = req.query
		const tokenFilter = typeof token === 'string' ? token.trim() : Array.isArray(token) ? token[0]?.trim() : ''
		const shouldUseDatasetCache = isDatasetCacheEnabled()
		const rows = shouldUseDatasetCache
			? await (async () => {
					const { getTokenYieldsRowsFromCache } = await import('~/server/datasetCache/yields')
					return getTokenYieldsRowsFromCache(tokenFilter, chains)
				})()
			: await getTokenYieldsRowsFromNetwork(tokenFilter, chains)

		res.status(200).json(rows)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch yields data' })
	}
}

export default withApiRouteTelemetry('/api/datasets/yields', handler)
