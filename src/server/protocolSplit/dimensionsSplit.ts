import { DIMENSIONS_OVERVIEW_API, PROTOCOLS_API } from '~/constants'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'
import { toInternalSlug } from '~/utils/chainNormalizer'
import { METRIC_CONFIG_BASE, toSlug } from '~/utils/protocolSplit'
import { ChartSeries, ProtocolSplitData } from './types'

export const DIMENSIONS_METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	...METRIC_CONFIG_BASE,
	'open-interest': { endpoint: 'open-interest', dataType: 'openInterestAtEnd', metricName: 'open interest' }
}

type DimensionsSplitParams = {
	metric: string
	chains: string[]
	categories: string[]
	topN: number
	groupByParent: boolean
	filterMode: 'include' | 'exclude'
}

type ChainResult = { chain: string; data: any }

const buildEmptySplit = (
	chainsArray: string[],
	categoriesArray: string[],
	metricName: string,
	topN: number,
	error?: string
): ProtocolSplitData => ({
	series: [],
	metadata: {
		chain: chainsArray.join(','),
		chains: chainsArray,
		categories: categoriesArray,
		metric: metricName,
		topN,
		totalProtocols: 0,
		othersCount: 0,
		marketSector: categoriesArray.join(',') || null,
		...(error ? { error } : {})
	}
})

const fetchChainResults = async (chainsArray: string[], metric: string): Promise<ChainResult[]> => {
	const config = DIMENSIONS_METRIC_CONFIG[metric]
	const chainDataPromises = chainsArray.map(async (singleChain) => {
		let apiChain = toInternalSlug(singleChain)

		let apiUrl =
			apiChain && apiChain !== 'all'
				? `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}/${apiChain}?excludeTotalDataChartBreakdown=false`
				: `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`

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

	return (await Promise.all(chainDataPromises)).filter(Boolean) as ChainResult[]
}

const toBreakdownMap = (breakdown: Array<[number, Record<string, number>]>): Map<number, Map<string, number>> => {
	const map = new Map<number, Map<string, number>>()
	breakdown.forEach(([ts, protocols]) => {
		const m = new Map<string, number>()
		Object.entries(protocols || {}).forEach(([name, v]) => m.set(name, v as number))
		map.set(ts, m)
	})
	return map
}

const buildAggregatedBreakdown = async (
	chainsArray: string[],
	metric: string,
	filterMode: 'include' | 'exclude',
	chainResults: ChainResult[]
): Promise<Map<number, Map<string, number>>> => {
	const aggregatedBreakdown = new Map<number, Map<string, number>>()

	const realChainsToExclude = chainsArray.filter((c) => c.toLowerCase() !== 'all')
	const hasRealChainsToExclude = filterMode === 'exclude' && realChainsToExclude.length > 0

	if (hasRealChainsToExclude) {
		const config = DIMENSIONS_METRIC_CONFIG[metric]
		let allUrl = `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`
		if (config.dataType) allUrl += `&dataType=${config.dataType}`
		const allResp = await fetch(allUrl)
		const allJson = await allResp.json()
		const allBreakdown: Array<[number, Record<string, number>]> = allJson?.totalDataChartBreakdown || []
		const allMap = toBreakdownMap(allBreakdown)

		const excludedResults = await Promise.all(
			realChainsToExclude.map(async (singleChain) => {
				let apiChain = toInternalSlug(singleChain)
				let url = `${DIMENSIONS_OVERVIEW_API}/${config.endpoint}/${apiChain}?excludeTotalDataChartBreakdown=false`
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
			excludedMaps.push(toBreakdownMap(ex.totalDataChartBreakdown))
		}

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

	return aggregatedBreakdown
}

export const getDimensionsSplitData = async ({
	metric,
	chains,
	categories,
	topN,
	groupByParent,
	filterMode
}: DimensionsSplitParams): Promise<ProtocolSplitData> => {
	const config = DIMENSIONS_METRIC_CONFIG[metric]
	if (!config) {
		throw new Error(`Unsupported metric: ${metric}`)
	}

	const chainsArray = chains.length > 0 ? chains : ['all']
	const categoriesArray = (categories || []).map((cat) => cat.toLowerCase())

	const chainResults = await fetchChainResults(chainsArray, metric)

	if (chainResults.length === 0 && filterMode === 'include') {
		return buildEmptySplit(
			chainsArray,
			categoriesArray,
			config.metricName,
			topN,
			`No data available for chains: ${chainsArray.join(', ')}`
		)
	}

	const aggregatedBreakdown = await buildAggregatedBreakdown(chainsArray, metric, filterMode, chainResults)

	const data = {
		totalDataChartBreakdown: Array.from(aggregatedBreakdown.entries())
			.sort(([a], [b]) => a - b)
			.map(([timestamp, protocols]) => [timestamp, Object.fromEntries(protocols.entries())])
	}

	if (!data.totalDataChartBreakdown || !Array.isArray(data.totalDataChartBreakdown)) {
		return buildEmptySplit(chainsArray, categoriesArray, config.metricName, topN)
	}

	const lastDayData = data.totalDataChartBreakdown[data.totalDataChartBreakdown.length - 2]
	if (!lastDayData || !lastDayData[1]) {
		return buildEmptySplit(chainsArray, categoriesArray, config.metricName, topN)
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
		if (filterMode === 'exclude') {
			protocolEntries = protocolEntries.filter((p) => !categoriesArray.includes(getCategory(p.name)))
		} else {
			protocolEntries = protocolEntries.filter((p) => categoriesArray.includes(getCategory(p.name)))
		}
	}

	let topProtocols: string[]
	let topProtocolsSet: Set<string>
	let protocolNameMapping: Map<string, string> = new Map()
	let protocolFamilyValues: Map<string, { name: string; value: number; isParent: boolean }> = new Map()

	if (groupByParent) {
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
				if (filterMode === 'exclude') {
					if (categoriesArray.includes(cat)) return
				} else {
					if (!categoriesArray.includes(cat)) return
				}
			}

			const protocolValue = value as number
			dayTotal += protocolValue

			const displayName = groupByParent ? protocolNameMapping.get(protocolName) || protocolName : protocolName

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
	const totalFamilies = groupByParent ? protocolFamilyValues.size : protocolEntries.length
	const othersCount = Math.max(0, totalFamilies - topN)

	if (hasOthersData) {
		series.push({
			name: `Others (${othersCount} protocols)`,
			data: othersData,
			color: '#999999'
		})
	}

	return {
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
	}
}
