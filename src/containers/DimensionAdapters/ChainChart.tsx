import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows, formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { LoadingDots } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { getErrorMessage } from '~/utils/error'
import { parseArrayParam, parseExcludeParam, pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import { fetchAdapterChainChartDataByProtocolBreakdown } from './api'
import type { ADAPTER_TYPES } from './constants'
import type { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'
import { getChartDataByChainAndInterval } from './utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const INTERVALS_LIST_ADAPTER_BY_CHAIN = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
const LINE_DIMENSIONS = new Set(['Open Interest', 'Active Liquidity'])
const CHART_VIEW_MODES_ADAPTER_BY_CHAIN = ['Combined', 'Breakdown'] as const
type AdapterByChainInterval = (typeof INTERVALS_LIST_ADAPTER_BY_CHAIN)[number]
type AdapterByChainViewMode = (typeof CHART_VIEW_MODES_ADAPTER_BY_CHAIN)[number]
type ChainsByAdapterInterval = AdapterByChainInterval
const CHART_TYPES_CHAINS_BY_ADAPTER = ['Volume', 'Dominance'] as const
type ChainsByAdapterChartType = (typeof CHART_TYPES_CHAINS_BY_ADAPTER)[number]

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	chain,
	chartName,
	dataType
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'chain' | 'dataType'> & { chartName: string }) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const chartInterval = React.useMemo<AdapterByChainInterval>(() => {
		const groupByParam = readSingleQueryValue(router.query.groupBy)?.toLowerCase()
		const matchedInterval = INTERVALS_LIST_ADAPTER_BY_CHAIN.find((interval) => interval.toLowerCase() === groupByParam)
		return matchedInterval ?? 'Daily'
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

	const onChangeChartInterval = (nextInterval: AdapterByChainInterval) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'Daily' ? undefined : nextInterval })
	}
	const onChangeChartViewMode = (nextChartViewMode: AdapterByChainViewMode) => {
		void pushShallowQuery(router, { chartView: nextChartViewMode === 'Combined' ? undefined : nextChartViewMode })
	}

	const isBreakdownMode = chartViewMode === 'Breakdown' && breakdownChartData != null
	const finalCharts = React.useMemo(() => {
		const isDaily = chartInterval === 'Daily'
		const groupBy =
			chartInterval === 'Weekly'
				? 'weekly'
				: chartInterval === 'Monthly'
					? 'monthly'
					: chartInterval === 'Cumulative'
						? 'cumulative'
						: 'daily'
		const isCumulative = chartInterval === 'Cumulative'
		const seriesDefinitions = dimensionsToRender.map((dimension, index) => {
			const seriesName = dimension
			const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
			const isOpenInterestSeries = chartName === 'Open Interest'
			const type = isOpenInterestSeries || isCumulative || isIntrinsicLineSeries ? ('line' as const) : ('bar' as const)
			const stack =
				isBreakdownMode && !isIntrinsicLineSeries && !isOpenInterestSeries ? 'protocol-breakdown' : undefined
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

			// formatLineChart uses latest value per period; formatBarChart sums values per period
			const data = isIntrinsicLineSeries
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

		const grouping =
			chartInterval === 'Daily'
				? 'day'
				: chartInterval === 'Weekly'
					? 'week'
					: chartInterval === 'Monthly'
						? 'month'
						: 'day'

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
			showCumulative: chartInterval === 'Cumulative'
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
				{chartName === 'Open Interest' ? null : (
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{INTERVALS_LIST_ADAPTER_BY_CHAIN.map((dataInterval) => (
							<Tooltip
								content={dataInterval}
								render={<button />}
								className="shrink-0 px-2 py-1 text-sm font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								onClick={() => onChangeChartInterval(dataInterval)}
								data-active={dataInterval === chartInterval}
								key={`${dataInterval}-${chartName}-${chain}`}
							>
								{dataInterval.slice(0, 1).toUpperCase()}
							</Tooltip>
						))}
					</div>
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
						groupBy={chartInterval === 'Weekly' ? 'weekly' : chartInterval === 'Monthly' ? 'monthly' : 'daily'}
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
	allChains
}: Pick<IChainsByAdapterPageData, 'chartData' | 'allChains'>) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const chartInterval = React.useMemo<ChainsByAdapterInterval>(() => {
		const groupByParam = readSingleQueryValue(router.query.groupBy)?.toLowerCase()
		const matchedInterval = INTERVALS_LIST_ADAPTER_BY_CHAIN.find((interval) => interval.toLowerCase() === groupByParam)
		return matchedInterval ?? 'Daily'
	}, [router.query.groupBy])
	const chartType = React.useMemo<ChainsByAdapterChartType>(() => {
		const chartTypeParam = readSingleQueryValue(router.query.chartType)?.toLowerCase()
		return chartTypeParam === 'dominance' ? 'Dominance' : 'Volume'
	}, [router.query.chartType])
	const effectiveInterval: ChainsByAdapterInterval = chartType === 'Dominance' ? 'Daily' : chartInterval
	const selectedChains = React.useMemo(() => {
		const chainsQuery = router.query.chains
		const excludeChainsQuery = router.query.excludeChains
		const excludedChainsSet = parseExcludeParam(excludeChainsQuery)
		const baseSelectedChains = chainsQuery != null ? parseArrayParam(chainsQuery, allChains) : allChains

		return excludedChainsSet.size > 0
			? baseSelectedChains.filter((chain) => !excludedChainsSet.has(chain))
			: baseSelectedChains
	}, [allChains, router.query.chains, router.query.excludeChains])

	const chainsByAdapterChartData = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData, chartInterval: effectiveInterval, selectedChains, chartType })
	}, [chartData, effectiveInterval, selectedChains, chartType])
	const deferredChartData = React.useDeferredValue(chainsByAdapterChartData)

	const onChangeChartInterval = (nextInterval: ChainsByAdapterInterval) => {
		void pushShallowQuery(router, { groupBy: nextInterval === 'Daily' ? undefined : nextInterval })
	}
	const onChangeChartType = (nextChartType: ChainsByAdapterChartType) => {
		void pushShallowQuery(router, {
			chartType: nextChartType === 'Volume' ? undefined : nextChartType,
			groupBy: nextChartType === 'Dominance' ? undefined : readSingleQueryValue(router.query.groupBy)
		})
	}

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2 pb-0">
				{chartType === 'Dominance' ? <div className="mr-auto" /> : null}
				{chartType === 'Dominance' ? null : (
					<div className="mr-auto flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{INTERVALS_LIST_ADAPTER_BY_CHAIN.map((dataInterval) => (
							<Tooltip
								content={dataInterval}
								render={<button />}
								className="shrink-0 px-2 py-1 text-sm font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								onClick={() => onChangeChartInterval(dataInterval)}
								data-active={dataInterval === chartInterval}
								key={`chains-by-adapter-${dataInterval}`}
							>
								{dataInterval.slice(0, 1).toUpperCase()}
							</Tooltip>
						))}
					</div>
				)}
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{CHART_TYPES_CHAINS_BY_ADAPTER.map((currentChartType) => (
						<button
							key={`chains-by-adapter-chart-type-${currentChartType}`}
							className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							data-active={currentChartType === chartType}
							onClick={() => onChangeChartType(currentChartType)}
						>
							{currentChartType}
						</button>
					))}
				</div>
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
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename="chains-by-adapter"
					title="Chains by Adapter"
				/>
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={deferredChartData.dataset}
					charts={deferredChartData.charts}
					{...(chartType === 'Dominance' ? { valueSymbol: '%', solidChartAreaStyle: true } : {})}
					{...(chartType === 'Dominance'
						? {
								chartOptions: {
									yAxis: {
										min: 0,
										max: 100
									}
								}
							}
						: {})}
					{...(chartType === 'Dominance'
						? {}
						: { groupBy: chartInterval === 'Weekly' ? 'weekly' : chartInterval === 'Monthly' ? 'monthly' : 'daily' })}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}
