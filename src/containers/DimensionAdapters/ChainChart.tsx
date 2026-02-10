import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/formatters'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { MultiChartConfig } from '~/containers/ProDashboard/types'
import { getAdapterDashboardType } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek, slug } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'

const INTERVALS_LIST = ['Daily', 'Weekly', 'Monthly'] as const
const CHART_TYPES = ['Volume', 'Dominance'] as const

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const INTERVALS_LIST_ADAPTER_BY_CHAIN = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
const LINE_DIMENSIONS = new Set(['Open Interest', 'Active Liquidity'])
type AdapterByChainInterval = (typeof INTERVALS_LIST_ADAPTER_BY_CHAIN)[number]

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

	const onChangeChartInterval = React.useCallback(
		(nextInterval: AdapterByChainInterval) => {
			pushShallowQuery(router, { groupBy: nextInterval === 'Daily' ? undefined : nextInterval })
		},
		[router]
	)

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
					filename={`${slug(chain)}-${adapterType}-${chartName}`}
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
	allChains,
	type
}: Pick<IChainsByAdapterPageData, 'chartData' | 'allChains'> & { type: string }) => {
	const [chartType, setChartType] = React.useState<(typeof CHART_TYPES)[number]>('Volume')
	const [chartInterval, setChartInterval] = React.useState<(typeof INTERVALS_LIST)[number]>('Daily')
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const [selectedChains, setSelectedChains] = React.useState<string[]>(allChains)

	const { dataset, charts, chartOptions } = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData, chartInterval, chartType, selectedChains })
	}, [chartData, chartInterval, selectedChains, chartType])

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{INTERVALS_LIST.map((dataInterval) => (
						<a
							key={`${dataInterval}-${type}`}
							onClick={() => React.startTransition(() => setChartInterval(dataInterval))}
							data-active={dataInterval === chartInterval}
							className="shrink-0 cursor-pointer px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
						>
							{dataInterval}
						</a>
					))}
				</div>
				<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{CHART_TYPES.map((dataType) => (
						<button
							className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							data-active={dataType === chartType}
							key={`${dataType}-${type}`}
							onClick={() => React.startTransition(() => setChartType(dataType))}
						>
							{dataType}
						</button>
					))}
				</div>
				<SelectWithCombobox
					allValues={allChains}
					selectedValues={selectedChains}
					setSelectedValues={setSelectedChains}
					label="Chains"
					labelType="smol"
					variant="filter"
					portal
				/>
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={`${type}-chains-${chartInterval.toLowerCase()}`}
					title={`${type} by Chain - ${chartType}`}
				/>
			</div>
			{chartType === 'Dominance' ? (
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={dataset}
						charts={charts}
						valueSymbol="%"
						expandTo100Percent
						chartOptions={chartOptions}
						onReady={handleChartReady}
					/>
				</React.Suspense>
			) : (
				<React.Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={dataset}
						charts={charts}
						chartOptions={chartOptions}
						groupBy={chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly'}
						onReady={handleChartReady}
					/>
				</React.Suspense>
			)}
		</div>
	)
}

const getChartDataByChainAndInterval = ({
	chartData,
	chartInterval,
	chartType,
	selectedChains
}: {
	chartData: Array<[number, Record<string, number>]>
	chartInterval: 'Daily' | 'Weekly' | 'Monthly'
	chartType?: 'Volume' | 'Dominance'
	selectedChains: string[]
}) => {
	const selectedChainsSet = new Set(selectedChains)

	if (chartType === 'Dominance') {
		const sumByDate = {}
		for (const [date, chainsOnDate] of chartData) {
			const finalDate = +date * 1e3

			for (const chain in chainsOnDate) {
				if (selectedChainsSet.has(chain)) {
					sumByDate[finalDate] = (sumByDate[finalDate] || 0) + (chainsOnDate[chain] || 0)
				}
			}
		}

		const allColors = getNDistinctColors(selectedChains.length + 1).slice(1)
		const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
		stackColors['Bitcoin'] = CHART_COLORS[0]
		stackColors['Others'] = allColors[allColors.length - 1]

		const source = chartData.map(([date, chainsOnDate]) => {
			const finalDate = +date * 1e3
			const row: Record<string, number | null> = { timestamp: finalDate }
			for (const chain of selectedChains) {
				row[chain] =
					sumByDate[finalDate] && chainsOnDate[chain] != null
						? (Number(chainsOnDate[chain] || 0) / sumByDate[finalDate]) * 100
						: null
			}
			return row
		})

		const chartsConfig = selectedChains.map((chain) => ({
			type: 'line' as const,
			name: chain,
			encode: { x: 'timestamp', y: chain },
			stack: chain,
			color: stackColors[chain]
		}))

		return {
			dataset: { source, dimensions: ['timestamp', ...selectedChains] },
			charts: chartsConfig,
			chartOptions: {}
		}
	}

	// if (chartInterval === 'Cumulative') {
	// 	const cumulativeByChain = {}
	// 	const dataByChain = {}

	// 	for (const [date, chainsOnDate] of chartData) {
	// 		const finalDate = +date * 1e3

	// 		for (const chain in chainsOnDate) {
	// 			if (selectedChains.includes(chain)) {
	// 				cumulativeByChain[chain] = (cumulativeByChain[chain] || 0) + (chainsOnDate[chain] || 0)
	// 				dataByChain[chain] = dataByChain[chain] || []
	// 				dataByChain[chain].push([finalDate, cumulativeByChain[chain]])
	// 			}
	// 		}
	// 	}

	// 	const allColors = getNDistinctColors(selectedChains.length + 1, CHART_COLORS[0])
	// 	const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
	// 	stackColors[selectedChains[0]] = CHART_COLORS[0]
	// 	stackColors['Others'] = allColors[allColors.length - 1]

	// 	return {
	// 		chartData: dataByChain,
	// 		stackColors,
	// 		chartOptions: {}
	// 	}
	// }

	const topByAllDates = {}

	const uniqTopChains = new Set<string>()
	for (const [date, chainsOnDate] of chartData) {
		const finalDate =
			chartInterval === 'Weekly'
				? lastDayOfWeek(+date) * 1e3
				: chartInterval === 'Monthly'
					? firstDayOfMonth(+date) * 1e3
					: +date * 1e3

		const topByDate = {}
		let others = 0
		const topItems = []
		for (const chain in chainsOnDate) {
			if (selectedChainsSet.has(chain)) {
				topItems.push([chain, chainsOnDate[chain]])
			}
		}
		const sortedTopItems = topItems.toSorted((a: [string, number], b: [string, number]) => b[1] - a[1])
		for (let index = 0; index < sortedTopItems.length; index++) {
			const [chain, value] = sortedTopItems[index] as [string, number]
			if (index < 10) {
				topByDate[chain] = topByDate[chain] || {}
				topByDate[chain][finalDate] = value ?? 0
				uniqTopChains.add(chain)
			} else {
				topByDate[chain] = topByDate[chain] || {}
				topByDate[chain][finalDate] = 0
				others += value ?? 0
			}
		}

		for (const chain of selectedChains) {
			topByAllDates[chain] = topByAllDates[chain] || {}
			topByAllDates[chain][finalDate] = (topByAllDates[chain][finalDate] || 0) + (topByDate[chain]?.[finalDate] ?? 0)
		}

		topByAllDates['Others'] = topByAllDates['Others'] || {}
		topByAllDates['Others'][finalDate] = (topByAllDates['Others'][finalDate] || 0) + others
	}

	const finalData = {}
	const zeroesByChain = {}
	for (const chain of [...uniqTopChains, 'Others']) {
		finalData[chain] = finalData[chain] || []
		for (const finalDate in topByAllDates[chain]) {
			finalData[chain].push([+finalDate, topByAllDates[chain][finalDate]])
		}
		if (selectedChainsSet.has(chain)) {
			zeroesByChain[chain] = Math.max(
				finalData[chain].findIndex((date) => date[1] !== 0),
				0
			)
		}
	}

	const zeroValues = Object.values(zeroesByChain) as number[]
	let startingZeroDatesToSlice = zeroValues.length > 0 ? Math.min(...zeroValues) : 0
	for (const chain in finalData) {
		if (!finalData[chain].length) delete finalData[chain]
	}
	for (const chain in finalData) {
		finalData[chain] = finalData[chain].slice(startingZeroDatesToSlice)
	}

	const allColors = getNDistinctColors(selectedChains.length + 1)
	const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
	stackColors['Others'] = allColors[allColors.length - 1]

	const seriesNames = Object.keys(finalData)
	const rowMap = new Map<number, Record<string, number>>()
	for (const chain of seriesNames) {
		for (const [timestamp, value] of finalData[chain]) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[chain] = value
			rowMap.set(timestamp, row)
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))

	const chartsConfig = seriesNames.map((chain) => ({
		type: 'bar' as const,
		name: chain,
		encode: { x: 'timestamp', y: chain },
		stack: 'chain',
		color: stackColors[chain]
	}))

	const chartOptions = {
		tooltip: {
			trigger: 'axis',
			confine: true,
			formatter: function (params) {
				let chartdate = formatTooltipChartDate(params[0].value[0], chartInterval.toLowerCase() as any)
				let others = 0
				let othersMarker = ''
				let vals = params
					.sort((a, b) => b.value[1] - a.value[1])
					.reduce((prev, curr) => {
						if (curr.value[1] === 0) return prev
						if (curr.seriesName === 'Others') {
							others += curr.value[1]
							othersMarker = curr.marker
							return prev
						}
						return (prev +=
							'<li style="list-style:none">' +
							curr.marker +
							curr.seriesName +
							'&nbsp;&nbsp;' +
							formatTooltipValue(curr.value[1], '$') +
							'</li>')
					}, '')
				if (others) {
					vals +=
						'<li style="list-style:none">' +
						othersMarker +
						'Others&nbsp;&nbsp;' +
						formatTooltipValue(others, '$') +
						'</li>'
				}
				return chartdate + vals
			}
		}
	}

	return {
		dataset: { source, dimensions: ['timestamp', ...seriesNames] },
		charts: chartsConfig,
		chartOptions
	}
}
