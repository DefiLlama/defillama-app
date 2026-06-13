import { DIMENSIONS_OVERVIEW_API, DIMENSIONS_SUMMARY_API } from '~/constants'
import { queryFilterMode, queryIntClamped, queryList, queryString } from '~/server/api/params'
import { badRequest, ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { fetchJson } from '~/utils/async'
import {
	BREAKDOWN_COLOR_PALETTE,
	buildAlignedTopAndOthers,
	CHAIN_NATIVE_BREAKDOWN_METRICS,
	displayChainName,
	filterOutToday,
	normalizeDailyPairs,
	resolveAllowedChainSlugsFromCategories,
	type ChartSeries,
	type ProtocolChainData
} from '~/utils/breakdowns'
import { buildChainMatchSet, toDimensionsSlug } from '~/utils/chainNormalizer'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const BREAKDOWN_RESULT_TTL_MS = 10 * 60 * 1000
const BREAKDOWN_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=1200'

const CHAIN_NATIVE_BREAKDOWN_LABELS: Record<'chain-fees' | 'chain-revenue', string> = {
	'chain-fees': 'Chain Fees',
	'chain-revenue': 'Chain Revenue'
}
const CHAIN_NATIVE_BREAKDOWN_CONFIG: Record<'chain-fees' | 'chain-revenue', { dataType?: string }> = {
	'chain-fees': {},
	'chain-revenue': { dataType: 'dailyRevenue' }
}

async function getChainNativeByChainBreakdownData({
	metric,
	chains,
	topN,
	chainFilterMode,
	chainCategoryFilterMode,
	chainCategories
}: {
	metric: 'chain-fees' | 'chain-revenue'
	chains?: string[]
	topN: number
	chainFilterMode: 'include' | 'exclude'
	chainCategoryFilterMode: 'include' | 'exclude'
	chainCategories: string[]
}): Promise<ProtocolChainData> {
	try {
		const config = CHAIN_NATIVE_BREAKDOWN_CONFIG[metric]
		let overviewUrl = `${DIMENSIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true`
		if (config?.dataType) overviewUrl += `&dataType=${config.dataType}`

		const overview = await fetchJson<any>(overviewUrl)
		const includeSet = chains && chains.length > 0 ? buildChainMatchSet(chains) : new Set<string>()
		let allowSlugsFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowSlugsFromCategories = await resolveAllowedChainSlugsFromCategories(chainCategories)
		}

		const protocols: any[] = Array.isArray(overview?.protocols) ? overview.protocols : []
		const rankedEntries = protocols
			.filter((p) => (p?.protocolType || '').toLowerCase() === 'chain')
			.map((p) => {
				const slug = typeof p.slug === 'string' && p.slug.length > 0 ? p.slug : toDimensionsSlug(p.name || '')
				const total24h = Number(p.total24h) || 0
				return {
					name: displayChainName(slug),
					slug,
					total24h
				}
			})
			.filter((entry) => entry.total24h > 0)
			.filter((entry) => {
				if (!chains || chains.length === 0) return true
				const matches =
					includeSet.has(entry.slug) ||
					includeSet.has(entry.slug.toLowerCase()) ||
					includeSet.has(entry.name) ||
					includeSet.has(entry.name.toLowerCase())
				if (chainFilterMode === 'include') return matches
				return !matches
			})
			.filter((entry) => {
				if (!allowSlugsFromCategories || allowSlugsFromCategories.size === 0) return true
				if (chainCategoryFilterMode === 'include') return allowSlugsFromCategories.has(entry.slug)
				return !allowSlugsFromCategories.has(entry.slug)
			})
			.sort((a, b) => b.total24h - a.total24h)

		if (rankedEntries.length === 0) {
			return {
				series: [],
				metadata: {
					protocol: 'All Protocols',
					metric: CHAIN_NATIVE_BREAKDOWN_LABELS[metric],
					chains: [],
					totalChains: 0,
					topN: 0,
					othersCount: 0
				}
			}
		}

		const picked = rankedEntries.slice(0, Math.min(topN, rankedEntries.length))
		const chainSeriesPromises = picked.map(async (entry, idx) => {
			let summaryUrl = `${DIMENSIONS_SUMMARY_API}/fees/${entry.slug}`
			if (config?.dataType) summaryUrl += `?dataType=${config.dataType}`
			const json = await fetchJson<any>(summaryUrl).catch(() => null)
			if (!json) return null
			const chart: Array<[number | string, number]> = Array.isArray(json?.totalDataChart) ? json.totalDataChart : []
			const normalized = filterOutToday(normalizeDailyPairs(chart.map(([ts, value]) => [Number(ts), Number(value)])))
			return {
				name: entry.name,
				data: normalized,
				color: BREAKDOWN_COLOR_PALETTE[idx % BREAKDOWN_COLOR_PALETTE.length]
			} as ChartSeries
		})

		const seriesRaw = (await Promise.all(chainSeriesPromises)).filter(Boolean) as ChartSeries[]
		const totalChart: Array<[number | string, number]> = Array.isArray(overview?.totalDataChart)
			? overview.totalDataChart
			: []
		const totalNormalized = filterOutToday(
			normalizeDailyPairs(totalChart.map(([ts, value]) => [Number(ts), Number(value)]))
		)

		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(seriesRaw, totalNormalized)
		const includedTopCount = alignedTopSeries.length
		const othersCount = Math.max(0, seriesRaw.length - includedTopCount)
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTopSeries]
		if (hasOthers) {
			finalSeries.push({
				name: `Others (${othersCount} chains)`,
				data: othersData,
				color: '#999999'
			})
		}

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: CHAIN_NATIVE_BREAKDOWN_LABELS[metric],
				chains: alignedTopSeries.map((entry) => entry.name),
				totalChains: seriesRaw.length,
				topN: includedTopCount,
				othersCount
			}
		}
	} catch (error) {
		console.log(`Error building ${metric} by chain:`, error)
		return {
			series: [],
			metadata: {
				protocol: 'All Protocols',
				metric: CHAIN_NATIVE_BREAKDOWN_LABELS[metric],
				chains: [],
				totalChains: 0,
				topN: 0,
				othersCount: 0
			}
		}
	}
}

export const chainNativeByChainBreakdown = defineApiRoute({
	route: '/api/public/chains/breakdowns/by-chain/[metric]',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const metric = queryString(req.query, 'metric') ?? ''
		if (!CHAIN_NATIVE_BREAKDOWN_METRICS.has(metric)) {
			return badRequest(`Unsupported metric: ${metric}`)
		}

		const rawChains = queryList(req.query, 'chains')
		const chains = rawChains.includes('All') ? [] : rawChains
		const chainCategories = queryList(req.query, 'chainCategories')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const chainCategoryMode = queryFilterMode(req.query, 'chainCategoryFilterMode', 'filterMode')
		const topN = queryIntClamped(req.query, 'limit', 5, 1, 20)

		try {
			const cacheKey = JSON.stringify([metric, chains, topN, chainMode, chainCategoryMode, chainCategories])
			const result = await cachedResult(
				'chains-breakdown-chain-native',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getChainNativeByChainBreakdownData({
						metric: metric as 'chain-fees' | 'chain-revenue',
						chains,
						topN,
						chainFilterMode: chainMode,
						chainCategoryFilterMode: chainCategoryMode,
						chainCategories
					})
			)
			return ok(result)
		} catch (error) {
			recordRouteRuntimeError(error, 'apiRoute')
			return {
				status: 500,
				body: {
					error: 'Failed to fetch chain breakdown data',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			}
		}
	}
})
