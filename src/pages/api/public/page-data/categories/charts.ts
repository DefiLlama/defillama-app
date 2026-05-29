import type { NextApiRequest, NextApiResponse } from 'next'
import { getProtocolsCategoriesChartData } from '~/containers/ProtocolsByCategoryOrTag/queries'
import { setPageDataCacheHeaders } from '~/server/pageData/cache'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

export const config = {
	api: {
		responseLimit: false
	}
}

function getStringListParam(value: string | string[] | undefined): string[] {
	if (!value) return []
	const values = Array.isArray(value) ? value : [value]
	const items: string[] = []

	for (const rawValue of values) {
		for (const item of rawValue.split(',')) {
			const trimmed = item.trim()
			if (trimmed) items.push(trimmed)
		}
	}

	return items
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	try {
		const chartData = await getProtocolsCategoriesChartData({
			extraTvlTypes: getStringListParam(req.query.extraTvlTypes)
		})
		setPageDataCacheHeaders(req, res)
		return res.status(200).json(chartData)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch categories chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/page-data/categories/charts', handler)
