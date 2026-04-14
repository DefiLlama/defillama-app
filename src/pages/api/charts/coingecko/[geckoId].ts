import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCoinGeckoChartByIdWithCacheFallback } from '~/api/coingecko'
import type { CgChartResponse } from '~/api/coingecko.types'
import { CACHE_SERVER } from '~/constants'
import { fetchJson } from '~/utils/async'

type ResponseData = CgChartResponse | { totalSupply: number | null } | { error: string } | null

const getQueryParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const geckoId = getQueryParam(req.query.geckoId)
	if (!geckoId) {
		return res.status(400).json({ error: 'geckoId parameter is required' })
	}

	const kind = getQueryParam(req.query.kind)

	try {
		res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')

		if (kind === 'supply') {
			const data = await fetchJson<{ data?: { total_supply?: number } }>(`${CACHE_SERVER}/supply/${geckoId}`).catch(
				() => null
			)
			return res.status(200).json({ totalSupply: data?.data?.total_supply ?? null })
		}

		const fullChart = getQueryParam(req.query.fullChart) !== 'false'
		const chart = await fetchCoinGeckoChartByIdWithCacheFallback(geckoId, { fullChart })
		return res.status(200).json(chart)
	} catch (error) {
		console.log('Failed to fetch coingecko chart data', error)
		return res.status(500).json({ error: 'Failed to load coingecko chart data' })
	}
}
