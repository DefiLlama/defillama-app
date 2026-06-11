import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCoinGeckoChartByIdWithCacheFallback } from '~/api/coingecko'
import type { CgChartResponse } from '~/api/coingecko.types'
import { CACHE_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

type ResponseData = CgChartResponse | { totalSupply: number | null } | { error: string } | null
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=600'
const NO_STORE_CACHE_CONTROL = 'no-store'

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

const setSuccessCacheHeaders = (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
	res.setHeader(
		'Cache-Control',
		jitterCacheControlHeader(SUCCESS_CACHE_CONTROL, req.url ?? '/api/public/charts/coingecko')
	)
}

const setNoStoreHeaders = (res: NextApiResponse<ResponseData>) => {
	res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL)
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && error.message.includes('[404]')
}

async function fetchTokenTotalSupply(geckoId: string): Promise<number | null> {
	try {
		const data = await fetchJson<{ data?: { total_supply?: number | null } }>(`${CACHE_SERVER}/supply/${geckoId}`)
		const rawSupply = data?.data?.total_supply ?? null
		return rawSupply != null && Number.isFinite(rawSupply) ? rawSupply : null
	} catch (error) {
		if (isNotFoundError(error)) return null
		throw error
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		setNoStoreHeaders(res)
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const geckoId = getQueryParam(req.query.geckoId)
	if (!geckoId) {
		setNoStoreHeaders(res)
		return res.status(400).json({ error: 'geckoId parameter is required' })
	}

	const kind = getQueryParam(req.query.kind)

	try {
		if (kind === 'supply') {
			// Supply is not part of the CoinGecko chart payload; it comes from the
			// cache-server supply snapshot while price charts use the CG cache path.
			const totalSupply = await fetchTokenTotalSupply(geckoId)
			if (totalSupply === null) {
				setNoStoreHeaders(res)
			} else {
				setSuccessCacheHeaders(req, res)
			}
			return res.status(200).json({ totalSupply })
		}

		const fullChart = getQueryParam(req.query.fullChart) !== 'false'
		const chart = await fetchCoinGeckoChartByIdWithCacheFallback(geckoId, { fullChart })
		if (!chart) {
			setNoStoreHeaders(res)
			return res.status(200).json(null)
		}

		setSuccessCacheHeaders(req, res)
		return res.status(200).json(chart)
	} catch (error) {
		setNoStoreHeaders(res)
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to load coingecko chart data' })
	}
}

export default withApiRouteTelemetry('/api/public/charts/coingecko/[geckoId]', handler)
