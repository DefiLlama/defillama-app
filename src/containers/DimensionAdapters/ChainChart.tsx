import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ensureChronologicalRows, formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek } from '~/utils'
import { parseArrayParam, parseExcludeParam, pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const INTERVALS_LIST_ADAPTER_BY_CHAIN = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
const LINE_DIMENSIONS = new Set(['Open Interest', 'Active Liquidity'])
type AdapterByChainInterval = (typeof INTERVALS_LIST_ADAPTER_BY_CHAIN)[number]
type ChainsByAdapterInterval = AdapterByChainInterval
const CHART_TYPES_CHAINS_BY_ADAPTER = ['Volume', 'Dominance'] as const
type ChainsByAdapterChartType = (typeof CHART_TYPES_CHAINS_BY_ADAPTER)[number]

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	chain,
	chartName
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'chain'> & { chartName: string }) => {
	const router = useRouter()
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const metricDimensions = chartData.dimensions.filter((dimension) => dimension !== 'timestamp')

	const chartInterval = React.useMemo<AdapterByChainInterval>(() => {
		const groupByParam = readSingleQueryValue(router.query.groupBy)?.toLowerCase()
		const matchedInterval = INTERVALS_LIST_ADAPTER_BY_CHAIN.find((interval) => interval.toLowerCase() === groupByParam)
		return matchedInterval ?? 'Daily'
	}, [router.query.groupBy])

	const onChangeChartInterval = (nextInterval: AdapterByChainInterval) => {
		pushShallowQuery(router, { groupBy: nextInterval === 'Daily' ? undefined : nextInterval })
	}

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
		const seriesDefinitions = metricDimensions.map((dimension, index) => {
			const seriesName = dimension
			const isIntrinsicLineSeries = LINE_DIMENSIONS.has(dimension)
			const type = isCumulative || isIntrinsicLineSeries ? ('line' as const) : ('bar' as const)
			if (isDaily) {
				return { dimension, seriesName, type, data: [], color: CHART_COLORS[index % CHART_COLORS.length] }
			}

			const rawData = chartData.source
				.map((row) => {
					const timestamp = Number(row.timestamp)
					const value = row[dimension] as number | null
					return value == null ? null : ([timestamp, value] as [number, number])
				})
				.filter((item): item is [number, number] => item != null)

			// Keep math behavior by source metric type (bar vs line), while allowing
			// cumulative mode to render bars as lines.
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

			return { dimension, seriesName, type, data, color: CHART_COLORS[index % CHART_COLORS.length] }
		})

		if (isDaily) {
			return {
				dataset: chartData,
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
				normalizedRow[series.seriesName] =
					typeof row[series.seriesName] === 'number' ? (row[series.seriesName] as number) : null
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
	}, [chartData, chartInterval, metricDimensions])

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
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{chartName === 'Open Interest'
						? null
						: INTERVALS_LIST_ADAPTER_BY_CHAIN.map((dataInterval) => (
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
				{chain ? <AddToDashboardButton chartConfig={multiChart} smol /> : null}
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={`${chain}-${adapterType}-${chartName}`}
					title={`${chain === 'All' ? 'All Chains' : chain} - ${chartName}`}
				/>
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={finalCharts.dataset}
					charts={finalCharts.charts}
					hideDefaultLegend={finalCharts.charts.length === 1}
					groupBy={chartInterval === 'Weekly' ? 'weekly' : chartInterval === 'Monthly' ? 'monthly' : 'daily'}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
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

	const { dataset, charts } = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData, chartInterval: effectiveInterval, selectedChains, chartType })
	}, [chartData, effectiveInterval, selectedChains, chartType])

	const onChangeChartInterval = (nextInterval: ChainsByAdapterInterval) => {
		pushShallowQuery(router, { groupBy: nextInterval === 'Daily' ? undefined : nextInterval })
	}
	const onChangeChartType = (nextChartType: ChainsByAdapterChartType) => {
		pushShallowQuery(router, {
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
					dataset={dataset}
					charts={charts}
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

const getChartDataByChainAndInterval = ({
	chartData,
	chartInterval,
	selectedChains,
	chartType
}: {
	chartData: IChainsByAdapterPageData['chartData']
	chartInterval: ChainsByAdapterInterval
	selectedChains: string[]
	chartType: ChainsByAdapterChartType
}) => {
	const isCumulative = chartInterval === 'Cumulative'
	const isDominance = chartType === 'Dominance'

	// 1) Aggregate selected chains into final interval buckets first.
	const groupedValuesByDate = new Map<number, Record<string, number>>()
	for (const row of chartData.source) {
		const timestampInSec = Math.floor(Number(row.timestamp) / 1e3)
		const finalDate =
			chartInterval === 'Weekly'
				? lastDayOfWeek(timestampInSec) * 1e3
				: chartInterval === 'Monthly'
					? firstDayOfMonth(timestampInSec) * 1e3
					: timestampInSec * 1e3

		const groupedValues = groupedValuesByDate.get(finalDate) ?? {}
		for (const chain of selectedChains) {
			const chainValue = row[chain]
			if (typeof chainValue === 'number' && Number.isFinite(chainValue)) {
				groupedValues[chain] = (groupedValues[chain] ?? 0) + chainValue
			}
		}
		groupedValuesByDate.set(finalDate, groupedValues)
	}

	// 2) Rank top-10 within each grouped bucket.
	const sortedDates: number[] = []
	for (const [date, groupedValues] of groupedValuesByDate.entries()) {
		for (const _key in groupedValues) {
			sortedDates.push(date)
			break
		}
	}
	sortedDates.sort((a, b) => a - b)
	const rankedTopByDate = new Map<number, Record<string, number>>()
	const othersByDate = new Map<number, number>()
	const uniqTopChains = new Set<string>()
	let hasOthersData = false

	for (const finalDate of sortedDates) {
		const groupedValues = groupedValuesByDate.get(finalDate) ?? {}
		const sortedTopItems = selectedChains
			.map((chain) => [chain, groupedValues[chain] ?? 0] as [string, number])
			.toSorted((a, b) => b[1] - a[1])

		const topValues: Record<string, number> = {}
		let others = 0
		for (let index = 0; index < sortedTopItems.length; index++) {
			const [chain, value] = sortedTopItems[index] as [string, number]
			if (index < 10) {
				topValues[chain] = value
				uniqTopChains.add(chain)
			} else {
				others += value
			}
		}

		rankedTopByDate.set(finalDate, topValues)
		if (others > 0) {
			othersByDate.set(finalDate, others)
			hasOthersData = true
		}
	}

	// 3) Build per-series time arrays with explicit zeroes for continuity.
	const finalData: Record<string, Array<[number, number]>> = {}
	const seriesToRender = hasOthersData ? [...uniqTopChains, 'Others'] : [...uniqTopChains]
	for (const chain of seriesToRender) {
		finalData[chain] = sortedDates.map((date) => {
			if (chain === 'Others') return [date, othersByDate.get(date) ?? 0]
			return [date, rankedTopByDate.get(date)?.[chain] ?? 0]
		})
	}

	let startingZeroDatesToSlice = Number.POSITIVE_INFINITY
	for (const chain in finalData) {
		if (chain === 'Others') continue
		const zeroIndex = Math.max(
			finalData[chain].findIndex((date) => date[1] !== 0),
			0
		)
		if (zeroIndex < startingZeroDatesToSlice) {
			startingZeroDatesToSlice = zeroIndex
		}
	}
	if (!Number.isFinite(startingZeroDatesToSlice)) {
		startingZeroDatesToSlice = 0
	}
	for (const chain in finalData) {
		finalData[chain] = finalData[chain].slice(startingZeroDatesToSlice)
		if (!isCumulative) continue
		let cumulative = 0
		finalData[chain] = finalData[chain].map(([timestamp, value]) => {
			cumulative += value
			return [timestamp, cumulative]
		})
	}

	const seriesNames = seriesToRender
	const allColors = getNDistinctColors(seriesNames.length || 1)
	const stackColors = Object.fromEntries(seriesNames.map((chain, i) => [chain, allColors[i]]))

	const rowMap = new Map<number, Record<string, number>>()
	for (const chain of seriesNames) {
		for (const [timestamp, value] of finalData[chain]) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[chain] = value
			rowMap.set(timestamp, row)
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))
	const finalSource = isDominance
		? source.map((row) => {
				const nextRow: Record<string, number | null> = { timestamp: Number(row.timestamp) }
				let total = 0
				for (const chain of seriesNames) {
					const value = row[chain]
					if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
						total += value
					}
				}

				for (const chain of seriesNames) {
					const value = row[chain]
					if (typeof value === 'number' && Number.isFinite(value) && total > 0) {
						nextRow[chain] = (value / total) * 100
					} else {
						nextRow[chain] = 0
					}
				}
				return nextRow
			})
		: source

	const chartsConfig = seriesNames.map((chain) => ({
		type: isDominance ? ('line' as const) : isCumulative ? ('line' as const) : ('bar' as const),
		name: chain,
		encode: { x: 'timestamp', y: chain },
		...(isDominance || !isCumulative ? { stack: 'chain' as const } : {}),
		color: stackColors[chain]
	}))

	return {
		dataset: { source: finalSource, dimensions: ['timestamp', ...seriesNames] },
		charts: chartsConfig
	}
}
