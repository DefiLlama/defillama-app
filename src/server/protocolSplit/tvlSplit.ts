import { fetchChainChart } from '~/containers/Chains/api'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { fetchProtocols } from '~/containers/Protocols/api'
import { fetchCategoryChart } from '~/containers/ProtocolsByCategoryOrTag/api'
import { toDisplayName } from '~/utils/chainNormalizer'
import { alignSeries, filterOutToday, normalizeDailyPairs, sumSeriesByTimestamp, toSlug } from '~/utils/protocolSplit'
import { processAdjustedProtocolTvl, processAdjustedTvl, type TvlChartData } from '~/utils/tvl'
import type { ChartSeries, ProtocolSplitData } from './types'

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

const fetchChainTotalTvl = async (chains: string[]): Promise<[number, number][]> => {
	const isAll = chains.length === 0 || chains.some((c) => c.toLowerCase() === 'all')
	if (isAll) {
		const j = await fetchChainChart<TvlChartData>().catch(() => null)
		if (!j) return []
		const adjustedTvl = processAdjustedTvl(j)
		return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
	}

	const perChain = await Promise.all(
		chains.map(async (chain) => {
			const j = await fetchChainChart<TvlChartData>(chain).catch(() => null)
			if (!j) return []
			const adjustedTvl = processAdjustedTvl(j)
			return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
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
	return fetchChainTotalTvl(['all'])
}

const fetchChainTvlSingle = async (chain: string): Promise<[number, number][]> => {
	const j = await fetchChainChart<TvlChartData>(chain).catch(() => null)
	if (!j) return []
	const adjustedTvl = processAdjustedTvl(j)
	return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
}

const fetchCategorySeriesAll = async (category: string, logArgs?: unknown[]): Promise<[number, number][]> => {
	try {
		const j = await fetchCategoryChart({ category })
		const tvl = j?.tvl || {}
		const mapped = Object.entries(tvl).map(
			([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
		)
		return filterOutToday(normalizeDailyPairs(mapped, 'last'))
	} catch (error) {
		if (logArgs?.length) {
			console.log('Error fetching category tvl', ...logArgs, error)
		}
		return []
	}
}

const fetchCategorySeriesPerChain = async (
	category: string,
	chain: string,
	logArgs?: unknown[]
): Promise<[number, number][]> => {
	try {
		const j = await fetchCategoryChart({ category, chain })
		const tvl = j?.tvl || {}
		const mapped = Object.entries(tvl).map(
			([ts, v]: [string, any]) => [parseInt(ts, 10), Number(v) || 0] as [number, number]
		)
		return filterOutToday(normalizeDailyPairs(mapped, 'last'))
	} catch (error) {
		if (logArgs?.length) {
			console.log('Error fetching category tvl', ...logArgs, error)
		}
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
			categoryDataPromises.push(fetchCategorySeriesAll(category, [category]))
		} else {
			for (const chain of chains) {
				categoryDataPromises.push(fetchCategorySeriesPerChain(category, chain, [category, chain]))
			}
		}
	}

	const allCategoryData = await Promise.all(categoryDataPromises)
	const summed = sumSeriesByTimestamp(allCategoryData)
	return Array.from(summed.entries()).sort((a, b) => a[0] - b[0])
}

export const getTvlSplitData = async (
	chains: string[],
	categories: string[],
	topN: number,
	groupByParent: boolean = false,
	chainFilterMode: 'include' | 'exclude' = 'include',
	categoryFilterMode: 'include' | 'exclude' = 'include'
): Promise<ProtocolSplitData> => {
	const selectedChains = (chains && chains.length > 0 ? chains : ['all']).filter(Boolean)
	const isAll = selectedChains.some((c) => c.toLowerCase() === 'all')
	const categoriesFilter = (categories || []).map((c) => c.toLowerCase())

	const protocolsJson = await fetchProtocols()
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
		chainFilterMode === 'exclude' ? selectedChains.map((ch) => toDisplayName(ch)) : []
	)
	const includedChainSetForProtocols: Set<string> = new Set(
		chainFilterMode === 'include' && !isAll ? selectedChains.map((ch) => toDisplayName(ch)) : []
	)
	const protocolSlugToCategory: Map<string, string> = new Map()
	const categoriesFilterSet = new Set(categoriesFilter)

	const hasRealExcludedChains =
		chainFilterMode === 'exclude' &&
		Array.from(excludedChainSetForProtocols).some((chain) => chain.toLowerCase() !== 'all')

	for (const p of protocols) {
		const cat = (p.category || '').toLowerCase()
		const slug = toSlug(p.name || '')
		if (slug) {
			protocolSlugToCategory.set(slug, cat)
		}
		if (categoriesFilterSet.size > 0) {
			if (categoryFilterMode === 'include' && !categoriesFilterSet.has(cat)) continue
			if (categoryFilterMode === 'exclude' && categoriesFilterSet.has(cat)) continue
		}

		let score = 0
		if (isAll) {
			if (chainFilterMode === 'exclude' && hasRealExcludedChains) {
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
			if (chainFilterMode === 'exclude' && hasRealExcludedChains) {
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
					const key = toDisplayName(ch)
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
					const json = await fetchProtocolBySlug<{ chainTvls?: Record<string, unknown> }>(slug)
					const chainTvls = json?.chainTvls || {}

					const opts: any = {}
					if (chainFilterMode === 'exclude' && hasRealExcludedChains) {
						opts.filterMode = 'exclude'
						opts.excludeChains = Array.from(excludedChainSetForProtocols).filter((c) => c.toLowerCase() !== 'all')
					}
					if (chainFilterMode === 'include' && !isAll && includedChainSetForProtocols.size > 0) {
						opts.filterMode = 'include'
						opts.includeChains = Array.from(includedChainSetForProtocols)
					}

					return processAdjustedProtocolTvl(chainTvls, opts)
				}

				if (useChildrenOnly) {
					const childSet = t.parentId ? childrenByParent.get(t.parentId) : undefined
					const childSlugs = childSet
						? Array.from(childSet).filter((slug) => {
								if (categoriesFilterSet.size === 0) return true
								const cat = protocolSlugToCategory.get(slug) || ''
								if (!cat) return categoryFilterMode === 'exclude'
								if (categoryFilterMode === 'include') return categoriesFilterSet.has(cat)
								return !categoriesFilterSet.has(cat)
							})
						: []
					if (childSlugs.length === 0) {
						return { name: t.name, data: [] as [number, number][], failed: false }
					}
					const childSeries = await Promise.all(childSlugs.map((slug) => buildSeriesForSlug(slug)))
					const summed = sumSeriesByTimestamp(childSeries)
					const data = Array.from(summed.entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
					return { name: t.name, data, failed: false }
				}

				const data = await buildSeriesForSlug(t.slug)
				return { name: t.name, data, failed: false }
			} catch (e) {
				console.log('Error fetching protocol tvl', t.slug, e)
				return { name: t.name, data: [] as [number, number][], failed: true }
			}
		})
	)

	const succeededSeries = protocolSeries.filter((s) => !s.failed)
	if (succeededSeries.length === 0) {
		console.log('Failed to fetch data for all selected protocols, returning empty chart')
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
	const hasCategories = categoriesFilter.length > 0
	const excludedChains = selectedChains.filter((c) => c.toLowerCase() !== 'all')

	const buildCategorySeriesAll = async (): Promise<[number, number][]> => {
		const perCategoryAll = await Promise.all(categoriesFilter.map((cat) => fetchCategorySeriesAll(cat)))
		return Array.from(sumSeriesByTimestamp(perCategoryAll).entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
	}

	const buildCategorySeriesExcludingChains = async (): Promise<[number, number][]> => {
		let series = await buildCategorySeriesAll()
		if (excludedChains.length === 0) return series
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
		return subtractSeries(series, sumExcludedCatsAcrossChains)
	}

	const buildTotalSeriesForChains = async (): Promise<[number, number][]> => {
		if (chainFilterMode === 'exclude' && hasRealExcludedChains) {
			const allTvl = await fetchAllChainTotalTvl()
			const excludedPerChain = await Promise.all(excludedChains.map((c) => fetchChainTvlSingle(c)))
			const sumExcluded = Array.from(sumSeriesByTimestamp(excludedPerChain).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
			return subtractSeries(allTvl, sumExcluded)
		}
		return fetchChainTotalTvl(isAll ? ['all'] : selectedChains)
	}

	const buildCategorySeriesWithChains = async (): Promise<[number, number][]> => {
		if (chainFilterMode === 'exclude' && hasRealExcludedChains) {
			return buildCategorySeriesExcludingChains()
		}
		return fetchCategoryTvl(isAll ? ['all'] : selectedChains, categoriesFilter)
	}

	if (hasCategories) {
		if (categoryFilterMode === 'include') {
			totalSeries = await buildCategorySeriesWithChains()
		} else {
			const base = await buildTotalSeriesForChains()
			const excludedCats = await buildCategorySeriesWithChains()
			totalSeries = subtractSeries(base, excludedCats)
		}
	} else {
		totalSeries = await buildTotalSeriesForChains()
	}

	const timestampSet = new Set<number>()
	for (const [t] of totalSeries) {
		timestampSet.add(t)
	}
	for (const s of succeededSeries) {
		for (const [t] of s.data) {
			timestampSet.add(t)
		}
	}
	const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

	const alignedProtocolSeries: ChartSeries[] = succeededSeries.map((s, idx) => ({
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
	const othersCount = Math.max(0, uniqueTotal - succeededSeries.length)

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
