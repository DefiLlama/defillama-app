import type { NextApiRequest, NextApiResponse } from 'next'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { getChainsByAdapterAllChains, getChainsByAdapterChartData } from '~/containers/AdapterMetrics/queries'
import { setPageDataCacheHeaders } from '~/server/pageData/cache'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export const config = {
	api: {
		responseLimit: false
	}
}

const ADAPTER_TYPE_VALUES = new Set<string>(Object.values(ADAPTER_TYPES))
const ADAPTER_DATA_TYPE_VALUES = new Set<string>(Object.values(ADAPTER_DATA_TYPES))

function getStringParam(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0]
	return value
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const adapterType = getStringParam(req.query.adapterType)
	const dataType = getStringParam(req.query.dataType)
	if (!adapterType || !dataType) {
		return res.status(400).json({ error: 'adapterType and dataType parameters are required' })
	}
	if (!ADAPTER_TYPE_VALUES.has(adapterType) || !ADAPTER_DATA_TYPE_VALUES.has(dataType)) {
		return res.status(400).json({ error: 'unsupported adapterType or dataType' })
	}

	try {
		// Build the chain universe from adapter metadata so this endpoint only
		// asks upstream for chains that expose the requested metric.
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const allChains = getChainsByAdapterAllChains({
			adapterType: adapterType as `${ADAPTER_TYPES}`,
			dataType: dataType as `${ADAPTER_DATA_TYPES}`,
			chainMetadata: metadataCache.chainMetadata
		})
		const chartData = await getChainsByAdapterChartData({
			adapterType: adapterType as `${ADAPTER_TYPES}`,
			dataType: dataType as `${ADAPTER_DATA_TYPES}`,
			allChains
		})

		setPageDataCacheHeaders(req, res)
		return res.status(200).json({ chartData })
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch dimension adapter chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/page-data/dimension-adapters/chains-chart', handler)
