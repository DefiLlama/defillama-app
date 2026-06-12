import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { CHART_COLORS } from '~/constants/colors'
import type { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import {
	FEE_EXTRA_METRIC_LABEL as FEES_EXTRA_METRIC_LABEL,
	getEnabledFeeExtraDataTypes,
	isFeeExtraEligibleAdapterMetric,
	type FeeExtraMetric as FeesExtraMetric
} from '~/metrics/feeExtras'
import { slug } from '~/utils'
import { getErrorMessage, normalizeError } from '~/utils/error'
import { parseArrayParam, parseExcludeParam, pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import {
	fetchAdapterChainChartData,
	fetchAdapterChainChartDataByProtocolBreakdown,
	fetchAdapterChartDataByChainBreakdown,
	fetchChainsByAdapterPageChartData
} from './api'
import { LINE_DIMENSIONS, type ADAPTER_TYPES } from './constants'
import type { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'
import {
	buildAdapterByChainBreakdownPresentation,
	buildAdapterByChainLatestValuePresentation,
	buildProtocolBreakdownNormalization,
	buildChainsByAdapterChartPresentation,
	mergeNamedDimensionChartDataset,
	mergeSingleDimensionChartDataset,
	mergeBreakdownCharts,
	normalizeProtocolBreakdownChartData,
	normalizeChainsByAdapterChartState,
	type ChainsByAdapterChartPresentation,
	type ChainsByAdapterChartState
} from './utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const HBarChart = React.lazy(() => import('~/components/ECharts/HBarChart'))
const TreeMapBuilderChart = React.lazy(() => import('~/components/ECharts/TreeMapBuilderChart'))

const CHART_VIEW_MODES_ADAPTER_BY_CHAIN = ['Combined', 'Breakdown'] as const
type AdapterByChainViewMode = (typeof CHART_VIEW_MODES_ADAPTER_BY_CHAIN)[number]
const CHART_KINDS_CHAINS_BY_ADAPTER = ['Bar', 'Dominance', 'Treemap', 'HBar'] as const
type ChainsByAdapterChartKind = (typeof CHART_KINDS_CHAINS_BY_ADAPTER)[number]
const BAR_VALUE_MODES_CHAINS_BY_ADAPTER = ['Absolute', 'Relative'] as const
type ChainsByAdapterValueMode = (typeof BAR_VALUE_MODES_CHAINS_BY_ADAPTER)[number]
const BAR_LAYOUTS_CHAINS_BY_ADAPTER = ['Stacked', 'Separate'] as const
type ChainsByAdapterBarLayout = (typeof BAR_LAYOUTS_CHAINS_BY_ADAPTER)[number]
const CHAINS_BY_ADAPTER_CHART_HEIGHT = '420px'
const CHAINS_BY_ADAPTER_TREEMAP_HEIGHT = '520px'
const CHART_KIND_OPTIONS = [
	{ key: 'Bar', name: 'Bar Chart' },
	{ key: 'Dominance', name: 'Dominance Chart' },
	{ key: 'Treemap', name: 'Treemap Chart' },
	{ key: 'HBar', name: 'HBar Chart' }
] as const
const BAR_VALUE_MODE_OPTIONS = [
	{ key: 'Absolute', name: 'Absolute ($)' },
	{ key: 'Relative', name: 'Relative (%)' }
] as const
const BAR_LAYOUT_OPTIONS = [
	{ key: 'Stacked', name: 'Stacked' },
	{ key: 'Separate', name: 'Separate' }
] as const
const CHART_VIEW_MODE_OPTIONS = [
	{ key: 'Combined', name: 'Combined' },
	{ key: 'Breakdown', name: 'Breakdown' }
] as const
const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
type CombinedChartPresentation = {
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesChart2SeriesConfig[]
}
const EMPTY_COMBINED_CHART_PRESENTATION: CombinedChartPresentation = { dataset: EMPTY_DATASET, charts: [] }
type FeesChartMode = { kind: 'plain' } | { kind: 'fees'; extras: FeesExtraMetric[] }
type BreakdownChartDataState =
	| { kind: 'loading' }
	| { kind: 'error'; message: string }
	| {
			kind: 'ready'
			chartData: MultiSeriesChart2Dataset
			protocolDimensions: string[]
			failedMetrics: FeesExtraMetric[]
	  }

function assertNever(value: never): never {
	throw new Error(`Unhandled chains by adapter chart state: ${JSON.stringify(value)}`)
}

function getFeesChartMode({
	adapterType,
	dataType,
	bribes,
	tokentax
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: IAdapterByChainPageData['dataType']
	bribes: boolean
	tokentax: boolean
}): FeesChartMode {
	if (!isFeeExtraEligibleAdapterMetric({ adapterType, dataType })) {
		return { kind: 'plain' }
	}

	const extras = getEnabledFeeExtraDataTypes({ bribes, tokentax })
	if (extras.length === 0) {
		return { kind: 'plain' }
	}

	return { kind: 'fees', extras }
}

function getChartKindQueryUpdate(
	nextChartKind: ChainsByAdapterChartKind,
	currentGroupByParam: string | undefined
): Record<string, string | undefined> {
	const normalizedGroupBy = currentGroupByParam?.toLowerCase()
	const nextGroupBy = normalizedGroupBy === 'daily' ? undefined : normalizedGroupBy

	switch (nextChartKind) {
		case 'Bar':
			return {
				chartKind: undefined,
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: nextGroupBy
			}
		case 'Dominance':
			return {
				chartKind: 'dominance',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: nextGroupBy
			}
		case 'Treemap':
			return {
				chartKind: 'treemap',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: nextGroupBy
			}
		case 'HBar':
			return {
				chartKind: 'hbar',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: nextGroupBy
			}
		default:
			return assertNever(nextChartKind)
	}
}

function getChartHeight(chartState: ChainsByAdapterChartState): string {
	switch (chartState.chartKind) {
		case 'bar':
		case 'dominance':
			return CHAINS_BY_ADAPTER_CHART_HEIGHT
		case 'treemap':
		case 'hbar':
			return CHAINS_BY_ADAPTER_TREEMAP_HEIGHT
		default:
			return assertNever(chartState)
	}
}

function getCombinedChartSeriesConfig({
	seriesName,
	type,
	color,
	index
}: {
	seriesName: string
	type: 'line' | 'bar'
	color: string
	index: number
}): MultiSeriesChart2SeriesConfig {
	return {
		type,
		name: seriesName,
		encode: { x: 'timestamp', y: seriesName },
		color,
		...(index > 0 && type === 'line' ? { yAxisIndex: 1, hideAreaStyle: true } : {})
	}
}

function buildAdapterByChainCombinedChartPresentation({
	chartData,
	chartName,
	groupBy
}: {
	chartData: MultiSeriesChart2Dataset
	chartName: string
	groupBy: LowercaseDwmcGrouping
}): CombinedChartPresentation {
	const isDaily = groupBy === 'daily'
	const isCumulative = groupBy === 'cumulative'
	const dimensions: string[] = []
	for (const dimension of chartData.dimensions) {
		if (dimension !== 'timestamp') {
			dimensions.push(dimension)
		}
	}

	const seriesDefinitions: Array<{
		dimension: string
		seriesName: string
		type: 'line' | 'bar'
		data: Array<[number, number | null]>
		color: string
	}> = []

	if (isDaily) {
		for (let index = 0; index < dimensions.length; index++) {
			const dimension = dimensions[index]
			const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
			const isSnapshotMetric = isIntrinsicLineSeries || LINE_DIMENSIONS.has(chartName)
			seriesDefinitions.push({
				dimension,
				seriesName: dimension,
				type: isSnapshotMetric || isCumulative ? 'line' : 'bar',
				data: [],
				color: CHART_COLORS[index % CHART_COLORS.length]
			})
		}

		return {
			dataset: chartData,
			charts: seriesDefinitions.map((series, index) =>
				getCombinedChartSeriesConfig({
					seriesName: series.seriesName,
					type: series.type,
					color: series.color,
					index
				})
			)
		}
	}

	const rawSeriesByDimension = new Map<string, Array<[number, number]>>()
	for (const dimension of dimensions) {
		rawSeriesByDimension.set(dimension, [])
	}

	for (const row of chartData.source) {
		const timestamp = Number(row.timestamp)
		for (const dimension of dimensions) {
			const value = row[dimension]
			if (value == null) continue
			rawSeriesByDimension.get(dimension)!.push([timestamp, value as number])
		}
	}

	for (let index = 0; index < dimensions.length; index++) {
		const dimension = dimensions[index]
		const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
		const isSnapshotMetric = isIntrinsicLineSeries || LINE_DIMENSIONS.has(chartName)
		const type = isSnapshotMetric || isCumulative ? 'line' : 'bar'
		const rawData = rawSeriesByDimension.get(dimension) ?? []
		const data = isSnapshotMetric
			? formatLineChart({
					data: rawData,
					groupBy,
					dateInMs: true,
					denominationPriceHistory: null
				})
			: formatBarChart({
					data: rawData,
					groupBy,
					dateInMs: true,
					denominationPriceHistory: null
				})

		seriesDefinitions.push({
			dimension,
			seriesName: dimension,
			type,
			data,
			color: CHART_COLORS[index % CHART_COLORS.length]
		})
	}

	const sourceDataByTimestamp = new Map<number, Record<string, number | null>>()
	for (const series of seriesDefinitions) {
		for (const [timestamp, value] of series.data) {
			const row = sourceDataByTimestamp.get(timestamp) ?? { timestamp }
			row[series.seriesName] = value
			sourceDataByTimestamp.set(timestamp, row)
		}
	}

	const sourceData: MultiSeriesChart2Dataset['source'] = []
	for (const row of ensureChronologicalRows(Array.from(sourceDataByTimestamp.values()))) {
		const normalizedRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
		for (const series of seriesDefinitions) {
			normalizedRow[series.seriesName] = row[series.seriesName] ?? null
		}
		sourceData.push(normalizedRow)
	}
	const seriesNames: string[] = []
	for (const series of seriesDefinitions) {
		seriesNames.push(series.seriesName)
	}

	return {
		dataset: {
			source: sourceData,
			dimensions: ['timestamp', ...seriesNames]
		},
		charts: seriesDefinitions.map((series, index) =>
			getCombinedChartSeriesConfig({
				seriesName: series.seriesName,
				type: series.type,
				color: series.color,
				index
			})
		)
	}
}

function getAdapterByChainChartKindQueryUpdate({
	nextChartKind,
	currentGroupByParam
}: {
	nextChartKind: ChainsByAdapterChartKind
	currentGroupByParam: string | undefined
}): Record<string, string | string[] | undefined> {
	return getChartKindQueryUpdate(nextChartKind, currentGroupByParam)
}

function applyBarLayoutToPresentation(
	presentation: ChainsByAdapterChartPresentation,
	chartState: ChainsByAdapterChartState
): ChainsByAdapterChartPresentation {
	if (
		presentation.kind !== 'bar' ||
		chartState.chartKind !== 'bar' ||
		presentation.barLayout === chartState.barLayout
	) {
		return presentation
	}

	const charts = presentation.charts.map((chart) => {
		if (chartState.barLayout === 'stacked') {
			return { ...chart, stack: 'chain' as const, large: false }
		}

		const { stack: _stack, large: _large, ...rest } = chart
		return rest
	})

	return {
		...presentation,
		charts,
		barLayout: chartState.barLayout,
		showTotalInTooltip: chartState.valueMode === 'absolute' && chartState.barLayout === 'stacked'
	}
}

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	chain,
	chartName,
	dataType,
	tableProtocols
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'chain' | 'dataType'> & {
	chartName: string
	tableProtocols: IAdapterByChainPageData['protocols']
}) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const feesChartMode = React.useMemo(
		() =>
			getFeesChartMode({
				adapterType,
				dataType,
				bribes: feesSettings.bribes,
				tokentax: feesSettings.tokentax
			}),
		[adapterType, dataType, feesSettings.bribes, feesSettings.tokentax]
	)

	const combinedChartInterval = React.useMemo<LowercaseDwmcGrouping>(() => {
		const groupByParam = readSingleQueryValue(router.query.groupBy)?.toLowerCase()
		const matchedInterval = DWMC_GROUPING_OPTIONS_LOWERCASE.find((option) => option.value === groupByParam)
		return matchedInterval?.value ?? 'daily'
	}, [router.query.groupBy])
	const chartViewMode = React.useMemo<AdapterByChainViewMode>(() => {
		const chartViewParam = readSingleQueryValue(router.query.chartView)?.toLowerCase()
		return chartViewParam === 'breakdown' ? 'Breakdown' : 'Combined'
	}, [router.query.chartView])
	const breakdownChartState = React.useMemo(
		() =>
			normalizeChainsByAdapterChartState({
				chartKindParam: readSingleQueryValue(router.query.chartKind),
				valueModeParam: readSingleQueryValue(router.query.valueMode),
				barLayoutParam: readSingleQueryValue(router.query.barLayout),
				groupByParam: readSingleQueryValue(router.query.groupBy),
				legacyChartTypeParam: readSingleQueryValue(router.query.chartType)
			}),
		[
			router.query.barLayout,
			router.query.chartKind,
			router.query.chartType,
			router.query.groupBy,
			router.query.valueMode
		]
	)

	const { data: combinedBribesChart, error: combinedBribesChartError } = useQuery({
		queryKey: ['adapter-chain-chart', adapterType, chain, 'dailyBribesRevenue'],
		queryFn: () =>
			fetchAdapterChainChartData({
				adapterType,
				chain,
				dataType: 'dailyBribesRevenue'
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled:
			chartViewMode === 'Combined' &&
			feesChartMode.kind === 'fees' &&
			feesChartMode.extras.includes('dailyBribesRevenue')
	})

	const { data: combinedTokenTaxChart, error: combinedTokenTaxChartError } = useQuery({
		queryKey: ['adapter-chain-chart', adapterType, chain, 'dailyTokenTaxes'],
		queryFn: () =>
			fetchAdapterChainChartData({
				adapterType,
				chain,
				dataType: 'dailyTokenTaxes'
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled:
			chartViewMode === 'Combined' && feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyTokenTaxes')
	})

	const breakdownChartDataState = useAdapterByChainBreakdownChartData({
		adapterType,
		chain,
		dataType,
		enabled: chartViewMode === 'Breakdown',
		feesChartMode,
		tableProtocols
	})

	const combinedChartData = React.useMemo(() => {
		if (chartViewMode !== 'Combined') {
			return chartData
		}

		switch (feesChartMode.kind) {
			case 'plain':
				return chartData
			case 'fees':
				return mergeSingleDimensionChartDataset({
					chartData,
					extraCharts: [
						feesChartMode.extras.includes('dailyBribesRevenue') ? (combinedBribesChart ?? []) : [],
						feesChartMode.extras.includes('dailyTokenTaxes') ? (combinedTokenTaxChart ?? []) : []
					]
				})
			default:
				return assertNever(feesChartMode)
		}
	}, [chartData, chartViewMode, combinedBribesChart, combinedTokenTaxChart, feesChartMode])

	const failedMetrics = React.useMemo(() => {
		if (chartViewMode === 'Breakdown') {
			return breakdownChartDataState.kind === 'ready' ? breakdownChartDataState.failedMetrics : []
		}

		if (feesChartMode.kind === 'plain') {
			return []
		}

		const nextFailedMetrics: FeesExtraMetric[] = []
		if (feesChartMode.extras.includes('dailyBribesRevenue') && combinedBribesChartError) {
			nextFailedMetrics.push('dailyBribesRevenue')
		}
		if (feesChartMode.extras.includes('dailyTokenTaxes') && combinedTokenTaxChartError) {
			nextFailedMetrics.push('dailyTokenTaxes')
		}

		return nextFailedMetrics
	}, [breakdownChartDataState, chartViewMode, combinedBribesChartError, combinedTokenTaxChartError, feesChartMode])

	const protocolOptions = React.useMemo(() => {
		if (breakdownChartDataState.kind !== 'ready') return []
		return breakdownChartDataState.protocolDimensions
	}, [breakdownChartDataState])

	const selectedProtocols = React.useMemo(() => {
		if (chartViewMode !== 'Breakdown' || protocolOptions.length === 0) return []

		const protocolsQuery = router.query.protocol
		const excludeProtocolsQuery = router.query.excludeProtocol
		const excludedProtocolsSet = parseExcludeParam(excludeProtocolsQuery)
		const baseSelectedProtocols =
			protocolsQuery != null ? parseArrayParam(protocolsQuery, protocolOptions) : protocolOptions

		if (excludedProtocolsSet.size === 0) return baseSelectedProtocols

		const selectedProtocols: string[] = []
		for (const protocolName of baseSelectedProtocols) {
			if (!excludedProtocolsSet.has(protocolName)) selectedProtocols.push(protocolName)
		}
		return selectedProtocols
	}, [chartViewMode, protocolOptions, router.query.protocol, router.query.excludeProtocol])

	const onChangeCombinedChartInterval = (nextInterval: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}
	const onChangeChartViewMode = (nextChartViewMode: AdapterByChainViewMode) => {
		void pushShallowQuery(router, {
			chartView: nextChartViewMode === 'Combined' ? undefined : nextChartViewMode,
			...(nextChartViewMode === 'Combined'
				? {
						protocol: undefined,
						excludeProtocol: undefined,
						chartKind: undefined,
						chartType: undefined,
						valueMode: undefined,
						barLayout: undefined
					}
				: {})
		})
	}
	const onChangeBreakdownChartInterval = (nextInterval: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}
	const onChangeChartKind = (nextChartKind: ChainsByAdapterChartKind) => {
		void pushShallowQuery(
			router,
			getAdapterByChainChartKindQueryUpdate({
				nextChartKind,
				currentGroupByParam: readSingleQueryValue(router.query.groupBy)
			})
		)
	}
	const onChangeValueMode = (nextValueMode: ChainsByAdapterValueMode) => {
		void pushShallowQuery(router, {
			chartKind: undefined,
			chartType: undefined,
			valueMode: nextValueMode === 'Absolute' ? undefined : nextValueMode.toLowerCase()
		})
	}
	const onChangeBarLayout = (nextBarLayout: ChainsByAdapterBarLayout) => {
		void pushShallowQuery(router, {
			chartKind: undefined,
			chartType: undefined,
			barLayout: nextBarLayout === 'Stacked' ? undefined : nextBarLayout.toLowerCase()
		})
	}

	const combinedFinalCharts = React.useMemo(() => {
		if (chartViewMode !== 'Combined') {
			return EMPTY_COMBINED_CHART_PRESENTATION
		}

		return buildAdapterByChainCombinedChartPresentation({
			chartData: combinedChartData,
			chartName,
			groupBy: combinedChartInterval
		})
	}, [chartViewMode, combinedChartData, chartName, combinedChartInterval])
	const deferredCombinedFinalCharts = React.useDeferredValue(combinedFinalCharts)

	const breakdownChartData =
		breakdownChartDataState.kind === 'ready' ? breakdownChartDataState.chartData : EMPTY_DATASET
	const breakdownChartKind = breakdownChartState.chartKind
	const breakdownGroupBy = breakdownChartState.groupBy
	const breakdownBarValueMode = breakdownChartState.chartKind === 'bar' ? breakdownChartState.valueMode : 'absolute'
	const breakdownChartDataBuildState = React.useMemo<ChainsByAdapterChartState>(() => {
		switch (breakdownChartKind) {
			case 'bar':
				return {
					chartKind: 'bar',
					valueMode: breakdownBarValueMode,
					barLayout: 'stacked',
					groupBy: breakdownGroupBy
				}
			case 'dominance':
				return { chartKind: 'dominance', groupBy: breakdownGroupBy }
			case 'treemap':
				return { chartKind: 'treemap', groupBy: breakdownGroupBy }
			case 'hbar':
				return { chartKind: 'hbar', groupBy: breakdownGroupBy }
			default:
				return assertNever(breakdownChartKind)
		}
	}, [breakdownChartKind, breakdownGroupBy, breakdownBarValueMode])
	const baseBreakdownPresentation = React.useMemo(() => {
		switch (breakdownChartDataBuildState.chartKind) {
			case 'treemap':
			case 'hbar':
				return buildAdapterByChainLatestValuePresentation({
					chartKind: breakdownChartDataBuildState.chartKind,
					selectedProtocols,
					groupBy: breakdownChartDataBuildState.groupBy,
					chartData: breakdownChartData,
					seriesType: 'bar'
				})
			case 'dominance':
			case 'bar':
				return buildAdapterByChainBreakdownPresentation({
					chartData: breakdownChartData,
					state: breakdownChartDataBuildState,
					selectedProtocols
				})
			default:
				return assertNever(breakdownChartDataBuildState)
		}
	}, [breakdownChartData, breakdownChartDataBuildState, selectedProtocols])
	const breakdownPresentation = React.useMemo(
		() => applyBarLayoutToPresentation(baseBreakdownPresentation, breakdownChartState),
		[baseBreakdownPresentation, breakdownChartState]
	)
	const deferredBreakdownPresentation = React.useDeferredValue(breakdownPresentation)

	const dashboardChartType = getAdapterDashboardType(adapterType)
	const multiChart = React.useMemo<MultiChartConfig | null>(() => {
		if (!dashboardChartType) return null

		let grouping: MultiChartConfig['grouping']
		switch (combinedChartInterval) {
			case 'weekly':
				grouping = 'week'
				break
			case 'monthly':
				grouping = 'month'
				break
			case 'quarterly':
				grouping = 'quarter'
				break
			case 'yearly':
				grouping = 'year'
				break
			default:
				grouping = 'day'
				break
		}

		return {
			id: generateItemId('multi', `${chain}-${adapterType}`),
			kind: 'multi',
			name: `${chain} – ${chartName}`,
			items: [
				{
					id: generateItemId('chart', `${chain}-${dashboardChartType}`),
					kind: 'chart',
					chain: chain,
					type: dashboardChartType,
					grouping,
					color: CHART_COLORS[0]
				}
			],
			grouping,
			showCumulative: combinedChartInterval === 'cumulative'
		}
	}, [chain, adapterType, dashboardChartType, combinedChartInterval, chartName])

	const breakdownChartKindLabel =
		breakdownChartState.chartKind === 'treemap'
			? 'Treemap Chart'
			: breakdownChartState.chartKind === 'hbar'
				? 'HBar Chart'
				: breakdownChartState.chartKind === 'dominance'
					? 'Dominance Chart'
					: 'Bar Chart'
	const breakdownBarValueModeLabel =
		breakdownChartState.chartKind === 'bar'
			? breakdownChartState.valueMode === 'relative'
				? 'Relative (%)'
				: 'Absolute ($)'
			: null
	const breakdownBarLayoutLabel =
		breakdownChartState.chartKind === 'bar'
			? breakdownChartState.barLayout === 'separate'
				? 'Separate'
				: 'Stacked'
			: null
	const breakdownChartHeight = getChartHeight(breakdownChartState)
	const breakdownMultiSeriesChartOptions = React.useMemo(() => {
		switch (deferredBreakdownPresentation.kind) {
			case 'treemap':
			case 'hbar':
				return undefined
			case 'bar':
				return deferredBreakdownPresentation.valueMode === 'relative'
					? {
							yAxis: {
								min: 0,
								max: 100
							}
						}
					: undefined
			case 'dominance':
				return {
					yAxis: {
						min: 0,
						max: 100
					}
				}
			default:
				return assertNever(deferredBreakdownPresentation)
		}
	}, [deferredBreakdownPresentation])
	const canExportBreakdownChart =
		(deferredBreakdownPresentation.kind !== 'treemap' && deferredBreakdownPresentation.kind !== 'hbar') ||
		deferredBreakdownPresentation.data.length > 0
	const breakdownExportConfig = React.useMemo(() => {
		const chartBaseTitle = `${chain === 'All' ? 'All Chains' : chain} - ${chartName} by Protocol`
		const chainSlug = slug(chain === 'All' ? 'all-chains' : chain)

		if (breakdownChartState.chartKind === 'dominance') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-dominance-${breakdownChartState.groupBy}`,
				title: `${chartBaseTitle} - Dominance Chart (${breakdownChartState.groupBy})`
			}
		}
		if (breakdownChartState.chartKind === 'treemap') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-treemap-${breakdownChartState.groupBy}`,
				title: `${chartBaseTitle} - Treemap (${breakdownChartState.groupBy})`
			}
		}
		if (breakdownChartState.chartKind === 'hbar') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-hbar-${breakdownChartState.groupBy}`,
				title: `${chartBaseTitle} - HBar (${breakdownChartState.groupBy})`
			}
		}

		return {
			filename: `${chainSlug}-${slug(chartName)}-by-protocol-bar-${breakdownChartState.valueMode}-${breakdownChartState.barLayout}-${breakdownChartState.groupBy}`,
			title: `${chartBaseTitle} - Bar (${breakdownChartState.valueMode === 'absolute' ? 'Absolute' : 'Relative'}, ${
				breakdownChartState.barLayout === 'stacked' ? 'Stacked' : 'Separate'
			}, ${breakdownChartState.groupBy})`
		}
	}, [breakdownChartState, chain, chartName])

	return (
		<div className="relative col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-start gap-2 p-2 pb-0">
				<Select
					allValues={CHART_VIEW_MODE_OPTIONS}
					selectedValues={chartViewMode}
					setSelectedValues={(value: string) => onChangeChartViewMode(value as AdapterByChainViewMode)}
					label={chartViewMode}
					labelType="none"
					variant="filter"
				/>
				{chartViewMode === 'Breakdown' ? (
					<Select
						allValues={CHART_KIND_OPTIONS}
						selectedValues={
							breakdownChartState.chartKind === 'treemap'
								? 'Treemap'
								: breakdownChartState.chartKind === 'hbar'
									? 'HBar'
									: breakdownChartState.chartKind === 'dominance'
										? 'Dominance'
										: 'Bar'
						}
						setSelectedValues={(value: string) => onChangeChartKind(value as ChainsByAdapterChartKind)}
						label={breakdownChartKindLabel}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartViewMode === 'Breakdown' && breakdownChartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_VALUE_MODE_OPTIONS}
						selectedValues={breakdownChartState.valueMode === 'relative' ? 'Relative' : 'Absolute'}
						setSelectedValues={(value: string) => onChangeValueMode(value as ChainsByAdapterValueMode)}
						label={breakdownBarValueModeLabel ?? 'Absolute'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartViewMode === 'Breakdown' && breakdownChartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_LAYOUT_OPTIONS}
						selectedValues={breakdownChartState.barLayout === 'separate' ? 'Separate' : 'Stacked'}
						setSelectedValues={(value: string) => onChangeBarLayout(value as ChainsByAdapterBarLayout)}
						label={breakdownBarLayoutLabel ?? 'Stacked'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartViewMode === 'Breakdown' ? (
					<ChartGroupingSelector
						value={breakdownChartState.groupBy}
						onValueChange={onChangeBreakdownChartInterval}
						options={DWMC_GROUPING_OPTIONS_LOWERCASE}
					/>
				) : null}
				{chartViewMode === 'Combined' && !LINE_DIMENSIONS.has(chartName) ? (
					<ChartGroupingSelector
						value={combinedChartInterval}
						onValueChange={onChangeCombinedChartInterval}
						options={DWMC_GROUPING_OPTIONS_LOWERCASE}
					/>
				) : null}
				{chartViewMode === 'Combined' && chain ? <AddToDashboardButton chartConfig={multiChart} smol /> : null}
				<div className="ml-auto flex items-center justify-end gap-2">
					{chartViewMode === 'Breakdown' && protocolOptions.length > 0 ? (
						<SelectWithCombobox
							allValues={protocolOptions}
							selectedValues={selectedProtocols}
							includeQueryKey="protocol"
							excludeQueryKey="excludeProtocol"
							defaultSelectedValues={protocolOptions}
							label="Protocols"
							labelType="smol"
							variant="filter"
							portal
						/>
					) : null}
					{chartViewMode === 'Breakdown' ? (
						breakdownChartState.chartKind === 'treemap' ? (
							<ChartRestoreButton chartInstance={exportChartInstance} />
						) : null
					) : null}
					{chartViewMode === 'Breakdown' ? (
						canExportBreakdownChart ? (
							<ChartExportButtons
								chartInstance={exportChartInstance}
								filename={breakdownExportConfig.filename}
								title={breakdownExportConfig.title}
								pngProfile={breakdownChartState.chartKind === 'treemap' ? 'treemapNormalized' : undefined}
							/>
						) : null
					) : (
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={`${chain}-${adapterType}-${chartName}`}
							title={`${chain === 'All' ? 'All Chains' : chain} - ${chartName}`}
						/>
					)}
				</div>
			</div>
			{chartViewMode === 'Breakdown' && breakdownChartDataState.kind === 'error' ? (
				<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">
					{breakdownChartDataState.message}
				</p>
			) : chartViewMode === 'Breakdown' && breakdownChartDataState.kind === 'loading' ? (
				<div className="flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : chartViewMode === 'Breakdown' ? (
				<React.Suspense
					fallback={
						<div
							style={{
								height: breakdownChartHeight
							}}
						/>
					}
				>
					{deferredBreakdownPresentation.kind === 'treemap' ? (
						<TreeMapBuilderChart
							data={deferredBreakdownPresentation.data}
							height={breakdownChartHeight}
							onReady={handleChartReady}
						/>
					) : deferredBreakdownPresentation.kind === 'hbar' ? (
						<HBarChart
							categories={deferredBreakdownPresentation.data.map((item) => item.name)}
							values={deferredBreakdownPresentation.data.map((item) => item.value)}
							colors={deferredBreakdownPresentation.data.map((item) => item.itemStyle.color)}
							height={breakdownChartHeight}
							valueSymbol="$"
							onReady={handleChartReady}
						/>
					) : (
						<MultiSeriesChart2
							dataset={deferredBreakdownPresentation.dataset}
							charts={deferredBreakdownPresentation.charts}
							height={breakdownChartHeight}
							valueSymbol={
								deferredBreakdownPresentation.kind === 'bar' && deferredBreakdownPresentation.valueMode === 'absolute'
									? '$'
									: '%'
							}
							solidChartAreaStyle={deferredBreakdownPresentation.kind === 'dominance'}
							{...(breakdownMultiSeriesChartOptions ? { chartOptions: breakdownMultiSeriesChartOptions } : {})}
							groupBy={deferredBreakdownPresentation.groupBy}
							hideDefaultLegend={deferredBreakdownPresentation.charts.length === 1}
							showTotalInTooltip={
								deferredBreakdownPresentation.kind === 'bar' ? deferredBreakdownPresentation.showTotalInTooltip : false
							}
							onReady={handleChartReady}
						/>
					)}
				</React.Suspense>
			) : (
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={deferredCombinedFinalCharts.dataset}
						charts={deferredCombinedFinalCharts.charts}
						hideDefaultLegend={deferredCombinedFinalCharts.charts.length === 1}
						groupBy={combinedChartInterval}
						onReady={handleChartReady}
					/>
				</React.Suspense>
			)}
			<FailedFeesMetricsPopover failedMetrics={failedMetrics} />
		</div>
	)
}

function useAdapterByChainBreakdownChartData({
	adapterType,
	chain,
	dataType,
	enabled,
	feesChartMode,
	tableProtocols
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType: IAdapterByChainPageData['dataType']
	enabled: boolean
	feesChartMode: FeesChartMode
	tableProtocols: IAdapterByChainPageData['protocols']
}): BreakdownChartDataState {
	const safeDataType = dataType === 'dailyEarnings' ? undefined : (dataType ?? undefined)
	const breakdownNormalization = React.useMemo(
		() => buildProtocolBreakdownNormalization(tableProtocols),
		[tableProtocols]
	)

	const { data, isLoading, error } = useQuery({
		queryKey: [
			'adapter-breakdown-chart',
			adapterType,
			chain,
			safeDataType,
			breakdownNormalization.signature,
			feesChartMode.kind === 'fees' ? feesChartMode.extras.join(',') : ''
		],
		queryFn: async () => {
			const requests = await Promise.allSettled([
				fetchAdapterChainChartDataByProtocolBreakdown({ adapterType, chain, dataType: safeDataType }),
				feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyBribesRevenue')
					? fetchAdapterChainChartDataByProtocolBreakdown({
							adapterType,
							chain,
							dataType: 'dailyBribesRevenue'
						})
					: Promise.resolve([]),
				feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyTokenTaxes')
					? fetchAdapterChainChartDataByProtocolBreakdown({
							adapterType,
							chain,
							dataType: 'dailyTokenTaxes'
						})
					: Promise.resolve([])
			])

			const baseResult = requests[0]
			if (baseResult?.status !== 'fulfilled') {
				throw normalizeError(baseResult?.reason ?? 'Failed to fetch breakdown chart data')
			}

			const failedMetrics: FeesExtraMetric[] = []
			if (
				feesChartMode.kind === 'fees' &&
				feesChartMode.extras.includes('dailyBribesRevenue') &&
				requests[1]?.status === 'rejected'
			) {
				failedMetrics.push('dailyBribesRevenue')
			}
			if (
				feesChartMode.kind === 'fees' &&
				feesChartMode.extras.includes('dailyTokenTaxes') &&
				requests[2]?.status === 'rejected'
			) {
				failedMetrics.push('dailyTokenTaxes')
			}

			const mergedData = mergeBreakdownCharts({
				chart: baseResult.value,
				extraCharts: [
					requests[1]?.status === 'fulfilled' ? requests[1].value : [],
					requests[2]?.status === 'fulfilled' ? requests[2].value : []
				]
			})
			const normalized = normalizeProtocolBreakdownChartData({
				chart: mergedData,
				normalization: breakdownNormalization
			})

			return {
				chartData: normalized.chartData,
				protocolDimensions: normalized.protocolDimensions,
				failedMetrics
			}
		},
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled
	})

	return React.useMemo(() => {
		if (!enabled) {
			return { kind: 'ready', chartData: EMPTY_DATASET, protocolDimensions: [], failedMetrics: [] }
		}

		if (isLoading) {
			return { kind: 'loading' }
		}

		if (error) {
			return { kind: 'error', message: getErrorMessage(error) }
		}

		return {
			kind: 'ready',
			chartData: data?.chartData ?? EMPTY_DATASET,
			protocolDimensions: data?.protocolDimensions ?? [],
			failedMetrics: data?.failedMetrics ?? []
		}
	}, [data, enabled, error, isLoading])
}

export const ChainsByAdapterChart = ({
	adapterType,
	dataType,
	chartData,
	allChains,
	chartName
}: Pick<IChainsByAdapterPageData, 'adapterType' | 'dataType' | 'chartData' | 'allChains'> & {
	chartName: string
}) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const feesChartMode = React.useMemo(
		() =>
			getFeesChartMode({
				adapterType,
				dataType,
				bribes: feesSettings.bribes,
				tokentax: feesSettings.tokentax
			}),
		[adapterType, dataType, feesSettings.bribes, feesSettings.tokentax]
	)
	const chartState = React.useMemo(
		() =>
			normalizeChainsByAdapterChartState({
				chartKindParam: readSingleQueryValue(router.query.chartKind),
				valueModeParam: readSingleQueryValue(router.query.valueMode),
				barLayoutParam: readSingleQueryValue(router.query.barLayout),
				groupByParam: readSingleQueryValue(router.query.groupBy),
				legacyChartTypeParam: readSingleQueryValue(router.query.chartType)
			}),
		[
			router.query.barLayout,
			router.query.chartKind,
			router.query.chartType,
			router.query.groupBy,
			router.query.valueMode
		]
	)
	const selectedChains = React.useMemo(() => {
		const chainsQuery = router.query.chain
		const excludeChainsQuery = router.query.excludeChain
		const excludedChainsSet = parseExcludeParam(excludeChainsQuery)
		const baseSelectedChains = chainsQuery != null ? parseArrayParam(chainsQuery, allChains) : allChains

		if (excludedChainsSet.size === 0) return baseSelectedChains

		const selectedChains: string[] = []
		for (const chain of baseSelectedChains) {
			if (!excludedChainsSet.has(chain)) selectedChains.push(chain)
		}
		return selectedChains
	}, [allChains, router.query.chain, router.query.excludeChain])
	const shouldFetchBaseChartData = chartData.source.length === 0 && dataType != null
	const {
		data: baseChartData,
		error: baseChartError,
		isLoading: isBaseChartLoading
	} = useQuery({
		queryKey: ['page-data', 'dimension-adapters', 'chains-chart', adapterType, dataType],
		queryFn: () => fetchChainsByAdapterPageChartData({ adapterType, dataType: dataType! }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: shouldFetchBaseChartData
	})
	const currentChartData = baseChartData?.chartData ?? chartData

	const { data: bribesChartData, error: bribesChartError } = useQuery({
		queryKey: ['adapter-chain-breakdown-chart', adapterType, chartName, 'dailyBribesRevenue'],
		queryFn: () => fetchAdapterChartDataByChainBreakdown({ adapterType, dataType: 'dailyBribesRevenue' }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyBribesRevenue')
	})

	const { data: tokenTaxChartData, error: tokenTaxChartError } = useQuery({
		queryKey: ['adapter-chain-breakdown-chart', adapterType, chartName, 'dailyTokenTaxes'],
		queryFn: () => fetchAdapterChartDataByChainBreakdown({ adapterType, dataType: 'dailyTokenTaxes' }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyTokenTaxes')
	})

	const mergedChartData = React.useMemo(() => {
		switch (feesChartMode.kind) {
			case 'plain':
				return currentChartData
			case 'fees':
				return mergeNamedDimensionChartDataset({
					chartData: currentChartData,
					allowedDimensions: allChains,
					extraCharts: [
						feesChartMode.extras.includes('dailyBribesRevenue') ? (bribesChartData ?? []) : [],
						feesChartMode.extras.includes('dailyTokenTaxes') ? (tokenTaxChartData ?? []) : []
					]
				})
			default:
				return assertNever(feesChartMode)
		}
	}, [allChains, bribesChartData, currentChartData, feesChartMode, tokenTaxChartData])

	const failedMetrics = React.useMemo(() => {
		if (feesChartMode.kind === 'plain') {
			return []
		}

		const nextFailedMetrics: FeesExtraMetric[] = []
		if (feesChartMode.extras.includes('dailyBribesRevenue') && bribesChartError) {
			nextFailedMetrics.push('dailyBribesRevenue')
		}
		if (feesChartMode.extras.includes('dailyTokenTaxes') && tokenTaxChartError) {
			nextFailedMetrics.push('dailyTokenTaxes')
		}

		return nextFailedMetrics
	}, [bribesChartError, feesChartMode, tokenTaxChartError])

	const chartKind = chartState.chartKind
	const chartGroupBy = chartState.groupBy
	const chartBarValueMode = chartState.chartKind === 'bar' ? chartState.valueMode : 'absolute'
	const chartDataBuildState = React.useMemo<ChainsByAdapterChartState>(() => {
		switch (chartKind) {
			case 'bar':
				return {
					chartKind: 'bar',
					valueMode: chartBarValueMode,
					barLayout: 'stacked',
					groupBy: chartGroupBy
				}
			case 'dominance':
				return { chartKind: 'dominance', groupBy: chartGroupBy }
			case 'treemap':
				return { chartKind: 'treemap', groupBy: chartGroupBy }
			case 'hbar':
				return { chartKind: 'hbar', groupBy: chartGroupBy }
			default:
				return assertNever(chartKind)
		}
	}, [chartKind, chartGroupBy, chartBarValueMode])
	const baseChartPresentation = React.useMemo(
		() =>
			buildChainsByAdapterChartPresentation({
				chartData: mergedChartData,
				selectedChains,
				state: chartDataBuildState,
				latestValueSeriesType: 'bar'
			}),
		[mergedChartData, selectedChains, chartDataBuildState]
	)
	const chartPresentation = React.useMemo(
		() => applyBarLayoutToPresentation(baseChartPresentation, chartState),
		[baseChartPresentation, chartState]
	)
	const deferredChartPresentation = React.useDeferredValue(chartPresentation)

	const onChangeChartInterval = (nextInterval: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}

	const onChangeChartKind = (nextChartKind: ChainsByAdapterChartKind) => {
		void pushShallowQuery(router, getChartKindQueryUpdate(nextChartKind, readSingleQueryValue(router.query.groupBy)))
	}

	const onChangeValueMode = (nextValueMode: ChainsByAdapterValueMode) => {
		void pushShallowQuery(router, {
			chartKind: undefined,
			chartType: undefined,
			valueMode: nextValueMode === 'Absolute' ? undefined : nextValueMode.toLowerCase()
		})
	}

	const onChangeBarLayout = (nextBarLayout: ChainsByAdapterBarLayout) => {
		void pushShallowQuery(router, {
			chartKind: undefined,
			chartType: undefined,
			barLayout: nextBarLayout === 'Stacked' ? undefined : nextBarLayout.toLowerCase()
		})
	}

	const exportConfig = React.useMemo(() => {
		const chartBaseTitle = `${chartName} by Chain`

		if (chartState.chartKind === 'dominance') {
			return {
				filename: `${slug(chartName)}-by-chain-dominance-${chartState.groupBy}`,
				title: `${chartBaseTitle} - Dominance Chart (${chartState.groupBy})`
			}
		}

		if (chartState.chartKind === 'treemap') {
			return {
				filename: `${slug(chartName)}-by-chain-treemap-${chartState.groupBy}`,
				title: `${chartBaseTitle} - Treemap (${chartState.groupBy})`
			}
		}
		if (chartState.chartKind === 'hbar') {
			return {
				filename: `${slug(chartName)}-by-chain-hbar-${chartState.groupBy}`,
				title: `${chartBaseTitle} - HBar (${chartState.groupBy})`
			}
		}

		return {
			filename: `${slug(chartName)}-by-chain-bar-${chartState.valueMode}-${chartState.barLayout}-${chartState.groupBy}`,
			title: `${chartBaseTitle} - Bar (${chartState.valueMode === 'absolute' ? 'Absolute' : 'Relative'}, ${
				chartState.barLayout === 'stacked' ? 'Stacked' : 'Separate'
			}, ${chartState.groupBy})`
		}
	}, [chartName, chartState])

	const chartKindLabel =
		chartState.chartKind === 'treemap'
			? 'Treemap Chart'
			: chartState.chartKind === 'hbar'
				? 'HBar Chart'
				: chartState.chartKind === 'dominance'
					? 'Dominance Chart'
					: 'Bar Chart'
	const barValueModeLabel =
		chartState.chartKind === 'bar' ? (chartState.valueMode === 'relative' ? 'Relative (%)' : 'Absolute ($)') : null
	const barLayoutLabel =
		chartState.chartKind === 'bar' ? (chartState.barLayout === 'separate' ? 'Separate' : 'Stacked') : null
	const chartHeight = getChartHeight(chartState)
	const multiSeriesChartOptions = React.useMemo(() => {
		switch (deferredChartPresentation.kind) {
			case 'treemap':
			case 'hbar':
				return undefined
			case 'bar':
				return deferredChartPresentation.valueMode === 'relative'
					? {
							yAxis: {
								min: 0,
								max: 100
							}
						}
					: undefined
			case 'dominance':
				return {
					yAxis: {
						min: 0,
						max: 100
					}
				}
			default:
				return assertNever(deferredChartPresentation)
		}
	}, [deferredChartPresentation])
	const baseChartErrorMessage = baseChartError ? getErrorMessage(baseChartError) : null
	const canExportChart =
		(deferredChartPresentation.kind !== 'treemap' && deferredChartPresentation.kind !== 'hbar') ||
		deferredChartPresentation.data.length > 0

	return (
		<div className="relative col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-start gap-2 p-2 pb-0">
				<Select
					allValues={CHART_KIND_OPTIONS}
					selectedValues={
						chartState.chartKind === 'treemap'
							? 'Treemap'
							: chartState.chartKind === 'hbar'
								? 'HBar'
								: chartState.chartKind === 'dominance'
									? 'Dominance'
									: 'Bar'
					}
					setSelectedValues={(value: string) => onChangeChartKind(value as ChainsByAdapterChartKind)}
					label={chartKindLabel}
					labelType="none"
					variant="filter"
				/>
				{chartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_VALUE_MODE_OPTIONS}
						selectedValues={chartState.valueMode === 'relative' ? 'Relative' : 'Absolute'}
						setSelectedValues={(value: string) => onChangeValueMode(value as ChainsByAdapterValueMode)}
						label={barValueModeLabel ?? 'Absolute'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_LAYOUT_OPTIONS}
						selectedValues={chartState.barLayout === 'separate' ? 'Separate' : 'Stacked'}
						setSelectedValues={(value: string) => onChangeBarLayout(value as ChainsByAdapterBarLayout)}
						label={barLayoutLabel ?? 'Stacked'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				<ChartGroupingSelector
					value={chartState.groupBy}
					onValueChange={onChangeChartInterval}
					options={DWMC_GROUPING_OPTIONS_LOWERCASE}
				/>
				<div className="ml-auto flex items-center justify-end gap-2">
					<SelectWithCombobox
						allValues={allChains}
						selectedValues={selectedChains}
						includeQueryKey="chain"
						excludeQueryKey="excludeChain"
						defaultSelectedValues={allChains}
						label="Chains"
						labelType="smol"
						variant="filter"
						portal
					/>
					{chartState.chartKind === 'treemap' ? <ChartRestoreButton chartInstance={exportChartInstance} /> : null}
					{canExportChart ? (
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={exportConfig.filename}
							title={exportConfig.title}
							pngProfile={chartState.chartKind === 'treemap' ? 'treemapNormalized' : undefined}
						/>
					) : null}
				</div>
			</div>
			<React.Suspense
				fallback={
					<div
						style={{
							height: chartHeight
						}}
					/>
				}
			>
				{isBaseChartLoading ? (
					<div className="flex items-center justify-center text-(--text-tertiary)" style={{ height: chartHeight }}>
						<LocalLoader />
					</div>
				) : baseChartErrorMessage ? (
					<div
						className="flex items-center justify-center p-4 text-center text-sm text-(--text-tertiary)"
						style={{ height: chartHeight }}
					>
						Failed to load chart data: {baseChartErrorMessage}
					</div>
				) : deferredChartPresentation.kind === 'treemap' ? (
					<TreeMapBuilderChart data={deferredChartPresentation.data} height={chartHeight} onReady={handleChartReady} />
				) : deferredChartPresentation.kind === 'hbar' ? (
					<HBarChart
						categories={deferredChartPresentation.data.map((item) => item.name)}
						values={deferredChartPresentation.data.map((item) => item.value)}
						colors={deferredChartPresentation.data.map((item) => item.itemStyle.color)}
						height={chartHeight}
						valueSymbol="$"
						onReady={handleChartReady}
					/>
				) : (
					<MultiSeriesChart2
						dataset={deferredChartPresentation.dataset}
						charts={deferredChartPresentation.charts}
						height={chartHeight}
						valueSymbol={
							deferredChartPresentation.kind === 'bar' && deferredChartPresentation.valueMode === 'absolute' ? '$' : '%'
						}
						solidChartAreaStyle={deferredChartPresentation.kind === 'dominance'}
						{...(multiSeriesChartOptions ? { chartOptions: multiSeriesChartOptions } : {})}
						groupBy={deferredChartPresentation.groupBy}
						hideDefaultLegend={deferredChartPresentation.charts.length === 1}
						showTotalInTooltip={
							deferredChartPresentation.kind === 'bar' ? deferredChartPresentation.showTotalInTooltip : false
						}
						onReady={handleChartReady}
					/>
				)}
			</React.Suspense>
			<FailedFeesMetricsPopover failedMetrics={failedMetrics} />
		</div>
	)
}

function FailedFeesMetricsPopover({ failedMetrics }: { failedMetrics: FeesExtraMetric[] }) {
	if (failedMetrics.length === 0) {
		return null
	}

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="absolute right-2 bottom-2 z-10 flex items-center justify-center rounded-full border border-(--cards-border) bg-(--bg-main) p-1.5 text-(--error) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
				<Icon name="alert-triangle" className="size-3.5" />
				<span className="sr-only">Show failed metric APIs</span>
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				className="z-10 mr-1 flex max-h-[calc(100dvh-80px)] w-[min(calc(100vw-16px),300px)] flex-col gap-1 overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 text-xs dark:border-[hsl(204,3%,32%)]"
			>
				<p className="font-medium text-(--error)">Failed to load data for:</p>
				<ul className="pl-4">
					{failedMetrics.map((metric) => (
						<li key={metric} className="list-disc">
							{FEES_EXTRA_METRIC_LABEL[metric]}
						</li>
					))}
				</ul>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
