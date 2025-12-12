import { NextApiRequest, NextApiResponse } from 'next'
import { CATEGORY_CHART_API, CHART_API, DIMENISIONS_OVERVIEW_API, PROTOCOL_API, PROTOCOLS_API } from '~/constants'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { normalizeChainName, toChainSlug } from '~/containers/ProDashboard/chainNormalizer'
import { processAdjustedProtocolTvl, processAdjustedTvl } from '~/utils/tvl'

interface ChartSeries {
	name: string
	data: [number, number][]
	color?: string
}

interface ProtocolSplitData {
	series: ChartSeries[]
	metadata: {
		chain: string
		chains: string[]
		categories: string[]
		metric: string
		topN: number
		totalProtocols: number
		othersCount: number
		marketSector: string | null
	}
}

// const COLORS = [
// 	'#8884d8',
// 	'#82ca9d',
// 	'#ffc658',
// 	'#ff7c7c',
// 	'#8dd1e1',
// 	'#d084d0',
// 	'#82d982',
// 	'#ffb347',
// 	'#67b7dc',
// 	'#a4de6c'
// ]

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
	'supply-side-revenue': { endpoint: 'fees', dataType: 'dailySupplySideRevenue', metricName: 'supply side revenue' },
	'open-interest': { endpoint: 'open-interest', dataType: 'openInterestAtEnd', metricName: 'open interest' }
}

const toSlug = (name: string = '') => name?.toLowerCase().split(' ').join('-').split("'").join('')

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

// Some protocol responses include synthetic keys that shouldn't be counted in TVL totals
// Ensure we ignore them consistently when aggregating per‑protocol TVL series
const isIgnoredChainKey = (key: string): boolean => {
	return (
		key === 'borrowed' ||
		key === 'pool2' ||
		key === 'staking' ||
		key.includes('-borrowed') ||
		key.includes('-pool2') ||
		key.includes('-staking')
	)
}

const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

const normalizeDailyPairs = (pairs: [number, number][]): [number, number][] => {
	const daily = new Map<number, number>()
	for (const [ts, v] of pairs) {
		const day = toUtcDay(Number(ts))
		daily.set(day, v || 0)
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

const fetchChainTotalTvl = async (chains: string[]): Promise<[number, number][]> => {
	const isAll = chains.length === 0 || chains.some((c) => c.toLowerCase() === 'all')
	if (isAll) {
		const r = await fetch(`${CHART_API}`)
		const j = await r.json()
		const adjustedTvl = processAdjustedTvl(j)
		return filterOutToday(normalizeDailyPairs(adjustedTvl))
	}

	const perChain = await Promise.all(
		chains.map(async (chain) => {
			const r = await fetch(`${CHART_API}/${chain}`)
			if (!r.ok) return []
			const j = await r.json()
			const adjustedTvl = processAdjustedTvl(j)
			return filterOutToday(normalizeDailyPairs(adjustedTvl))
		})
	)
	const summed = sumSeriesByTimestamp(perChain)
	return Array.from(summed.entries()).sort((a, b) => a[0] - b[0])
}

const subtractSeries = (a: [number, number][], b: [number, number][]): [number, number][] => {
	const mapA = new Map(a.map(([t, v]) => [t, v]))
	for (const [t, v] of b) {
		mapA.set(t, (mapA.get(t) || 0) - (v || 0))
	}
	return Array.from(mapA.entries()).sort((x, y) => x[0] - y[0]) as [number, number][]
}

const fetchAllChainTotalTvl = async (): Promise<[number, number][]> => {
	const r = await fetch(`${CHART_API}`)
	const j = await r.json()
	const adjustedTvl = processAdjustedTvl(j)
	return filterOutToday(normalizeDailyPairs(adjustedTvl))
}

const fetchChainTvlSingle = async (chain: string): Promise<[number, number][]> => {
	const r = await fetch(`${CHART_API}/${chain}`)
	if (!r.ok) return []
	const j = await r.json()
	const adjustedTvl = processAdjustedTvl(j)
	return filterOutToday(normalizeDailyPairs(adjustedTvl))
}

const fetchCategorySeriesAll = async (category: string): Promise<[number, number][]> => {
	try {
		const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}`)
		if (!r.ok) return []
		const j = await r.json()
		const tvl = j?.tvl || {}
		const mapped = Object.entries(tvl).map(
			([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
		)
		return filterOutToday(normalizeDailyPairs(mapped))
	} catch {
		return []
	}
}

const fetchCategorySeriesPerChain = async (category: string, chain: string): Promise<[number, number][]> => {
	try {
		const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}/${toSlug(chain)}`)
		if (!r.ok) return []
		const j = await r.json()
		const tvl = j?.tvl || {}
		const mapped = Object.entries(tvl).map(
			([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
		)
		return filterOutToday(normalizeDailyPairs(mapped))
	} catch {
		return []
	}
}

const fetchCategoryTvl = async (chains: string[], categories: string[]): Promise<[number, number][]> => {
	if (categories.length === 0) {
		return fetchChainTotalTvl(chains)
	}

	const isAllChains = chains.length === 0 || chains.some((c) => c.toLowerCase() === 'all')
	const categoryDataPromises: Promise<[number, number][]>[] = []

	for (const category of categories) {
		if (isAllChains) {
			categoryDataPromises.push(
				(async () => {
					try {
						const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}`)
						if (!r.ok) return []
						const j = await r.json()
						const tvl = j?.tvl || {}
						const mapped = Object.entries(tvl).map(
							([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
						)
						return filterOutToday(normalizeDailyPairs(mapped))
					} catch (e) {
						console.log('Error fetching category tvl', category, e)
						return []
					}
				})()
			)
		} else {
			for (const chain of chains) {
				categoryDataPromises.push(
					(async () => {
						try {
							const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}/${toSlug(chain)}`)
							if (!r.ok) return []
							const j = await r.json()
							const tvl = j?.tvl || {}
							const mapped = Object.entries(tvl).map(
								([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
							)
							return filterOutToday(normalizeDailyPairs(mapped))
						} catch (e) {
							console.log('Error fetching category tvl', category, chain, e)
							return []
						}
					})()
				)
			}
		}
	}

	const allCategoryData = await Promise.all(categoryDataPromises)
	const summed = sumSeriesByTimestamp(allCategoryData)
	return Array.from(summed.entries()).sort((a, b) => a[0] - b[0])
}

const getTvlData = async (
	chains: string[],
	categories: string[],
	topN: number,
	groupByParent: boolean = false,
	filterMode: 'include' | 'exclude' = 'include'
): Promise<ProtocolSplitData> => {
	const selectedChains = (chains && chains.length > 0 ? chains : ['all']).filter(Boolean)
	const isAll = selectedChains.some((c) => c.toLowerCase() === 'all')
	const categoriesFilter = (categories || []).map((c) => c.toLowerCase())

	const protocolsResp = await fetch(PROTOCOLS_API)
	const protocolsJson = await protocolsResp.json()
	const protocols: any[] = Array.isArray(protocolsJson?.protocols) ? protocolsJson.protocols : []
	const parentProtocols: any[] = Array.isArray(protocolsJson?.parentProtocols) ? protocolsJson.parentProtocols : []
	const parentIdToName = new Map<string, string>()
	const parentIdToSlug = new Map<string, string>()
	for (const pp of parentProtocols) {
		if (pp?.id && pp?.name) {
			parentIdToName.set(pp.id, pp.name)
			parentIdToSlug.set(pp.id, toSlug(pp.name))
		}
	}

	type ChildScore = { childName: string; childSlug: string; parentId: string | null; value: number }
	const childScores: ChildScore[] = []
	const childrenByParent: Map<string, Set<string>> = new Map()
	const excludedChainSetForProtocols: Set<string> = new Set(
		filterMode === 'exclude' ? selectedChains.map((ch) => normalizeChainName(ch)) : []
	)
	const includedChainSetForProtocols: Set<string> = new Set(
		filterMode === 'include' && !isAll ? selectedChains.map((ch) => normalizeChainName(ch)) : []
	)
	const categoriesFilterSet = new Set(categoriesFilter)

	for (const p of protocols) {
		const cat = (p.category || '').toLowerCase()
		if (categoriesFilterSet.size > 0) {
			if (filterMode === 'include' && !categoriesFilterSet.has(cat)) continue
			if (filterMode === 'exclude' && categoriesFilterSet.has(cat)) continue
		}

		let score = 0
		if (isAll) {
			if (filterMode === 'exclude') {
				for (const key in p.chainTvls || {}) {
					if (isIgnoredChainKey(key)) continue
					if (excludedChainSetForProtocols.has(key)) continue
					const chainEntry = p.chainTvls?.[key]
					if (chainEntry && typeof chainEntry.tvl === 'number') {
						score += chainEntry.tvl
					}
				}
			} else {
				score = typeof p.tvl === 'number' ? p.tvl : 0
			}
		} else {
			if (filterMode === 'exclude') {
				for (const key in p.chainTvls || {}) {
					if (isIgnoredChainKey(key)) continue
					if (excludedChainSetForProtocols.has(key)) continue
					const chainEntry = p.chainTvls?.[key]
					if (chainEntry && typeof chainEntry.tvl === 'number') {
						score += chainEntry.tvl
					}
				}
			} else {
				for (const ch of selectedChains) {
					const key = normalizeChainName(ch)
					if (isIgnoredChainKey(key)) continue
					const chainEntry = p.chainTvls?.[key]
					if (chainEntry && typeof chainEntry.tvl === 'number') {
						score += chainEntry.tvl
					}
				}
			}
		}
		if (score <= 0) continue
		const childSlug = toSlug(p.name)
		childScores.push({ childName: p.name, childSlug, parentId: p.parentProtocol || null, value: score })
		if (p.parentProtocol) {
			if (!childrenByParent.has(p.parentProtocol)) childrenByParent.set(p.parentProtocol, new Set())
			childrenByParent.get(p.parentProtocol)!.add(childSlug)
		}
	}

	childScores.sort((a, b) => b.value - a.value)

	type PickedItem = { name: string; slug: string; parentId: string | null; isParent: boolean }
	const picked = new Map<string, PickedItem>()
	if (groupByParent) {
		for (const c of childScores) {
			const key = c.parentId || `protocol:${c.childSlug}`
			if (picked.has(key)) continue
			const name = c.parentId ? parentIdToName.get(c.parentId) || c.childName : c.childName
			const slug = c.parentId ? parentIdToSlug.get(c.parentId) || c.childSlug : c.childSlug
			picked.set(key, { name, slug, parentId: c.parentId || null, isParent: !!c.parentId })
			if (picked.size >= topN) break
		}
	} else {
		for (const c of childScores) {
			const key = `protocol:${c.childSlug}`
			if (picked.has(key)) continue
			picked.set(key, { name: c.childName, slug: c.childSlug, parentId: null, isParent: false })
			if (picked.size >= topN) break
		}
	}
	const top = Array.from(picked.values())
	const uniqueTotal = groupByParent
		? new Set(childScores.map((c) => c.parentId || `protocol:${c.childSlug}`)).size
		: childScores.length

	if (top.length === 0) {
		const displayChains = isAll ? ['All'] : selectedChains
		return {
			series: [],
			metadata: {
				chain: displayChains.join(','),
				chains: displayChains,
				categories: categories,
				metric: 'TVL',
				topN,
				totalProtocols: 0,
				othersCount: 0,
				marketSector: categories.join(',') || null
			}
		}
	}

	const protocolSeries = await Promise.all(
		top.map(async (t) => {
			try {
				const useChildrenOnly = groupByParent && !!t.parentId && categoriesFilter.length > 0

				const buildSeriesForSlug = async (slug: string): Promise<[number, number][]> => {
					const resp = await fetch(`${PROTOCOL_API}/${slug}`)
					if (!resp.ok) return []
					const json = await resp.json()
					const chainTvls = json?.chainTvls || {}

					const opts: any = {}
					if (filterMode === 'exclude' && excludedChainSetForProtocols.size > 0) {
						opts.filterMode = 'exclude'
						opts.excludeChains = Array.from(excludedChainSetForProtocols)
					}
					if (filterMode === 'include' && !isAll && includedChainSetForProtocols.size > 0) {
						opts.filterMode = 'include'
						opts.includeChains = Array.from(includedChainSetForProtocols)
					}

					return processAdjustedProtocolTvl(chainTvls, opts)
				}

				if (useChildrenOnly) {
					const childSet = t.parentId ? childrenByParent.get(t.parentId) : undefined
					const childSlugs = childSet ? Array.from(childSet) : []
					if (childSlugs.length === 0) {
						return { name: t.name, data: [] as [number, number][], failed: false }
					}
					const childSeries = await Promise.all(childSlugs.map((slug) => buildSeriesForSlug(slug)))
					const summed = sumSeriesByTimestamp(childSeries)
					const data = Array.from(summed.entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
					return { name: t.name, data }
				}

				const data = await buildSeriesForSlug(t.slug)
				return { name: t.name, data }
			} catch (e) {
				console.log('Error fetching protocol tvl', t.slug, e)
				return { name: t.name, data: [] as [number, number][], failed: true }
			}
		})
	)

	const failedProtocols = protocolSeries.filter((s: any) => s.failed)
	if (failedProtocols.length > 0) {
		console.log(`Failed to fetch data for ${failedProtocols.length} protocols, returning empty chart`)
		const displayChains = isAll ? ['All'] : selectedChains
		return {
			series: [],
			metadata: {
				chain: displayChains.join(','),
				chains: displayChains,
				categories,
				metric: 'TVL',
				topN,
				totalProtocols: 0,
				othersCount: 0,
				marketSector: categories.join(',') || null
			}
		}
	}

	let totalSeries: [number, number][]
	if (filterMode === 'exclude') {
		const allTvl = await fetchAllChainTotalTvl()
		const excludedChains = (isAll ? selectedChains : selectedChains).filter((c) => c.toLowerCase() !== 'all')
		const excludedPerChain = await Promise.all(excludedChains.map((c) => fetchChainTvlSingle(c)))
		const sumExcluded = Array.from(sumSeriesByTimestamp(excludedPerChain).entries()).sort((a, b) => a[0] - b[0]) as [
			number,
			number
		][]
		let base = subtractSeries(allTvl, sumExcluded)

		if (categoriesFilter.length > 0) {
			const perCategoryAll = await Promise.all(categoriesFilter.map((cat) => fetchCategorySeriesAll(cat)))
			let excludedCatsAll = Array.from(sumSeriesByTimestamp(perCategoryAll).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
			if (excludedChains.length > 0) {
				const perCatPerExcluded = await Promise.all(
					categoriesFilter.map(async (cat) => {
						const perChainCat = await Promise.all(excludedChains.map((ch) => fetchCategorySeriesPerChain(cat, ch)))
						const summed = Array.from(sumSeriesByTimestamp(perChainCat).entries()).sort((a, b) => a[0] - b[0]) as [
							number,
							number
						][]
						return summed
					})
				)
				const sumExcludedCatsAcrossChains = Array.from(sumSeriesByTimestamp(perCatPerExcluded).entries()).sort(
					(a, b) => a[0] - b[0]
				) as [number, number][]
				excludedCatsAll = subtractSeries(excludedCatsAll, sumExcludedCatsAcrossChains)
			}
			base = subtractSeries(base, excludedCatsAll)
		}
		totalSeries = base
	} else {
		totalSeries = await fetchCategoryTvl(isAll ? ['all'] : selectedChains, categoriesFilter)
	}

	const timestampSet = new Set<number>()
	totalSeries.forEach(([t]) => timestampSet.add(t))
	protocolSeries.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
	const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

	const alignedProtocolSeries: ChartSeries[] = protocolSeries.map((s, idx) => ({
		name: s.name,
		data: alignSeries(allTimestamps, s.data),
		color: EXTENDED_COLOR_PALETTE[idx % EXTENDED_COLOR_PALETTE.length]
	}))

	const alignedTotal = alignSeries(allTimestamps, totalSeries)
	const topSumPerTs = alignSeries(
		allTimestamps,
		Array.from(sumSeriesByTimestamp(alignedProtocolSeries.map((s) => s.data)).entries()).sort(
			(a, b) => a[0] - b[0]
		) as [number, number][]
	)

	const othersData: [number, number][] = allTimestamps.map((t, i) => {
		const total = alignedTotal[i]?.[1] || 0
		const topSum = topSumPerTs[i]?.[1] || 0
		const rest = Math.max(0, total - topSum)
		return [t, rest]
	})

	const hasOthers = othersData.some(([, v]) => v > 0)
	const othersCount = Math.max(0, uniqueTotal - top.length)

	const series: ChartSeries[] = [...alignedProtocolSeries]
	if (hasOthers) {
		series.push({ name: `Others (${othersCount} protocols)`, data: othersData, color: '#999999' })
	}

	const displayChains = isAll ? ['All'] : selectedChains
	return {
		series,
		metadata: {
			chain: displayChains.join(','),
			chains: displayChains,
			categories,
			metric: 'TVL',
			topN,
			totalProtocols: uniqueTotal,
			othersCount,
			marketSector: categories.join(',') || null
		}
	}
}

async function handleTVLRequest(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains, limit = '10', categories, groupByParent, filterMode } = req.query

		let chainsArray = chains ? (chains as string).split(',').filter(Boolean) : []
		if (chainsArray.length === 0 || chainsArray.some((c) => c.toLowerCase() === 'all')) {
			chainsArray = []
		}
		const categoriesArray = categories ? (categories as string).split(',').filter(Boolean) : []
		const topN = Math.min(parseInt(limit as string), 20)
		const shouldGroupByParent = groupByParent === 'true'
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'

		const result = await getTvlData(chainsArray, categoriesArray, topN, shouldGroupByParent, fm)

		res.status(200).json(result)
	} catch (error) {
		console.log('Error handling TVL request:', error)
		res.status(500).json({
			error: 'Failed to fetch TVL data',
			message: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { dataType, chains, limit = '10', categories, groupByParent, filterMode } = req.query
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
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'
		const shouldGroupByParent = groupByParent === 'true'

		const config = METRIC_CONFIG[metric]
		if (!config) {
			return res.status(400).json({ error: `Unsupported metric: ${metric}` })
		}

		const chainDataPromises = chainsArray.map(async (singleChain) => {
			const apiChain = toChainSlug(singleChain)

			let apiUrl =
				apiChain && apiChain !== 'all'
					? `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}/${apiChain}?excludeTotalDataChartBreakdown=false`
					: `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`

			if (config.dataType) {
				apiUrl += `&dataType=${config.dataType}`
			}

			try {
				const response = await fetch(apiUrl)
				if (!response.ok) {
					console.log(`API Error for ${metric} on ${singleChain}: ${response.status} - URL: ${apiUrl}`)
					return null
				}
				const data = await response.json()
				return { chain: singleChain, data }
			} catch (error) {
				console.log(`Error fetching data for ${singleChain}:`, error)
				return null
			}
		})

		const chainResults = (await Promise.all(chainDataPromises)).filter(Boolean)

		if (chainResults.length === 0 && fm === 'include') {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null,
					error: `No data available for chains: ${chainsArray.join(', ')}`
				}
			})
		}

		const aggregatedBreakdown = new Map<number, Map<string, number>>()

		if (fm === 'exclude') {
			const config = METRIC_CONFIG[metric]
			let allUrl = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
			if (config.dataType) allUrl += `&dataType=${config.dataType}`
			const allResp = await fetch(allUrl)
			const allJson = await allResp.json()
			const allBreakdown: Array<[number, Record<string, number>]> = allJson?.totalDataChartBreakdown || []
			const allMap = new Map<number, Map<string, number>>()
			allBreakdown.forEach(([ts, protocols]) => {
				const m = new Map<string, number>()
				Object.entries(protocols || {}).forEach(([name, v]) => m.set(name, v as number))
				allMap.set(ts, m)
			})

			const excludedResults = await Promise.all(
				chainsArray
					.filter((c) => c.toLowerCase() !== 'all')
					.map(async (singleChain) => {
						const apiChain = toChainSlug(singleChain)
						let url = `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}/${apiChain}?excludeTotalDataChartBreakdown=false`
						if (config.dataType) url += `&dataType=${config.dataType}`
						try {
							const r = await fetch(url)
							if (!r.ok) return null
							const j = await r.json()
							return j
						} catch {
							return null
						}
					})
			)
			const excludedMaps: Map<number, Map<string, number>>[] = []
			for (const ex of excludedResults) {
				if (!ex || !Array.isArray(ex.totalDataChartBreakdown)) continue
				const map = new Map<number, Map<string, number>>()
				ex.totalDataChartBreakdown.forEach(([ts, protocols]: [number, Record<string, number>]) => {
					const m = new Map<string, number>()
					Object.entries(protocols || {}).forEach(([name, v]) => m.set(name, v as number))
					map.set(ts, m)
				})
				excludedMaps.push(map)
			}

			// Subtract excluded from all
			for (const [ts, allProtoMap] of allMap.entries()) {
				const out = new Map<string, number>(allProtoMap)
				for (const exMap of excludedMaps) {
					const exProtoMap = exMap.get(ts)
					if (!exProtoMap) continue
					for (const [p, v] of exProtoMap.entries()) {
						out.set(p, (out.get(p) || 0) - (v || 0))
					}
				}
				aggregatedBreakdown.set(ts, out)
			}
		} else {
			for (const result of chainResults) {
				const { data } = result
				if (!data.totalDataChartBreakdown || !Array.isArray(data.totalDataChartBreakdown)) continue

				data.totalDataChartBreakdown.forEach((item: any) => {
					const [timestamp, protocols] = item
					if (!protocols) return

					if (!aggregatedBreakdown.has(timestamp)) {
						aggregatedBreakdown.set(timestamp, new Map())
					}

					const timestampData = aggregatedBreakdown.get(timestamp)!

					Object.entries(protocols).forEach(([protocolName, value]) => {
						const currentValue = timestampData.get(protocolName) || 0
						timestampData.set(protocolName, currentValue + (value as number))
					})
				})
			}
		}

		const data = {
			totalDataChartBreakdown: Array.from(aggregatedBreakdown.entries())
				.sort(([a], [b]) => a - b)
				.map(([timestamp, protocols]) => [timestamp, Object.fromEntries(protocols.entries())])
		}

		if (!data.totalDataChartBreakdown || !Array.isArray(data.totalDataChartBreakdown)) {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null
				}
			})
		}

		const lastDayData = data.totalDataChartBreakdown[data.totalDataChartBreakdown.length - 2]
		if (!lastDayData || !lastDayData[1]) {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null
				}
			})
		}

		const lastDayProtocols = lastDayData[1]

		let protocolCategories: Map<string, string> = new Map()
		let protocolCategoriesBySlug: Map<string, string> = new Map()
		let protocolToParentId: Map<string, string> = new Map()
		let parentIdToName: Map<string, string> = new Map()
		let parentIdToSlug: Map<string, string> = new Map()

		const protocolsResponse = await fetch(PROTOCOLS_API)
		const protocolsData = await protocolsResponse.json()
		const protocols = protocolsData.protocols || []
		const parentProtocols = protocolsData.parentProtocols || []

		for (const pp of parentProtocols) {
			if (pp?.id && pp?.name) {
				parentIdToName.set(pp.id, pp.name)
				parentIdToSlug.set(pp.id, toSlug(pp.name))
			}
		}

		protocols.forEach((protocol: any) => {
			if (protocol.name) {
				if (protocol.category) {
					const cat = protocol.category.toLowerCase()
					protocolCategories.set(protocol.name, cat)
					protocolCategoriesBySlug.set(toSlug(protocol.name), cat)
				}
				if (protocol.parentProtocol) {
					protocolToParentId.set(protocol.name, protocol.parentProtocol)
				}
			}
		})

		const getCategory = (name: string): string => {
			return protocolCategories.get(name) || protocolCategoriesBySlug.get(toSlug(name)) || ''
		}

		let protocolEntries = Object.entries(lastDayProtocols).map(([name, value]) => ({ name, value: value as number }))

		if (categoriesArray.length > 0 && (protocolCategories.size > 0 || protocolCategoriesBySlug.size > 0)) {
			if (fm === 'exclude') {
				protocolEntries = protocolEntries.filter((p) => !categoriesArray.includes(getCategory(p.name)))
			} else {
				protocolEntries = protocolEntries.filter((p) => categoriesArray.includes(getCategory(p.name)))
			}
		}

		let topProtocols: string[]
		let topProtocolsSet: Set<string>
		let protocolNameMapping: Map<string, string> = new Map()
		let protocolFamilyValues: Map<string, { name: string; value: number; isParent: boolean }> = new Map()

		if (shouldGroupByParent) {
			for (const entry of protocolEntries) {
				const parentId = protocolToParentId.get(entry.name)
				if (parentId) {
					const parentName = parentIdToName.get(parentId) || entry.name
					const existing = protocolFamilyValues.get(parentId)
					if (existing) {
						protocolFamilyValues.set(parentId, {
							name: parentName,
							value: existing.value + entry.value,
							isParent: true
						})
					} else {
						protocolFamilyValues.set(parentId, {
							name: parentName,
							value: entry.value,
							isParent: true
						})
					}
				} else {
					const key = `protocol:${entry.name}`
					protocolFamilyValues.set(key, {
						name: entry.name,
						value: entry.value,
						isParent: false
					})
				}
			}

			const sortedFamilies = Array.from(protocolFamilyValues.values()).sort((a, b) => b.value - a.value)
			topProtocols = sortedFamilies.slice(0, topN).map((f) => f.name)
			topProtocolsSet = new Set(topProtocols)

			for (const [protocolName, parentId] of protocolToParentId.entries()) {
				const parentName = parentIdToName.get(parentId)
				if (parentName && topProtocolsSet.has(parentName)) {
					protocolNameMapping.set(protocolName, parentName)
				}
			}
		} else {
			protocolEntries.sort((a, b) => b.value - a.value)
			topProtocols = protocolEntries.slice(0, topN).map((p) => p.name)
			topProtocolsSet = new Set(topProtocols)

			for (const entry of protocolEntries) {
				protocolFamilyValues.set(`protocol:${entry.name}`, {
					name: entry.name,
					value: entry.value,
					isParent: false
				})
			}
		}

		const protocolData: Map<string, [number, number][]> = new Map()
		topProtocols.forEach((protocol) => {
			protocolData.set(protocol, [])
		})

		const timestampTotals: Map<number, number> = new Map()
		const timestampTopTotals: Map<number, number> = new Map()

		data.totalDataChartBreakdown.forEach((item: any) => {
			const [timestamp, protocols] = item
			if (!protocols) return

			let dayTotal = 0
			let topTotal = 0

			Object.entries(protocols).forEach(([protocolName, value]) => {
				if (categoriesArray.length > 0 && (protocolCategories.size > 0 || protocolCategoriesBySlug.size > 0)) {
					const cat = getCategory(protocolName)
					if (fm === 'exclude') {
						if (categoriesArray.includes(cat)) return
					} else {
						if (!categoriesArray.includes(cat)) return
					}
				}

				const protocolValue = value as number
				dayTotal += protocolValue

				const displayName = shouldGroupByParent ? protocolNameMapping.get(protocolName) || protocolName : protocolName

				if (topProtocolsSet.has(displayName)) {
					topTotal += protocolValue
					const series = protocolData.get(displayName)
					if (series) {
						const existingIndex = series.findIndex(([ts]) => ts === timestamp)
						if (existingIndex >= 0) {
							series[existingIndex][1] += protocolValue
						} else {
							series.push([timestamp, protocolValue])
						}
					}
				}
			})

			timestampTotals.set(timestamp, dayTotal)
			timestampTopTotals.set(timestamp, topTotal)
		})

		const allTimestamps = Array.from(timestampTotals.keys()).sort((a, b) => a - b)

		const series: ChartSeries[] = []

		topProtocols.forEach((protocol, index) => {
			const sortedData = (protocolData.get(protocol) || []).sort((a, b) => a[0] - b[0])
			const protocolDataMap = new Map(sortedData)

			const alignedData: [number, number][] = allTimestamps.map((timestamp) => {
				return [timestamp, protocolDataMap.get(timestamp) || 0]
			})

			series.push({
				name: protocol,
				data: alignedData,
				color: EXTENDED_COLOR_PALETTE[index % EXTENDED_COLOR_PALETTE.length]
			})
		})

		const othersData: [number, number][] = allTimestamps.map((timestamp) => {
			const total = timestampTotals.get(timestamp) || 0
			const topTotal = timestampTopTotals.get(timestamp) || 0
			const othersValue = Math.max(0, total - topTotal)
			return [timestamp, othersValue]
		})

		const hasOthersData = othersData.some(([_, value]) => value > 0)
		const totalFamilies = shouldGroupByParent ? protocolFamilyValues.size : protocolEntries.length
		const othersCount = Math.max(0, totalFamilies - topN)

		if (hasOthersData) {
			series.push({
				name: `Others (${othersCount} protocols)`,
				data: othersData,
				color: '#999999'
			})
		}

		res.status(200).json({
			series,
			metadata: {
				chain: chainsArray.join(','),
				chains: chainsArray,
				categories: categoriesArray,
				metric: config.metricName,
				topN,
				totalProtocols: totalFamilies,
				othersCount: othersCount,
				marketSector: categoriesArray.join(',') || null
			}
		})
	} catch (error) {
		const metric = req.query.dataType as string
		console.log(`Error in ${metric} split API:`, error)
		res.status(500).json({
			error: `Failed to fetch protocol ${metric} data`,
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}
