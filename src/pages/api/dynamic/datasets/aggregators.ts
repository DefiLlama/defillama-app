import type { NextApiRequest, NextApiResponse } from 'next'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { fetchDimensionDataset } from '~/containers/ProDashboard/server/datasetFetchers'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains } = req.query
		const chainList = typeof chains === 'string' ? [chains] : chains || []

		const sortedProtocols = await fetchDimensionDataset({
			adapterType: ADAPTER_TYPES.AGGREGATORS,
			route: 'dex-aggregators',
			metricName: 'DEX Aggregator Volume',
			chains: chainList,
			withChainBreakdown: true
		})

		res.status(200).json(sortedProtocols)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({ error: 'Failed to fetch aggregators data' })
	}
}

export default withApiRouteTelemetry('/api/dynamic/datasets/aggregators', handler)
