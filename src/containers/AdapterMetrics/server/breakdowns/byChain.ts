import { DIMENSIONS_OVERVIEW_API, DIMENSIONS_SUMMARY_API } from '~/constants'
import { fetchProtocols } from '~/containers/ProtocolLists/api'
import { fetchJson } from '~/utils/async'
import {
	BREAKDOWN_COLOR_PALETTE,
	buildAlignedTopAndOthers,
	displayChainName,
	filterOutToday,
	normalizeDailyPairs,
	resolveAllowedChainSlugsFromCategories,
	sumSeriesByTimestamp,
	toSlug,
	type ChartSeries,
	type ProtocolChainData
} from '~/utils/breakdowns'
import { toDimensionsSlug, toDisplayName } from '~/utils/chainNormalizer'
import { DIMENSIONS_METRIC_CONFIG } from './config'

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
		const json = await fetchProtocols()
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

async function getDimensionsProtocolChainData(
	protocol: string,
	metric: string,
	chains?: string[],
	topN: number = 5,
	chainFilterMode: 'include' | 'exclude' = 'include',
	chainCategoryFilterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	const config = DIMENSIONS_METRIC_CONFIG[metric]
	if (!config) {
		throw new Error(`Unsupported metric: ${metric}`)
	}

	try {
		let apiUrl = `${DIMENSIONS_SUMMARY_API}/${config.endpoint}/${protocol}`
		if (config.dataType) {
			apiUrl += `?dataType=${config.dataType}`
		}

		const data = await fetchJson<any>(apiUrl)

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
			const chainSeriesData = chainDataMap.get(chain)!
			const sortedData = chainSeriesData.toSorted((a, b) => a[0] - b[0])
			series.push({
				name: chain,
				data: filterOutToday(sortedData),
				color: BREAKDOWN_COLOR_PALETTE[colorIndex % BREAKDOWN_COLOR_PALETTE.length]
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
	const config = DIMENSIONS_METRIC_CONFIG[metric]
	if (!config) throw new Error(`Unsupported metric: ${metric}`)

	try {
		let overviewUrl = `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
		if (config.dataType) overviewUrl += `&dataType=${config.dataType}`
		const overview = await fetchJson<any>(overviewUrl)

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
			const j = await fetchJson<any>(url).catch(() => null)
			if (!j) return null
			const tdc: Array<[number, number]> = Array.isArray(j?.totalDataChart) ? j.totalDataChart : []
			let normalized = filterOutToday(
				normalizeDailyPairs((tdc as Array<[number | string, number]>).map(([ts, v]) => [Number(ts), Number(v)]))
			)

			if (hasProtocolCategoryFilter) {
				const breakdownSeries = Array.isArray(j?.totalDataChartBreakdown) ? j.totalDataChartBreakdown : []
				if (breakdownSeries.length > 0) {
					const filteredPairs = breakdownSeries.map(([timestamp, protocolsAtTimestamp]) => [
						Number(timestamp),
						aggregateProtocolsForTimestamp(protocolsAtTimestamp)
					])
					normalized = filterOutToday(normalizeDailyPairs(filteredPairs))
				}
			}

			return {
				name: displayChainName(slug),
				data: normalized,
				color: BREAKDOWN_COLOR_PALETTE[idx % BREAKDOWN_COLOR_PALETTE.length]
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
				const filteredTotal = totalBreakdown.map(([timestamp, protocolsAtTimestamp]) => [
					Number(timestamp),
					aggregateProtocolsForTimestamp(protocolsAtTimestamp)
				])
				totalNormalized = filterOutToday(normalizeDailyPairs(filteredTotal))
			}
		}

		const { alignedTopSeries, othersData } = buildAlignedTopAndOthers(seriesRaw, totalNormalized)

		const includedTopCount = alignedTopSeries.length
		const othersCount = Math.max(0, seriesRaw.length - includedTopCount)
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTopSeries]
		if (hasOthers) finalSeries.push({ name: `Others (${othersCount} chains)`, data: othersData, color: '#999999' })

		return {
			series: finalSeries,
			metadata: {
				protocol: 'All Protocols',
				metric: config.metricName,
				chains: alignedTopSeries.map((entry) => entry.name),
				totalChains: seriesRaw.length,
				topN: includedTopCount,
				othersCount
			}
		}
	} catch (e) {
		console.log(`Error building all-protocols ${metric} by chain:`, e)
		return {
			series: [],
			metadata: {
				protocol: 'All Protocols',
				metric: DIMENSIONS_METRIC_CONFIG[metric]?.metricName || metric,
				chains: [],
				totalChains: 0
			}
		}
	}
}

type AdapterMetricChainBreakdownParams = {
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

export const getAdapterMetricProtocolChainBreakdownData = async ({
	protocol,
	metric,
	chains,
	topN,
	chainFilterMode,
	chainCategoryFilterMode,
	protocolCategoryFilterMode,
	chainCategories,
	protocolCategories
}: AdapterMetricChainBreakdownParams): Promise<ProtocolChainData> => {
	const protocolStr = typeof protocol === 'string' ? protocol : undefined
	const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

	if (isProtocolAll) {
		return getAllProtocolsTopChainsDimensionsData(
			metric,
			topN,
			chains,
			chainFilterMode,
			chainCategoryFilterMode,
			protocolCategoryFilterMode,
			chainCategories,
			protocolCategories
		)
	}

	return getDimensionsProtocolChainData(
		protocolStr,
		metric,
		chains,
		topN,
		chainFilterMode,
		chainCategoryFilterMode,
		chainCategories
	)
}
