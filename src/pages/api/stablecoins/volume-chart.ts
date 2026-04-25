import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchStablecoinVolumeChartApi } from '~/containers/Stablecoins/api'
import type { StablecoinVolumeChartKind } from '~/containers/Stablecoins/api.types'
import { buildStablecoinVolumeChartPayload } from '~/containers/Stablecoins/volumeChart'

const VALID_CHARTS = new Set<StablecoinVolumeChartKind>(['total', 'chain', 'token', 'currency'])

const getStringParam = (value: string | string[] | undefined): string | undefined => {
	if (Array.isArray(value)) return value[0]
	return value
}

const parseLimit = (value: string | string[] | undefined): number | undefined => {
	const raw = getStringParam(value)
	if (!raw) return undefined
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const rawChart = getStringParam(req.query.chart)
	if (!rawChart || !VALID_CHARTS.has(rawChart as StablecoinVolumeChartKind)) {
		return res.status(400).json({ error: 'valid chart parameter is required' })
	}

	const chart = rawChart as StablecoinVolumeChartKind

	try {
		const data = await fetchStablecoinVolumeChartApi(chart)
		const payload = buildStablecoinVolumeChartPayload(data, {
			chart,
			selectedDimension: getStringParam(req.query.dimension),
			fallbackDimension: getStringParam(req.query.fallbackDimension),
			limit: parseLimit(req.query.limit)
		})

		res.setHeader('Cache-Control', 'public, max-age=300')
		return res.status(200).json(payload)
	} catch (error) {
		console.log('Error fetching stablecoin volume chart:', error)
		return res.status(500).json({ error: 'Failed to fetch stablecoin volume chart' })
	}
}
