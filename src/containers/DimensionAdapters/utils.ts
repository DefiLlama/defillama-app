import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { getNDistinctColors, slug } from '~/utils'
import type { IAdapterChainMetrics } from './api.types'
import type { ADAPTER_TYPES } from './constants'
import type { IChainsByAdapterPageData } from './types'

export type BribesData = {
	total24h: number | null
	total7d: number | null
	total30d: number | null
	total1y: number | null
	totalAllTime: number | null
}
export type OpenInterestData = { total24h: number | null; doublecounted: boolean }
export type ActiveLiquidityData = { total24h: number | null; doublecounted: boolean }
export type NormalizedVolumeData = { total24h: number | null }

type AggregatedProtocol = Omit<
	IAdapterChainMetrics['protocols'][0],
	'total24h' | 'total7d' | 'total30d' | 'total1y' | 'totalAllTime'
> & {
	total24h: number
	total7d: number
	total30d: number
	total1y: number
	totalAllTime: number
}

export function aggregateProtocolVersions(protocolVersions: IAdapterChainMetrics['protocols']): AggregatedProtocol {
	const aggregatedRevenue = {
		total24h: protocolVersions.reduce((sum, p) => sum + (p.total24h ?? 0), 0),
		total7d: protocolVersions.reduce((sum, p) => sum + (p.total7d ?? 0), 0),
		total30d: protocolVersions.reduce((sum, p) => sum + (p.total30d ?? 0), 0),
		total1y: protocolVersions.reduce((sum, p) => sum + (p.total1y ?? 0), 0),
		totalAllTime: protocolVersions.reduce((sum, p) => sum + (p.totalAllTime ?? 0), 0)
	}

	const breakdowns24h: Record<string, Record<string, number>>[] = []
	const breakdowns30d: Record<string, Record<string, number>>[] = []
	for (const p of protocolVersions) {
		if (p.breakdown24h) breakdowns24h.push(p.breakdown24h)
		if (p.breakdown30d) breakdowns30d.push(p.breakdown30d)
	}
	const mergedBreakdown24h = mergeBreakdowns(breakdowns24h)
	const mergedBreakdown30d = mergeBreakdowns(breakdowns30d)

	const parentProtocol = protocolVersions[0]
	return {
		...parentProtocol,
		name: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name,
		displayName: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.displayName,
		slug: slug(parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name),
		...aggregatedRevenue,
		chains: [...new Set(protocolVersions.flatMap((p) => p.chains))],
		breakdown24h: mergedBreakdown24h,
		breakdown30d: mergedBreakdown30d
	}
}

export function mergeBreakdowns(breakdowns: Record<string, Record<string, number>>[]) {
	const merged: Record<string, Record<string, number>> = {}
	for (const breakdown of breakdowns) {
		if (!breakdown) continue
		for (const chainName in breakdown) {
			const protocolData = breakdown[chainName]
			if (!merged[chainName]) {
				merged[chainName] = {}
			}
			for (const protocolName in protocolData) {
				const value = protocolData[protocolName]
				merged[chainName][protocolName] = (merged[chainName][protocolName] || 0) + value
			}
		}
	}
	return merged
}

export function groupProtocolsByParent<T extends { parentProtocol?: string; defillamaId: string }>(
	protocols: T[]
): Map<string, T[]> {
	const protocolGroups = new Map<string, T[]>()

	for (const protocol of protocols) {
		const parentKey = protocol.parentProtocol || protocol.defillamaId
		if (!protocolGroups.has(parentKey)) {
			protocolGroups.set(parentKey, [])
		}
		protocolGroups.get(parentKey)!.push(protocol)
	}

	return protocolGroups
}

export function processGroupedProtocols<T, R>(
	protocolGroups: Map<string, T[]>,
	processor: (protocolVersions: T[], parentKey: string) => R
): R[] {
	const processedData: R[] = []
	for (const [parentKey, protocolVersions] of protocolGroups) {
		processedData.push(processor(protocolVersions, parentKey))
	}
	return processedData
}

export function processRevenueDataForMatching(protocols: IAdapterChainMetrics['protocols']) {
	const protocolGroups = groupProtocolsByParent(protocols)

	return processGroupedProtocols(protocolGroups, (protocolVersions, parentKey) => {
		if (protocolVersions.length === 1) {
			return {
				...protocolVersions[0],
				parentKey,
				groupedName:
					protocolVersions[0].linkedProtocols?.[0] || protocolVersions[0].parentProtocol || protocolVersions[0].name
			}
		} else {
			const aggregatedProtocol = aggregateProtocolVersions(protocolVersions)
			return {
				...aggregatedProtocol,
				parentKey,
				groupedName:
					aggregatedProtocol.linkedProtocols?.[0] || aggregatedProtocol.parentProtocol || aggregatedProtocol.name
			}
		}
	})
}

export function matchRevenueToEarnings(
	revenueData: Array<{
		parentKey: string
		name: string
		displayName: string
		defillamaId: string
		groupedName: string
		total24h: number | null
		total7d: number | null
		total30d: number | null
		total1y: number | null
		totalAllTime: number | null
	}>,
	earningsProtocols: Array<{
		parentProtocol: string
		defillamaId: string
		name: string
		displayName: string
	}>
) {
	const matchedData: Record<string, BribesData> = {}

	for (const revenueProtocol of revenueData) {
		const matchingEarningsProtocol = earningsProtocols.find((earningsProto) => {
			const earningsParentKey = earningsProto.parentProtocol || earningsProto.defillamaId

			return (
				earningsParentKey === revenueProtocol.parentKey ||
				earningsProto.name === revenueProtocol.name ||
				earningsProto.displayName === revenueProtocol.displayName ||
				earningsProto.defillamaId === revenueProtocol.defillamaId ||
				earningsProto.name === revenueProtocol.groupedName ||
				earningsProto.displayName === revenueProtocol.groupedName
			)
		})

		if (matchingEarningsProtocol) {
			matchedData[matchingEarningsProtocol.name] = {
				total24h: revenueProtocol.total24h ?? null,
				total7d: revenueProtocol.total7d ?? null,
				total30d: revenueProtocol.total30d ?? null,
				total1y: revenueProtocol.total1y ?? null,
				totalAllTime: revenueProtocol.totalAllTime ?? null
			}
		}
	}

	return matchedData
}

export function buildAdapterByChainChartDataset({
	adapterType,
	metricName,
	primaryChartData,
	openInterestChartData,
	activeLiquidityChartData
}: {
	adapterType: `${ADAPTER_TYPES}`
	metricName: string
	primaryChartData: Array<[number, number]>
	openInterestChartData: Array<[number, number]>
	activeLiquidityChartData: Array<[number, number]>
}): MultiSeriesChart2Dataset {
	const toChartPointMap = (points: Array<[number, number]>) => {
		const map = new Map<number, number>()
		for (const [timestamp, value] of points) {
			map.set(timestamp * 1e3, value)
		}
		return map
	}

	const primaryDataMap = toChartPointMap(primaryChartData)
	const primaryDimensionLabel = metricName

	const secondaryDimensionLabel =
		adapterType === 'derivatives' ? 'Open Interest' : adapterType === 'normalized-volume' ? 'Active Liquidity' : null

	const secondarySourceData =
		adapterType === 'derivatives'
			? openInterestChartData
			: adapterType === 'normalized-volume'
				? activeLiquidityChartData
				: []

	const secondaryDataMap = toChartPointMap(secondarySourceData)
	const hasSecondarySeries = secondaryDataMap.size > 0

	const allTimestamps = new Set<number>([...primaryDataMap.keys(), ...secondaryDataMap.keys()])
	const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

	const source = sortedTimestamps.map((timestamp) => {
		if (hasSecondarySeries && secondaryDimensionLabel) {
			return {
				timestamp,
				[primaryDimensionLabel]: primaryDataMap.get(timestamp) ?? null,
				[secondaryDimensionLabel]: secondaryDataMap.get(timestamp) ?? null
			}
		}

		return {
			timestamp,
			[primaryDimensionLabel]: primaryDataMap.get(timestamp) ?? null
		}
	})

	return {
		source,
		dimensions: hasSecondarySeries
			? ['timestamp', primaryDimensionLabel, secondaryDimensionLabel as string]
			: ['timestamp', primaryDimensionLabel]
	}
}

export function getChartDataByChainAndInterval({
	chartData,
	chartInterval,
	selectedChains,
	chartType
}: {
	chartData: IChainsByAdapterPageData['chartData']
	chartInterval: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	selectedChains: string[]
	chartType: 'Volume' | 'Dominance'
}) {
	const isDominance = chartType === 'Dominance'
	const isCumulative = chartInterval === 'cumulative'
	const groupBy = isCumulative
		? 'cumulative'
		: chartInterval === 'weekly'
			? 'weekly'
			: chartInterval === 'monthly'
				? 'monthly'
				: 'daily'

	const chainTotals = new Map<string, number>()
	const chainSeries = new Map<string, Array<[number, number]>>()

	for (const row of chartData.source) {
		const timestamp = Number(row.timestamp)
		for (const chain of selectedChains) {
			const value = row[chain]
			if (typeof value === 'number') {
				chainTotals.set(chain, (chainTotals.get(chain) ?? 0) + value)
				let series = chainSeries.get(chain)
				if (!series) {
					series = []
					chainSeries.set(chain, series)
				}
				series.push([timestamp, value])
			}
		}
	}

	const ranked = Array.from(chainTotals.entries()).toSorted((a, b) => b[1] - a[1])
	const topChains: string[] = []
	const otherChainNames: string[] = []
	for (let i = 0; i < ranked.length; i++) {
		if (i < 10) topChains.push(ranked[i][0])
		else otherChainNames.push(ranked[i][0])
	}

	let othersSeries: Array<[number, number]> | null = null
	if (otherChainNames.length > 0) {
		const othersMap = new Map<number, number>()
		for (const chain of otherChainNames) {
			for (const [ts, value] of chainSeries.get(chain)!) {
				othersMap.set(ts, (othersMap.get(ts) ?? 0) + value)
			}
		}
		othersSeries = Array.from(othersMap.entries()).sort((a, b) => a[0] - b[0])
	}

	const seriesNames = othersSeries ? [...topChains, 'Others'] : [...topChains]

	const groupedSeries = new Map<string, Array<[number, number | null]>>()
	for (const chain of topChains) {
		groupedSeries.set(
			chain,
			formatBarChart({ data: chainSeries.get(chain)!, groupBy, dateInMs: true, denominationPriceHistory: null })
		)
	}
	if (othersSeries) {
		groupedSeries.set(
			'Others',
			formatBarChart({ data: othersSeries, groupBy, dateInMs: true, denominationPriceHistory: null })
		)
	}

	const allColors = getNDistinctColors(seriesNames.length || 1)
	const colorByChain = Object.fromEntries(seriesNames.map((chain, i) => [chain, allColors[i]]))

	const rowMap = new Map<number, Record<string, number>>()
	for (const chain of seriesNames) {
		for (const [timestamp, value] of groupedSeries.get(chain)!) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[chain] = value ?? 0
			rowMap.set(timestamp, row)
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))
	for (const row of source) {
		for (const chain of seriesNames) {
			if (!(chain in row)) row[chain] = 0
		}
	}

	const finalSource = isDominance
		? source.map((row) => {
				const nextRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
				let total = 0
				for (const chain of seriesNames) {
					if (row[chain] > 0) total += row[chain]
				}
				for (const chain of seriesNames) {
					nextRow[chain] = total > 0 ? (row[chain] / total) * 100 : 0
				}
				return nextRow
			})
		: source

	const charts = seriesNames.map((chain) => ({
		type: (isDominance || isCumulative ? 'line' : 'bar') as 'line' | 'bar',
		name: chain,
		encode: { x: 'timestamp', y: chain },
		...(isDominance || !isCumulative ? { stack: 'chain' as const } : {}),
		color: colorByChain[chain]
	}))

	return {
		dataset: { source: finalSource, dimensions: ['timestamp', ...seriesNames] },
		charts
	}
}
