import type { NextApiRequest, NextApiResponse } from 'next'
import {
	fetchStablecoinChainVolumeChartApi,
	fetchStablecoinTokenVolumeChartApi,
	fetchStablecoinVolumeChartApi
} from '~/containers/Stablecoins/api'
import type {
	StablecoinVolumeChainChartKind,
	StablecoinVolumeChartResponse,
	StablecoinVolumeGlobalChartKind,
	StablecoinVolumeTokenChartKind
} from '~/containers/Stablecoins/api.types'
import { STABLECOIN_CHART_CACHE_CONTROL } from '~/containers/Stablecoins/chartSeries'
import { buildStablecoinVolumeChartPayload } from '~/containers/Stablecoins/volumeChart'
import metadataCache from '~/utils/metadata'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const GLOBAL_CHARTS = new Set<StablecoinVolumeGlobalChartKind>(['total', 'chain', 'token', 'currency'])
const CHAIN_CHARTS = new Set<StablecoinVolumeChainChartKind>(['total', 'token', 'currency'])
const TOKEN_CHARTS = new Set<StablecoinVolumeTokenChartKind>(['total', 'chain'])

const getStringParam = (value: string | string[] | undefined): string | undefined => {
	if (Array.isArray(value)) return value[0]
	return value
}

const parseLimit = (value: string | string[] | undefined): number | undefined => {
	const raw = getStringParam(value)
	if (!raw) return undefined
	const parsed = Math.trunc(Number(raw))
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const scope = getStringParam(req.query.scope) ?? 'global'
	const rawChart = getStringParam(req.query.chart)
	if (!rawChart) {
		return res.status(400).json({ error: 'valid chart parameter is required' })
	}

	try {
		let chart: StablecoinVolumeGlobalChartKind | StablecoinVolumeChainChartKind | StablecoinVolumeTokenChartKind
		let data: StablecoinVolumeChartResponse
		if (scope === 'global') {
			if (!GLOBAL_CHARTS.has(rawChart as StablecoinVolumeGlobalChartKind)) {
				return res.status(400).json({ error: 'unsupported global volume chart' })
			}
			chart = rawChart as StablecoinVolumeGlobalChartKind
			data = await fetchStablecoinVolumeChartApi(chart)
		} else if (scope === 'chain') {
			if (!CHAIN_CHARTS.has(rawChart as StablecoinVolumeChainChartKind)) {
				return res.status(400).json({ error: 'unsupported chain volume chart' })
			}
			const chain = getStringParam(req.query.chain)
			if (!chain) return res.status(400).json({ error: 'chain parameter is required' })
			chart = rawChart as StablecoinVolumeChainChartKind
			data = await fetchStablecoinChainVolumeChartApi(chain, chart, metadataCache.chainMetadata)
		} else if (scope === 'token') {
			if (!TOKEN_CHARTS.has(rawChart as StablecoinVolumeTokenChartKind)) {
				return res.status(400).json({ error: 'unsupported token volume chart' })
			}
			const token = getStringParam(req.query.token)
			if (!token) return res.status(400).json({ error: 'token parameter is required' })
			chart = rawChart as StablecoinVolumeTokenChartKind
			data = await fetchStablecoinTokenVolumeChartApi(token, chart)
		} else {
			return res.status(400).json({ error: 'unsupported scope' })
		}

		const payload = buildStablecoinVolumeChartPayload(data, {
			chart,
			limit: parseLimit(req.query.limit)
		})

		res.setHeader('Cache-Control', STABLECOIN_CHART_CACHE_CONTROL)
		return res.status(200).json(payload)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		return res.status(500).json({ error: 'Failed to fetch stablecoin volume chart' })
	}
}

export default withApiRouteTelemetry('/api/stablecoins/volume-chart', handler)
