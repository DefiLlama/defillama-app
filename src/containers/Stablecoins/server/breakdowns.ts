import { fetchStablecoinChartAllApi, fetchStablecoinDominanceAllApi } from '~/containers/Stablecoins/api'
import { queryFilterMode, queryIntClamped, queryList, queryString } from '~/server/api/params'
import { badRequest, ok } from '~/server/api/respond'
import { cachedResult } from '~/server/api/resultCache'
import { defineApiRoute } from '~/server/api/types'
import { displayChainName, resolveAllowedChainNamesFromCategories } from '~/server/breakdowns'
import {
	BREAKDOWN_COLOR_PALETTE,
	buildAlignedTopAndOthers,
	filterOutToday,
	normalizeDailyPairs,
	type ChartSeries,
	type ProtocolChainData
} from '~/utils/breakdowns'
import { buildChainMatchSet, toDimensionsSlug, toDisplayName } from '~/utils/chainNormalizer'
import { recordRouteRuntimeError } from '~/utils/telemetry'

const BREAKDOWN_RESULT_TTL_MS = 10 * 60 * 1000
const BREAKDOWN_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=1200'

const sumStablecoinUsd = (value: any): number => {
	if (typeof value === 'number') return value || 0
	if (!value || typeof value !== 'object') return 0
	let total = 0
	for (const nested of Object.values(value)) {
		if (typeof nested === 'number') total += nested || 0
		else if (nested && typeof nested === 'object') total += sumStablecoinUsd(nested)
	}
	return total
}

async function getStablecoinByChainBreakdownData({
	chains,
	topN,
	chainFilterMode,
	chainCategoryFilterMode,
	chainCategories
}: {
	chains?: string[]
	topN: number
	chainFilterMode: 'include' | 'exclude'
	chainCategoryFilterMode: 'include' | 'exclude'
	chainCategories: string[]
}): Promise<ProtocolChainData> {
	try {
		const aggregatedJsonPromise = fetchStablecoinChartAllApi().catch((err) => {
			console.log('Failed to fetch aggregated stablecoin series for chains builder:', err)
			return null
		})
		const dominanceJson = await fetchStablecoinDominanceAllApi()
		const chainChartMap: Record<string, any[]> = dominanceJson?.chainChartMap ?? {}
		const includeSet = chains && chains.length > 0 ? buildChainMatchSet(chains) : new Set<string>()

		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			const namesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
			allowNamesFromCategories = buildChainMatchSet(Array.from(namesFromCategories))
		}

		const candidates: Array<{ name: string; data: [number, number][]; lastValue: number }> = []

		for (const chainName in chainChartMap) {
			const charts = chainChartMap[chainName]
			if (chainName.toLowerCase() === 'all') continue
			if (!Array.isArray(charts) || charts.length === 0) continue

			const matchValues = [
				chainName,
				chainName.toLowerCase(),
				toDisplayName(chainName),
				toDisplayName(chainName).toLowerCase(),
				toDimensionsSlug(chainName)
			]

			if (includeSet.size > 0) {
				const matches = matchValues.some((value) => includeSet.has(value))
				if (chainFilterMode === 'include') {
					if (!matches) continue
				} else if (matches) {
					continue
				}
			}

			if (allowNamesFromCategories && allowNamesFromCategories.size > 0) {
				const matches = matchValues.some((value) => allowNamesFromCategories!.has(value))
				if (chainCategoryFilterMode === 'include') {
					if (!matches) continue
				} else if (matches) {
					continue
				}
			}

			const pairs = charts
				.map((point: any) => {
					const rawTs = point?.date ?? point?.timestamp
					if (rawTs == null) return null
					let ts = Number(rawTs)
					if (!Number.isFinite(ts)) return null
					if (ts > 1e12) ts = Math.floor(ts / 1000)
					const usd = sumStablecoinUsd(point?.totalCirculatingUSD)
					if (!Number.isFinite(usd)) return null
					return [ts, usd] as [number, number]
				})
				.filter(Boolean) as [number, number][]

			if (pairs.length === 0) continue

			const normalized = filterOutToday(normalizeDailyPairs(pairs))
			if (normalized.length === 0) continue

			const lastValue = normalized[normalized.length - 1]?.[1] || 0
			if (lastValue <= 0) continue

			candidates.push({
				name: displayChainName(toDimensionsSlug(chainName)),
				data: normalized,
				lastValue
			})
		}

		if (candidates.length === 0) {
			return {
				series: [],
				metadata: {
					protocol: 'All Protocols',
					metric: 'Stablecoin Mcap',
					chains: [],
					totalChains: 0,
					topN: 0,
					othersCount: 0
				}
			}
		}

		const ranked = candidates.sort((a, b) => b.lastValue - a.lastValue)
		const picked = ranked.slice(0, Math.min(topN, ranked.length))
		const pickedSeries: ChartSeries[] = picked.map((entry, idx) => ({
			name: entry.name,
			data: entry.data,
			color: BREAKDOWN_COLOR_PALETTE[idx % BREAKDOWN_COLOR_PALETTE.length]
		}))

		let totalPairs: [number, number][] = []
		const aggregatedJson = await aggregatedJsonPromise
		if (aggregatedJson) {
			const aggregatedArray: any[] = Array.isArray(aggregatedJson?.aggregated) ? aggregatedJson.aggregated : []
			totalPairs = filterOutToday(
				normalizeDailyPairs(
					aggregatedArray
						.map((item: any) => {
							const rawTs = item?.date ?? item?.timestamp
							if (rawTs == null) return null
							let ts = Number(rawTs)
							if (!Number.isFinite(ts)) return null
							if (ts > 1e12) ts = Math.floor(ts / 1000)
							const usd = sumStablecoinUsd(item?.totalCirculatingUSD)
							if (!Number.isFinite(usd)) return null
							return [ts, usd] as [number, number]
						})
						.filter(Boolean) as [number, number][]
				)
			)
		}

		const { alignedTopSeries, othersData, allTimestamps } = buildAlignedTopAndOthers(pickedSeries, totalPairs)
		const othersCount = Math.max(0, ranked.length - picked.length)
		const finalSeries: ChartSeries[] = [...alignedTopSeries]

		if (totalPairs.length > 0 && allTimestamps.length > 0) {
			const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
			if (hasOthers) {
				finalSeries.push({
					name: `Others (${othersCount} chains)`,
					data: othersData,
					color: '#999999'
				})
			}
		}

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: 'Stablecoin Mcap',
				chains: picked.map((entry) => entry.name),
				totalChains: ranked.length,
				topN: picked.length,
				othersCount
			}
		}
	} catch (error) {
		console.log('Error building stablecoin mcap by chain:', error)
		return {
			series: [],
			metadata: {
				protocol: 'All Protocols',
				metric: 'Stablecoin Mcap',
				chains: [],
				totalChains: 0,
				topN: 0,
				othersCount: 0
			}
		}
	}
}

export const stablecoinByChainBreakdown = defineApiRoute({
	route: '/api/public/stablecoins/breakdowns/by-chain',
	cacheControl: BREAKDOWN_CACHE_CONTROL,
	handle: async (req) => {
		const protocol = queryString(req.query, 'protocol')
		if (protocol && protocol.toLowerCase() !== 'all') {
			return badRequest('stablecoins metric is only available when protocol=All')
		}

		const rawChains = queryList(req.query, 'chains')
		const chains = rawChains.includes('All') ? [] : rawChains
		const chainCategories = queryList(req.query, 'chainCategories')
		const chainMode = queryFilterMode(req.query, 'chainFilterMode', 'filterMode')
		const chainCategoryMode = queryFilterMode(req.query, 'chainCategoryFilterMode', 'filterMode')
		const topN = queryIntClamped(req.query, 'limit', 5, 1, 20)

		try {
			const cacheKey = JSON.stringify([
				'all',
				'stablecoins',
				chains,
				topN,
				chainMode,
				chainCategoryMode,
				chainCategories
			])
			const result = await cachedResult(
				'stablecoins-breakdown-chain',
				cacheKey,
				{ ttlMs: BREAKDOWN_RESULT_TTL_MS, ttlJitter: 0.2 },
				() =>
					getStablecoinByChainBreakdownData({
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
					error: 'Failed to fetch stablecoin chain data',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			}
		}
	}
})
