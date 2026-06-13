import { fetchChainChart, fetchChainsTvlOverview } from '~/containers/Chains/api'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { resolveAllowedChainNamesFromCategories } from '~/server/breakdowns'
import {
	BREAKDOWN_COLOR_PALETTE,
	buildAlignedTopAndOthers,
	filterOutToday,
	normalizeDailyPairs,
	sumSeriesByTimestamp,
	type ChartSeries,
	type ProtocolChainData
} from '~/utils/breakdowns'
import { buildChainMatchSet, toDisplayName } from '~/utils/chainNormalizer'
import { processAdjustedProtocolTvl, processAdjustedTvl } from '~/utils/tvl'

const keysToSkip = new Set(['staking', 'pool2', 'borrowed', 'doublecounted', 'liquidstaking', 'vesting'])

async function getTvlProtocolChainData(
	protocol: string,
	chains?: string[],
	topN: number = 5,
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const data = await fetchProtocolBySlug<{ name?: string; chainTvls?: Record<string, unknown> }>(protocol)
		const chainTvls = data?.chainTvls || {}

		const series: ChartSeries[] = []
		const availableChains: string[] = []
		let colorIndex = 0

		const chainMatchSet = chains && chains.length > 0 ? buildChainMatchSet(chains) : new Set<string>()

		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowNamesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
		}
		for (const chainKey in chainTvls) {
			if (
				keysToSkip.has(chainKey) ||
				chainKey
					.split('-')
					.slice(1)
					.some((seg) => keysToSkip.has(seg))
			) {
				continue
			}

			if (chains && chains.length > 0) {
				const matches = chainMatchSet.has(chainKey) || chainMatchSet.has(chainKey.toLowerCase())
				if (chainFilterMode === 'include') {
					if (!matches) continue
				} else {
					if (matches) continue
				}
			}

			if (allowNamesFromCategories && allowNamesFromCategories.size > 0) {
				if (chainCategoryFilterMode === 'include') {
					if (!allowNamesFromCategories.has(chainKey)) continue
				} else {
					if (allowNamesFromCategories.has(chainKey)) continue
				}
			}

			const adjustedForChain = processAdjustedProtocolTvl(chainTvls as any, {
				filterMode: 'include',
				includeChains: [chainKey]
			})
			if (adjustedForChain.length > 0) {
				series.push({
					name: chainKey,
					data: adjustedForChain,
					color: BREAKDOWN_COLOR_PALETTE[colorIndex % BREAKDOWN_COLOR_PALETTE.length]
				})
				availableChains.push(chainKey)
				colorIndex++
			}
		}

		const sortedSeries = series.toSorted((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const topSeries = sortedSeries.slice(0, Math.min(topN, sortedSeries.length))
		const othersSeries = sortedSeries.slice(Math.min(topN, sortedSeries.length))

		const totalSeries = Array.from(sumSeriesByTimestamp(sortedSeries.map((s) => s.data)).entries()).sort(
			(a, b) => a[0] - b[0]
		) as [number, number][]
		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(topSeries, totalSeries)

		const hasOthers = othersSeries.length > 0 && othersData.some(([, v]) => v > 0)

		const finalSeries: ChartSeries[] = [...alignedTopSeries]
		if (hasOthers) {
			finalSeries.push({
				name: `Others (${othersSeries.length} chains)`,
				data: othersData,
				color: '#999999'
			})
		}

		return {
			series: finalSeries,
			metadata: {
				protocol: data.name || protocol,
				metric: 'TVL',
				chains: availableChains,
				totalChains: availableChains.length,
				topN: Math.min(topN, sortedSeries.length),
				othersCount: Math.max(0, sortedSeries.length - Math.min(topN, sortedSeries.length))
			}
		}
	} catch (error) {
		console.log(`Error fetching TVL for protocol ${protocol}:`, error)
		return {
			series: [],
			metadata: {
				protocol,
				metric: 'TVL',
				chains: [],
				totalChains: 0
			}
		}
	}
}

async function getAllProtocolsTopChainsTvlData(
	topN: number = 5,
	chains?: string[],
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const allChains = await fetchChainsTvlOverview()
		const includeSet = new Set<string>((chains || []).map((c) => toDisplayName(c)))
		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowNamesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
		}

		let ranked = allChains
			.filter((c) => typeof c.tvl === 'number' && c.tvl > 0 && c.name)
			.filter((c) => {
				if (!chains || chains.length === 0) return true
				if (chainFilterMode === 'include') return includeSet.has(toDisplayName(c.name))
				return !includeSet.has(toDisplayName(c.name))
			})
			.filter((c) => {
				if (!allowNamesFromCategories || allowNamesFromCategories.size === 0) return true
				if (chainCategoryFilterMode === 'include') return allowNamesFromCategories.has(c.name)
				return !allowNamesFromCategories.has(c.name)
			})
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const picked = ranked.slice(0, Math.min(topN, ranked.length))
		const pickedNames = picked.map((c) => c.name)

		const [globalJson, ...chainResponses] = await Promise.all([
			fetchChainChart<any>(),
			...pickedNames.map((name) =>
				fetchChainChart<any>(name)
					.then((data) => ({ name, data }))
					.catch(() => null)
			)
		])
		const adjustedGlobalTvl = processAdjustedTvl(globalJson)
		const totalSeries = filterOutToday(normalizeDailyPairs(adjustedGlobalTvl.map(([ts, v]) => [Number(ts), Number(v)])))

		const topSeriesRaw: ChartSeries[] = []
		let colorIndex = 0
		for (const chainResponse of chainResponses) {
			if (!chainResponse) continue
			const { name, data: j } = chainResponse
			const adjustedTvl = processAdjustedTvl(j)
			const normalized = filterOutToday(normalizeDailyPairs(adjustedTvl.map(([ts, v]) => [Number(ts), Number(v)])))
			topSeriesRaw.push({
				name,
				data: normalized,
				color: BREAKDOWN_COLOR_PALETTE[colorIndex++ % BREAKDOWN_COLOR_PALETTE.length]
			})
		}

		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(topSeriesRaw, totalSeries)

		const includedTopCount = topSeriesRaw.length
		const includedTopNames = topSeriesRaw.map((series) => series.name)
		const othersCount = Math.max(0, ranked.length - includedTopCount)
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTopSeries]
		if (hasOthers) finalSeries.push({ name: `Others (${othersCount} chains)`, data: othersData, color: '#999999' })

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: 'TVL',
				chains: includedTopNames,
				totalChains: ranked.length,
				topN: includedTopCount,
				othersCount
			}
		}
	} catch (e) {
		console.log('Error building all-protocols TVL by chain:', e)
		return { series: [], metadata: { protocol: 'All Protocols', metric: 'TVL', chains: [], totalChains: 0 } }
	}
}

type ProtocolChainBreakdownParams = {
	protocol?: string
	metric: string
	chains: string[]
	topN: number
	chainFilterMode: 'include' | 'exclude'
	chainCategoryFilterMode: 'include' | 'exclude'
	chainCategories: string[]
}

export const getProtocolChainBreakdownData = async ({
	protocol,
	metric,
	chains,
	topN,
	chainFilterMode,
	chainCategoryFilterMode,
	chainCategories
}: ProtocolChainBreakdownParams): Promise<ProtocolChainData> => {
	const protocolStr = typeof protocol === 'string' ? protocol : undefined
	const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

	if (metric !== 'tvl') {
		throw new Error('Unsupported ProtocolOverview by-chain metric: ' + metric)
	}

	if (isProtocolAll) {
		return getAllProtocolsTopChainsTvlData(topN, chains, chainFilterMode, chainCategoryFilterMode, chainCategories)
	}

	return getTvlProtocolChainData(protocolStr, chains, topN, chainFilterMode, chainCategoryFilterMode, chainCategories)
}
