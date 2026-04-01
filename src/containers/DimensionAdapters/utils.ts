import type {
	ChartTimeGroupingWithCumulative,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart } from '~/components/ECharts/utils'
import { getNDistinctColors, slug } from '~/utils'
import { parseExcludeParam } from '~/utils/routerQuery'
import type { IAdapterChainMetrics } from './api.types'
import type { ADAPTER_TYPES } from './constants'
import type { IAdapterByChainPageData, IChainsByAdapterPageData, IProtocol } from './types'

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

/** Table/category filter: which protocol rows belong to the selected categories (including child protocols). */
export function getProtocolsByCategory(
	protocols: IAdapterByChainPageData['protocols'],
	categoriesToFilter: Array<string>
): IProtocol[] {
	const final: IProtocol[] = []

	for (const protocol of protocols) {
		if (protocol.childProtocols) {
			const childProtocols = protocol.childProtocols.filter(
				(childProtocol) => childProtocol.category && categoriesToFilter.includes(childProtocol.category)
			)

			if (childProtocols.length === protocol.childProtocols.length) {
				final.push(protocol)
			} else {
				for (const childProtocol of childProtocols) {
					final.push(childProtocol)
				}
			}

			continue
		}

		if (protocol.category && categoriesToFilter.includes(protocol.category)) {
			final.push(protocol)
			continue
		}
	}

	return final
}

/** Leaf `name`s for breakdown filter: parents with children are omitted; children are included recursively. */
export function leafProtocolNamesFromTableRows(protocols: IProtocol[]): string[] {
	const walk = (p: IProtocol): IProtocol[] =>
		p.childProtocols && p.childProtocols.length > 0 ? p.childProtocols.flatMap(walk) : [p]
	return protocols
		.flatMap(walk)
		.toSorted((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
		.map((p) => p.name)
}

export type CategoryProtocolNameFilter =
	| { kind: 'unrestricted' }
	| { kind: 'no-rows' }
	| { kind: 'restricted'; names: Set<string> }

/**
 * Same category selection rules as the adapter-by-chain table; used to align breakdown chart series with the table.
 */
export function getCategoryProtocolNameFilterForChart({
	categories,
	protocols,
	categoryParam,
	excludeCategoryParam,
	hasCategoryParam
}: {
	categories: string[]
	protocols: IProtocol[]
	categoryParam: string | string[] | undefined
	excludeCategoryParam: string | string[] | undefined
	hasCategoryParam: boolean
}): CategoryProtocolNameFilter {
	const excludeSet = parseExcludeParam(excludeCategoryParam)

	let selectedCategories =
		categories.length > 0 && hasCategoryParam && categoryParam === ''
			? []
			: categoryParam
				? typeof categoryParam === 'string'
					? [categoryParam]
					: categoryParam
				: categories

	selectedCategories = excludeSet.size > 0 ? selectedCategories.filter((c) => !excludeSet.has(c)) : selectedCategories

	const categoriesToFilter = selectedCategories.filter((c) => c.toLowerCase() !== 'all' && c.toLowerCase() !== 'none')

	if (categories.length === 0) {
		return { kind: 'unrestricted' }
	}

	if (selectedCategories.length === 0) {
		return { kind: 'no-rows' }
	}

	if (categoriesToFilter.length > 0) {
		const filtered = getProtocolsByCategory(protocols, categoriesToFilter)
		return { kind: 'restricted', names: new Set(leafProtocolNamesFromTableRows(filtered)) }
	}

	return { kind: 'unrestricted' }
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

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

function toChartTimestamp(timestamp: number) {
	return timestamp < 1e12 ? timestamp * 1e3 : timestamp
}

export function mergeSingleDimensionChartDataset({
	chartData,
	extraCharts
}: {
	chartData: MultiSeriesChart2Dataset
	extraCharts: Array<Array<[number, number]>>
}): MultiSeriesChart2Dataset {
	assert(chartData.dimensions[0] === 'timestamp', 'Expected timestamp dimension')
	assert(chartData.dimensions.length === 2, 'Expected a single chart dimension')

	const dimension = chartData.dimensions[1]
	const rows = new Map<number, number | null>()

	for (const row of chartData.source) {
		const value = row[dimension]
		rows.set(Number(row.timestamp), typeof value === 'number' ? value : null)
	}

	for (const extraChart of extraCharts) {
		for (const [timestamp, value] of extraChart) {
			const chartTimestamp = toChartTimestamp(timestamp)
			rows.set(chartTimestamp, (rows.get(chartTimestamp) ?? 0) + value)
		}
	}

	return {
		dimensions: ['timestamp', dimension],
		source: Array.from(rows.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([timestamp, value]) => ({
				timestamp,
				[dimension]: value
			}))
	}
}

export function mergeBreakdownCharts({
	chart,
	extraCharts
}: {
	chart: Array<[number, Record<string, number>]>
	extraCharts: Array<Array<[number, Record<string, number>]>>
}): Array<[number, Record<string, number>]> {
	const rows = new Map<number, Record<string, number>>()

	const mergeChart = (input: Array<[number, Record<string, number>]>) => {
		for (const [timestamp, values] of input) {
			const row = rows.get(timestamp) ?? {}
			for (const key in values) {
				row[key] = (row[key] ?? 0) + values[key]
			}
			rows.set(timestamp, row)
		}
	}

	mergeChart(chart)
	for (const extraChart of extraCharts) {
		mergeChart(extraChart)
	}

	return Array.from(rows.entries()).sort((a, b) => a[0] - b[0])
}

export type ProtocolBreakdownNormalization = {
	canonicalBySeriesName: Record<string, string>
	aliasesByCanonicalName: Record<string, string[]>
	signature: string
}

export function buildProtocolBreakdownNormalization(protocols: IProtocol[]): ProtocolBreakdownNormalization {
	const canonicalBySeriesName = new Map<string, string>()
	const aliasesByCanonicalName = new Map<string, Set<string>>()

	const addAlias = (seriesName: string, canonicalName: string) => {
		canonicalBySeriesName.set(seriesName, canonicalName)
		const aliases = aliasesByCanonicalName.get(canonicalName) ?? new Set<string>()
		aliases.add(seriesName)
		aliasesByCanonicalName.set(canonicalName, aliases)
	}

	const walk = (protocol: IProtocol, canonicalName = protocol.name) => {
		addAlias(protocol.name, canonicalName)
		for (const alias of protocol.breakdownAliases ?? []) {
			addAlias(alias, canonicalName)
		}
		for (const childProtocol of protocol.childProtocols ?? []) {
			walk(childProtocol, canonicalName)
		}
	}

	for (const protocol of protocols) {
		walk(protocol)
	}

	const canonicalRecord = Object.fromEntries(
		Array.from(canonicalBySeriesName.entries()).toSorted((a, b) => a[0].localeCompare(b[0]))
	)
	const aliasesRecord = Object.fromEntries(
		Array.from(aliasesByCanonicalName.entries())
			.toSorted((a, b) => a[0].localeCompare(b[0]))
			.map(([canonicalName, aliases]) => [canonicalName, Array.from(aliases).toSorted((a, b) => a.localeCompare(b))])
	)

	return {
		canonicalBySeriesName: canonicalRecord,
		aliasesByCanonicalName: aliasesRecord,
		signature: JSON.stringify(canonicalRecord)
	}
}

export function normalizeProtocolBreakdownChartData({
	chart,
	normalization
}: {
	chart: Array<[number, Record<string, number>]>
	normalization: ProtocolBreakdownNormalization
}): {
	chartData: MultiSeriesChart2Dataset
	protocolDimensions: string[]
} {
	const protocolValuesByTimestamp = new Map<number, Record<string, number>>()
	const protocolTotals = new Map<string, number>()

	for (const [timestamp, protocolValues] of chart) {
		const valuesAtTimestamp: Record<string, number> = {}

		for (const [protocolName, value] of Object.entries(protocolValues)) {
			const canonicalName = normalization.canonicalBySeriesName[protocolName]
			if (!canonicalName) continue

			valuesAtTimestamp[canonicalName] = (valuesAtTimestamp[canonicalName] ?? 0) + value
			protocolTotals.set(canonicalName, (protocolTotals.get(canonicalName) ?? 0) + value)
		}

		if (Object.keys(valuesAtTimestamp).length > 0) {
			protocolValuesByTimestamp.set(timestamp * 1e3, valuesAtTimestamp)
		}
	}

	const protocolDimensions = Array.from(protocolTotals.entries())
		.toSorted((a, b) => b[1] - a[1])
		.map(([name]) => name)

	if (protocolDimensions.length === 0) {
		return {
			chartData: { source: [], dimensions: ['timestamp'] },
			protocolDimensions: []
		}
	}

	const sortedTimestamps = Array.from(protocolValuesByTimestamp.keys()).sort((a, b) => a - b)
	const source = sortedTimestamps.map((timestamp) => {
		const row: Record<string, number | null> = { timestamp }
		const valuesAtTimestamp = protocolValuesByTimestamp.get(timestamp)
		for (const protocolName of protocolDimensions) {
			row[protocolName] = valuesAtTimestamp?.[protocolName] ?? null
		}
		return row
	})

	return {
		chartData: {
			source,
			dimensions: ['timestamp', ...protocolDimensions]
		},
		protocolDimensions
	}
}

export function mergeNamedDimensionChartDataset({
	chartData,
	extraCharts
}: {
	chartData: MultiSeriesChart2Dataset
	extraCharts: Array<Array<[number, Record<string, number>]>>
}): MultiSeriesChart2Dataset {
	assert(chartData.dimensions[0] === 'timestamp', 'Expected timestamp dimension')

	const dimensions = chartData.dimensions.filter((dimension) => dimension !== 'timestamp')
	const rows = new Map<number, Record<string, number | null>>()

	for (const row of chartData.source) {
		const nextRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
		for (const dimension of dimensions) {
			const value = row[dimension]
			nextRow[dimension] = typeof value === 'number' ? value : null
		}
		rows.set(Number(row.timestamp), nextRow)
	}

	for (const extraChart of extraCharts) {
		for (const [timestamp, values] of extraChart) {
			const chartTimestamp = toChartTimestamp(timestamp)
			const row = rows.get(chartTimestamp) ?? { timestamp: chartTimestamp }

			for (const dimension of dimensions) {
				if (!(dimension in row)) {
					row[dimension] = null
				}
			}

			for (const key in values) {
				if (!(key in row)) continue
				row[key] = (row[key] ?? 0) + values[key]
			}

			rows.set(chartTimestamp, row)
		}
	}

	return {
		dimensions: chartData.dimensions,
		source: Array.from(rows.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
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
			groupBy: ChartTimeGroupingWithCumulative
	  }
	| {
			chartKind: 'line'
			groupBy: ChartTimeGroupingWithCumulative
	  }
	| {
			chartKind: 'treemap'
			groupBy: ChartTimeGroupingWithCumulative
	  }
	| {
			chartKind: 'hbar'
			groupBy: ChartTimeGroupingWithCumulative
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
	groupBy: ChartTimeGroupingWithCumulative
}

type ChainsByAdapterLinePresentation = {
	kind: 'line'
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
	groupBy: ChartTimeGroupingWithCumulative
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

type ChainsByAdapterBarState = Extract<ChainsByAdapterChartState, { chartKind: 'bar' }>
type ChainsByAdapterLineState = Extract<ChainsByAdapterChartState, { chartKind: 'line' }>
type LatestValueSeriesType = 'bar' | 'line'

const DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY: ChartTimeGroupingWithCumulative = 'daily'
const VALID_GROUPINGS = new Set<ChartTimeGroupingWithCumulative>([
	'daily',
	'weekly',
	'monthly',
	'quarterly',
	'yearly',
	'cumulative'
])
const MAX_BREAKDOWN_SERIES = 10
const MAX_CHAINS_BY_ADAPTER_HBAR_ITEMS = 9
const MIN_COMPLETE_DAILY_GAP_MS = 23 * 60 * 60 * 1000

/** Rolling window length for treemap/hbar "latest value" when groupBy is not daily/cumulative (from latest row in dataset). */
function getRollingWindowMsForTreemapGrouping(groupBy: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): number {
	const dayMs = 24 * 60 * 60 * 1000
	switch (groupBy) {
		case 'weekly':
			return 7 * dayMs
		case 'monthly':
			return 30 * dayMs
		case 'quarterly':
			return 90 * dayMs
		case 'yearly':
			return 365 * dayMs
	}
}

function getLatestTimestampMsInDataset(chartData: MultiSeriesChart2Dataset): number | null {
	let max = -Infinity
	for (const row of chartData.source) {
		const ts = Number(row.timestamp)
		if (Number.isFinite(ts) && ts > max) max = ts
	}
	return Number.isFinite(max) && max > -Infinity ? max : null
}

function assertNever(value: never): never {
	throw new Error(`Unhandled chains by adapter chart state: ${JSON.stringify(value)}`)
}

function toValidChartGrouping(value: string | undefined | null): ChartTimeGroupingWithCumulative | null {
	if (!value) return null
	return VALID_GROUPINGS.has(value as ChartTimeGroupingWithCumulative)
		? (value as ChartTimeGroupingWithCumulative)
		: null
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

	const normalizedChartKind = chartKindParam?.toLowerCase()
	if (normalizedChartKind === 'line') {
		return {
			chartKind: 'line',
			groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY
		}
	}
	if (normalizedChartKind === 'treemap') {
		return {
			chartKind: 'treemap',
			groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY
		}
	}
	if (normalizedChartKind === 'hbar') {
		return { chartKind: 'hbar', groupBy: toValidChartGrouping(normalizedGroupBy) ?? DEFAULT_CHAINS_BY_ADAPTER_GROUP_BY }
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
	selectedNames,
	rankingScores
}: {
	chartData: MultiSeriesChart2Dataset
	selectedNames: string[]
	rankingScores?: Map<string, number>
}) {
	const entityTotals = new Map<string, number>()
	const entitySeries = new Map<string, Array<[number, number]>>()

	for (const row of chartData.source) {
		const timestamp = Number(row.timestamp)
		for (const entity of selectedNames) {
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

	const getRankingScore = (entity: string) => rankingScores?.get(entity) ?? Number.NEGATIVE_INFINITY
	const ranked = Array.from(entityTotals.entries()).toSorted((a, b) => {
		const aScore = getRankingScore(a[0])
		const bScore = getRankingScore(b[0])
		if (aScore !== bScore) {
			return bScore > aScore ? 1 : -1
		}
		return b[1] - a[1]
	})
	const topEntityNames = ranked.slice(0, MAX_BREAKDOWN_SERIES).map(([entity]) => entity)
	const otherEntityNames = ranked.slice(MAX_BREAKDOWN_SERIES).map(([entity]) => entity)
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
	const topColorBySeriesName = Object.fromEntries(topSeriesNames.map((seriesName, i) => [seriesName, topColors[i]]))

	return {
		topSeries,
		topSeriesNames,
		topColorBySeriesName
	}
}

function getOrderedSelectedSeriesNames({
	chartData,
	selectedNames
}: {
	chartData: MultiSeriesChart2Dataset
	selectedNames: string[]
}) {
	const selectedSet = new Set(selectedNames)
	return chartData.dimensions.filter((dimension) => dimension !== 'timestamp' && selectedSet.has(dimension))
}

function orderSelectedNamesByRankingScores({
	chartData,
	selectedNames,
	rankingScores
}: {
	chartData: MultiSeriesChart2Dataset
	selectedNames: string[]
	rankingScores?: Map<string, number>
}) {
	const selectedSeriesNames = getOrderedSelectedSeriesNames({ chartData, selectedNames })
	const selectedSet = new Set(selectedSeriesNames)
	const totals = new Map<string, number>()

	for (const row of chartData.source) {
		for (const seriesName of selectedSeriesNames) {
			const value = row[seriesName]
			if (typeof value === 'number' && Number.isFinite(value)) {
				totals.set(seriesName, (totals.get(seriesName) ?? 0) + value)
			}
		}
	}

	const getRankingScore = (seriesName: string) => rankingScores?.get(seriesName) ?? Number.NEGATIVE_INFINITY

	return selectedSeriesNames
		.toSorted((a, b) => {
			const aScore = getRankingScore(a)
			const bScore = getRankingScore(b)
			if (aScore !== bScore) {
				return bScore > aScore ? 1 : -1
			}

			return (totals.get(b) ?? 0) - (totals.get(a) ?? 0)
		})
		.filter((seriesName) => selectedSet.has(seriesName))
}

function buildSeriesMapForNames({
	chartData,
	seriesNames
}: {
	chartData: MultiSeriesChart2Dataset
	seriesNames: string[]
}) {
	const seriesMap = new Map<string, Array<[number, number]>>()

	for (const seriesName of seriesNames) {
		const rawSeries = chartData.source
			.map((row) => {
				const timestamp = Number(row.timestamp)
				const value = row[seriesName]
				return typeof value === 'number' && Number.isFinite(timestamp) ? ([timestamp, value] as [number, number]) : null
			})
			.filter((point): point is [number, number] => point != null)

		if (rawSeries.length > 0) {
			seriesMap.set(seriesName, rawSeries)
		}
	}

	return seriesMap
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
	topColorBySeriesName,
	state
}: {
	topSeries: Map<string, Array<[number, number]>>
	topSeriesNames: string[]
	topColorBySeriesName: Record<string, string>
	state: ChainsByAdapterBarState
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
			color: topColorBySeriesName[seriesName]
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
	topColorBySeriesName,
	state
}: {
	topSeries: Map<string, Array<[number, number]>>
	topSeriesNames: string[]
	topColorBySeriesName: Record<string, string>
	state: ChainsByAdapterLineState
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
			color: topColorBySeriesName[seriesName],
			stack: 'chain'
		})),
		groupBy: state.groupBy
	}
}

function buildTreemapPresentation({
	selectedNames,
	latestRows
}: {
	selectedNames: string[]
	latestRows: BreakdownLatestValueRow[]
}): ChainsByAdapterLatestValueDatum[] {
	const latestValuesByName = new Map<string, number>()
	for (const row of latestRows) {
		const value = row.total24h
		if (typeof value === 'number' && Number.isFinite(value)) {
			latestValuesByName.set(row.name, value)
		}
	}

	const values = selectedNames
		.map((name) => {
			const rawValue = latestValuesByName.get(name) ?? 0
			const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
			return {
				name,
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

function buildLatestValueRowsFromChartData({
	chartData,
	selectedNames,
	groupBy
}: {
	chartData: MultiSeriesChart2Dataset
	selectedNames: string[]
	groupBy: ChartTimeGroupingWithCumulative
	seriesType: LatestValueSeriesType
}): BreakdownLatestValueRow[] {
	if (groupBy === 'daily') {
		const effectiveTimestamp = getEffectiveDailyLatestTimestamp(chartData)
		if (effectiveTimestamp == null) {
			return selectedNames.map((name) => ({ name, total24h: null }))
		}

		const sourceRow = chartData.source.find((row) => Number(row.timestamp) === effectiveTimestamp)
		return selectedNames.map((name) => {
			const value = sourceRow?.[name]
			return {
				name,
				total24h: typeof value === 'number' && Number.isFinite(value) ? value : null
			}
		})
	}

	if (groupBy === 'cumulative') {
		return selectedNames.map((name) => {
			const rawData = chartData.source
				.map((row) => {
					const timestamp = Number(row.timestamp)
					const value = row[name]
					return typeof value === 'number' && Number.isFinite(timestamp)
						? ([timestamp, value] as [number, number])
						: null
				})
				.filter((point): point is [number, number] => point != null)

			// Cumulative rankings should always use running totals, even for line renderers.
			const groupedData = formatBarChart({
				data: rawData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})

			return {
				name,
				total24h: groupedData.at(-1)?.[1] ?? null
			}
		})
	}

	const latestTsMs = getLatestTimestampMsInDataset(chartData)
	if (latestTsMs == null) {
		return selectedNames.map((name) => ({ name, total24h: null }))
	}

	const windowMs = getRollingWindowMsForTreemapGrouping(groupBy)
	const cutoffMs = latestTsMs - windowMs

	return selectedNames.map((name) => {
		const rawData = chartData.source
			.map((row) => {
				const timestamp = Number(row.timestamp)
				const value = row[name]
				return typeof value === 'number' && Number.isFinite(timestamp) ? ([timestamp, value] as [number, number]) : null
			})
			.filter((point): point is [number, number] => point != null)

		const sorted = rawData.toSorted((a, b) => a[0] - b[0])

		let sum = 0
		let pointsInWindow = 0
		let i = sorted.length - 1
		if (i >= 0) {
			do {
				const point = sorted[i]!
				const [tsMs, value] = point
				if (tsMs < cutoffMs) break
				sum += value
				pointsInWindow++
				i--
			} while (i >= 0)
		}

		return {
			name,
			total24h: pointsInWindow === 0 ? null : sum
		}
	})
}

function getEffectiveDailyLatestTimestamp(chartData: MultiSeriesChart2Dataset): number | null {
	const timestamps = chartData.source
		.map((row) => Number(row.timestamp))
		.filter((timestamp) => Number.isFinite(timestamp))
		.toSorted((a, b) => a - b)

	if (timestamps.length === 0) return null
	if (timestamps.length === 1) return timestamps[0]

	const lastTimestamp = timestamps[timestamps.length - 1]
	const previousTimestamp = timestamps[timestamps.length - 2]
	const lastDate = new Date(lastTimestamp)
	const isUtcMidnight =
		lastDate.getUTCHours() === 0 &&
		lastDate.getUTCMinutes() === 0 &&
		lastDate.getUTCSeconds() === 0 &&
		lastDate.getUTCMilliseconds() === 0
	const gapMs = lastTimestamp - previousTimestamp

	return !isUtcMidnight || gapMs < MIN_COMPLETE_DAILY_GAP_MS ? previousTimestamp : lastTimestamp
}

function buildHBarPresentation({
	selectedNames,
	latestRows
}: {
	selectedNames: string[]
	latestRows: BreakdownLatestValueRow[]
}): ChainsByAdapterLatestValueDatum[] {
	const rankedValues = buildTreemapPresentation({ selectedNames, latestRows })

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

export function buildChainsByAdapterChartPresentation({
	chartData,
	selectedChains,
	state,
	latestValueSeriesType = 'bar'
}: {
	chartData: IChainsByAdapterPageData['chartData']
	selectedChains: string[]
	state: ChainsByAdapterChartState
	latestValueSeriesType?: LatestValueSeriesType
}): ChainsByAdapterChartPresentation {
	switch (state.chartKind) {
		case 'treemap': {
			const latestRows = buildLatestValueRowsFromChartData({
				chartData,
				selectedNames: selectedChains,
				groupBy: state.groupBy,
				seriesType: latestValueSeriesType
			})
			return {
				kind: 'treemap',
				data: buildTreemapPresentation({ selectedNames: selectedChains, latestRows })
			}
		}
		case 'hbar': {
			const latestRows = buildLatestValueRowsFromChartData({
				chartData,
				selectedNames: selectedChains,
				groupBy: state.groupBy,
				seriesType: latestValueSeriesType
			})
			return {
				kind: 'hbar',
				data: buildHBarPresentation({ selectedNames: selectedChains, latestRows })
			}
		}
		case 'line': {
			const { topSeries, topSeriesNames, topColorBySeriesName } = createSeriesUniverse({
				chartData,
				selectedNames: selectedChains
			})
			return buildLinePresentation({ topSeries, topSeriesNames, topColorBySeriesName, state })
		}
		case 'bar': {
			const { topSeries, topSeriesNames, topColorBySeriesName } = createSeriesUniverse({
				chartData,
				selectedNames: selectedChains
			})
			return buildBarPresentation({ topSeries, topSeriesNames, topColorBySeriesName, state })
		}
		default:
			return assertNever(state)
	}
}

export function buildAdapterByChainBreakdownPresentation({
	chartData,
	selectedProtocols,
	state
}: {
	chartData: MultiSeriesChart2Dataset
	selectedProtocols: string[]
	state: ChainsByAdapterBarState | ChainsByAdapterLineState
}): ChainsByAdapterBarPresentation | ChainsByAdapterLinePresentation {
	const latestRows = buildLatestValueRowsFromChartData({
		chartData,
		selectedNames: selectedProtocols,
		groupBy: state.groupBy,
		seriesType: state.chartKind
	})
	const rankingScores = new Map<string, number>()
	for (const row of latestRows) {
		if (typeof row.total24h === 'number' && Number.isFinite(row.total24h)) {
			rankingScores.set(row.name, row.total24h)
		}
	}

	const orderedSeriesNames = orderSelectedNamesByRankingScores({
		chartData,
		selectedNames: selectedProtocols,
		rankingScores
	})
	const topSeries = buildSeriesMapForNames({ chartData, seriesNames: orderedSeriesNames })
	const topColors = getNDistinctColors(orderedSeriesNames.length || 1)
	const topColorBySeriesName = Object.fromEntries(orderedSeriesNames.map((seriesName, i) => [seriesName, topColors[i]]))

	switch (state.chartKind) {
		case 'line':
			return buildLinePresentation({ topSeries, topSeriesNames: orderedSeriesNames, topColorBySeriesName, state })
		case 'bar':
			return buildBarPresentation({ topSeries, topSeriesNames: orderedSeriesNames, topColorBySeriesName, state })
		default:
			return assertNever(state)
	}
}

export function buildAdapterByChainLatestValuePresentation({
	chartKind,
	selectedProtocols,
	groupBy,
	chartData,
	seriesType = 'bar'
}: {
	chartKind: 'treemap' | 'hbar'
	selectedProtocols: string[]
	groupBy: ChartTimeGroupingWithCumulative
	chartData: MultiSeriesChart2Dataset
	seriesType?: LatestValueSeriesType
}): ChainsByAdapterTreemapPresentation | ChainsByAdapterHBarPresentation {
	const latestRows = buildLatestValueRowsFromChartData({
		chartData,
		selectedNames: selectedProtocols,
		groupBy,
		seriesType
	})

	if (chartKind === 'treemap') {
		return {
			kind: 'treemap',
			data: buildTreemapPresentation({ selectedNames: selectedProtocols, latestRows })
		}
	}

	return {
		kind: 'hbar',
		data: buildHBarPresentation({ selectedNames: selectedProtocols, latestRows })
	}
}
