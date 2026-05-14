import type { NextApiRequest, NextApiResponse } from 'next'
import { getCachedCgChartData } from '~/api/coingecko'
import type { CgChartResponse } from '~/api/coingecko.types'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseBody = CgChartResponse | { error: string } | null

const VALID_GECKO_ID = /^[A-Za-z0-9._-]{1,80}$/
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_CACHE_CONTROL = 'no-store'

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

const setNoStoreHeaders = (res: NextApiResponse<ResponseBody>) => {
	res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
}

const setSuccessCacheHeaders = (req: NextApiRequest, res: NextApiResponse<ResponseBody>) => {
	res.setHeader('Cache-Control', jitterCacheControlHeader(SUCCESS_CACHE_CONTROL, req.url ?? '/api/cache/cgchart'))
}

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		setNoStoreHeaders(res)
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const geckoId = getQueryParam(req.query.geckoId)
	if (!geckoId || !VALID_GECKO_ID.test(geckoId)) {
		setNoStoreHeaders(res)
		return res.status(400).json({ error: 'Invalid geckoId parameter' })
	}

	const fullChart = getQueryParam(req.query.fullChart) === 'true'

	try {
		const data = await getCachedCgChartData(geckoId, fullChart)
		if (!data) {
			setNoStoreHeaders(res)
			return res.status(200).json(null)
		}
		setSuccessCacheHeaders(req, res)
		return res.status(200).json({ data })
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		setNoStoreHeaders(res)
		return res.status(500).json({ error: 'Failed to fetch chart data.' })
	}
}

export default withApiRouteTelemetry('/api/cache/cgchart/[geckoId]', handler)
