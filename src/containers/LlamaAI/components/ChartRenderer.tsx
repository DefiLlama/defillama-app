import { lazy, memo, Suspense, useState } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
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

interface ChartRendererProps {
	charts: ChartConfiguration[]
	chartData: any[]
	isLoading?: boolean
	isAnalyzing?: boolean
	hasError?: boolean
	expectedChartCount?: number
	chartTypes?: string[]
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
				<div className="flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
					<Icon name="bar-chart" height={24} width={24} className="mb-2" />
					<p>No data available for chart</p>
				</div>
			)
		}

		switch (adaptedChart.chartType) {
			case 'bar':
				const isTimeSeriesChart = config.axes.x.type === 'time'
				return (
					<Suspense fallback={<ChartLoadingSpinner />}>
						{isTimeSeriesChart ? (
							<BarChart chartData={adaptedChart.data} {...(adaptedChart.props as IBarChartProps)} />
						) : (
							<NonTimeSeriesBarChart chartData={adaptedChart.data} {...(adaptedChart.props as IBarChartProps)} />
						)}
					</Suspense>
				)

			case 'line':
			case 'area':
				return (
					<Suspense fallback={<ChartLoadingSpinner />}>
						<AreaChart chartData={adaptedChart.data} {...(adaptedChart.props as IChartProps)} connectNulls={true} />
					</Suspense>
				)

			case 'combo':
				return (
					<Suspense fallback={<ChartLoadingSpinner />}>
						<MultiSeriesChart {...(adaptedChart.props as any)} connectNulls={true} />
					</Suspense>
				)

			case 'multi-series':
				return (
					<Suspense fallback={<ChartLoadingSpinner />}>
						<MultiSeriesChart {...(adaptedChart.props as any)} connectNulls={true} />
					</Suspense>
				)

			default:
				return (
					<div className="flex h-full flex-col items-center justify-center text-red-500">
						<Icon name="alert-triangle" height={24} width={24} className="mb-2" />
						<p>Unsupported chart type: {adaptedChart.chartType}</p>
					</div>
				)
		}
	} catch (error) {
		console.error('Chart render error:', error)
		return (
			<div className="flex h-full flex-col items-center justify-center text-red-500">
				<Icon name="alert-triangle" height={24} width={24} className="mb-2" />
				<p>Chart render failed</p>
				<p className="mt-1 text-xs opacity-75">{error instanceof Error ? error.message : 'Unknown error'}</p>
			</div>
		)
	}
})

const ChartLoadingSpinner = () => (
	<div className="flex h-full items-center justify-center">
		<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
	</div>
)

const ChartAnalysisPlaceholder = ({
	expectedChartCount = 1,
	chartTypes
}: {
	expectedChartCount?: number
	chartTypes?: string[]
}) => (
	<div className="mt-4 overflow-visible rounded-lg border border-gray-200 dark:border-gray-700">
		<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
			<div className="flex items-center gap-2">
				<Icon name="search" height={16} width={16} className="animate-pulse text-blue-500" />
				<h4 className="text-sm font-medium text-gray-900 dark:text-white">Analyzing data for chart opportunities...</h4>
			</div>
		</div>

		<div className="p-4">
			<div className="flex h-32 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<div className="mb-3 flex justify-center">
						<ChartLoadingSpinner />
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Determining the best visualizations for your data...
					</p>
				</div>
			</div>
		</div>
	</div>
)

const ChartLoadingPlaceholder = ({
	expectedChartCount = 1,
	chartTypes
}: {
	expectedChartCount?: number
	chartTypes?: string[]
}) => (
	<div className="mt-4 overflow-visible rounded-lg border border-gray-200 dark:border-gray-700">
		<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
			<div className="flex items-center gap-2">
				<Icon name="bar-chart" height={16} width={16} className="animate-pulse text-blue-500" />
				<h4 className="text-sm font-medium text-gray-900 dark:text-white">
					{expectedChartCount > 1 ? `Generating ${expectedChartCount} Charts...` : 'Generating Chart...'}
				</h4>
			</div>
		</div>

		<div className="p-4">
			<div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<div className="mb-3 flex justify-center">
						<ChartLoadingSpinner />
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{chartTypes?.length
							? `Creating ${chartTypes.join(', ')} visualization${chartTypes.length > 1 ? 's' : ''}...`
							: 'Creating visualization...'}
					</p>
				</div>
			</div>
		</div>
	</div>
)

const ChartErrorPlaceholder = () => (
	<div className="mt-4 overflow-visible rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
		<div className="flex items-center gap-2 border-b border-red-200 bg-red-100 p-3 dark:border-red-800 dark:bg-red-900/20">
			<Icon name="alert-triangle" height={16} width={16} className="text-red-600 dark:text-red-400" />
			<h4 className="text-sm font-medium text-red-800 dark:text-red-200">Chart Generation Failed</h4>
		</div>
		<div className="p-4">
			<p className="text-sm text-red-700 dark:text-red-300">Chart generation encountered an issue</p>
		</div>
	</div>
)

export const ChartRenderer = memo(function ChartRenderer({
	charts,
	chartData,
	isLoading = false,
	isAnalyzing = false,
	hasError = false,
	expectedChartCount,
	chartTypes
}: ChartRendererProps) {
	const [activeTabIndex, setActiveTabIndex] = useState(0)
	const [isCollapsed, setIsCollapsed] = useState(false)

	if (hasError && (!charts || charts.length === 0)) {
		return <ChartErrorPlaceholder />
	}

	if (isAnalyzing && (!charts || charts.length === 0)) {
		return <ChartAnalysisPlaceholder expectedChartCount={expectedChartCount} chartTypes={chartTypes} />
	}

	if (isLoading && (!charts || charts.length === 0)) {
		return <ChartLoadingPlaceholder expectedChartCount={expectedChartCount} chartTypes={chartTypes} />
	}

	if (!isLoading && !isAnalyzing && !hasError && (!charts || charts.length === 0)) {
		return null
	}

	const hasMultipleCharts = charts.length > 1

	return (
		<div className="mt-4 overflow-visible rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
				<div className="flex items-center gap-2">
					<Icon name="bar-chart" height={16} width={16} className="text-blue-500" />
					<h4 className="text-sm font-medium text-gray-900 dark:text-white">
						{hasMultipleCharts ? `${charts.length} Charts Generated` : 'Chart Generated'}
					</h4>
				</div>

				<button
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					title={isCollapsed ? 'Expand charts' : 'Collapse charts'}
				>
					<Icon
						name="chevron-down"
						height={14}
						width={14}
						data-open={!isCollapsed}
						className="transition-transform data-[open=true]:rotate-180"
					/>
					{isCollapsed ? 'Show' : 'Hide'}
				</button>
			</div>

			{!isCollapsed && (
				<div className="p-4">
					{charts[hasMultipleCharts ? activeTabIndex : 0]?.description && (
						<div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
								{charts[hasMultipleCharts ? activeTabIndex : 0].description}
							</p>
						</div>
					)}

					{hasMultipleCharts && (
						<div className="mb-4 flex border-b border-gray-200 dark:border-gray-700">
							{charts.map((chart, index) => (
								<button
									key={chart.id}
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

					{/* Chart content */}
					<div style={{ height: '300px' }} className="w-full">
						{charts.map((chart, index) => (
							<SingleChart
								key={chart.id}
								config={chart}
								data={chartData}
								isActive={!hasMultipleCharts || activeTabIndex === index}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	)
})
