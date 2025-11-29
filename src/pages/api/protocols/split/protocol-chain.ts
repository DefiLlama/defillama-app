import { NextApiRequest, NextApiResponse } from 'next'
import {
	CHAIN_TVL_API,
	CHAINS_API_V2,
	CHART_API,
	DIMENISIONS_OVERVIEW_API,
	DIMENISIONS_SUMMARY_BASE_API,
	PEGGEDCHART_API,
	PEGGEDCHART_DOMINANCE_ALL_API,
	PROTOCOL_API,
	PROTOCOLS_API
} from '~/constants'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { processAdjustedProtocolTvl, processAdjustedTvl } from '~/utils/tvl'

interface ChartSeries {
	name: string
	data: [number, number][]
	color?: string
}

interface ProtocolChainData {
	series: ChartSeries[]
	metadata: {
		protocol: string
		metric: string
		chains: string[]
		totalChains: number
		topN?: number
		othersCount?: number
	}
}

const METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	tvl: { endpoint: 'tvl', metricName: 'TVL' },
	fees: { endpoint: 'fees', metricName: 'fees' },
	revenue: { endpoint: 'fees', dataType: 'dailyRevenue', metricName: 'revenue' },
	volume: { endpoint: 'dexs', metricName: 'volume' },
	perps: { endpoint: 'derivatives', metricName: 'perps volume' },
	'options-notional': { endpoint: 'options', dataType: 'dailyNotionalVolume', metricName: 'options notional' },
	'options-premium': { endpoint: 'options', dataType: 'dailyPremiumVolume', metricName: 'options premium' },
	'bridge-aggregators': { endpoint: 'bridge-aggregators', metricName: 'bridge volume' },
	'dex-aggregators': { endpoint: 'aggregators', metricName: 'DEX aggregator volume' },
	'perps-aggregators': { endpoint: 'aggregator-derivatives', metricName: 'perps aggregator volume' },
	'user-fees': { endpoint: 'fees', dataType: 'dailyUserFees', metricName: 'user fees' },
	'holders-revenue': { endpoint: 'fees', dataType: 'dailyHoldersRevenue', metricName: 'holders revenue' },
	'protocol-revenue': { endpoint: 'fees', dataType: 'dailyProtocolRevenue', metricName: 'protocol revenue' },
	'supply-side-revenue': { endpoint: 'fees', dataType: 'dailySupplySideRevenue', metricName: 'supply side revenue' }
}

const CHAIN_ONLY_METRICS = new Set(['stablecoins', 'chain-fees', 'chain-revenue'])

const CHAIN_ONLY_METRIC_LABELS: Record<string, string> = {
	stablecoins: 'Stablecoin Mcap',
	'chain-fees': 'Chain Fees',
	'chain-revenue': 'Chain Revenue'
}

const CHAIN_FEES_CONFIG: Record<'chain-fees' | 'chain-revenue', { dataType?: string }> = {
	'chain-fees': {},
	'chain-revenue': { dataType: 'dailyRevenue' }
}

const toSlug = (name: string = '') => name?.toLowerCase().split(' ').join('-').split("'").join('')

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

const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

const normalizeChainKey = (chain: string): string => {
	const lc = chain.toLowerCase()
	if (lc === 'optimism' || lc === 'op mainnet' || lc === 'op-mainnet') return 'OP Mainnet'
	return chain
}

const toDimensionsChainSlug = (chain: string): string => {
	if (!chain) return chain
	const lc = chain.toLowerCase()
	if (lc === 'optimism' || lc === 'op mainnet' || lc === 'op-mainnet') return 'optimism'
	if (lc === 'bsc' || lc === 'binance smart chain') return 'bsc'
	if (lc === 'avax' || lc === 'avalanche') return 'avax'
	if (lc === 'gnosis' || lc === 'xdai') return 'xdai'
	if (lc === 'hyperliquid' || lc === 'hyperliquid l1' || lc === 'hyperliquid_l1' || lc === 'hyperliquid-l1')
		return 'hyperliquid'
	if (lc === 'zksync era' || lc === 'zksync-era' || lc === 'zksync_era' || lc === 'zksync') return 'zksync'
	if (lc === 'polygon zkevm' || lc === 'polygon-zkevm' || lc === 'polygon_zkevm') return 'polygon_zkevm'
	if (lc === 'immutable zkevm' || lc === 'immutable-zkevm' || lc === 'immutable_zkevm' || lc === 'imx') return 'imx'
	if (lc === 'cronos zkevm' || lc === 'cronos-zkevm' || lc === 'cronos_zkevm') return 'cronos_zkevm'
	if (lc === 'arbitrum nova' || lc === 'arbitrum-nova' || lc === 'arbitrum_nova') return 'arbitrum_nova'
	return lc.replace(/\s+/g, '_')
}

const toOverviewApiSlug = (breakdownSlug: string): string => {
	if (!breakdownSlug) return breakdownSlug
	const lc = breakdownSlug.toLowerCase()
	if (lc === 'zksync') return 'zksync-era'
	if (lc === 'imx') return 'immutable-zkevm'
	return lc.replace(/_/g, '-')
}

const displayChainName = (slug: string): string => {
	const lc = slug.toLowerCase()
	if (lc === 'op-mainnet' || lc === 'optimism') return 'OP Mainnet'
	if (lc === 'avax') return 'Avalanche'
	if (lc === 'bsc') return 'BSC'
	if (lc === 'xdai') return 'Gnosis'
	if (lc === 'zksync') return 'zkSync Era'
	if (lc === 'polygon_zkevm') return 'Polygon zkEVM'
	if (lc === 'imx') return 'Immutable zkEVM'
	if (lc === 'cronos_zkevm') return 'Cronos zkEVM'
	if (lc === 'arbitrum_nova') return 'Arbitrum Nova'
	const norm = lc.replace(/_/g, '-')
	return norm
		.split('-')
		.map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
		.join(' ')
}

const buildChainMatchSet = (values: string[]): Set<string> => {
	const set = new Set<string>()
	for (const value of values) {
		if (!value) continue
		set.add(value)
		set.add(value.toLowerCase())
		const normalized = normalizeChainKey(value)
		set.add(normalized)
		set.add(normalized.toLowerCase())
		const slug = toDimensionsChainSlug(value)
		if (slug) {
			set.add(slug)
			set.add(slug.toLowerCase())
		}
	}
	return set
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

const normalizeDailyPairs = (pairs: [number, number][]): [number, number][] => {
	const daily = new Map<number, number>()
	for (const [ts, v] of pairs) {
		const day = toUtcDay(Number(ts))
		daily.set(day, (daily.get(day) || 0) + (v || 0))
	}
	return Array.from(daily.entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
}

const startOfTodayUtc = (): number => {
	const now = new Date()
	return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000)
}

const filterOutToday = (pairs: [number, number][]): [number, number][] => {
	const today = startOfTodayUtc()
	return pairs.filter(([ts]) => ts < today)
}

const sumSeriesByTimestamp = (seriesList: [number, number][][]): Map<number, number> => {
	const acc = new Map<number, number>()
	for (const series of seriesList) {
		for (const [ts, val] of series) {
			acc.set(ts, (acc.get(ts) || 0) + (val || 0))
		}
	}
	return acc
}

const alignSeries = (timestamps: number[], series: [number, number][]): [number, number][] => {
	const map = new Map(series.map(([t, v]) => [t, v]))
	return timestamps.map((t) => [t, map.get(t) || 0])
}

export const keysToSkip = ['staking', 'pool2', 'borrowed', 'doublecounted', 'liquidstaking', 'vesting']

async function getTvlProtocolChainData(
	protocol: string,
	chains?: string[],
	topN: number = 5,
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const response = await fetch(`${PROTOCOL_API}/${protocol}`)
		if (!response.ok) {
			throw new Error(`Failed to fetch TVL data: ${response.statusText}`)
		}

		const data = await response.json()
		const chainTvls = data?.chainTvls || {}

		const series: ChartSeries[] = []
		const availableChains: string[] = []
		let colorIndex = 0

		const excludeSet = new Set<string>((chains || []).map((c) => normalizeChainKey(c)))

		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowNamesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
		}
		for (const [chainKey, chainData] of Object.entries(chainTvls)) {
			if (keysToSkip.some((key) => chainKey.includes(`-${key}`) || chainKey === key)) {
				continue
			}

			if (chains && chains.length > 0) {
				if (filterMode === 'include') {
					if (!chains.includes(chainKey)) continue
				} else {
					if (excludeSet.has(chainKey)) continue
				}
			}

			if (allowNamesFromCategories && allowNamesFromCategories.size > 0) {
				if (filterMode === 'include') {
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

		series.sort((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const topSeries = series.slice(0, Math.min(topN, series.length))
		const othersSeries = series.slice(Math.min(topN, series.length))

		const timestampSet = new Set<number>()
		series.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
		const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const alignedTopSeries = topSeries.map((s) => ({
			...s,
			data: alignSeries(allTimestamps, s.data)
		}))
		const alignedTotal = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(series.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
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
				topN: Math.min(topN, series.length),
				othersCount: Math.max(0, series.length - Math.min(topN, series.length))
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
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) {
		throw new Error(`Unsupported metric: ${metric}`)
	}

	try {
		let apiUrl = `${DIMENISIONS_SUMMARY_BASE_API}/${config.endpoint}/${protocol}`
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
		breakdown.forEach((item: any) => {
			const [timestamp, chainData] = item
			if (!chainData || typeof chainData !== 'object') return

			Object.entries(chainData).forEach(([chain, versions]: [string, any]) => {
				if (chains && chains.length > 0) {
					if (filterMode === 'include') {
						if (!chains.includes(chain)) return
					} else {
						if (excludeSet.has(chain)) return
					}
				}

				if (allowSlugsFromCategories && allowSlugsFromCategories.size > 0) {
					if (filterMode === 'include') {
						if (!allowSlugsFromCategories.has(chain)) return
					} else {
						if (allowSlugsFromCategories.has(chain)) return
					}
				}

				if (typeof versions === 'object' && versions !== null) {
					let chainTotal = 0
					Object.values(versions).forEach((value: any) => {
						if (typeof value === 'number') {
							chainTotal += value
						}
					})

					if (chainTotal > 0) {
						if (!chainDataMap.has(chain)) {
							chainDataMap.set(chain, [])
						}
						chainDataMap.get(chain)!.push([timestamp, chainTotal])
					}
				}
			})
		})

		const series: ChartSeries[] = []
		let colorIndex = 0

		Array.from(chainDataMap.entries()).forEach(([chain, data]) => {
			const sortedData = data.sort((a, b) => a[0] - b[0])
			series.push({
				name: chain,
				data: filterOutToday(sortedData),
				color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length]
			})
			colorIndex++
		})

		series.sort((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const availableChains = series.map((s) => s.name)

		const topSeries = series.slice(0, Math.min(topN, series.length))
		const othersSeries = series.slice(Math.min(topN, series.length))

		const timestampSet = new Set<number>()
		series.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
		const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const alignedTopSeries = topSeries.map((s) => ({
			...s,
			data: alignSeries(allTimestamps, s.data)
		}))
		const alignedTotal = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(series.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
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
				topN: Math.min(topN, series.length),
				othersCount: Math.max(0, series.length - Math.min(topN, series.length))
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
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const resp = await fetch(CHAIN_TVL_API)
		const allChains = (await resp.json()) as Array<{ name: string; tvl: number }>
		const includeSet = new Set<string>((chains || []).map((c) => normalizeChainKey(c)))
		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowNamesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
		}

		let ranked = allChains
			.filter((c) => typeof c.tvl === 'number' && c.tvl > 0 && c.name)
			.filter((c) => {
				if (!chains || chains.length === 0) return true
				if (filterMode === 'include') return includeSet.has(normalizeChainKey(c.name))
				return !includeSet.has(normalizeChainKey(c.name))
			})
			.filter((c) => {
				if (!allowNamesFromCategories || allowNamesFromCategories.size === 0) return true
				if (filterMode === 'include') return allowNamesFromCategories.has(c.name)
				return !allowNamesFromCategories.has(c.name)
			})
			.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))

		const picked = ranked.slice(0, Math.min(topN, ranked.length))
		const pickedNames = picked.map((c) => c.name)

		const [globalResp, ...chainResponses] = await Promise.all([
			fetch(CHART_API),
			...pickedNames.map((name) => fetch(`${CHART_API}/${encodeURIComponent(name)}`))
		])

		const globalJson = await globalResp.json()
		const adjustedGlobalTvl = processAdjustedTvl(globalJson)
		const totalSeries = filterOutToday(normalizeDailyPairs(adjustedGlobalTvl.map(([ts, v]) => [Number(ts), Number(v)])))

		const topSeriesRaw: ChartSeries[] = []
		let colorIndex = 0
		for (let i = 0; i < chainResponses.length; i++) {
			const r = chainResponses[i]
			if (!r.ok) continue
			const j = await r.json()
			const adjustedTvl = processAdjustedTvl(j)
			const normalized = filterOutToday(normalizeDailyPairs(adjustedTvl.map(([ts, v]) => [Number(ts), Number(v)])))
			topSeriesRaw.push({
				name: pickedNames[i],
				data: normalized,
				color: EXTENDED_COLOR_PALETTE[colorIndex++ % EXTENDED_COLOR_PALETTE.length]
			})
		}

		const tsSet = new Set<number>()
		topSeriesRaw.forEach((s) => s.data.forEach(([t]) => tsSet.add(t)))
		totalSeries.forEach(([t]) => tsSet.add(t))
		const allTs = Array.from(tsSet).sort((a, b) => a - b)

		const alignedTop = topSeriesRaw.map((s) => ({ ...s, data: alignSeries(allTs, s.data) }))
		const alignedTotal = alignSeries(allTs, totalSeries)
		const topSumPerTs = alignSeries(
			allTs,
			Array.from(sumSeriesByTimestamp(alignedTop.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)

		const othersData: [number, number][] = allTs.map((t, i) => {
			const total = alignedTotal[i]?.[1] || 0
			const top = topSumPerTs[i]?.[1] || 0
			return [t, Math.max(0, total - top)]
		})

		const othersCount = Math.max(0, ranked.length - Math.min(topN, ranked.length))
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTop]
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
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const dominanceResp = await fetch(PEGGEDCHART_DOMINANCE_ALL_API)
		if (!dominanceResp.ok) {
			throw new Error(`Failed to fetch stablecoin dominance data: ${dominanceResp.statusText}`)
		}

		const dominanceJson = await dominanceResp.json()
		const chainChartMap: Record<string, any[]> = dominanceJson?.chainChartMap ?? {}

		const includeSet = chains && chains.length > 0 ? buildChainMatchSet(chains) : new Set<string>()

		let allowNamesFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			const namesFromCategories = await resolveAllowedChainNamesFromCategories(chainCategories)
			allowNamesFromCategories = buildChainMatchSet(Array.from(namesFromCategories))
		}

		const candidates: Array<{ name: string; data: [number, number][]; lastValue: number }> = []

		for (const [chainName, charts] of Object.entries(chainChartMap)) {
			if (chainName.toLowerCase() === 'all') continue
			if (!Array.isArray(charts) || charts.length === 0) continue

			const matchValues = [
				chainName,
				chainName.toLowerCase(),
				normalizeChainKey(chainName),
				normalizeChainKey(chainName).toLowerCase(),
				toDimensionsChainSlug(chainName)
			]

			if (includeSet.size > 0) {
				const matches = matchValues.some((value) => includeSet.has(value))
				if (filterMode === 'include') {
					if (!matches) continue
				} else if (matches) {
					continue
				}
			}

			if (allowNamesFromCategories && allowNamesFromCategories.size > 0) {
				const matches = matchValues.some((value) => allowNamesFromCategories!.has(value))
				if (filterMode === 'include') {
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

			const displayName = displayChainName(toDimensionsChainSlug(chainName))

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
			const aggregatedResp = await fetch(`${PEGGEDCHART_API}/all`)
			if (aggregatedResp.ok) {
				const aggregatedJson = await aggregatedResp.json()
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
		} catch (err) {
			console.log('Failed to fetch aggregated stablecoin series for chains builder:', err)
		}

		const timestampSet = new Set<number>()
		pickedSeries.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
		totalPairs.forEach(([t]) => timestampSet.add(t))
		const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const alignedTop = pickedSeries.map((s) => ({ ...s, data: alignSeries(allTimestamps, s.data) }))

		let finalSeries: ChartSeries[] = [...alignedTop]
		const othersCount = Math.max(0, ranked.length - picked.length)

		if (totalPairs.length > 0 && allTimestamps.length > 0) {
			const alignedTotal = alignSeries(allTimestamps, totalPairs)
			const topSumPerTs = alignSeries(
				allTimestamps,
				Array.from(sumSeriesByTimestamp(alignedTop.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
					number,
					number
				][]
			)
			const othersData: [number, number][] = allTimestamps.map((t, idx) => {
				const total = alignedTotal[idx]?.[1] || 0
				const top = topSumPerTs[idx]?.[1] || 0
				return [t, Math.max(0, total - top)]
			})
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
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	try {
		const config = CHAIN_FEES_CONFIG[metric]
		let overviewUrl = `${DIMENISIONS_OVERVIEW_API}/fees?excludeTotalDataChartBreakdown=true`
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
				const slug = typeof p.slug === 'string' && p.slug.length > 0 ? p.slug : toDimensionsChainSlug(p.name || '')
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
				if (filterMode === 'include') return matches
				return !matches
			})
			.filter((entry) => {
				if (!allowSlugsFromCategories || allowSlugsFromCategories.size === 0) return true
				if (filterMode === 'include') return allowSlugsFromCategories.has(entry.slug)
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
			let summaryUrl = `${DIMENISIONS_SUMMARY_BASE_API}/fees/${entry.slug}`
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

		const tsSet = new Set<number>()
		seriesRaw.forEach((s) => s.data.forEach(([t]) => tsSet.add(t)))
		totalNormalized.forEach(([t]) => tsSet.add(t))
		const allTs = Array.from(tsSet).sort((a, b) => a - b)

		const alignedTop = seriesRaw.map((s) => ({ ...s, data: alignSeries(allTs, s.data) }))
		const topSumPerTs = alignSeries(
			allTs,
			Array.from(sumSeriesByTimestamp(alignedTop.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
		const totalAligned = alignSeries(allTs, totalNormalized)
		const othersData: [number, number][] = allTs.map((t, idx) => {
			const total = totalAligned[idx]?.[1] || 0
			const top = topSumPerTs[idx]?.[1] || 0
			return [t, Math.max(0, total - top)]
		})

		const othersCount = Math.max(0, rankedEntries.length - picked.length)
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTop]
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
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[],
	protocolCategories?: string[]
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) throw new Error(`Unsupported metric: ${metric}`)

	try {
		let overviewUrl = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
		if (config.dataType) overviewUrl += `&dataType=${config.dataType}`
		const overviewResp = await fetch(overviewUrl)
		if (!overviewResp.ok) throw new Error(`Overview fetch failed: ${overviewResp.status}`)
		const overview = await overviewResp.json()

		const normalizedProtocolCategories = (protocolCategories || []).map((cat) => cat.toLowerCase()).filter(Boolean)
		const protocolCategoryFilterSet = new Set(normalizedProtocolCategories)
		const hasProtocolCategoryFilter = protocolCategoryFilterSet.size > 0

		let protocolCategoryLookup: ProtocolCategoryLookup | null = null
		if (hasProtocolCategoryFilter) {
			protocolCategoryLookup = await getProtocolCategoryLookup()
		}

		const chainTotals = new Map<string, number>()
		const protocols: any[] = Array.isArray(overview?.protocols) ? overview.protocols : []

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
			if (!category) return filterMode === 'exclude'
			if (filterMode === 'include') {
				return protocolCategoryFilterSet.has(category)
			}
			return !protocolCategoryFilterSet.has(category)
		}

		const aggregateProtocolsForTimestamp = (protocolsMap: Record<string, any>): number => {
			if (!protocolsMap || typeof protocolsMap !== 'object') return 0
			let total = 0
			for (const [protocolName, value] of Object.entries(protocolsMap)) {
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
			for (const [chainSlug, versions] of Object.entries(br24)) {
				let sum = 0
				if (versions && typeof versions === 'object') {
					for (const v of Object.values(versions as Record<string, number>)) sum += Number(v) || 0
				} else if (typeof versions === 'number') {
					sum += Number(versions) || 0
				}
				chainTotals.set(chainSlug, (chainTotals.get(chainSlug) || 0) + sum)
			}
		}

		const filterSet = new Set<string>((chains || []).map((c) => toDimensionsChainSlug(c)))
		let allowSlugsFromCategories: Set<string> | null = null
		if (chainCategories && chainCategories.length > 0) {
			allowSlugsFromCategories = await resolveAllowedChainSlugsFromCategories(chainCategories)
		}
		let ranked = Array.from(chainTotals.entries())
			.filter(([slug, v]) => v > 0)
			.filter(([slug]) => {
				if (!chains || chains.length === 0) return true
				if (filterMode === 'include') return filterSet.has(slug)
				return !filterSet.has(slug)
			})
			.filter(([slug]) => {
				if (!allowSlugsFromCategories || allowSlugsFromCategories.size === 0) return true
				if (filterMode === 'include') return allowSlugsFromCategories.has(slug)
				return !allowSlugsFromCategories.has(slug)
			})
			.sort((a, b) => b[1] - a[1])

		const picked = ranked.slice(0, Math.min(topN, ranked.length)).map(([slug]) => slug)

		const chainSeriesPromises = picked.map(async (slug, idx) => {
			const includeBreakdownParam = hasProtocolCategoryFilter ? 'false' : 'true'
			const endpointSlug = toOverviewApiSlug(slug)
			let url = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}/${endpointSlug}?excludeTotalDataChartBreakdown=${includeBreakdownParam}`
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

		const tsSet = new Set<number>()
		seriesRaw.forEach((s) => s.data.forEach(([t]) => tsSet.add(t)))
		totalNormalized.forEach(([t]) => tsSet.add(t))
		const allTs = Array.from(tsSet).sort((a, b) => a - b)

		const alignedTop = seriesRaw.map((s) => ({ ...s, data: alignSeries(allTs, s.data) }))
		const topSumPerTs = alignSeries(
			allTs,
			Array.from(sumSeriesByTimestamp(alignedTop.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
		const totalAligned = alignSeries(allTs, totalNormalized)
		const othersData: [number, number][] = allTs.map((t, i) => {
			const total = totalAligned[i]?.[1] || 0
			const top = topSumPerTs[i]?.[1] || 0
			return [t, Math.max(0, total - top)]
		})

		const othersCount = Math.max(0, ranked.length - Math.min(topN, ranked.length))
		const hasOthers = othersCount > 0 && othersData.some(([, v]) => v > 0)
		const finalSeries = [...alignedTop]
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { protocol, metric = 'tvl', chains, limit = '5', filterMode, chainCategories, protocolCategories } = req.query

		const metricStr = metric as string
		const rawChains = (chains as string | undefined)?.split(',').filter(Boolean) || []
		const chainsArray = rawChains.includes('All') ? [] : rawChains
		const chainCategoriesArray = (chainCategories as string | undefined)?.split(',').filter(Boolean) || []
		const protocolCategoriesArray = (protocolCategories as string | undefined)?.split(',').filter(Boolean) || []
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'
		const topN = Math.min(parseInt(limit as string), 20)
		const protocolStr = typeof protocol === 'string' ? protocol : undefined
		const isProtocolAll = !protocolStr || protocolStr.toLowerCase() === 'all'

		let result: ProtocolChainData

		if (CHAIN_ONLY_METRICS.has(metricStr)) {
			if (!isProtocolAll) {
				res.status(400).json({
					error: `${metricStr} metric is only available when protocol=All`
				})
				return
			}

			if (metricStr === 'stablecoins') {
				result = await getAllProtocolsTopChainsStablecoinsData(topN, chainsArray, fm, chainCategoriesArray)
			} else {
				result = await getAllProtocolsTopChainsChainFeesData(
					metricStr as 'chain-fees' | 'chain-revenue',
					topN,
					chainsArray,
					fm,
					chainCategoriesArray
				)
			}
		} else if (isProtocolAll) {
			if (metricStr === 'tvl') {
				result = await getAllProtocolsTopChainsTvlData(topN, chainsArray, fm, chainCategoriesArray)
			} else {
				result = await getAllProtocolsTopChainsDimensionsData(
					metricStr,
					topN,
					chainsArray,
					fm,
					chainCategoriesArray,
					protocolCategoriesArray
				)
			}
		} else {
			if (metricStr === 'tvl') {
				result = await getTvlProtocolChainData(protocolStr, chainsArray, topN, fm, chainCategoriesArray)
			} else {
				result = await getDimensionsProtocolChainData(
					protocolStr,
					metricStr,
					chainsArray,
					topN,
					fm,
					chainCategoriesArray
				)
			}
		}

		res.status(200).json(result)
	} catch (error) {
		console.log('Error in protocol-chain split API:', error)
		res.status(500).json({
			error: 'Failed to fetch protocol chain data',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

async function resolveAllowedChainNamesFromCategories(categories: string[]): Promise<Set<string>> {
	if (!categories || categories.length === 0) return new Set()
	const requests = categories.map((cat) => fetch(`${CHAINS_API_V2}/${encodeURIComponent(cat)}`))
	const responses = await Promise.allSettled(requests)
	const out = new Set<string>()
	for (const res of responses) {
		if (res.status === 'fulfilled' && res.value.ok) {
			try {
				const j = await res.value.json()
				const arr: string[] = Array.isArray(j?.chainsUnique) ? j.chainsUnique : []
				for (const name of arr) out.add(name)
			} catch {}
		}
	}
	return out
}

async function resolveAllowedChainSlugsFromCategories(categories: string[]): Promise<Set<string>> {
	const names = await resolveAllowedChainNamesFromCategories(categories)
	const slugs = new Set<string>()
	for (const name of names) slugs.add(toDimensionsChainSlug(name))
	return slugs
}
