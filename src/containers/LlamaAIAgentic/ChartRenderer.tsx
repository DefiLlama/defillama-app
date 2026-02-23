import { lazy, memo, Suspense, useEffect, useReducer, useRef } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard/AddToDashboardButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatTooltipValue } from '~/components/ECharts/formatters'
import type { IBarChartProps, IChartProps, IPieChartProps, IScatterChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { adaptCandlestickData, adaptChartData, adaptMultiSeriesData } from './chartAdapter'
import { areChartDataEqual, areChartsEqual, areStringArraysEqual } from './chartComparison'
import { ChartControls } from './ChartControls'
import { ChartDataTransformer } from './chartDataTransformer'
import type { ChartConfiguration } from './types'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const CandlestickChart = lazy(() => import('~/components/ECharts/CandlestickChart'))
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart'))
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))
const PieChart = lazy(() => import('~/components/ECharts/PieChart'))
const ScatterChart = lazy(() => import('~/components/ECharts/ScatterChart'))

interface ChartRendererProps {
	charts: ChartConfiguration[]
	chartData: any[] | Record<string, any[]>
	isLoading?: boolean
	hasError?: boolean
	chartTypes?: string[]
	resizeTrigger?: number
	sessionId?: string | null
	fetchFn?: typeof fetch
}

interface SingleChartProps {
	config: ChartConfiguration
	data: any[]
	isActive: boolean
	sessionId?: string | null
	fetchFn?: typeof fetch
}

type ChartState = {
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter'
	showHallmarks: boolean
	showLabels: boolean
}

type ChartAction =
	| { type: 'SET_STACKED'; payload: boolean }
	| { type: 'SET_PERCENTAGE'; payload: boolean }
	| { type: 'SET_CUMULATIVE'; payload: boolean }
	| { type: 'SET_GROUPING'; payload: 'day' | 'week' | 'month' | 'quarter' }
	| { type: 'SET_HALLMARKS'; payload: boolean }
	| { type: 'SET_LABELS'; payload: boolean }

const chartReducer = (state: ChartState, action: ChartAction): ChartState => {
	switch (action.type) {
		case 'SET_STACKED':
			return { ...state, stacked: action.payload }
		case 'SET_PERCENTAGE':
			return { ...state, percentage: action.payload }
		case 'SET_CUMULATIVE':
			return { ...state, cumulative: action.payload }
		case 'SET_GROUPING':
			return { ...state, grouping: action.payload }
		case 'SET_HALLMARKS':
			return { ...state, showHallmarks: action.payload }
		case 'SET_LABELS':
			return { ...state, showLabels: action.payload }
		default:
			return state
	}
}

function SingleChart({ config, data, isActive, sessionId, fetchFn }: SingleChartProps) {
	const [chartState, dispatch] = useReducer(chartReducer, {
		stacked: config.displayOptions?.defaultStacked || false,
		percentage: config.displayOptions?.defaultPercentage || false,
		cumulative: false,
		grouping: 'day' as const,
		showHallmarks: true,
		showLabels: config.displayOptions?.showLabels || false
	})
	const handleStackedChange = (stacked: boolean) => dispatch({ type: 'SET_STACKED', payload: stacked })
	const handlePercentageChange = (percentage: boolean) => dispatch({ type: 'SET_PERCENTAGE', payload: percentage })
	const handleCumulativeChange = (cumulative: boolean) => dispatch({ type: 'SET_CUMULATIVE', payload: cumulative })
	const handleGroupingChange = (grouping: ChartState['grouping']) =>
		dispatch({ type: 'SET_GROUPING', payload: grouping })
	const handleHallmarksChange = (showHallmarks: boolean) => dispatch({ type: 'SET_HALLMARKS', payload: showHallmarks })
	const handleLabelsChange = (showLabels: boolean) => dispatch({ type: 'SET_LABELS', payload: showLabels })

	if (!isActive) return null

	if (config.type === 'candlestick') {
		const candlestickData = adaptCandlestickData(config, data)
		return (
			<div className="flex flex-col p-2" data-chart-id={config.id}>
				<Suspense fallback={<div className="h-[480px]" />}>
					<CandlestickChart data={candlestickData.data} indicators={candlestickData.indicators} />
				</Suspense>
			</div>
		)
	}

	try {
		const isMultiSeries = (config.series && config.series.length > 1 && config.type !== 'scatter' && config.type !== 'pie') || config.type === 'combo'
		let adaptedChart = isMultiSeries ? adaptMultiSeriesData(config, data) : adaptChartData(config, data)

		if (config.type === 'pie' && chartState.percentage) {
			const pieData = (adaptedChart.props as any).chartData || []
			const total = pieData.reduce((sum: number, item: any) => sum + item.value, 0)
			const percentageData = pieData.map((item: any) => ({
				...item,
				value: total > 0 ? (item.value / total) * 100 : 0
			}))
			adaptedChart = {
				...adaptedChart,
				props: {
					...(adaptedChart.props as any),
					chartData: percentageData,
					valueSymbol: '%'
				}
			}
		}

		const dataLength = isMultiSeries
			? (adaptedChart.props as any).series?.[0]?.data?.length || 0
			: adaptedChart.data?.length || data?.length || 0

		const shouldTransform =
			isMultiSeries &&
			(chartState.stacked || chartState.percentage || chartState.cumulative || chartState.grouping !== 'day')

		if (shouldTransform) {
			let transformedSeries = (adaptedChart.props as any).series || []

			if (chartState.grouping !== 'day' && config.displayOptions?.supportsGrouping) {
				transformedSeries = ChartDataTransformer.groupByInterval(transformedSeries, chartState.grouping, config.type)
			}

			if (chartState.cumulative && config.displayOptions?.canShowCumulative) {
				transformedSeries = ChartDataTransformer.applyCumulativeToSeries(transformedSeries)
			}

			if (chartState.stacked && config.displayOptions?.canStack && !chartState.percentage) {
				transformedSeries = ChartDataTransformer.toStacked(transformedSeries, config.type)
			}

			if (chartState.percentage && config.displayOptions?.canShowPercentage) {
				transformedSeries = ChartDataTransformer.toPercentage(transformedSeries, chartState.stacked)
			}

			adaptedChart = {
				...adaptedChart,
				props: {
					...(adaptedChart.props as any),
					series: transformedSeries,
					groupBy:
						chartState.grouping === 'week'
							? 'weekly'
							: chartState.grouping === 'month'
								? 'monthly'
								: chartState.grouping === 'quarter'
									? 'quarterly'
									: 'daily'
				}
			}
		}

		const valueSymbol = chartState.percentage
			? '%'
			: config.valueSymbol || (config.axes.yAxes?.length === 1 ? config.axes.yAxes[0]?.valueSymbol : undefined) || '$'
		adaptedChart = {
			...adaptedChart,
			props: {
				...(adaptedChart.props as any),
				valueSymbol,
				...(!chartState.showHallmarks && { hallmarks: undefined }),
				...(chartState.percentage && {
					chartOptions: {
						yAxis: {
							max: 100,
							min: 0,
							axisLabel: {
								formatter: '{value}%'
							}
						},
						grid: {
							top: 24,
							right: 12,
							bottom: 68,
							left: 12
						},
						tooltip: {
							valueFormatter: (value: number) => value.toFixed(2) + '%'
						}
					}
				})
			}
		}

		const hasData =
			adaptedChart.chartType === 'multi-series'
				? (adaptedChart.props as any).series?.length > 0
				: adaptedChart.data.length > 0

		const prepareCsv = () => {
			const filename = `${adaptedChart.title}-${adaptedChart.chartType}-${new Date().toISOString().split('T')[0]}.csv`
			const isTimeSeries = config.axes.x.type === 'time'
			const xLabel = config.axes.x.label || (isTimeSeries ? 'Date' : 'Category')
			const yLabel = config.axes.yAxes?.[0]?.label || config.series?.[0]?.name || 'Value'

			if (adaptedChart.chartType === 'multi-series') {
				const seriesNames = (adaptedChart.props as any).series.map((s: any) => s.name)
				const rows: Array<Array<string | number | boolean>> = [
					isTimeSeries ? ['Timestamp', 'Date', ...seriesNames] : [xLabel, ...seriesNames]
				]
				const valuesByKey: Record<string | number, Record<string, number>> = {}
				for (const s of (adaptedChart.props as any).series ?? []) {
					for (const [key, val] of s.data ?? []) {
						valuesByKey[key] = valuesByKey[key] || {}
						valuesByKey[key][s.name] = val
					}
				}
				for (const key of Object.keys(valuesByKey).sort((a, b) => +a - +b)) {
					const base = isTimeSeries ? [key, new Date(+key * 1e3).toLocaleDateString()] : [key]
					rows.push([...base, ...seriesNames.map((name: string) => valuesByKey[key][name] ?? '')])
				}
				return { filename, rows }
			}

			if (adaptedChart.chartType === 'pie') {
				const rows: Array<Array<string | number | boolean>> = [['Name', 'Value']]
				for (const item of (adaptedChart.props as any).chartData ?? []) {
					rows.push([item.name, item.value])
				}
				return { filename, rows }
			}

			if (adaptedChart.chartType === 'scatter') {
				const xAxisLabel = config.axes.x.label || 'X'
				const yAxisLabel = config.axes.yAxes?.[0]?.label || 'Y'
				const rows: Array<Array<string | number | boolean>> = [[xAxisLabel, yAxisLabel, 'Entity']]
				for (const point of (adaptedChart.props as any).chartData ?? []) {
					rows.push([point[0], point[1], point[2] ?? ''])
				}
				return { filename, rows }
			}

			if (['area', 'line', 'bar', 'hbar'].includes(adaptedChart.chartType)) {
				const chartData = adaptedChart.data as Array<[string | number, number | null]>
				if (isTimeSeries) {
					const rows: Array<Array<string | number | boolean>> = [['Timestamp', 'Date', yLabel]]
					for (const [ts, val] of chartData) {
						rows.push([ts, new Date(+ts * 1e3).toLocaleDateString(), val ?? ''])
					}
					return { filename, rows }
				}
				const rows: Array<Array<string | number | boolean>> = [[xLabel, yLabel]]
				for (const [category, val] of chartData) {
					rows.push([category, val ?? ''])
				}
				return { filename, rows }
			}

			return { filename, rows: [] }
		}

		const chartToolbar = (
			<div className="flex items-center justify-end gap-1 p-2 pt-0">
				{sessionId && (
					<AddToDashboardButton
						chartConfig={null}
						llamaAIChart={{ sessionId, chartId: config.id, title: config.title }}
						smol
					/>
				)}
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
			</div>
		)

		if (!hasData) {
			return (
				<div className="flex flex-col items-center justify-center gap-2 p-1 py-8 text-[#666] dark:text-[#919296]">
					<Icon name="bar-chart" height={16} width={16} />
					<p>No data available for chart</p>
				</div>
			)
		}

		const chartKey = `${config.id}-${chartState.stacked}-${chartState.percentage}-${chartState.cumulative}-${chartState.grouping}-${chartState.showHallmarks}`

		let chartContent: React.ReactNode

		switch (adaptedChart.chartType) {
			case 'bar':
				const isTimeSeriesChart = config.axes.x.type === 'time'
				if (isTimeSeriesChart) {
					chartContent = (
						<Suspense fallback={<div className="h-[338px]" />}>
							{chartToolbar}
							<BarChart
								key={chartKey}
								chartData={adaptedChart.data}
								{...(adaptedChart.props as IBarChartProps)}
								hideDownloadButton={true}
							/>
						</Suspense>
					)
				} else {
					const seriesData = (adaptedChart.data as Array<[any, number]>).map(([x, y]) => [x, y])
					const multiSeriesProps: any = {
						series: [
							{
								data: seriesData,
								type: 'bar',
								name: config.series[0]?.name || 'Value',
								color: config.series[0]?.styling?.color || '#1f77b4'
							}
						],
						title: config.title,
						valueSymbol: config.valueSymbol || '$',
						height: '360px',
						xAxisType: 'category',
						chartOptions: {
							grid: {
								bottom: 68,
								left: 12,
								right: 12
							},
							tooltip: {
								formatter: (params: any) => {
									if (!Array.isArray(params)) return ''
									const xValue = params[0]?.value?.[0]
									const yValue = params[0]?.value?.[1]
									const seriesName = params[0]?.seriesName
									const valueSymbol = config.valueSymbol || '$'
									const formattedValue = formatTooltipValue(yValue, valueSymbol)
									return `<div style="margin-bottom: 4px; font-weight: 600;">${xValue}</div><div>${seriesName}: ${formattedValue}</div>`
								}
							}
						}
					}
					chartContent = (
						<Suspense fallback={<div className="h-[338px]" />}>
							{chartToolbar}
							<MultiSeriesChart key={chartKey} {...multiSeriesProps} />
						</Suspense>
					)
				}
				break

			case 'hbar':
				const hbarData = adaptedChart.data as Array<[any, number]>
				const hbarCategories = hbarData.map(([cat]) => cat)
				const hbarValues = hbarData.map(([, val]) => val)
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						{chartToolbar}
						<HBarChart
							key={chartKey}
							categories={hbarCategories}
							values={hbarValues}
							valueSymbol={config.valueSymbol || '$'}
							color={config.series[0]?.styling?.color || '#1f77b4'}
						/>
					</Suspense>
				)
				break

			case 'line':
			case 'area':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						{chartToolbar}
						<AreaChart
							key={chartKey}
							chartData={adaptedChart.data}
							{...(adaptedChart.props as IChartProps)}
							connectNulls={true}
							hideDownloadButton={true}
						/>
					</Suspense>
				)
				break

			case 'multi-series':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						{chartToolbar}
						<MultiSeriesChart key={chartKey} {...(adaptedChart.props as any)} connectNulls={true} />
					</Suspense>
				)
				break

			case 'pie':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<PieChart key={chartKey} {...(adaptedChart.props as IPieChartProps)} customComponents={chartToolbar} />
					</Suspense>
				)
				break

			case 'scatter':
				chartContent = (
					<Suspense fallback={<div className="h-[360px]" />}>
						{chartToolbar}
						<ScatterChart
							key={chartKey}
							{...(adaptedChart.props as IScatterChartProps)}
							height="360px"
							showLabels={chartState.showLabels}
						/>
					</Suspense>
				)
				break

			default:
				chartContent = (
					<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
						<Icon name="alert-triangle" height={16} width={16} />
						<p>Unsupported chart type: {adaptedChart.chartType}</p>
					</div>
				)
		}

		return (
			<div className="flex flex-col *:[2n-1]:m-2" data-chart-id={config.id}>
				{config.displayOptions && (
					<ChartControls
						displayOptions={config.displayOptions}
						stacked={chartState.stacked}
						percentage={chartState.percentage}
						cumulative={chartState.cumulative}
						grouping={chartState.grouping}
						dataLength={dataLength}
						showHallmarks={chartState.showHallmarks}
						hasHallmarks={!!config.hallmarks?.length}
						showLabels={chartState.showLabels}
						isScatter={adaptedChart.chartType === 'scatter'}
						onStackedChange={handleStackedChange}
						onPercentageChange={handlePercentageChange}
						onCumulativeChange={handleCumulativeChange}
						onGroupingChange={handleGroupingChange}
						onHallmarksChange={handleHallmarksChange}
						onLabelsChange={handleLabelsChange}
					/>
				)}
				{chartContent}
			</div>
		)
	} catch (error) {
		console.log('Chart render error:', error)
		return (
			<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
				<Icon name="alert-triangle" height={16} width={16} />
				<p>{error instanceof Error ? error.message : 'Unknown error'}</p>
			</div>
		)
	}
}

const ChartLoadingSpinner = () => <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>

const ChartLoadingPlaceholder = ({ chartTypes }: { chartTypes?: string[] }) => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#e6e6e6] px-1 py-8 dark:border-[#222324]">
		<ChartLoadingSpinner />
		<p className="text-[#666] dark:text-[#919296]">
			{chartTypes?.length
				? `Creating ${chartTypes.join(', ')} visualization${chartTypes.length > 1 ? 's' : ''}...`
				: 'Creating visualization...'}
		</p>
	</div>
)

const ChartErrorPlaceholder = () => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
		<Icon name="alert-triangle" height={16} width={16} />
		<p>Chart generation encountered an issue</p>
	</div>
)

export function ChartRenderer({
	charts,
	chartData,
	isLoading = false,
	hasError = false,
	chartTypes,
	resizeTrigger = 0,
	sessionId,
	fetchFn
}: ChartRendererProps) {
	return (
		<ChartRendererMemoized
			{...{ charts, chartData, isLoading, hasError, chartTypes, resizeTrigger, sessionId, fetchFn }}
		/>
	)
}

function ChartRendererImpl({
	charts,
	chartData,
	isLoading = false,
	hasError = false,
	chartTypes,
	resizeTrigger = 0,
	sessionId,
	fetchFn
}: ChartRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [activeTabIndex, setActiveTab] = useReducer((state: number, action: number) => action, 0)

	useEffect(() => {
		if (!containerRef.current) return

		const resizeObserver = new ResizeObserver(() => {
			const event = new CustomEvent('chartResize')
			window.dispatchEvent(event)
		})

		resizeObserver.observe(containerRef.current)
		return () => resizeObserver.disconnect()
	}, [])

	useEffect(() => {
		if (resizeTrigger > 0) {
			const timer = setTimeout(() => {
				const event = new CustomEvent('chartResize')
				window.dispatchEvent(event)
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [resizeTrigger])

	if (hasError && (!charts || charts.length === 0)) {
		return <ChartErrorPlaceholder />
	}

	if (isLoading && (!charts || charts.length === 0)) {
		return <ChartLoadingPlaceholder chartTypes={chartTypes} />
	}

	if (!isLoading && !hasError && (!charts || charts.length === 0)) {
		return null
	}

	const hasMultipleCharts = charts.length > 1

	return (
		<div ref={containerRef} className="flex flex-col gap-2 rounded-md border border-(--old-blue) pt-2">
			{hasMultipleCharts && (
				<div className="-mt-2 flex border-b border-[#e6e6e6] dark:border-[#222324]">
					{charts.map((chart, index) => (
						<button
							key={`toggle-${chart.id}`}
							onClick={() => setActiveTab(index)}
							className={`border-b-2 px-2 py-1.5 text-sm transition-colors ${
								activeTabIndex === index
									? 'border-(--old-blue) text-(--old-blue)'
									: 'border-transparent text-[#666] hover:text-black dark:text-[#919296] dark:hover:text-white'
							}`}
						>
							{chart.title}
						</button>
					))}
				</div>
			)}
			{charts.map((chart, index) => (
				<SingleChart
					key={chart.id}
					config={chart}
					data={Array.isArray(chartData) ? chartData : chartData?.[chart.datasetName || chart.id] || []}
					isActive={!hasMultipleCharts || activeTabIndex === index}
					sessionId={sessionId}
					fetchFn={fetchFn}
				/>
			))}
		</div>
	)
}

const ChartRendererMemoized = memo(ChartRendererImpl, (prev, next) => {
	return (
		prev.isLoading === next.isLoading &&
		prev.hasError === next.hasError &&
		prev.resizeTrigger === next.resizeTrigger &&
		prev.sessionId === next.sessionId &&
		areStringArraysEqual(prev.chartTypes, next.chartTypes) &&
		areChartsEqual(prev.charts, next.charts) &&
		areChartDataEqual(prev.chartData, next.chartData)
	)
})

ChartRendererMemoized.displayName = 'ChartRenderer'
