import type { NextApiRequest, NextApiResponse } from 'next'
import { getChainsByCategoryChartData } from '~/containers/ChainsByCategory/queries'
import { setPageDataCacheHeaders } from '~/server/pageData/cache'
import { getCommaSeparatedQueryParam, getFirstQueryParam } from '~/server/pageData/query'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export const config = {
	api: {
		responseLimit: false
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const category = getFirstQueryParam(req.query.category) ?? 'All'
		const sampledChart = getFirstQueryParam(req.query.sampledChart) === 'true'
		const extraTvlTypes = getCommaSeparatedQueryParam(req.query.extraTvlTypes)
		const data = await getChainsByCategoryChartData({
			category,
			sampledChart,
			extraTvlTypes
		})

		setPageDataCacheHeaders(req, res)
		return res.status(200).json({
			tvlChartsByChain: data.tvlChartsByChain,
			totalTvlByDate: data.totalTvlByDate
		})
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch chains chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/page-data/chains/charts', handler)
