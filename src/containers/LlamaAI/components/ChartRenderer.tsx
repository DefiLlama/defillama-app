import { lazy, memo, Suspense, useState, useEffect, useRef } from 'react'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import type { ChartConfiguration } from '../types'
import { adaptChartData, adaptMultiSeriesData } from '../utils/chartAdapter'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const NonTimeSeriesBarChart = lazy(
	() => import('~/components/ECharts/BarChart/NonTimeSeries')
) as React.FC<IBarChartProps>
const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))
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

const SingleChart = memo(function SingleChart({ config, data, isActive }: SingleChartProps) {
	if (!isActive) return null

	try {
		const isMultiSeries = config.series && config.series.length > 1
		const adaptedChart = isMultiSeries ? adaptMultiSeriesData(config, data) : adaptChartData(config, data)

		const hasData =
			adaptedChart.chartType === 'multi-series'
				? (adaptedChart.props as any).series?.length > 0
				: adaptedChart.data.length > 0

		if (!hasData) {
			return (
				<div className="flex flex-col items-center justify-center gap-2 p-1 py-8 text-gray-500 dark:text-gray-400">
					<Icon name="bar-chart" height={16} width={16} />
					<p>No data available for chart</p>
				</div>
			)
		}

		switch (adaptedChart.chartType) {
			case 'bar':
				const isTimeSeriesChart = config.axes.x.type === 'time'
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						{isTimeSeriesChart ? (
							<BarChart chartData={adaptedChart.data} {...(adaptedChart.props as IBarChartProps)} height={'300px'} />
						) : (
							<NonTimeSeriesBarChart
								chartData={adaptedChart.data}
								{...(adaptedChart.props as IBarChartProps)}
								height={'300px'}
							/>
						)}
					</Suspense>
				)

			case 'line':
			case 'area':
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						<AreaChart
							chartData={adaptedChart.data}
							{...(adaptedChart.props as IChartProps)}
							connectNulls={true}
							height={'300px'}
						/>
					</Suspense>
				)

			case 'combo':
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						<MultiSeriesChart {...(adaptedChart.props as any)} connectNulls={true} height={'300px'} />
					</Suspense>
				)

			case 'multi-series':
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						<MultiSeriesChart {...(adaptedChart.props as any)} connectNulls={true} height={'300px'} />
					</Suspense>
				)

			case 'pie':
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						<PieChart {...(adaptedChart.props as IPieChartProps)} height={'300px'} />
					</Suspense>
				)

			case 'scatter':
				return (
					<Suspense fallback={<div className="h-[300px]" />}>
						<ScatterChart chartData={adaptedChart.data} />
					</Suspense>
				)

			default:
				return (
					<div className="flex flex-col items-center justify-center gap-2 rounded-md bg-red-50 p-1 py-8 text-red-700 dark:bg-red-900/10 dark:text-red-300">
						<Icon name="alert-triangle" height={16} width={16} />
						<p>Unsupported chart type: {adaptedChart.chartType}</p>
					</div>
				)
		}
	} catch (error) {
		console.error('Chart render error:', error)
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
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-gray-200 p-1 py-8 dark:border-gray-700">
		<ChartLoadingSpinner />
		<p className="text-gray-600 dark:text-gray-400">Determining the best visualizations for your data...</p>
	</div>
)

const ChartLoadingPlaceholder = ({ chartTypes }: { chartTypes?: string[] }) => (
	<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-gray-200 p-1 py-8 dark:border-gray-700">
		<ChartLoadingSpinner />
		<p className="text-gray-600 dark:text-gray-400">
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
	const [activeTabIndex, setActiveTabIndex] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)

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
				<div className="flex border-b border-gray-200 px-2 dark:border-gray-700">
					{charts.map((chart, index) => (
						<button
							key={`toggle-${chart.id}`}
							onClick={() => setActiveTabIndex(index)}
							className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
								activeTabIndex === index
									? 'border-blue-500 text-blue-600 dark:text-blue-400'
									: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
							}`}
						>
							{chart.title}
						</button>
					))}
				</div>
			)}
			{charts.map((chart, index) => (
				<SingleChart
					key={`${chart.id}`}
					config={chart}
					data={chartData}
					isActive={!hasMultipleCharts || activeTabIndex === index}
				/>
			))}
		</div>
	)
})
