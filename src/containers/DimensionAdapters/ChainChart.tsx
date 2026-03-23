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
import { LoadingDots } from '~/components/Loaders'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { CHART_COLORS } from '~/constants/colors'
import type { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug } from '~/utils'
import { getErrorMessage } from '~/utils/error'
import { parseArrayParam, parseExcludeParam, pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import { fetchAdapterChainChartDataByProtocolBreakdown } from './api'
import { LINE_DIMENSIONS, type ADAPTER_TYPES } from './constants'
import type { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'
import { buildChainsByAdapterChartPresentation, normalizeChainsByAdapterChartState } from './utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const TreeMapBuilderChart = React.lazy(() => import('~/components/ECharts/TreeMapBuilderChart'))

const CHART_VIEW_MODES_ADAPTER_BY_CHAIN = ['Combined', 'Breakdown'] as const
type AdapterByChainViewMode = (typeof CHART_VIEW_MODES_ADAPTER_BY_CHAIN)[number]
const CHART_KINDS_CHAINS_BY_ADAPTER = ['Bar', 'Line', 'Treemap'] as const
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
	{ key: 'Treemap', name: 'Treemap Chart' }
] as const
const BAR_VALUE_MODE_OPTIONS = [
	{ key: 'Absolute', name: 'Absolute ($)' },
	{ key: 'Relative', name: 'Relative (%)' }
] as const
const BAR_LAYOUT_OPTIONS = [
	{ key: 'Stacked', name: 'Stacked' },
	{ key: 'Separate', name: 'Separate' }
] as const

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	chain,
	chartName,
	dataType
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'chain' | 'dataType'> & { chartName: string }) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const chartInterval = React.useMemo<LowercaseDwmcGrouping>(() => {
		// Preserve existing shared/bookmarked URLs that still use title-cased values like `Weekly`.
		const groupByParam = readSingleQueryValue(router.query.groupBy)?.toLowerCase()
		const matchedInterval = DWMC_GROUPING_OPTIONS_LOWERCASE.find((option) => option.value === groupByParam)
		return matchedInterval?.value ?? 'daily'
	}, [router.query.groupBy])
	const chartViewMode = React.useMemo<AdapterByChainViewMode>(() => {
		const chartViewParam = readSingleQueryValue(router.query.chartView)?.toLowerCase()
		return chartViewParam === 'breakdown' ? 'Breakdown' : 'Combined'
	}, [router.query.chartView])

	const { breakdownChartData, breakdownProtocolDimensions, isBreakdownLoading, breakdownError } =
		useAdapterByChainBreakdownChartData({
			adapterType,
			chain,
			dataType,
			enabled: chartViewMode === 'Breakdown'
		})

	const selectedProtocols = React.useMemo(() => {
		if (chartViewMode !== 'Breakdown' || breakdownProtocolDimensions.length === 0) return []
		const protocolsQuery = router.query.chartProtocols
		const excludeProtocolsQuery = router.query.excludeChartProtocols
		const excludedProtocolsSet = parseExcludeParam(excludeProtocolsQuery)
		const baseSelectedProtocols =
			protocolsQuery != null
				? parseArrayParam(protocolsQuery, breakdownProtocolDimensions)
				: breakdownProtocolDimensions

		return excludedProtocolsSet.size > 0
			? baseSelectedProtocols.filter((protocolName) => !excludedProtocolsSet.has(protocolName))
			: baseSelectedProtocols
	}, [chartViewMode, breakdownProtocolDimensions, router.query.chartProtocols, router.query.excludeChartProtocols])

	const activeChartData = chartViewMode === 'Breakdown' && breakdownChartData ? breakdownChartData : chartData
	const metricDimensions = activeChartData.dimensions.filter((d) => d !== 'timestamp')

	const dimensionsToRender = React.useMemo(() => {
		if (chartViewMode !== 'Breakdown' || !breakdownChartData) {
			return metricDimensions
		}

		const selectedProtocolsSet = new Set(selectedProtocols)
		return breakdownProtocolDimensions.filter((d) => selectedProtocolsSet.has(d))
	}, [metricDimensions, chartViewMode, breakdownChartData, selectedProtocols, breakdownProtocolDimensions])

	const onChangeChartInterval = (nextInterval: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}
	const onChangeChartViewMode = (nextChartViewMode: AdapterByChainViewMode) => {
		void pushShallowQuery(router, { chartView: nextChartViewMode === 'Combined' ? undefined : nextChartViewMode })
	}

	const isBreakdownMode = chartViewMode === 'Breakdown' && breakdownChartData != null
	const finalCharts = React.useMemo(() => {
		const isDaily = chartInterval === 'daily'

		const isCumulative = chartInterval === 'cumulative'
		const seriesDefinitions = dimensionsToRender.map((dimension, index) => {
			const seriesName = dimension
			const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
			// Snapshot metrics (Open Interest, Active Liquidity) take last-value-per-period;
			// flow metrics (fees, volume) sum per period. In breakdown mode dimensions are
			// protocol names, so fall back to chartName to inherit the metric's semantics.
			const isSnapshotMetric = isIntrinsicLineSeries || LINE_DIMENSIONS.has(chartName)
			const type = isSnapshotMetric || isCumulative ? ('line' as const) : ('bar' as const)
			const stack = isBreakdownMode && !isSnapshotMetric ? 'protocol-breakdown' : undefined
			if (isDaily) {
				return { dimension, seriesName, type, stack, data: [], color: CHART_COLORS[index % CHART_COLORS.length] }
			}

			const rawData = activeChartData.source
				.map((row) => {
					const timestamp = Number(row.timestamp)
					const value = row[dimension] as number | null
					return value == null ? null : ([timestamp, value] as [number, number])
				})
				.filter((item): item is [number, number] => item != null)

			// Snapshot metrics (OI, Active Liquidity) are point-in-time values — summing
			// them is meaningless, so they always use formatLineChart (last-value-per-period).
			// When chartInterval is 'cumulative', formatLineChart falls through to daily
			// passthrough which is correct: "cumulative OI" has no meaning, so we just
			// show the raw snapshot values alongside any cumulative flow series.
			// Flow metrics (fees, volume) sum per period via formatBarChart, which also
			// handles cumulative running totals.
			const data = isSnapshotMetric
				? formatLineChart({
						data: rawData,
						groupBy: chartInterval,
						dateInMs: true,
						denominationPriceHistory: null
					})
				: formatBarChart({
						data: rawData,
						groupBy: chartInterval,
						dateInMs: true,
						denominationPriceHistory: null
					})

			return { dimension, seriesName, type, stack, data, color: CHART_COLORS[index % CHART_COLORS.length] }
		})

		if (isDaily) {
			return {
				dataset: activeChartData,
				charts: seriesDefinitions.map((series, index) => ({
					type: series.type,
					name: series.seriesName,
					encode: { x: 'timestamp', y: series.seriesName },
					color: series.color,
					...(series.stack ? { stack: series.stack } : {}),
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
				...(series.stack ? { stack: series.stack } : {}),
				...(index > 0 && series.type === 'line' ? { yAxisIndex: 1, hideAreaStyle: true } : {})
			}))
		}
	}, [activeChartData, chartInterval, chartName, isBreakdownMode, dimensionsToRender])
	const deferredFinalCharts = React.useDeferredValue(finalCharts)

	const dashboardChartType = getAdapterDashboardType(adapterType)

	const multiChart = React.useMemo<MultiChartConfig | null>(() => {
		if (!dashboardChartType) return null

		let grouping: MultiChartConfig['grouping']
		switch (chartInterval) {
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
			showCumulative: chartInterval === 'cumulative'
		}
	}, [chain, adapterType, dashboardChartType, chartInterval, chartName])

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{CHART_VIEW_MODES_ADAPTER_BY_CHAIN.map((mode) => (
						<button
							key={`adapter-by-chain-chart-view-mode-${mode}`}
							className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							data-active={mode === chartViewMode}
							onClick={() => onChangeChartViewMode(mode)}
						>
							{mode}
						</button>
					))}
				</div>
				{chartViewMode === 'Breakdown' && breakdownProtocolDimensions.length > 0 ? (
					<SelectWithCombobox
						allValues={breakdownProtocolDimensions}
						selectedValues={selectedProtocols}
						includeQueryKey="chartProtocols"
						excludeQueryKey="excludeChartProtocols"
						defaultSelectedValues={breakdownProtocolDimensions}
						label="Protocols"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				{LINE_DIMENSIONS.has(chartName) ? null : (
					<ChartGroupingSelector
						value={chartInterval}
						onValueChange={onChangeChartInterval}
						options={DWMC_GROUPING_OPTIONS_LOWERCASE}
						buttonClassName="font-medium data-[active=true]:font-medium"
					/>
				)}
				{chain ? <AddToDashboardButton chartConfig={multiChart} smol /> : null}
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={`${chain}-${adapterType}-${chartName}`}
					title={`${chain === 'All' ? 'All Chains' : chain} - ${chartName}`}
				/>
			</div>
			{chartViewMode === 'Breakdown' && breakdownError ? (
				<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">{breakdownError}</p>
			) : chartViewMode === 'Breakdown' && isBreakdownLoading ? (
				<p className="flex min-h-[360px] items-center justify-center gap-1">
					Loading
					<LoadingDots />
				</p>
			) : (
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={deferredFinalCharts.dataset}
						charts={deferredFinalCharts.charts}
						hideDefaultLegend={deferredFinalCharts.charts.length === 1}
						groupBy={chartInterval}
						showTotalInTooltip={isBreakdownMode}
						onReady={handleChartReady}
					/>
				</React.Suspense>
			)}
		</div>
	)
}

function useAdapterByChainBreakdownChartData({
	adapterType,
	chain,
	dataType,
	enabled
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType: IAdapterByChainPageData['dataType']
	enabled: boolean
}) {
	const safeDataType = dataType === 'dailyEarnings' ? undefined : (dataType ?? undefined)

	const { data, isLoading, error } = useQuery({
		queryKey: ['adapter-breakdown-chart', adapterType, chain, safeDataType],
		queryFn: () => fetchAdapterChainChartDataByProtocolBreakdown({ adapterType, chain, dataType: safeDataType }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled
	})

	const breakdownError = error ? getErrorMessage(error) : null

	return React.useMemo(() => {
		if (!data || data.length === 0) {
			return {
				breakdownChartData: null,
				breakdownProtocolDimensions: [],
				isBreakdownLoading: isLoading && enabled,
				breakdownError
			}
		}

		const protocolValuesByTimestamp = new Map<number, Record<string, number>>()
		const protocolTotals = new Map<string, number>()

		for (const [timestamp, protocolValues] of data) {
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

		return { breakdownChartData, breakdownProtocolDimensions: allProtocols, isBreakdownLoading: false, breakdownError }
	}, [data, isLoading, enabled, breakdownError])
}

export const ChainsByAdapterChart = ({
	chartData,
	allChains,
	chains,
	chartName
}: Pick<IChainsByAdapterPageData, 'chartData' | 'allChains' | 'chains'> & { chartName: string }) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
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
		const chainsQuery = router.query.chains
		const excludeChainsQuery = router.query.excludeChains
		const excludedChainsSet = parseExcludeParam(excludeChainsQuery)
		const baseSelectedChains = chainsQuery != null ? parseArrayParam(chainsQuery, allChains) : allChains

		return excludedChainsSet.size > 0
			? baseSelectedChains.filter((chain) => !excludedChainsSet.has(chain))
			: baseSelectedChains
	}, [allChains, router.query.chains, router.query.excludeChains])

	const chartPresentation = React.useMemo(
		() =>
			buildChainsByAdapterChartPresentation({ chartData, selectedChains, state: chartState, latestChainRows: chains }),
		[chartData, selectedChains, chartState, chains]
	)
	const deferredChartPresentation = React.useDeferredValue(chartPresentation)

	const onChangeChartInterval = (nextInterval: LowercaseDwmGrouping) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'daily' ? undefined : nextInterval })
	}

	const onChangeChartKind = (nextChartKind: ChainsByAdapterChartKind) => {
		if (nextChartKind === 'Bar') {
			void pushShallowQuery(router, {
				chartKind: undefined,
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy: undefined
			})
			return
		}

		if (nextChartKind === 'Line') {
			void pushShallowQuery(router, {
				chartKind: nextChartKind.toLowerCase(),
				chartType: undefined,
				valueMode: undefined,
				barLayout: undefined,
				groupBy:
					readSingleQueryValue(router.query.groupBy)?.toLowerCase() === 'daily'
						? undefined
						: readSingleQueryValue(router.query.groupBy)
			})
			return
		}

		void pushShallowQuery(router, {
			chartKind: nextChartKind.toLowerCase(),
			chartType: undefined,
			valueMode: undefined,
			barLayout: undefined,
			groupBy: undefined
		})
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

		return {
			filename: `${slug(chartName)}-by-chain-bar-${chartState.valueMode}-${chartState.barLayout}-${chartState.groupBy}`,
			title: `${chartBaseTitle} - Bar (${chartState.valueMode === 'absolute' ? 'Absolute' : 'Relative'}, ${
				chartState.barLayout === 'stacked' ? 'Stacked' : 'Separate'
			}, ${chartState.groupBy})`
		}
	}, [chartName, chartState])

	const multiSeriesChartOptions = React.useMemo(() => {
		if (deferredChartPresentation.kind !== 'multiSeries') return undefined

		const hasVisibleLegend = deferredChartPresentation.charts.length > 1
		const baseOptions = deferredChartPresentation.chartOptions ?? {}

		if (!hasVisibleLegend) {
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
	}, [deferredChartPresentation])

	const chartKindLabel =
		chartState.chartKind === 'treemap' ? 'Treemap Chart' : chartState.chartKind === 'line' ? 'Line Chart' : 'Bar Chart'
	const barValueModeLabel =
		chartState.chartKind === 'bar' ? (chartState.valueMode === 'relative' ? 'Relative (%)' : 'Absolute ($)') : null
	const barLayoutLabel =
		chartState.chartKind === 'bar' ? (chartState.barLayout === 'separate' ? 'Separate' : 'Stacked') : null

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<Select
					allValues={CHART_KIND_OPTIONS as any}
					selectedValues={
						chartState.chartKind === 'treemap' ? 'Treemap' : chartState.chartKind === 'line' ? 'Line' : 'Bar'
					}
					setSelectedValues={(value: string) => onChangeChartKind(value as ChainsByAdapterChartKind)}
					label={chartKindLabel}
					labelType="none"
					variant="filter"
				/>
				{chartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_VALUE_MODE_OPTIONS as any}
						selectedValues={chartState.valueMode === 'relative' ? 'Relative' : 'Absolute'}
						setSelectedValues={(value: string) => onChangeValueMode(value as ChainsByAdapterValueMode)}
						label={barValueModeLabel ?? 'Absolute'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartState.chartKind === 'bar' ? (
					<Select
						allValues={BAR_LAYOUT_OPTIONS as any}
						selectedValues={chartState.barLayout === 'separate' ? 'Separate' : 'Stacked'}
						setSelectedValues={(value: string) => onChangeBarLayout(value as ChainsByAdapterBarLayout)}
						label={barLayoutLabel ?? 'Stacked'}
						labelType="none"
						variant="filter"
					/>
				) : null}
				{chartState.chartKind !== 'treemap' ? (
					<ChartGroupingSelector
						value={chartState.groupBy}
						onValueChange={onChangeChartInterval}
						options={DWM_GROUPING_OPTIONS_LOWERCASE}
						buttonClassName="font-medium data-[active=true]:font-medium"
					/>
				) : null}
				<SelectWithCombobox
					allValues={allChains}
					selectedValues={selectedChains}
					includeQueryKey="chains"
					excludeQueryKey="excludeChains"
					defaultSelectedValues={allChains}
					label="Chains"
					labelType="smol"
					variant="filter"
					triggerProps={{ style: { marginLeft: 'auto' } }}
					portal
				/>
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={exportConfig.filename}
					title={exportConfig.title}
				/>
			</div>
			<React.Suspense
				fallback={
					<div
						style={{
							height:
								deferredChartPresentation.kind === 'treemap'
									? CHAINS_BY_ADAPTER_TREEMAP_HEIGHT
									: CHAINS_BY_ADAPTER_CHART_HEIGHT
						}}
					/>
				}
			>
				{deferredChartPresentation.kind === 'treemap' ? (
					<TreeMapBuilderChart
						data={deferredChartPresentation.data}
						height={CHAINS_BY_ADAPTER_TREEMAP_HEIGHT}
						onReady={handleChartReady}
					/>
				) : (
					<MultiSeriesChart2
						dataset={deferredChartPresentation.dataset}
						charts={deferredChartPresentation.charts}
						height={CHAINS_BY_ADAPTER_CHART_HEIGHT}
						valueSymbol={deferredChartPresentation.valueSymbol}
						solidChartAreaStyle={deferredChartPresentation.solidChartAreaStyle}
						{...(multiSeriesChartOptions ? { chartOptions: multiSeriesChartOptions } : {})}
						{...(deferredChartPresentation.groupBy ? { groupBy: deferredChartPresentation.groupBy } : {})}
						hideDefaultLegend={deferredChartPresentation.charts.length === 1}
						showTotalInTooltip={deferredChartPresentation.showTotalInTooltip}
						onReady={handleChartReady}
					/>
				)}
			</React.Suspense>
		</div>
	)
}
