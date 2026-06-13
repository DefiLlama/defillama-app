import type { NextApiRequest, NextApiResponse } from 'next'
import { CHAIN_ONLY_METRICS, getProtocolChainSplitData } from '~/server/protocolSplit/protocolChainService'
import { cachedResult } from '~/server/resultCache'
import { jitterCacheControlHeader } from '~/utils/maxAgeForNext'
import { recordRouteRuntimeError, withApiRouteTelemetry } from '~/utils/telemetry'

const SPLIT_RESULT_TTL_MS = 10 * 60 * 1000

async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const {
			protocol,
			metric = 'tvl',
			chains,
			limit = '5',
			filterMode,
			chainFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			chainCategories,
			protocolCategories
		} = req.query

		const metricStr = metric as string
		const rawChains = (chains as string | undefined)?.split(',').filter(Boolean) || []
		const chainsArray = rawChains.includes('All') ? [] : rawChains
		const chainCategoriesArray = (chainCategories as string | undefined)?.split(',').filter(Boolean) || []
		const protocolCategoriesArray = (protocolCategories as string | undefined)?.split(',').filter(Boolean) || []
		const resolveMode = (value?: string, fallback?: string) => {
			if (value === 'include' || value === 'exclude') return value
			if (fallback === 'include' || fallback === 'exclude') return fallback
			return 'include'
		}
		const chainMode = resolveMode(chainFilterMode as string | undefined, filterMode as string | undefined)
		const chainCategoryMode = resolveMode(
			chainCategoryFilterMode as string | undefined,
			filterMode as string | undefined
		)
		const protocolCategoryMode = resolveMode(
			protocolCategoryFilterMode as string | undefined,
			filterMode as string | undefined
		)
		const topN = Math.min(parseInt(limit as string), 20)
		const protocolStr = typeof protocol === 'string' ? protocol : undefined
		const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

		if (CHAIN_ONLY_METRICS.has(metricStr)) {
			if (!isProtocolAll) {
				res.status(400).json({
					error: `${metricStr} metric is only available when protocol=All`
				})
				return
			}
		}

		const cacheKey = JSON.stringify([
			protocolStr ?? 'all',
			metricStr,
			chainsArray,
			topN,
			chainMode,
			chainCategoryMode,
			protocolCategoryMode,
			chainCategoriesArray,
			protocolCategoriesArray
		])
		const result = await cachedResult(
			'protocols-split-chain',
			cacheKey,
			{ ttlMs: SPLIT_RESULT_TTL_MS, ttlJitter: 0.2 },
			() =>
				getProtocolChainSplitData({
					protocol: protocolStr,
					metric: metricStr,
					chains: chainsArray,
					topN,
					chainFilterMode: chainMode,
					chainCategoryFilterMode: chainCategoryMode,
					protocolCategoryFilterMode: protocolCategoryMode,
					chainCategories: chainCategoriesArray,
					protocolCategories: protocolCategoriesArray
				})
		)

		res.setHeader(
			'Cache-Control',
			jitterCacheControlHeader('public, s-maxage=600, stale-while-revalidate=1200', req.url ?? cacheKey)
		)
		res.status(200).json(result)
	} catch (error) {
		recordRouteRuntimeError(error, 'apiRoute')
		res.status(500).json({
			error: 'Failed to fetch protocol chain data',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

export default withApiRouteTelemetry('/api/dynamic/protocols/split/protocol-chain', handler)
