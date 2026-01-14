import { CATEGORY_CHART_API, CHART_API, PROTOCOL_API, PROTOCOLS_API } from '~/constants'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { toDisplayName } from '~/utils/chainNormalizer'
import { alignSeries, filterOutToday, normalizeDailyPairs, sumSeriesByTimestamp, toSlug } from '~/utils/protocolSplit'
import { processAdjustedProtocolTvl, processAdjustedTvl } from '~/utils/tvl'
import { ChartSeries, ProtocolSplitData } from './types'

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
		const r = await fetch(`${CHART_API}`)
		const j = await r.json()
		const adjustedTvl = processAdjustedTvl(j)
		return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
	}

	const perChain = await Promise.all(
		chains.map(async (chain) => {
			const r = await fetch(`${CHART_API}/${chain}`)
			if (!r.ok) return []
			const j = await r.json()
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
	const r = await fetch(`${CHART_API}`)
	const j = await r.json()
	const adjustedTvl = processAdjustedTvl(j)
	return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
}

const fetchChainTvlSingle = async (chain: string): Promise<[number, number][]> => {
	const r = await fetch(`${CHART_API}/${chain}`)
	if (!r.ok) return []
	const j = await r.json()
	const adjustedTvl = processAdjustedTvl(j)
	return filterOutToday(normalizeDailyPairs(adjustedTvl, 'last'))
}

const fetchCategorySeriesAll = async (category: string, logArgs?: unknown[]): Promise<[number, number][]> => {
	try {
		const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}`)
		if (!r.ok) return []
		const j = await r.json()
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
		const r = await fetch(`${CATEGORY_CHART_API}/${toSlug(category)}/${toSlug(chain)}`)
		if (!r.ok) return []
		const j = await r.json()
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
		filterMode === 'exclude' ? selectedChains.map((ch) => toDisplayName(ch)) : []
	)
	const includedChainSetForProtocols: Set<string> = new Set(
		filterMode === 'include' && !isAll ? selectedChains.map((ch) => toDisplayName(ch)) : []
	)
	const categoriesFilterSet = new Set(categoriesFilter)

	const hasRealExcludedChains =
		filterMode === 'exclude' && Array.from(excludedChainSetForProtocols).some((chain) => chain.toLowerCase() !== 'all')

	for (const p of protocols) {
		const cat = (p.category || '').toLowerCase()
		if (categoriesFilterSet.size > 0) {
			if (filterMode === 'include' && !categoriesFilterSet.has(cat)) continue
			if (filterMode === 'exclude' && categoriesFilterSet.has(cat)) continue
		}

		let score = 0
		if (isAll) {
			if (filterMode === 'exclude' && hasRealExcludedChains) {
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
			if (filterMode === 'exclude' && hasRealExcludedChains) {
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
					const resp = await fetch(`${PROTOCOL_API}/${slug}`)
					if (!resp.ok) return []
					const json = await resp.json()
					const chainTvls = json?.chainTvls || {}

					const opts: any = {}
					if (hasRealExcludedChains) {
						opts.filterMode = 'exclude'
						opts.excludeChains = Array.from(excludedChainSetForProtocols).filter((c) => c.toLowerCase() !== 'all')
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
	const hasRealExcludedChainsForTotal = hasRealExcludedChains || categoriesFilter.length > 0
	if (filterMode === 'exclude' && hasRealExcludedChainsForTotal) {
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
