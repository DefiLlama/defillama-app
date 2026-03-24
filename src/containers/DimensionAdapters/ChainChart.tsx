import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWM_GROUPING_OPTIONS_LOWERCASE,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmGrouping,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { CHART_COLORS } from '~/constants/colors'
import type { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug } from '~/utils'
import { getErrorMessage } from '~/utils/error'
import { parseArrayParam, parseExcludeParam, pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import {
	fetchAdapterChainChartData,
	fetchAdapterChainChartDataByProtocolBreakdown,
	fetchAdapterChartDataByChainBreakdown
} from './api'
import { LINE_DIMENSIONS, type ADAPTER_TYPES } from './constants'
import type { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'
import {
	buildAdapterByChainBreakdownPresentation,
	buildAdapterByChainLatestValuePresentation,
	buildChainsByAdapterChartPresentation,
	mergeBreakdownCharts,
	mergeNamedDimensionChartDataset,
	mergeSingleDimensionChartDataset,
	normalizeChainsByAdapterChartState,
	type ChainsByAdapterChartState
} from './utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const HBarChart = React.lazy(() => import('~/components/ECharts/HBarChart'))
const TreeMapBuilderChart = React.lazy(() => import('~/components/ECharts/TreeMapBuilderChart'))

const CHART_VIEW_MODES_ADAPTER_BY_CHAIN = ['Combined', 'Breakdown'] as const
type AdapterByChainViewMode = (typeof CHART_VIEW_MODES_ADAPTER_BY_CHAIN)[number]
const CHART_KINDS_CHAINS_BY_ADAPTER = ['Bar', 'Line', 'Treemap', 'HBar'] as const
type ChainsByAdapterChartKind = (typeof CHART_KINDS_CHAINS_BY_ADAPTER)[number]
const BAR_VALUE_MODES_CHAINS_BY_ADAPTER = ['Absolute', 'Relative'] as const
type ChainsByAdapterValueMode = (typeof BAR_VALUE_MODES_CHAINS_BY_ADAPTER)[number]
const BAR_LAYOUTS_CHAINS_BY_ADAPTER = ['Stacked', 'Separate'] as const
type ChainsByAdapterBarLayout = (typeof BAR_LAYOUTS_CHAINS_BY_ADAPTER)[number]
const CHAINS_BY_ADAPTER_CHART_HEIGHT = '420px'
const CHAINS_BY_ADAPTER_TREEMAP_HEIGHT = '520px'
const CHART_KIND_OPTIONS = [
	{ key: 'Bar', name: 'Bar Chart' },
	{ key: 'Line', name: 'Line Chart' },
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
const FEES_CHART_NAMES = new Set(['Fees', 'Revenue', 'Holders Revenue'])
const FEES_EXTRA_METRIC_LABEL = {
	dailyBribesRevenue: 'Bribes Revenue',
	dailyTokenTaxes: 'Token Tax'
} as const

type FeesExtraMetric = keyof typeof FEES_EXTRA_METRIC_LABEL
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
	chartName,
	bribes,
	tokentax
}: {
	adapterType: `${ADAPTER_TYPES}`
	chartName: string
	bribes: boolean
	tokentax: boolean
}): FeesChartMode {
	if (adapterType !== 'fees' || !FEES_CHART_NAMES.has(chartName)) {
		return { kind: 'plain' }
	}

	const extras: FeesExtraMetric[] = []
	if (bribes) extras.push('dailyBribesRevenue')
	if (tokentax) extras.push('dailyTokenTaxes')
	if (extras.length === 0) {
		return { kind: 'plain' }
	}

	return { kind: 'fees', extras }
}

function getChartKindQueryUpdate(
	nextChartKind: ChainsByAdapterChartKind,
	currentGroupByParam: string | undefined
): Record<string, string | undefined> {
	switch (nextChartKind) {
		case 'Bar':
			return {
				chartKind: undefined,
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: currentGroupByParam?.toLowerCase() === 'daily' ? undefined : currentGroupByParam
			}
		case 'Line':
			return {
				chartKind: 'line',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: currentGroupByParam?.toLowerCase() === 'daily' ? undefined : currentGroupByParam
			}
		case 'Treemap':
			return {
				chartKind: 'treemap',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: undefined
			}
		case 'HBar':
			return {
				chartKind: 'hbar',
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: undefined
			}
		default:
			return assertNever(nextChartKind)
	}
}

function getChartHeight(chartState: ChainsByAdapterChartState): string {
	switch (chartState.chartKind) {
		case 'bar':
		case 'line':
			return CHAINS_BY_ADAPTER_CHART_HEIGHT
		case 'treemap':
		case 'hbar':
			return CHAINS_BY_ADAPTER_TREEMAP_HEIGHT
		default:
			return assertNever(chartState)
	}
}

function getAdapterByChainChartKindQueryUpdate({
	nextChartKind,
	currentGroupByParam,
	currentChartKind
}: {
	nextChartKind: ChainsByAdapterChartKind
	currentGroupByParam: string | undefined
	currentChartKind: ChainsByAdapterChartState['chartKind']
}): Record<string, string | string[] | undefined> {
	const nextUpdates = getChartKindQueryUpdate(nextChartKind, currentGroupByParam)
	const enteringLatestValueChart = nextChartKind === 'Treemap' || nextChartKind === 'HBar'
	const leavingLatestValueChart = currentChartKind === 'treemap' || currentChartKind === 'hbar'

	if (enteringLatestValueChart || leavingLatestValueChart) {
		return {
			...nextUpdates,
			chartProtocols: undefined,
			excludeChartProtocols: undefined
		}
	}

	return nextUpdates
}

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	chain,
	chartName,
	dataType,
	protocols
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'chain' | 'dataType' | 'protocols'> & {
	chartName: string
}) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const feesChartMode = React.useMemo(
		() =>
			getFeesChartMode({
				adapterType,
				chartName,
				bribes: feesSettings.bribes,
				tokentax: feesSettings.tokentax
			}),
		[adapterType, chartName, feesSettings.bribes, feesSettings.tokentax]
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
	const isLatestValueBreakdownChart =
		chartViewMode === 'Breakdown' &&
		(breakdownChartState.chartKind === 'treemap' || breakdownChartState.chartKind === 'hbar')

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
		chartName,
		chain,
		dataType,
		enabled: chartViewMode === 'Breakdown' && !isLatestValueBreakdownChart,
		feesChartMode
	})

	const combinedChartData = React.useMemo(() => {
		switch (feesChartMode.kind) {
			case 'plain':
				return chartData
			case 'fees':
				return mergeSingleDimensionChartDataset({
					chartData,
					extraCharts: [combinedBribesChart ?? [], combinedTokenTaxChart ?? []]
				})
			default:
				return assertNever(feesChartMode)
		}
	}, [chartData, combinedBribesChart, combinedTokenTaxChart, feesChartMode])

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

	const protocolOptions = React.useMemo(
		() =>
			isLatestValueBreakdownChart
				? protocols.map((protocol) => protocol.name)
				: breakdownChartDataState.kind === 'ready'
					? breakdownChartDataState.protocolDimensions
					: [],
		[breakdownChartDataState, isLatestValueBreakdownChart, protocols]
	)
	const selectedProtocols = React.useMemo(() => {
		if (chartViewMode !== 'Breakdown' || protocolOptions.length === 0) return []
		const protocolsQuery = router.query.chartProtocols
		const excludeProtocolsQuery = router.query.excludeChartProtocols
		const excludedProtocolsSet = parseExcludeParam(excludeProtocolsQuery)
		const baseSelectedProtocols =
			protocolsQuery != null ? parseArrayParam(protocolsQuery, protocolOptions) : protocolOptions

		return excludedProtocolsSet.size > 0
			? baseSelectedProtocols.filter((protocolName) => !excludedProtocolsSet.has(protocolName))
			: baseSelectedProtocols
	}, [chartViewMode, protocolOptions, router.query.chartProtocols, router.query.excludeChartProtocols])

	const onChangeCombinedChartInterval = (nextInterval: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}
	const onChangeChartViewMode = (nextChartViewMode: AdapterByChainViewMode) => {
		void pushShallowQuery(router, { chartView: nextChartViewMode === 'Combined' ? undefined : nextChartViewMode })
	}
	const onChangeBreakdownChartInterval = (nextInterval: LowercaseDwmGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}
	const onChangeChartKind = (nextChartKind: ChainsByAdapterChartKind) => {
		void pushShallowQuery(
			router,
			getAdapterByChainChartKindQueryUpdate({
				nextChartKind,
				currentGroupByParam: readSingleQueryValue(router.query.groupBy),
				currentChartKind: breakdownChartState.chartKind
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

	const combinedMetricDimensions = combinedChartData.dimensions.filter((d) => d !== 'timestamp')
	const combinedFinalCharts = React.useMemo(() => {
		const isDaily = combinedChartInterval === 'daily'
		const isCumulative = combinedChartInterval === 'cumulative'
		const seriesDefinitions = combinedMetricDimensions.map((dimension, index) => {
			const seriesName = dimension
			const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
			const isSnapshotMetric = isIntrinsicLineSeries || LINE_DIMENSIONS.has(chartName)
			const type = isSnapshotMetric || isCumulative ? ('line' as const) : ('bar' as const)

			if (isDaily) {
				return { dimension, seriesName, type, data: [], color: CHART_COLORS[index % CHART_COLORS.length] }
			}

			const rawData = combinedChartData.source
				.map((row) => {
					const timestamp = Number(row.timestamp)
					const value = row[dimension] as number | null
					return value == null ? null : ([timestamp, value] as [number, number])
				})
				.filter((item): item is [number, number] => item != null)

			const data = isSnapshotMetric
				? formatLineChart({
						data: rawData,
						groupBy: combinedChartInterval,
						dateInMs: true,
						denominationPriceHistory: null
					})
				: formatBarChart({
						data: rawData,
						groupBy: combinedChartInterval,
						dateInMs: true,
						denominationPriceHistory: null
					})

			return { dimension, seriesName, type, data, color: CHART_COLORS[index % CHART_COLORS.length] }
		})

		if (isDaily) {
			return {
				dataset: combinedChartData,
				charts: seriesDefinitions.map((series, index) => ({
					type: series.type,
					name: series.seriesName,
					encode: { x: 'timestamp', y: series.seriesName },
					color: series.color,
					...(index > 0 && series.type === 'line' ? { yAxisIndex: 1, hideAreaStyle: true } : {})
				}))
			}
		}

		const sourceDataByTimestamp = new Map<number, Record<string, number | null>>()
		for (const series of seriesDefinitions) {
			for (const [timestamp, value] of series.data) {
				const row = sourceDataByTimestamp.get(timestamp) ?? { timestamp }
				row[series.seriesName] = value
				sourceDataByTimestamp.set(timestamp, row)
			}
		}

		const sourceData = ensureChronologicalRows(Array.from(sourceDataByTimestamp.values())).map((row) => {
			const normalizedRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
			for (const series of seriesDefinitions) {
				normalizedRow[series.seriesName] = row[series.seriesName] ?? null
			}
			return normalizedRow
		})
		const seriesNames = seriesDefinitions.map((series) => series.seriesName)

		return {
			dataset: {
				source: sourceData,
				dimensions: ['timestamp', ...seriesNames]
			},
			charts: seriesDefinitions.map((series, index) => ({
				type: series.type,
				name: series.seriesName,
				encode: { x: 'timestamp', y: series.seriesName },
				color: series.color,
				...(index > 0 && series.type === 'line' ? { yAxisIndex: 1, hideAreaStyle: true } : {})
			}))
		}
	}, [combinedChartData, chartName, combinedChartInterval, combinedMetricDimensions])
	const deferredCombinedFinalCharts = React.useDeferredValue(combinedFinalCharts)

	const breakdownChartData =
		breakdownChartDataState.kind === 'ready' ? breakdownChartDataState.chartData : EMPTY_DATASET
	const breakdownPresentation = React.useMemo(() => {
		switch (breakdownChartState.chartKind) {
			case 'treemap':
			case 'hbar':
				return buildAdapterByChainLatestValuePresentation({
					chartKind: breakdownChartState.chartKind,
					protocols,
					selectedProtocols
				})
			case 'line':
			case 'bar':
				return buildAdapterByChainBreakdownPresentation({
					chartData: breakdownChartData,
					state: breakdownChartState,
					selectedProtocols
				})
			default:
				return assertNever(breakdownChartState)
		}
	}, [breakdownChartData, breakdownChartState, protocols, selectedProtocols])
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

	const breakdownMultiSeriesChartOptions = React.useMemo(() => {
		switch (deferredBreakdownPresentation.kind) {
			case 'treemap':
			case 'hbar':
				return undefined
			case 'bar': {
				const baseOptions =
					deferredBreakdownPresentation.valueMode === 'relative'
						? {
								yAxis: {
									min: 0,
									max: 100
								}
							}
						: {}
				if (deferredBreakdownPresentation.charts.length <= 1) {
					return Object.keys(baseOptions).length > 0 ? baseOptions : undefined
				}
				return {
					...baseOptions,
					legend: {
						top: 12
					},
					grid: {
						top: 40
					}
				}
			}
			case 'line':
				if (deferredBreakdownPresentation.charts.length <= 1) {
					return {
						yAxis: {
							min: 0,
							max: 100
						}
					}
				}
				return {
					yAxis: {
						min: 0,
						max: 100
					},
					legend: {
						top: 12
					},
					grid: {
						top: 40
					}
				}
			default:
				return assertNever(deferredBreakdownPresentation)
		}
	}, [deferredBreakdownPresentation])

	const breakdownChartKindLabel =
		breakdownChartState.chartKind === 'treemap'
			? 'Treemap Chart'
			: breakdownChartState.chartKind === 'hbar'
				? 'HBar Chart'
				: breakdownChartState.chartKind === 'line'
					? 'Line Chart'
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
	const canExportBreakdownChart =
		(deferredBreakdownPresentation.kind !== 'treemap' && deferredBreakdownPresentation.kind !== 'hbar') ||
		deferredBreakdownPresentation.data.length > 0
	const breakdownExportConfig = React.useMemo(() => {
		const chartBaseTitle = `${chain === 'All' ? 'All Chains' : chain} - ${chartName} by Protocol`
		const chainSlug = slug(chain === 'All' ? 'all-chains' : chain)

		if (breakdownChartState.chartKind === 'line') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-line-relative-${breakdownChartState.groupBy}`,
				title: `${chartBaseTitle} - Dominance Line (${breakdownChartState.groupBy})`
			}
		}
		if (breakdownChartState.chartKind === 'treemap') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-treemap-latest`,
				title: `${chartBaseTitle} - Treemap (Latest)`
			}
		}
		if (breakdownChartState.chartKind === 'hbar') {
			return {
				filename: `${chainSlug}-${slug(chartName)}-by-protocol-hbar-latest`,
				title: `${chartBaseTitle} - HBar (Latest)`
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
									: breakdownChartState.chartKind === 'line'
										? 'Line'
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
				{chartViewMode === 'Breakdown' &&
				breakdownChartState.chartKind !== 'treemap' &&
				breakdownChartState.chartKind !== 'hbar' ? (
					<ChartGroupingSelector
						value={breakdownChartState.groupBy}
						onValueChange={onChangeBreakdownChartInterval}
						options={DWM_GROUPING_OPTIONS_LOWERCASE}
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
							includeQueryKey="chartProtocols"
							excludeQueryKey="excludeChartProtocols"
							defaultSelectedValues={protocolOptions}
							label="Protocols"
							labelType="smol"
							variant="filter"
							portal
						/>
					) : null}
					{chartViewMode === 'Breakdown' ? (
						canExportBreakdownChart ? (
							<ChartExportButtons
								chartInstance={exportChartInstance}
								filename={breakdownExportConfig.filename}
								title={breakdownExportConfig.title}
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
			{chartViewMode === 'Breakdown' && !isLatestValueBreakdownChart && breakdownChartDataState.kind === 'error' ? (
				<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">
					{breakdownChartDataState.message}
				</p>
			) : chartViewMode === 'Breakdown' &&
			  !isLatestValueBreakdownChart &&
			  breakdownChartDataState.kind === 'loading' ? (
				<p className="flex min-h-[360px] items-center justify-center gap-1">
					Loading
					<LoadingDots />
				</p>
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
							solidChartAreaStyle={deferredBreakdownPresentation.kind === 'line'}
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
	chartName,
	chain,
	dataType,
	enabled,
	feesChartMode
}: {
	adapterType: `${ADAPTER_TYPES}`
	chartName: string
	chain: string
	dataType: IAdapterByChainPageData['dataType']
	enabled: boolean
	feesChartMode: FeesChartMode
}): BreakdownChartDataState {
	const safeDataType = dataType === 'dailyEarnings' ? undefined : (dataType ?? undefined)

	const { data, isLoading, error } = useQuery({
		queryKey: ['adapter-breakdown-chart', adapterType, chain, safeDataType],
		queryFn: () => fetchAdapterChainChartDataByProtocolBreakdown({ adapterType, chain, dataType: safeDataType }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled
	})

	const { data: bribesData, error: bribesError } = useQuery({
		queryKey: ['adapter-breakdown-chart', adapterType, chain, chartName, 'dailyBribesRevenue'],
		queryFn: () =>
			fetchAdapterChainChartDataByProtocolBreakdown({
				adapterType,
				chain,
				dataType: 'dailyBribesRevenue'
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: enabled && feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyBribesRevenue')
	})

	const { data: tokenTaxData, error: tokenTaxError } = useQuery({
		queryKey: ['adapter-breakdown-chart', adapterType, chain, chartName, 'dailyTokenTaxes'],
		queryFn: () =>
			fetchAdapterChainChartDataByProtocolBreakdown({
				adapterType,
				chain,
				dataType: 'dailyTokenTaxes'
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: enabled && feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyTokenTaxes')
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

		const mergedData = mergeBreakdownCharts({
			chart: data ?? [],
			extraCharts: [bribesData ?? [], tokenTaxData ?? []]
		})
		const protocolValuesByTimestamp = new Map<number, Record<string, number>>()
		const protocolTotals = new Map<string, number>()

		for (const [timestamp, protocolValues] of mergedData) {
			const valuesAtTimestamp: Record<string, number> = {}
			for (const [protocolName, value] of Object.entries(protocolValues)) {
				valuesAtTimestamp[protocolName] = value
				protocolTotals.set(protocolName, (protocolTotals.get(protocolName) ?? 0) + value)
			}
			protocolValuesByTimestamp.set(timestamp * 1e3, valuesAtTimestamp)
		}

		const allProtocols = Array.from(protocolTotals.entries())
			.toSorted((a, b) => b[1] - a[1])
			.map(([name]) => name)

		const sortedTimestamps = Array.from(protocolValuesByTimestamp.keys()).sort((a, b) => a - b)

		const source = sortedTimestamps.map((timestamp) => {
			const row: Record<string, number | null> = { timestamp }
			const valuesAtTimestamp = protocolValuesByTimestamp.get(timestamp)
			for (const protocolName of allProtocols) {
				row[protocolName] = valuesAtTimestamp?.[protocolName] ?? null
			}
			return row
		})

		const breakdownChartData: MultiSeriesChart2Dataset = {
			source,
			dimensions: ['timestamp', ...allProtocols]
		}

		const failedMetrics: FeesExtraMetric[] = []
		if (feesChartMode.kind === 'fees') {
			if (feesChartMode.extras.includes('dailyBribesRevenue') && bribesError) {
				failedMetrics.push('dailyBribesRevenue')
			}
			if (feesChartMode.extras.includes('dailyTokenTaxes') && tokenTaxError) {
				failedMetrics.push('dailyTokenTaxes')
			}
		}

		return {
			kind: 'ready',
			chartData: breakdownChartData,
			protocolDimensions: allProtocols,
			failedMetrics
		}
	}, [bribesData, bribesError, data, enabled, error, feesChartMode, isLoading, tokenTaxData, tokenTaxError])
}

export const ChainsByAdapterChart = ({
	adapterType,
	chartData,
	allChains,
	chains,
	chartName
}: Pick<IChainsByAdapterPageData, 'adapterType' | 'chartData' | 'allChains' | 'chains'> & { chartName: string }) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const feesChartMode = React.useMemo(
		() =>
			getFeesChartMode({
				adapterType,
				chartName,
				bribes: feesSettings.bribes,
				tokentax: feesSettings.tokentax
			}),
		[adapterType, chartName, feesSettings.bribes, feesSettings.tokentax]
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
	const usesTimeSeriesData = chartState.chartKind === 'bar' || chartState.chartKind === 'line'
	const selectedChains = React.useMemo(() => {
		const chainsQuery = router.query.chains
		const excludeChainsQuery = router.query.excludeChains
		const excludedChainsSet = parseExcludeParam(excludeChainsQuery)
		const baseSelectedChains = chainsQuery != null ? parseArrayParam(chainsQuery, allChains) : allChains

		return excludedChainsSet.size > 0
			? baseSelectedChains.filter((chain) => !excludedChainsSet.has(chain))
			: baseSelectedChains
	}, [allChains, router.query.chains, router.query.excludeChains])

	const { data: bribesChartData, error: bribesChartError } = useQuery({
		queryKey: ['adapter-chain-breakdown-chart', adapterType, chartName, 'dailyBribesRevenue'],
		queryFn: () => fetchAdapterChartDataByChainBreakdown({ adapterType, dataType: 'dailyBribesRevenue' }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: usesTimeSeriesData && feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyBribesRevenue')
	})

	const { data: tokenTaxChartData, error: tokenTaxChartError } = useQuery({
		queryKey: ['adapter-chain-breakdown-chart', adapterType, chartName, 'dailyTokenTaxes'],
		queryFn: () => fetchAdapterChartDataByChainBreakdown({ adapterType, dataType: 'dailyTokenTaxes' }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: usesTimeSeriesData && feesChartMode.kind === 'fees' && feesChartMode.extras.includes('dailyTokenTaxes')
	})

	const mergedChartData = React.useMemo(() => {
		if (!usesTimeSeriesData) {
			return chartData
		}

		switch (feesChartMode.kind) {
			case 'plain':
				return chartData
			case 'fees':
				return mergeNamedDimensionChartDataset({
					chartData,
					extraCharts: [bribesChartData ?? [], tokenTaxChartData ?? []]
				})
			default:
				return assertNever(feesChartMode)
		}
	}, [bribesChartData, chartData, feesChartMode, tokenTaxChartData, usesTimeSeriesData])

	const failedMetrics = React.useMemo(() => {
		if (!usesTimeSeriesData || feesChartMode.kind === 'plain') {
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
	}, [bribesChartError, feesChartMode, tokenTaxChartError, usesTimeSeriesData])

	const chartPresentation = React.useMemo(
		() =>
			buildChainsByAdapterChartPresentation({
				chartData: mergedChartData,
				selectedChains,
				state: chartState,
				latestChainRows: chains
			}),
		[mergedChartData, selectedChains, chartState, chains]
	)
	const deferredChartPresentation = React.useDeferredValue(chartPresentation)

	const onChangeChartInterval = (nextInterval: LowercaseDwmGrouping) => {
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

		if (chartState.chartKind === 'line') {
			return {
				filename: `${slug(chartName)}-by-chain-line-relative-${chartState.groupBy}`,
				title: `${chartBaseTitle} - Dominance Line (${chartState.groupBy})`
			}
		}

		if (chartState.chartKind === 'treemap') {
			return {
				filename: `${slug(chartName)}-by-chain-treemap-latest`,
				title: `${chartBaseTitle} - Treemap (Latest)`
			}
		}
		if (chartState.chartKind === 'hbar') {
			return {
				filename: `${slug(chartName)}-by-chain-hbar-latest`,
				title: `${chartBaseTitle} - HBar (Latest)`
			}
		}

		return {
			filename: `${slug(chartName)}-by-chain-bar-${chartState.valueMode}-${chartState.barLayout}-${chartState.groupBy}`,
			title: `${chartBaseTitle} - Bar (${chartState.valueMode === 'absolute' ? 'Absolute' : 'Relative'}, ${
				chartState.barLayout === 'stacked' ? 'Stacked' : 'Separate'
			}, ${chartState.groupBy})`
		}
	}, [chartName, chartState])

	const multiSeriesChartOptions = React.useMemo(() => {
		switch (deferredChartPresentation.kind) {
			case 'treemap':
			case 'hbar':
				return undefined
			case 'bar': {
				const baseOptions =
					deferredChartPresentation.valueMode === 'relative'
						? {
								yAxis: {
									min: 0,
									max: 100
								}
							}
						: {}
				if (deferredChartPresentation.charts.length <= 1) {
					return Object.keys(baseOptions).length > 0 ? baseOptions : undefined
				}
				return {
					...baseOptions,
					legend: {
						top: 12
					},
					grid: {
						top: 40
					}
				}
			}
			case 'line':
				if (deferredChartPresentation.charts.length <= 1) {
					return {
						yAxis: {
							min: 0,
							max: 100
						}
					}
				}
				return {
					yAxis: {
						min: 0,
						max: 100
					},
					legend: {
						top: 12
					},
					grid: {
						top: 40
					}
				}
			default:
				return assertNever(deferredChartPresentation)
		}
	}, [deferredChartPresentation])

	const chartKindLabel =
		chartState.chartKind === 'treemap'
			? 'Treemap Chart'
			: chartState.chartKind === 'hbar'
				? 'HBar Chart'
				: chartState.chartKind === 'line'
					? 'Line Chart'
					: 'Bar Chart'
	const barValueModeLabel =
		chartState.chartKind === 'bar' ? (chartState.valueMode === 'relative' ? 'Relative (%)' : 'Absolute ($)') : null
	const barLayoutLabel =
		chartState.chartKind === 'bar' ? (chartState.barLayout === 'separate' ? 'Separate' : 'Stacked') : null
	const chartHeight = getChartHeight(chartState)
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
								: chartState.chartKind === 'line'
									? 'Line'
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
				{chartState.chartKind !== 'treemap' && chartState.chartKind !== 'hbar' ? (
					<ChartGroupingSelector
						value={chartState.groupBy}
						onValueChange={onChangeChartInterval}
						options={DWM_GROUPING_OPTIONS_LOWERCASE}
					/>
				) : null}
				<div className="ml-auto flex items-center justify-end gap-2">
					<SelectWithCombobox
						allValues={allChains}
						selectedValues={selectedChains}
						includeQueryKey="chains"
						excludeQueryKey="excludeChains"
						defaultSelectedValues={allChains}
						label="Chains"
						labelType="smol"
						variant="filter"
						portal
					/>
					{canExportChart ? (
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={exportConfig.filename}
							title={exportConfig.title}
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
				{deferredChartPresentation.kind === 'treemap' ? (
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
						solidChartAreaStyle={deferredChartPresentation.kind === 'line'}
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
				<Icon name="alert-triangle" className="h-3.5 w-3.5" />
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
