import { NextApiRequest, NextApiResponse } from 'next'
import {
	CHAIN_TVL_API,
	CHAINS_API_V2,
	CHART_API,
	DIMENISIONS_OVERVIEW_API,
	DIMENISIONS_SUMMARY_BASE_API,
	PROTOCOL_API
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

const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

const normalizeChainKey = (chain: string): string => {
	const lc = chain.toLowerCase()
	if (lc === 'optimism' || lc === 'op mainnet' || lc === 'op-mainnet') return 'OP Mainnet'
	return chain
}

const toDimensionsChainSlug = (chain: string): string => {
	if (!chain) return chain
	const lc = chain.toLowerCase()
	if (lc === 'optimism' || lc === 'op mainnet' || lc === 'op-mainnet') return 'op-mainnet'
	if (lc === 'bsc' || lc === 'binance smart chain') return 'bsc'
	if (lc === 'avax' || lc === 'avalanche') return 'avax'
	if (lc === 'gnosis' || lc === 'xdai') return 'xdai'
	return lc
}

const displayChainName = (slug: string): string => {
	const lc = slug.toLowerCase()
	if (lc === 'op-mainnet' || lc === 'optimism') return 'OP Mainnet'
	if (lc === 'avax') return 'Avalanche'
	if (lc === 'bsc') return 'BSC'
	if (lc === 'xdai') return 'Gnosis'
	return lc
		.split('-')
		.map((p) => (p.length ? p[0].toUpperCase() + p.slice(1) : p))
		.join(' ')
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
		console.error(`Error fetching TVL for protocol ${protocol}:`, error)
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
		console.error(`Error fetching ${metric} for protocol ${protocol}:`, error)
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
		console.error('Error building all-protocols TVL by chain:', e)
		return { series: [], metadata: { protocol: 'All Protocols', metric: 'TVL', chains: [], totalChains: 0 } }
	}
}

async function getAllProtocolsTopChainsDimensionsData(
	metric: string,
	topN: number = 5,
	chains?: string[],
	filterMode: 'include' | 'exclude' = 'include',
	chainCategories?: string[]
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) throw new Error(`Unsupported metric: ${metric}`)

	try {
		let overviewUrl = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
		if (config.dataType) overviewUrl += `&dataType=${config.dataType}`
		const overviewResp = await fetch(overviewUrl)
		if (!overviewResp.ok) throw new Error(`Overview fetch failed: ${overviewResp.status}`)
		const overview = await overviewResp.json()

		const chainTotals = new Map<string, number>()
		const protocols: any[] = Array.isArray(overview?.protocols) ? overview.protocols : []
		for (const p of protocols) {
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
			let url = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}/${slug}?excludeTotalDataChartBreakdown=true`
			if (config.dataType) url += `&dataType=${config.dataType}`
			const r = await fetch(url)
			if (!r.ok) return null
			const j = await r.json()
			const tdc: Array<[number, number]> = Array.isArray(j?.totalDataChart) ? j.totalDataChart : []
			const normalized = filterOutToday(
				normalizeDailyPairs((tdc as Array<[number | string, number]>).map(([ts, v]) => [Number(ts), Number(v)]))
			)
			return {
				name: displayChainName(slug),
				data: normalized,
				color: EXTENDED_COLOR_PALETTE[idx % EXTENDED_COLOR_PALETTE.length]
			} as ChartSeries
		})

		const seriesRaw = (await Promise.all(chainSeriesPromises)).filter(Boolean) as ChartSeries[]

		const totalChart: Array<[number, number]> = Array.isArray(overview?.totalDataChart) ? overview.totalDataChart : []
		const totalNormalized = filterOutToday(
			normalizeDailyPairs((totalChart as Array<[number | string, number]>).map(([ts, v]) => [Number(ts), Number(v)]))
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
		console.error(`Error building all-protocols ${metric} by chain:`, e)
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
		const { protocol, metric = 'tvl', chains, limit = '5', filterMode, chainCategories } = req.query

		const metricStr = metric as string
		const rawChains = (chains as string | undefined)?.split(',').filter(Boolean) || []
		const chainsArray = rawChains.includes('All') ? [] : rawChains
		const chainCategoriesArray = (chainCategories as string | undefined)?.split(',').filter(Boolean) || []
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'
		const topN = Math.min(parseInt(limit as string), 20)

		let result: ProtocolChainData

		if (!protocol || typeof protocol !== 'string' || protocol.toLowerCase() === 'all') {
			if (metricStr === 'tvl') {
				result = await getAllProtocolsTopChainsTvlData(topN, chainsArray, fm, chainCategoriesArray)
			} else {
				result = await getAllProtocolsTopChainsDimensionsData(metricStr, topN, chainsArray, fm, chainCategoriesArray)
			}
		} else {
			if (metricStr === 'tvl') {
				result = await getTvlProtocolChainData(protocol, chainsArray, topN, fm, chainCategoriesArray)
			} else {
				result = await getDimensionsProtocolChainData(protocol, metricStr, chainsArray, topN, fm, chainCategoriesArray)
			}
		}

		res.status(200).json(result)
	} catch (error) {
		console.error('Error in protocol-chain split API:', error)
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
