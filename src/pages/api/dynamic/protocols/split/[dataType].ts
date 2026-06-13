import type { NextApiRequest, NextApiResponse } from 'next'
import { DIMENSIONS_METRIC_CONFIG, getDimensionsSplitData } from '~/server/protocolSplit/dimensionsSplit'
import { getTvlSplitData } from '~/server/protocolSplit/tvlSplit'
import { cachedResult } from '~/server/resultCache'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const SPLIT_RESULT_TTL_MS = 10 * 60 * 1000

function setSplitCacheHeader(req: NextApiRequest, res: NextApiResponse, key: string) {
	res.setHeader(
		'Cache-Control',
		jitterCacheControlHeader('public, s-maxage=600, stale-while-revalidate=1200', req.url ?? key)
	)
}

async function handleTVLRequest(req: NextApiRequest, res: NextApiResponse) {
	try {
		const {
			chains,
			limit = '10',
			categories,
			groupByParent,
			filterMode,
			chainFilterMode,
			categoryFilterMode
		} = req.query

		let chainsArray = chains ? (chains as string).split(',').filter(Boolean) : []
		if (chainsArray.length === 0 || chainsArray.some((c) => c.toLowerCase() === 'all')) {
			chainsArray = []
		}
		const categoriesArray = categories ? (categories as string).split(',').filter(Boolean) : []
		const topN = Math.min(parseInt(limit as string), 20)
		const shouldGroupByParent = groupByParent === 'true'
		const resolveMode = (value?: string, fallback?: string) => {
			if (value === 'include' || value === 'exclude') return value
			if (fallback === 'include' || fallback === 'exclude') return fallback
			return 'include'
		}
		const chainMode = resolveMode(chainFilterMode as string | undefined, filterMode as string | undefined)
		const categoryMode = resolveMode(categoryFilterMode as string | undefined, filterMode as string | undefined)

		const cacheKey = JSON.stringify([chainsArray, categoriesArray, topN, shouldGroupByParent, chainMode, categoryMode])
		const result = await cachedResult(
			'protocols-split-tvl',
			cacheKey,
			{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
			() => getTvlSplitData(chainsArray, categoriesArray, topN, shouldGroupByParent, chainMode, categoryMode)
		)

		setSplitCacheHeader(req, res, cacheKey)
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({
			error: 'Failed to fetch TVL data',
			message: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const {
			dataType,
			chains,
			limit = '10',
			categories,
			groupByParent,
			filterMode,
			chainFilterMode,
			categoryFilterMode
		} = req.query
		const metric = dataType as string

		if (metric === 'tvl') {
			return handleTVLRequest(req, res)
		}

		const topN = Math.min(parseInt(limit as string), 20)
		const chainsArray = chains ? (chains as string).split(',').filter(Boolean) : ['all']
		const categoriesArray = categories
			? (categories as string)
					.split(',')
					.filter(Boolean)
					.map((cat) => cat.toLowerCase())
			: []
		const resolveMode = (value?: string, fallback?: string) => {
			if (value === 'include' || value === 'exclude') return value
			if (fallback === 'include' || fallback === 'exclude') return fallback
			return 'include'
		}
		const chainMode = resolveMode(chainFilterMode as string | undefined, filterMode as string | undefined)
		const categoryMode = resolveMode(categoryFilterMode as string | undefined, filterMode as string | undefined)
		const shouldGroupByParent = groupByParent === 'true'

		const config = DIMENSIONS_METRIC_CONFIG[metric]
		if (!config) {
			return res.status(400).json({ error: `Unsupported metric: ${metric}` })
		}

		const cacheKey = JSON.stringify([
			metric,
			chainsArray,
			categoriesArray,
			topN,
			shouldGroupByParent,
			chainMode,
			categoryMode
		])
		const result = await cachedResult(
			'protocols-split-dimensions',
			cacheKey,
			{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
			() =>
				getDimensionsSplitData({
					metric,
					chains: chainsArray,
					categories: categoriesArray,
					topN,
					groupByParent: shouldGroupByParent,
					chainFilterMode: chainMode,
					categoryFilterMode: categoryMode
				})
		)

		setSplitCacheHeader(req, res, cacheKey)
		res.status(200).json(result)
	} catch (error) {
		const metric = req.query.dataType as string
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({
			error: `Failed to fetch protocol ${metric} data`,
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

export default withApiRouteTelemetry('/api/dynamic/protocols/split/[dataType]', handler)
