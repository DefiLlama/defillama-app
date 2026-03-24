import type {
	ChartTimeGrouping,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { getNDistinctColors, slug } from '~/utils'
import type { IAdapterChainMetrics } from './api.types'
import type { ADAPTER_TYPES } from './constants'
import type { IChainsByAdapterPageData, IProtocol } from './types'

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

export type ChainsByAdapterChartKind = 'bar' | 'line' | 'treemap' | 'hbar'
export type ChainsByAdapterValueMode = 'absolute' | 'relative'
export type ChainsByAdapterBarLayout = 'stacked' | 'separate'

export type ChainsByAdapterChartState =
	| {
			chartKind: 'bar'
			valueMode: ChainsByAdapterValueMode
			barLayout: ChainsByAdapterBarLayout
			groupBy: ChartTimeGrouping
	  }
	| {
			chartKind: 'line'
			groupBy: ChartTimeGrouping
	  }
	| {
			chartKind: 'treemap'
	  }
	| {
			chartKind: 'hbar'
	  }

export type ChainsByAdapterLatestValueDatum = {
	name: string
	value: number
	share: number
	itemStyle: { color: string }
}

type BreakdownLatestValueRow = {
	name: string
	total24h: number | null
}

type ChainsByAdapterBarPresentation = {
	kind: 'bar'
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	valueMode: ChainsByAdapterValueMode
	barLayout: ChainsByAdapterBarLayout
	showTotalInTooltip: boolean
	groupBy: ChartTimeGrouping
}

type ChainsByAdapterLinePresentation = {
	kind: 'line'
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	groupBy: ChartTimeGrouping
}

type ChainsByAdapterTreemapPresentation = {
	kind: 'treemap'
	data: ChainsByAdapterLatestValueDatum[]
}

type ChainsByAdapterHBarPresentation = {
	kind: 'hbar'
	data: ChainsByAdapterLatestValueDatum[]
}

export type ChainsByAdapterChartPresentation =
	| ChainsByAdapterBarPresentation
	| ChainsByAdapterLinePresentation
	| ChainsByAdapterTreemapPresentation
	| ChainsByAdapterHBarPresentation

const DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY: ChartTimeGrouping = 'daily'
const VALID_BAR_GROUPINGS = new Set<ChartTimeGrouping>(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
const MAX_CHAINS_BY_ADAPTER_HBAR_ITEMS = 9

function toValidChartGrouping(value: string | undefined | null): ChartTimeGrouping | null {
	if (!value) return null
	return VALID_BAR_GROUPINGS.has(value as ChartTimeGrouping) ? (value as ChartTimeGrouping) : null
}

export function normalizeChainsByAdapterChartState({
	chartKindParam,
	valueModeParam,
	barLayoutParam,
	groupByParam,
	legacyChartTypeParam
}: {
	chartKindParam?: string | null
	valueModeParam?: string | null
	barLayoutParam?: string | null
	groupByParam?: string | null
	legacyChartTypeParam?: string | null
}): ChainsByAdapterChartState {
	const normalizedGroupBy = groupByParam?.toLowerCase()
	if (normalizedGroupBy === 'cumulative') {
		return { chartKind: 'line', groupBy: DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY }
	}

	const normalizedChartKind = chartKindParam?.toLowerCase()
	if (normalizedChartKind === 'line') {
		return {
			chartKind: 'line',
			groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY
		}
	}
	if (normalizedChartKind === 'treemap') {
		return { chartKind: 'treemap' }
	}
	if (normalizedChartKind === 'hbar') {
		return { chartKind: 'hbar' }
	}
	if (legacyChartTypeParam?.toLowerCase() === 'dominance') {
		return {
			chartKind: 'line',
			groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY
		}
	}

	return {
		chartKind: 'bar',
		valueMode: valueModeParam?.toLowerCase() === 'relative' ? 'relative' : 'absolute',
		barLayout: barLayoutParam?.toLowerCase() === 'separate' ? 'separate' : 'stacked',
		groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY
	}
}

function createSeriesUniverse({
	chartData,
	selectedEntities
}: {
	chartData: MultiSeriesChart2Dataset
	selectedEntities: string[]
}) {
	const entityTotals = new Map<string, number>()
	const entitySeries = new Map<string, Array<[number, number]>>()

	for (const row of chartData.source) {
		const timestamp = Number(row.timestamp)
		for (const entity of selectedEntities) {
			const value = row[entity]
			if (typeof value === 'number') {
				entityTotals.set(entity, (entityTotals.get(entity) ?? 0) + value)
				let series = entitySeries.get(entity)
				if (!series) {
					series = []
					entitySeries.set(entity, series)
				}
				series.push([timestamp, value])
			}
		}
	}

	const ranked = Array.from(entityTotals.entries()).toSorted((a, b) => b[1] - a[1])
	const topEntityNames = ranked.slice(0, 10).map(([entity]) => entity)
	const otherEntityNames = ranked.slice(10).map(([entity]) => entity)
	const topSeries = new Map<string, Array<[number, number]>>()

	for (const entity of topEntityNames) {
		const series = entitySeries.get(entity)
		if (series) {
			topSeries.set(entity, series)
		}
	}

	if (otherEntityNames.length > 0) {
		const othersMap = new Map<number, number>()
		for (const entity of otherEntityNames) {
			for (const [ts, value] of entitySeries.get(entity) ?? []) {
				othersMap.set(ts, (othersMap.get(ts) ?? 0) + value)
			}
		}
		topSeries.set(
			'Others',
			Array.from(othersMap.entries()).sort((a, b) => a[0] - b[0])
		)
	}

	const topSeriesNames = Array.from(topSeries.keys())
	const topColors = getNDistinctColors(topSeriesNames.length || 1)
	const topColorByChain = Object.fromEntries(topSeriesNames.map((chain, i) => [chain, topColors[i]]))

	return {
		topSeries,
		topSeriesNames,
		topColorByChain
	}
}

function buildDenseRowsFromGroupedSeries(
	groupedSeries: Map<string, Array<[number, number | null]>>,
	seriesNames: string[]
): MultiSeriesChart2Dataset {
	const rowMap = new Map<number, Record<string, number | null>>()

	for (const seriesName of seriesNames) {
		for (const [timestamp, value] of groupedSeries.get(seriesName) ?? []) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[seriesName] = value
			rowMap.set(timestamp, row)
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))
	for (const row of source) {
		for (const seriesName of seriesNames) {
			if (!(seriesName in row)) row[seriesName] = null
		}
	}

	return {
		source,
		dimensions: ['timestamp', ...seriesNames]
	}
}

function normalizeDatasetToPercent(dataset: MultiSeriesChart2Dataset, seriesNames: string[]): MultiSeriesChart2Dataset {
	return {
		dimensions: dataset.dimensions,
		source: dataset.source.map((row) => {
			const nextRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
			let total = 0
			for (const seriesName of seriesNames) {
				const value = row[seriesName]
				if (typeof value === 'number' && Number.isFinite(value) && value > 0) total += value
			}
			for (const seriesName of seriesNames) {
				const value = row[seriesName]
				if (typeof value !== 'number' || !Number.isFinite(value)) {
					nextRow[seriesName] = null
					continue
				}
				nextRow[seriesName] = total > 0 ? (value / total) * 100 : 0
			}
			return nextRow
		})
	}
}

function buildBarPresentation({
	topSeries,
	topSeriesNames,
	topColorByChain,
	state
}: {
	topSeries: Map<string, Array<[number, number]>>
	topSeriesNames: string[]
	topColorByChain: Record<string, string>
	state: Extract<ChainsByAdapterChartState, { chartKind: 'bar' }>
}): ChainsByAdapterBarPresentation {
	const groupedSeries = new Map<string, Array<[number, number | null]>>()

	for (const seriesName of topSeriesNames) {
		groupedSeries.set(
			seriesName,
			formatBarChart({
				data: topSeries.get(seriesName) ?? [],
				groupBy: state.groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})
		)
	}

	const absoluteDataset = buildDenseRowsFromGroupedSeries(groupedSeries, topSeriesNames)
	const finalDataset =
		state.valueMode === 'relative' ? normalizeDatasetToPercent(absoluteDataset, topSeriesNames) : absoluteDataset

	return {
		kind: 'bar',
		dataset: finalDataset,
		charts: topSeriesNames.map((seriesName) => ({
			type: 'bar',
			name: seriesName,
			encode: { x: 'timestamp', y: seriesName },
			...(state.barLayout === 'stacked' ? { stack: 'chain' as const } : {}),
			color: topColorByChain[seriesName]
		})),
		valueMode: state.valueMode,
		barLayout: state.barLayout,
		showTotalInTooltip: state.valueMode === 'absolute' && state.barLayout === 'stacked',
		groupBy: state.groupBy
	}
}

function buildLinePresentation({
	topSeries,
	topSeriesNames,
	topColorByChain,
	state
}: {
	topSeries: Map<string, Array<[number, number]>>
	topSeriesNames: string[]
	topColorByChain: Record<string, string>
	state: Extract<ChainsByAdapterChartState, { chartKind: 'line' }>
}): ChainsByAdapterLinePresentation {
	const groupedSeries = new Map<string, Array<[number, number | null]>>()

	for (const seriesName of topSeriesNames) {
		groupedSeries.set(
			seriesName,
			formatBarChart({
				data: topSeries.get(seriesName) ?? [],
				groupBy: state.groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})
		)
	}

	const groupedDataset = buildDenseRowsFromGroupedSeries(groupedSeries, topSeriesNames)
	const relativeDataset = normalizeDatasetToPercent(groupedDataset, topSeriesNames)

	return {
		kind: 'line',
		dataset: relativeDataset,
		charts: topSeriesNames.map((seriesName) => ({
			type: 'line',
			name: seriesName,
			encode: { x: 'timestamp', y: seriesName },
			color: topColorByChain[seriesName],
			stack: 'chain'
		})),
		groupBy: state.groupBy
	}
}

function buildTreemapPresentation({
	selectedEntities,
	latestRows
}: {
	selectedEntities: string[]
	latestRows: BreakdownLatestValueRow[]
}): ChainsByAdapterLatestValueDatum[] {
	const latestValuesByName = new Map<string, number>()
	for (const row of latestRows) {
		const value = row.total24h
		if (typeof value === 'number' && Number.isFinite(value)) {
			latestValuesByName.set(row.name, value)
		}
	}

	const values = selectedEntities
		.map((entityName) => {
			const rawValue = latestValuesByName.get(entityName) ?? 0
			const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
			return {
				name: entityName,
				value: Number.isFinite(value) ? value : 0
			}
		})
		.filter((item) => item.value > 0)
		.toSorted((a, b) => b.value - a.value)

	const total = values.reduce((sum, item) => sum + item.value, 0)
	const colors = getNDistinctColors(values.length || 1)

	return values.map((item, index) => ({
		...item,
		share: total > 0 ? (item.value / total) * 100 : 0,
		itemStyle: {
			color: colors[index]
		}
	}))
}

function buildHBarPresentation({
	selectedEntities,
	latestRows
}: {
	selectedEntities: string[]
	latestRows: BreakdownLatestValueRow[]
}): ChainsByAdapterLatestValueDatum[] {
	const rankedValues = buildTreemapPresentation({ selectedEntities, latestRows })

	if (rankedValues.length <= MAX_CHAINS_BY_ADAPTER_HBAR_ITEMS) {
		return rankedValues
	}

	const topValues = rankedValues.slice(0, MAX_CHAINS_BY_ADAPTER_HBAR_ITEMS)
	const othersValue = rankedValues.slice(MAX_CHAINS_BY_ADAPTER_HBAR_ITEMS).reduce((sum, item) => sum + item.value, 0)

	if (othersValue <= 0) {
		return topValues
	}

	const limitedValues = [...topValues, { name: 'Others', value: othersValue }]
	const total = limitedValues.reduce((sum, item) => sum + item.value, 0)
	const colors = getNDistinctColors(limitedValues.length)

	return limitedValues.map((item, index) => ({
		...item,
		share: total > 0 ? (item.value / total) * 100 : 0,
		itemStyle: {
			color: colors[index]
		}
	}))
}

function buildBreakdownChartPresentation({
	chartData,
	selectedEntities,
	state,
	latestRows
}: {
	chartData: MultiSeriesChart2Dataset
	selectedEntities: string[]
	state: ChainsByAdapterChartState
	latestRows: BreakdownLatestValueRow[]
}): ChainsByAdapterChartPresentation {
	if (state.chartKind === 'treemap') {
		return {
			kind: 'treemap',
			data: buildTreemapPresentation({ selectedEntities, latestRows })
		}
	}

	if (state.chartKind === 'hbar') {
		return {
			kind: 'hbar',
			data: buildHBarPresentation({ selectedEntities, latestRows })
		}
	}

	const { topSeries, topSeriesNames, topColorByChain } = createSeriesUniverse({ chartData, selectedEntities })

	if (state.chartKind === 'line') {
		return buildLinePresentation({ topSeries, topSeriesNames, topColorByChain, state })
	}

	return buildBarPresentation({ topSeries, topSeriesNames, topColorByChain, state })
}

function getAdapterByChainLatestProtocolRows(protocols: IProtocol[]): BreakdownLatestValueRow[] {
	return protocols.map((protocol) => ({ name: protocol.name, total24h: protocol.total24h }))
}

export function buildChainsByAdapterChartPresentation({
	chartData,
	selectedChains,
	state,
	latestChainRows
}: {
	chartData: IChainsByAdapterPageData['chartData']
	selectedChains: string[]
	state: ChainsByAdapterChartState
	latestChainRows: IChainsByAdapterPageData['chains']
}): ChainsByAdapterChartPresentation {
	return buildBreakdownChartPresentation({
		chartData,
		selectedEntities: selectedChains,
		state,
		latestRows: latestChainRows
	})
}

export function buildAdapterByChainChartPresentation({
	chartData,
	selectedBreakdownProtocols,
	state,
	protocols,
	selectedLatestValueProtocols
}: {
	chartData: MultiSeriesChart2Dataset
	selectedBreakdownProtocols: string[]
	state: ChainsByAdapterChartState
	protocols: IProtocol[]
	selectedLatestValueProtocols: string[]
}): ChainsByAdapterChartPresentation {
	if (state.chartKind === 'treemap' || state.chartKind === 'hbar') {
		const selectedLatestValueProtocolsSet = new Set(selectedLatestValueProtocols)
		const latestRows = getAdapterByChainLatestProtocolRows(protocols).filter((row) =>
			selectedLatestValueProtocolsSet.has(row.name)
		)
		const selectedLatestProtocolNames = latestRows.map((row) => row.name)

		return state.chartKind === 'treemap'
			? {
					kind: 'treemap',
					data: buildTreemapPresentation({ selectedEntities: selectedLatestProtocolNames, latestRows })
				}
			: {
					kind: 'hbar',
					data: buildHBarPresentation({ selectedEntities: selectedLatestProtocolNames, latestRows })
				}
	}

	return buildBreakdownChartPresentation({
		chartData,
		selectedEntities: selectedBreakdownProtocols,
		state,
		latestRows: getAdapterByChainLatestProtocolRows(protocols)
	})
}
