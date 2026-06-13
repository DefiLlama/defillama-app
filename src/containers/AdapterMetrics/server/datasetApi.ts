import type { NextApiHandler } from 'next'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'
import { DIMENSION_DATASET_SPEC_BY_TYPE, fetchDimensionDataset } from './datasets'

const ADAPTER_METRIC_DATASET_ROUTE_BY_PUBLIC_METRIC: Record<string, string> = {
	dexs: 'dexs',
	perps: 'perps',
	'dex-aggregators': 'aggregators',
	'bridge-aggregators': 'bridge-aggregators',
	fees: 'fees',
	revenue: 'revenue',
	earnings: 'earnings',
	'holders-revenue': 'holders-revenue',
	options: 'options'
}

export function createAdapterMetricDatasetHandler(publicMetric: string): NextApiHandler {
	const datasetType = ADAPTER_METRIC_DATASET_ROUTE_BY_PUBLIC_METRIC[publicMetric]
	const spec = datasetType ? DIMENSION_DATASET_SPEC_BY_TYPE[datasetType] : null
	const route = `/api/dynamic/adapter-metrics/${publicMetric}`

	return withApiRouteTelemetry(route, async (req, res) => {
		if (!spec) {
			res.status(404).json({ error: 'Unsupported adapter metric dataset' })
			return
		}

		try {
			const { chains } = req.query
			const chainList = typeof chains === 'string' ? [chains] : chains || []
			const sortedProtocols = await fetchDimensionDataset({ ...spec.options, chains: chainList })
			res.status(200).json(sortedProtocols)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			res.status(500).json({ error: `Failed to fetch ${publicMetric} data` })
		}
	})
}
