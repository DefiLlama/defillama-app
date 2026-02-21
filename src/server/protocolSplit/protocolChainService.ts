import {
	DIMENSIONS_OVERVIEW_API,
	DIMENSIONS_SUMMARY_API,
	PROTOCOLS_API
} from '~/constants'
import { fetchChainChart, fetchChainsByCategory, fetchChainsTvlOverview } from '~/containers/Chains/api'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { fetchStablecoinChartAllApi, fetchStablecoinDominanceAllApi } from '~/containers/Stablecoins/api'
import {
	buildChainMatchSet as buildChainMatchSetFromNormalizer,
	toDimensionsSlug,
	toDisplayName
} from '~/utils/chainNormalizer'
import {
	alignSeries,
	filterOutToday,
	METRIC_CONFIG_BASE,
	normalizeDailyPairs,
	sumSeriesByTimestamp,
	toSlug
} from '~/utils/protocolSplit'
import { processAdjustedProtocolTvl, processAdjustedTvl } from '~/utils/tvl'
import type { ChartSeries, ProtocolChainData } from './types'

const METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	...METRIC_CONFIG_BASE
}

export const CHAIN_ONLY_METRICS = new Set(['stablecoins', 'chain-fees', 'chain-revenue'])

const CHAIN_ONLY_METRIC_LABELS: Record<string, string> = {
	stablecoins: 'Stablecoin Mcap',
	'chain-fees': 'Chain Fees',
	'chain-revenue': 'Chain Revenue'
}

const CHAIN_FEES_CONFIG: Record<'chain-fees' | 'chain-revenue', { dataType?: string }> = {
	'chain-fees': {},
	'chain-revenue': { dataType: 'dailyRevenue' }
}

type ProtocolCategoryLookup = {
	byName: Map<string, string>
	bySlug: Map<string, string>
}

const createEmptyCategoryLookup = (): ProtocolCategoryLookup => ({
	byName: new Map(),
	bySlug: new Map()
})

let protocolCategoryCache: { data: ProtocolCategoryLookup; timestamp: number } | null = null
const PROTOCOL_CATEGORY_CACHE_MS = 60 * 60 * 1000

const registerCategoryLookupEntry = (
	lookup: ProtocolCategoryLookup,
	identifier: string | undefined,
	category: string | undefined,
	options: { asSlug?: boolean } = {}
) => {
	if (!lookup || !identifier || !category) return
	const normalizedIdentifier = identifier.toLowerCase()
	const normalizedCategory = category.toLowerCase()
	if (options.asSlug) {
		lookup.bySlug.set(normalizedIdentifier, normalizedCategory)
	} else {
		lookup.byName.set(normalizedIdentifier, normalizedCategory)
	}
}

const extendLookupWithOverviewProtocols = (lookup: ProtocolCategoryLookup | null, overviewProtocols: any[]) => {
	if (!lookup || !Array.isArray(overviewProtocols)) return
	for (const proto of overviewProtocols) {
		const category = (proto?.category || '').toLowerCase()
		if (!category) continue
		registerCategoryLookupEntry(lookup, proto?.name, category)
		registerCategoryLookupEntry(lookup, proto?.displayName, category)
		registerCategoryLookupEntry(lookup, proto?.slug, category, { asSlug: true })
	}
}

const getCategoryFromLookup = (lookup: ProtocolCategoryLookup | null, name?: string): string => {
	if (!lookup || !name) return ''
	const normalizedName = name.toLowerCase()
	if (lookup.byName.has(normalizedName)) {
		return lookup.byName.get(normalizedName)!
	}
	const slug = toSlug(name)
	if (slug && lookup.bySlug.has(slug)) {
		return lookup.bySlug.get(slug)!
	}
	return ''
}

const sumNestedValues = (value: any): number => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : 0
	}
	if (Array.isArray(value)) {
		return value.reduce((acc: number, curr) => acc + sumNestedValues(curr), 0)
	}
	if (value && typeof value === 'object') {
		const nestedValues = Object.values(value as Record<string, any>)
		return nestedValues.reduce((acc: number, curr) => acc + sumNestedValues(curr), 0)
	}
	return 0
}

const getProtocolCategoryLookup = async (): Promise<ProtocolCategoryLookup | null> => {
	if (protocolCategoryCache && Date.now() - protocolCategoryCache.timestamp < PROTOCOL_CATEGORY_CACHE_MS) {
		return protocolCategoryCache.data
	}
	try {
		const response = await fetch(PROTOCOLS_API)
		if (!response.ok) {
			throw new Error(`Failed to fetch protocols for category lookup: ${response.status}`)
		}
		const json = await response.json()
		const lookup = createEmptyCategoryLookup()
		const protocols = Array.isArray(json?.protocols) ? json.protocols : []
		for (const proto of protocols) {
			const category = (proto?.category || '').toLowerCase()
			if (!category) continue
			registerCategoryLookupEntry(lookup, proto?.name, category)
			registerCategoryLookupEntry(lookup, proto?.slug, category, { asSlug: true })
		}
		protocolCategoryCache = { data: lookup, timestamp: Date.now() }
		return lookup
	} catch (error) {
		console.log('Failed to prepare protocol category lookup for chain builder filters:', error)
		return null
	}
}

const buildChainMatchSet = buildChainMatchSetFromNormalizer

const displayChainName = (slug: string): string => {
	const display = toDisplayName(slug)
	if (display !== slug) return display
	const lc = slug.toLowerCase()
	const norm = lc.replace(/_/g, '-')
	return norm
		.split('-')
		.map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
		.join(' ')
}

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

const buildAlignedTopAndOthers = (
	topSeries: ChartSeries[],
	totalSeries: [number, number][]
): { alignedTopSeries: ChartSeries[]; othersData: [number, number][]; allTimestamps: number[] } => {
	const timestampSet = new Set<number>()
	for (const s of topSeries) {
		for (const [t] of s.data) {
			timestampSet.add(t)
		}
	}
	for (const [t] of totalSeries) {
		timestampSet.add(t)
	}
	const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

	const alignedTopSeries = topSeries.map((s) => ({
		...s,
		data: alignSeries(allTimestamps, s.data)
	}))

	const alignedTotal = alignSeries(allTimestamps, totalSeries)
	const topSumPerTs = alignSeries(
		allTimestamps,
		Array.from(sumSeriesByTimestamp(alignedTopSeries.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
			number,
			number
		][]
	)

	const othersData: [number, number][] = allTimestamps.map((t, i) => {
		const total = alignedTotal[i]?.[1] || 0
		const topSum = topSumPerTs[i]?.[1] || 0
		const rest = Math.max(0, total - topSum)
		return [t, rest]
	})

	return { alignedTopSeries, othersData, allTimestamps }
}

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

		const excludeSet = new Set<string>((chains || []).map((c) => toDisplayName(c)))

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
				if (chainFilterMode === 'include') {
					if (!chains.includes(chainKey)) continue
				} else {
					if (excludeSet.has(chainKey)) continue
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
					color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length]
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

async function getDimensionsProtocolChainData(
	protocol: string,
	metric: string,
	chains?: string[],
	topN: number = 5,
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) {
		throw new Error(`Unsupported metric: ${metric}`)
	}

	try {
		let apiUrl = `${DIMENSIONS_SUMMARY_API}/${config.endpoint}/${protocol}`
		if (config.dataType) {
			apiUrl += `?dataType=${config.dataType}`
		}

		const response = await fetch(apiUrl)
		if (!response.ok) {
			throw new Error(`Failed to fetch ${metric} data: ${response.statusText}`)
		}

		const data = await response.json()

		const breakdown = data?.totalDataChartBreakdown || []
		if (!Array.isArray(breakdown) || breakdown.length === 0) {
			return {
				series: [],
				metadata: {
					protocol,
					metric: config.metricName,
					chains: [],
					totalChains: 0
				}
			}
		}

		const chainDataMap = new Map<string, [number, number][]>()

		const excludeSet = new Set<string>((chains || []).map((c) => c))
		let allowSlugsFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowSlugsFromCategories = await resolveAllowedChainSlugsFromCategories(chainCategories)
		}
		for (const item of breakdown) {
			const [timestamp, chainData] = item
			if (!chainData || typeof chainData !== 'object') continue

			for (const chain in chainData) {
				const versions = (chainData as Record<string, any>)[chain]
				if (chains && chains.length > 0) {
					if (chainFilterMode === 'include') {
						if (!chains.includes(chain)) continue
					} else {
						if (excludeSet.has(chain)) continue
					}
				}

				if (allowSlugsFromCategories && allowSlugsFromCategories.size > 0) {
					const chainSlug = toDimensionsSlug(chain)
					if (chainCategoryFilterMode === 'include') {
						if (!allowSlugsFromCategories.has(chainSlug)) continue
					} else {
						if (allowSlugsFromCategories.has(chainSlug)) continue
					}
				}

				if (typeof versions === 'object' && versions !== null) {
					let chainTotal = 0
					for (const value of Object.values(versions)) {
						if (typeof value === 'number') {
							chainTotal += value
						}
					}

					if (chainTotal > 0) {
						if (!chainDataMap.has(chain)) {
							chainDataMap.set(chain, [])
						}
						chainDataMap.get(chain)!.push([timestamp, chainTotal])
					}
				}
			}
		}

		const series: ChartSeries[] = []
		let colorIndex = 0

		for (const chain of chainDataMap.keys()) {
			const data = chainDataMap.get(chain)!
			const sortedData = data.toSorted((a, b) => a[0] - b[0])
			series.push({
				name: chain,
				data: filterOutToday(sortedData),
				color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length]
			})
			colorIndex++
		}

		const sortedSeries = series.toSorted((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const availableChains = sortedSeries.map((s) => s.name)

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
				protocol,
				metric: config.metricName,
				chains: availableChains,
				totalChains: availableChains.length,
				topN: Math.min(topN, sortedSeries.length),
				othersCount: Math.max(0, sortedSeries.length - Math.min(topN, sortedSeries.length))
			}
		}
	} catch (error) {
		console.log(`Error fetching ${metric} for protocol ${protocol}:`, error)
		return {
			series: [],
			metadata: {
				protocol,
				metric: config.metricName,
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

		const globalJson = await fetchChainChart<any>()
		const chainResponses = await Promise.all(
			pickedNames.map((name) =>
				fetchChainChart<any>(name)
					.then((data) => ({ name, data }))
					.catch(() => null)
			)
		)
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
				color: EXTENDED_COLOR_PALETTE[colorIndex++ % EXTENDED_COLOR_PALETTE.length]
			})
		}

		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(topSeriesRaw, totalSeries)

		const othersCount = Math.max(0, ranked.length - Math.min(topN, ranked.length))
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTopSeries]
		if (hasOthers) finalSeries.push({ name: `Others (${othersCount} chains)`, data: othersData, color: '#999999' })

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: 'TVL',
				chains: pickedNames,
				totalChains: ranked.length,
				topN: Math.min(topN, ranked.length),
				othersCount
			}
		}
	} catch (e) {
		console.log('Error building all-protocols TVL by chain:', e)
		return { series: [], metadata: { protocol: 'All Protocols', metric: 'TVL', chains: [], totalChains: 0 } }
	}
}

async function getAllProtocolsTopChainsStablecoinsData(
	topN: number = 5,
	chains?: string[],
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
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

			const displayName = displayChainName(toDimensionsSlug(chainName))

			candidates.push({
				name: displayName,
				data: normalized,
				lastValue
			})
		}

		if (candidates.length === 0) {
			return {
				series: [],
				metadata: {
					protocol: 'All Protocols',
					metric: CHAIN_ONLY_METRIC_LABELS['stablecoins'],
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
			color: EXTENDED_COLOR_PALETTE[idx % EXTENDED_COLOR_PALETTE.length]
		}))

		let totalPairs: [number, number][] = []
		try {
			const aggregatedJson = await fetchStablecoinChartAllApi()
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
		} catch (err) {
			console.log('Failed to fetch aggregated stablecoin series for chains builder:', err)
		}

		const { alignedTopSeries, othersData, allTimestamps } = buildAlignedTopAndOthers(pickedSeries, totalPairs)

		let finalSeries: ChartSeries[] = [...alignedTopSeries]
		const othersCount = Math.max(0, ranked.length - picked.length)

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
				metric: CHAIN_ONLY_METRIC_LABELS['stablecoins'],
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
				metric: CHAIN_ONLY_METRIC_LABELS['stablecoins'],
				chains: [],
				totalChains: 0,
				topN: 0,
				othersCount: 0
			}
		}
	}
}

async function getAllProtocolsTopChainsChainFeesData(
	metric: 'chain-fees' | 'chain-revenue',
	topN: number = 5,
	chains?: string[],
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const config = CHAIN_FEES_CONFIG[metric]
		let overviewUrl = `${DIMENSIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true`
		if (config?.dataType) overviewUrl += `&dataType=${config.dataType}`

		const overviewResp = await fetch(overviewUrl)
		if (!overviewResp.ok) throw new Error(`Overview fetch failed: ${overviewResp.status}`)
		const overview = await overviewResp.json()

		const includeSet = chains && chains.length > 0 ? buildChainMatchSet(chains) : new Set<string>()
		let allowSlugsFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			const slugs = await resolveAllowedChainSlugsFromCategories(chainCategories)
			allowSlugsFromCategories = slugs
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
					metric: CHAIN_ONLY_METRIC_LABELS[metric],
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
			const resp = await fetch(summaryUrl)
			if (!resp.ok) return null
			const json = await resp.json()
			const chart: Array<[number | string, number]> = Array.isArray(json?.totalDataChart) ? json.totalDataChart : []
			const normalized = filterOutToday(normalizeDailyPairs(chart.map(([ts, value]) => [Number(ts), Number(value)])))
			return {
				name: entry.name,
				data: normalized,
				color: EXTENDED_COLOR_PALETTE[idx % EXTENDED_COLOR_PALETTE.length]
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

		const othersCount = Math.max(0, rankedEntries.length - picked.length)
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
				metric: CHAIN_ONLY_METRIC_LABELS[metric],
				chains: picked.map((entry) => entry.name),
				totalChains: rankedEntries.length,
				topN: picked.length,
				othersCount
			}
		}
	} catch (error) {
		console.log(`Error building ${metric} by chain:`, error)
		return {
			series: [],
			metadata: {
				protocol: 'All Protocols',
				metric: CHAIN_ONLY_METRIC_LABELS[metric],
				chains: [],
				totalChains: 0,
				topN: 0,
				othersCount: 0
			}
		}
	}
}

async function getAllProtocolsTopChainsDimensionsData(
	metric: string,
	topN: number = 5,
	chains?: string[],
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	protocolCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[],
	protocolCategories?: string[]
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) throw new Error(`Unsupported metric: ${metric}`)

	try {
		let overviewUrl = `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
		if (config.dataType) overviewUrl += `&dataType=${config.dataType}`
		const overviewResp = await fetch(overviewUrl)
		if (!overviewResp.ok) throw new Error(`Overview fetch failed: ${overviewResp.status}`)
		const overview = await overviewResp.json()

		const protocolCategoryFilterSet = new Set<string>()
		for (const cat of protocolCategories || []) {
			const lower = cat?.toLowerCase()
			if (lower) protocolCategoryFilterSet.add(lower)
		}
		const hasProtocolCategoryFilter = protocolCategoryFilterSet.size > 0

		let protocolCategoryLookup: ProtocolCategoryLookup | null = null
		if (hasProtocolCategoryFilter) {
			protocolCategoryLookup = await getProtocolCategoryLookup()
		}

		const chainTotals = new Map<string, number>()
		const protocols: any[] = Array.isArray(overview?.protocols) ? overview.protocols : []
		const allChainsFromApi: string[] = Array.isArray(overview?.allChains) ? overview.allChains : []

		if (protocolCategoryLookup) {
			extendLookupWithOverviewProtocols(protocolCategoryLookup, protocols)
		}

		const resolveProtocolCategory = (protocolName: string, fallbackCategory?: string): string => {
			const fallback = (fallbackCategory || '').toLowerCase()
			if (fallback) return fallback
			return getCategoryFromLookup(protocolCategoryLookup, protocolName)
		}

		const shouldIncludeProtocol = (protocolName: string, fallbackCategory?: string): boolean => {
			if (!hasProtocolCategoryFilter) return true
			const category = resolveProtocolCategory(protocolName, fallbackCategory)
			if (!category) return protocolCategoryFilterMode === 'exclude'
			if (protocolCategoryFilterMode === 'include') {
				return protocolCategoryFilterSet.has(category)
			}
			return !protocolCategoryFilterSet.has(category)
		}

		const aggregateProtocolsForTimestamp = (protocolsMap: Record<string, any>): number => {
			if (!protocolsMap || typeof protocolsMap !== 'object') return 0
			let total = 0
			for (const protocolName in protocolsMap) {
				const value = protocolsMap[protocolName]
				if (!shouldIncludeProtocol(protocolName)) continue
				total += sumNestedValues(value)
			}
			return total
		}
		for (const p of protocols) {
			const protocolName = (p?.name || p?.displayName || p?.slug || '') as string
			if (!shouldIncludeProtocol(protocolName, p?.category)) continue

			const br24 = p?.breakdown24h
			if (!br24 || typeof br24 !== 'object') continue
			for (const chainSlug in br24) {
				const versions = br24[chainSlug]
				let sum = 0
				if (versions && typeof versions === 'object') {
					for (const v of Object.values(versions as Record<string, number>)) sum += Number(v) || 0
				} else if (typeof versions === 'number') {
					sum += Number(versions) || 0
				}
				chainTotals.set(chainSlug, (chainTotals.get(chainSlug) || 0) + sum)
			}
		}

		const filterSet = new Set<string>((chains || []).map((c) => toDimensionsSlug(c)))
		const filterSetOriginal = new Set<string>((chains || []).map((c) => c.toLowerCase()))
		let allowSlugsFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowSlugsFromCategories = await resolveAllowedChainSlugsFromCategories(chainCategories)
		}

		if (chains && chains.length > 0 && chainFilterMode === 'include') {
			for (const chainName of allChainsFromApi) {
				const slug = toDimensionsSlug(chainName)
				if ((filterSet.has(slug) || filterSetOriginal.has(chainName.toLowerCase())) && !chainTotals.has(slug)) {
					chainTotals.set(slug, 0)
				}
			}
		}

		let ranked = Array.from(chainTotals.entries())
			.filter(([slug, v]) => {
				if (chains && chains.length > 0) {
					if (chainFilterMode === 'include') {
						return filterSet.has(slug)
					}
					if (filterSet.has(slug)) return false
				}
				return v > 0
			})
			.filter(([slug]) => {
				if (!allowSlugsFromCategories || allowSlugsFromCategories.size === 0) return true
				const normalizedSlug = toDimensionsSlug(slug)
				const result =
					chainCategoryFilterMode === 'include'
						? allowSlugsFromCategories.has(normalizedSlug)
						: !allowSlugsFromCategories.has(normalizedSlug)

				return result
			})
			.sort((a, b) => b[1] - a[1])

		const picked = ranked.slice(0, Math.min(topN, ranked.length)).map(([slug]) => slug)

		const chainSeriesPromises = picked.map(async (slug, idx) => {
			const includeBreakdownParam = hasProtocolCategoryFilter ? 'false' : 'true'
			const endpointSlug = toDisplayName(slug)
			let url = `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}/${endpointSlug}?excludeTotalDataChartBreakdown=${includeBreakdownParam}`
			if (config.dataType) url += `&dataType=${config.dataType}`
			const r = await fetch(url)
			if (!r.ok) return null
			const j = await r.json()
			const tdc: Array<[number, number]> = Array.isArray(j?.totalDataChart) ? j.totalDataChart : []
			let normalized = filterOutToday(
				normalizeDailyPairs((tdc as Array<[number | string, number]>).map(([ts, v]) => [Number(ts), Number(v)]))
			)

			if (hasProtocolCategoryFilter) {
				const breakdownSeries = Array.isArray(j?.totalDataChartBreakdown) ? j.totalDataChartBreakdown : []
				if (breakdownSeries.length > 0) {
					const filteredPairs = breakdownSeries.map(([timestamp, protocols]) => [
						Number(timestamp),
						aggregateProtocolsForTimestamp(protocols)
					])
					normalized = filterOutToday(normalizeDailyPairs(filteredPairs))
				}
			}

			return {
				name: displayChainName(slug),
				data: normalized,
				color: EXTENDED_COLOR_PALETTE[idx % EXTENDED_COLOR_PALETTE.length]
			} as ChartSeries
		})

		const seriesRaw = (await Promise.all(chainSeriesPromises)).filter(Boolean) as ChartSeries[]

		const totalChart: Array<[number, number]> = Array.isArray(overview?.totalDataChart) ? overview.totalDataChart : []
		let totalNormalized = filterOutToday(
			normalizeDailyPairs((totalChart as Array<[number | string, number]>).map(([ts, v]) => [Number(ts), Number(v)]))
		)
		if (hasProtocolCategoryFilter) {
			const totalBreakdown = Array.isArray(overview?.totalDataChartBreakdown) ? overview.totalDataChartBreakdown : []
			if (totalBreakdown.length > 0) {
				const filteredTotal = totalBreakdown.map(([timestamp, protocols]) => [
					Number(timestamp),
					aggregateProtocolsForTimestamp(protocols)
				])
				totalNormalized = filterOutToday(normalizeDailyPairs(filteredTotal))
			}
		}

		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(seriesRaw, totalNormalized)

		const othersCount = Math.max(0, ranked.length - Math.min(topN, ranked.length))
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTopSeries]
		if (hasOthers) finalSeries.push({ name: `Others (${othersCount} chains)`, data: othersData, color: '#999999' })

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: config.metricName,
				chains: picked.map(displayChainName),
				totalChains: ranked.length,
				topN: Math.min(topN, ranked.length),
				othersCount
			}
		}
	} catch (e) {
		console.log(`Error building all-protocols ${metric} by chain:`, e)
		return {
			series: [],
			metadata: {
				protocol: 'All Protocols',
				metric: METRIC_CONFIG[metric]?.metricName || metric,
				chains: [],
				totalChains: 0
			}
		}
	}
}

type ProtocolChainSplitParams = {
	protocol?: string
	metric: string
	chains: string[]
	topN: number
	chainFilterMode: 'include' | 'exclude'
	chainCategoryFilterMode: 'include' | 'exclude'
	protocolCategoryFilterMode: 'include' | 'exclude'
	chainCategories: string[]
	protocolCategories: string[]
}

export const getProtocolChainSplitData = async ({
	protocol,
	metric,
	chains,
	topN,
	chainFilterMode,
	chainCategoryFilterMode,
	protocolCategoryFilterMode,
	chainCategories,
	protocolCategories
}: ProtocolChainSplitParams): Promise<ProtocolChainData> => {
	const metricStr = metric
	const protocolStr = typeof protocol === 'string' ? protocol : undefined
	const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

	if (CHAIN_ONLY_METRICS.has(metricStr)) {
		if (metricStr === 'stablecoins') {
			return getAllProtocolsTopChainsStablecoinsData(
				topN,
				chains,
				chainFilterMode,
				chainCategoryFilterMode,
				chainCategories
			)
		}
		return getAllProtocolsTopChainsChainFeesData(
			metricStr as 'chain-fees' | 'chain-revenue',
			topN,
			chains,
			chainFilterMode,
			chainCategoryFilterMode,
			chainCategories
		)
	}

	if (isProtocolAll) {
		if (metricStr === 'tvl') {
			return getAllProtocolsTopChainsTvlData(topN, chains, chainFilterMode, chainCategoryFilterMode, chainCategories)
		}
		return getAllProtocolsTopChainsDimensionsData(
			metricStr,
			topN,
			chains,
			chainFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			chainCategories,
			protocolCategories
		)
	}

	if (metricStr === 'tvl') {
		return getTvlProtocolChainData(protocolStr, chains, topN, chainFilterMode, chainCategoryFilterMode, chainCategories)
	}
	return getDimensionsProtocolChainData(
		protocolStr,
		metricStr,
		chains,
		topN,
		chainFilterMode,
		chainCategoryFilterMode,
		chainCategories
	)
}

async function resolveAllowedChainNamesFromCategories(categories: string[]): Promise<Set<string>> {
	if (!categories || categories.length === 0) return new Set()
	const responses = await Promise.allSettled(categories.map((cat) => fetchChainsByCategory(cat)))
	const out = new Set<string>()
	for (const res of responses) {
		if (res.status === 'fulfilled') {
			const arr: string[] = Array.isArray(res.value?.chainsUnique) ? res.value.chainsUnique : []
			for (const name of arr) out.add(name)
		}
	}
	return out
}

async function resolveAllowedChainSlugsFromCategories(categories: string[]): Promise<Set<string>> {
	const names = await resolveAllowedChainNamesFromCategories(categories)
	const slugs = new Set<string>()
	for (const name of names) {
		const slug = toDimensionsSlug(name)
		slugs.add(slug)
	}
	return slugs
}
