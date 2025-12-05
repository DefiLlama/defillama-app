import { lazy, memo, Suspense, useEffect, useReducer, useRef } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IBarChartProps, IChartProps, IPieChartProps, IScatterChartProps } from '~/components/ECharts/types'
import { formatTooltipValue } from '~/components/ECharts/useDefaults'
import { Icon } from '~/components/Icon'
import type { ChartConfiguration } from '../types'
import { adaptChartData, adaptMultiSeriesData } from '../utils/chartAdapter'
import { ChartDataTransformer } from '../utils/chartDataTransformer'
import { ChartControls } from './ChartControls'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart'))
const PieChart = lazy(() => import('~/components/ECharts/PieChart'))
const ScatterChart = lazy(() => import('~/components/ECharts/ScatterChart'))

interface ChartRendererProps {
	charts: ChartConfiguration[]
	chartData: any[]
	isLoading?: boolean
	isAnalyzing?: boolean
	hasError?: boolean
	expectedChartCount?: number
	chartTypes?: string[]
	resizeTrigger?: number
}

interface SingleChartProps {
	config: ChartConfiguration
	data: any[]
	isActive: boolean
}

type ChartState = {
	stacked: boolean
	percentage: boolean
	cumulative: boolean
	grouping: 'day' | 'week' | 'month' | 'quarter'
	showHallmarks: boolean
}

type ChartAction =
	| { type: 'SET_STACKED'; payload: boolean }
	| { type: 'SET_PERCENTAGE'; payload: boolean }
	| { type: 'SET_CUMULATIVE'; payload: boolean }
	| { type: 'SET_GROUPING'; payload: 'day' | 'week' | 'month' | 'quarter' }
	| { type: 'SET_HALLMARKS'; payload: boolean }

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
		default:
			return state
	}
}

const SingleChart = memo(function SingleChart({ config, data, isActive }: SingleChartProps) {
	const [chartState, dispatch] = useReducer(chartReducer, {
		stacked: config.displayOptions?.defaultStacked || false,
		percentage: config.displayOptions?.defaultPercentage || false,
		cumulative: false,
		grouping: 'day' as const,
		showHallmarks: true
	})

	if (!isActive) return null

	try {
		const isMultiSeries = config.series && config.series.length > 1
		let adaptedChart = isMultiSeries ? adaptMultiSeriesData(config, data) : adaptChartData(config, data)

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

		const valueSymbol = chartState.percentage ? '%' : config.valueSymbol || '$'
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
			if (['multi-series', 'combo'].includes(adaptedChart.chartType)) {
				const rows = [['Timestamp', 'Date', ...(adaptedChart.props as any).series.map((series: any) => series.name)]]
				const valuesByDate = {}
				for (const adaptedSeries of (adaptedChart.props as any).series ?? []) {
					for (const item of adaptedSeries.data ?? []) {
						valuesByDate[item[0]] = valuesByDate[item[0]] || {}
						valuesByDate[item[0]][adaptedSeries.name] = item[1]
					}
				}
				for (const date in valuesByDate) {
					const row = [date, new Date(+date * 1e3).toLocaleDateString()]
					for (const series of (adaptedChart.props as any).series ?? []) {
						row.push(valuesByDate[date][series.name] ?? '')
					}
					rows.push(row)
				}
				return {
					filename,
					rows
				}
			}

			if (adaptedChart.chartType === 'pie') {
				const rows = [['Name', 'Value']]
				for (const item of (adaptedChart.props as any).chartData ?? []) {
					rows.push([item.name, item.value])
				}
				return {
					filename,
					rows
				}
			}

			return {
				filename,
				rows: []
			}
		}

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
							<BarChart key={chartKey} chartData={adaptedChart.data} {...(adaptedChart.props as IBarChartProps)} />
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
							<MultiSeriesChart key={chartKey} {...multiSeriesProps} />
						</Suspense>
					)
				}
				break

			case 'line':
			case 'area':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<AreaChart
							key={chartKey}
							chartData={adaptedChart.data}
							{...(adaptedChart.props as IChartProps)}
							connectNulls={true}
						/>
					</Suspense>
				)
				break

			case 'combo':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="m-2 mt-0 flex items-center justify-end">
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<MultiSeriesChart key={chartKey} {...(adaptedChart.props as any)} connectNulls={true} />
					</Suspense>
				)
				break

			case 'multi-series':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<div className="m-2 mt-0 flex items-center justify-end">
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
						</div>
						<MultiSeriesChart key={chartKey} {...(adaptedChart.props as any)} connectNulls={true} />
					</Suspense>
				)
				break

			case 'pie':
				chartContent = (
					<Suspense fallback={<div className="h-[338px]" />}>
						<PieChart
							key={chartKey}
							{...(adaptedChart.props as IPieChartProps)}
							customComponents={<CSVDownloadButton prepareCsv={prepareCsv} smol />}
						/>
					</Suspense>
				)
				break

			case 'scatter':
				chartContent = (
					<Suspense fallback={<div className="h-[360px]" />}>
						<ScatterChart key={chartKey} {...(adaptedChart.props as IScatterChartProps)} height="360px" />
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
			<div className="flex flex-col" data-chart-id={config.id}>
				{config.displayOptions && !['pie', 'scatter'].includes(adaptedChart.chartType) && (
					<ChartControls
						displayOptions={config.displayOptions}
						stacked={chartState.stacked}
						percentage={chartState.percentage}
						cumulative={chartState.cumulative}
						grouping={chartState.grouping}
						dataLength={dataLength}
						showHallmarks={chartState.showHallmarks}
						hasHallmarks={!!config.hallmarks?.length}
						onStackedChange={(stacked) => dispatch({ type: 'SET_STACKED', payload: stacked })}
						onPercentageChange={(percentage) => dispatch({ type: 'SET_PERCENTAGE', payload: percentage })}
						onCumulativeChange={(cumulative) => dispatch({ type: 'SET_CUMULATIVE', payload: cumulative })}
						onGroupingChange={(grouping) => dispatch({ type: 'SET_GROUPING', payload: grouping })}
						onHallmarksChange={(showHallmarks) => dispatch({ type: 'SET_HALLMARKS', payload: showHallmarks })}
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
})

const ChartLoadingSpinner = () => <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>

const ChartAnalysisPlaceholder = () => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#e6e6e6] px-1 py-8 dark:border-[#222324]">
		<ChartLoadingSpinner />
		<p className="text-[#666] dark:text-[#919296]">Determining the best visualizations for your data...</p>
	</div>
)

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

export const ChartRenderer = memo(function ChartRenderer({
	charts,
	chartData,
	isLoading = false,
	isAnalyzing = false,
	hasError = false,
	expectedChartCount,
	chartTypes,
	resizeTrigger = 0
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

	if (isAnalyzing && (!charts || charts.length === 0)) {
		return <ChartAnalysisPlaceholder />
	}

	if (isLoading && (!charts || charts.length === 0)) {
		return <ChartLoadingPlaceholder chartTypes={chartTypes} />
	}

	if (!isLoading && !isAnalyzing && !hasError && (!charts || charts.length === 0)) {
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
					data={Array.isArray(chartData) ? chartData : (chartData?.[chart.id] || [])}
					isActive={!hasMultipleCharts || activeTabIndex === index}
				/>
			))}
		</div>
	)
})
