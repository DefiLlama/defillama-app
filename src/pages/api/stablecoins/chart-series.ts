import type { NextApiRequest, NextApiResponse } from 'next'
import {
	STABLECOIN_CHART_CACHE_CONTROL,
	type StablecoinAssetChartType,
	type StablecoinChainsChartType,
	type StablecoinOverviewChartType
} from '~/containers/Stablecoins/chartSeries'
import {
	getStablecoinAssetChartSeries,
	getStablecoinChainsChartSeries,
	getStablecoinOverviewChartSeries
} from '~/containers/Stablecoins/queries.server'
import { isTruthyQueryParam } from '~/utils/routerQuery'

const OVERVIEW_CHARTS = new Set<StablecoinOverviewChartType>([
	'totalMcap',
	'tokenMcaps',
	'dominance',
	'usdInflows',
	'tokenInflows'
])
const CHAINS_CHARTS = new Set<StablecoinChainsChartType>(['totalMcap', 'chainMcaps', 'dominance'])
const ASSET_CHARTS = new Set<StablecoinAssetChartType>(['totalCirc', 'chainMcaps', 'chainDominance'])

const getStringParam = (value: string | string[] | undefined): string | undefined => {
	if (Array.isArray(value)) return value[0]
	return value
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', ['GET'])
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	const scope = getStringParam(req.query.scope)
	const rawChart = getStringParam(req.query.chart)
	if (!scope || !rawChart) {
		return res.status(400).json({ error: 'scope and chart parameters are required' })
	}

	try {
		if (scope === 'overview') {
			if (!OVERVIEW_CHARTS.has(rawChart as StablecoinOverviewChartType)) {
				return res.status(400).json({ error: 'unsupported overview chart' })
			}
			const chain = getStringParam(req.query.chain)
			if (!chain) return res.status(400).json({ error: 'chain parameter is required' })
			const payload = await getStablecoinOverviewChartSeries({
				chain: chain === 'All' ? null : chain,
				chart: rawChart as StablecoinOverviewChartType,
				filters: {
					attribute: req.query.attribute,
					excludeAttribute: req.query.excludeAttribute,
					pegtype: req.query.pegtype,
					excludePegtype: req.query.excludePegtype,
					backing: req.query.backing,
					excludeBacking: req.query.excludeBacking,
					minMcap: req.query.minMcap,
					maxMcap: req.query.maxMcap
				}
			})
			res.setHeader('Cache-Control', STABLECOIN_CHART_CACHE_CONTROL)
			return res.status(200).json(payload)
		}

		if (scope === 'chains') {
			if (!CHAINS_CHARTS.has(rawChart as StablecoinChainsChartType)) {
				return res.status(400).json({ error: 'unsupported chains chart' })
			}
			const payload = await getStablecoinChainsChartSeries(
				rawChart as StablecoinChainsChartType,
				isTruthyQueryParam(req.query.unreleased)
			)
			res.setHeader('Cache-Control', STABLECOIN_CHART_CACHE_CONTROL)
			return res.status(200).json(payload)
		}

		if (scope === 'asset') {
			if (!ASSET_CHARTS.has(rawChart as StablecoinAssetChartType)) {
				return res.status(400).json({ error: 'unsupported asset chart' })
			}
			const stablecoin = getStringParam(req.query.stablecoin)
			if (!stablecoin) return res.status(400).json({ error: 'stablecoin parameter is required' })
			const payload = await getStablecoinAssetChartSeries({
				peggedasset: stablecoin,
				chart: rawChart as StablecoinAssetChartType,
				includeUnreleased: isTruthyQueryParam(req.query.unreleased)
			})
			if (!payload) return res.status(404).json({ error: 'stablecoin not found' })
			res.setHeader('Cache-Control', STABLECOIN_CHART_CACHE_CONTROL)
			return res.status(200).json(payload)
		}

		return res.status(400).json({ error: 'unsupported scope' })
	} catch (error) {
		console.error('Error fetching stablecoin chart series:', error)
		return res.status(500).json({ error: 'Failed to fetch stablecoin chart series' })
	}
}
