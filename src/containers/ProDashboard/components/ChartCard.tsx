import { Icon } from '~/components/Icon'
import { ChartConfig, CHART_TYPES, Chain, Protocol } from '../types'
import { LoadingSpinner } from './LoadingSpinner'
import { getItemIconUrl, generateChartColor, convertToCumulative } from '../utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { lazy, memo, Suspense } from 'react'
import { IChartProps, IBarChartProps } from '~/components/ECharts/types'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface ChartCardProps {
	chart: ChartConfig
}

interface ChartRendererProps {
	chart: ChartConfig
	data: [string, number][]
	isLoading: boolean
	hasError: boolean
	refetch: () => void
	color: string
}

const ChartRenderer = memo(function ChartRenderer({
	chart,
	data,
	isLoading,
	hasError,
	refetch,
	color
}: ChartRendererProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-col items-center justify-center h-full pro-text3">
				<Icon name="alert-triangle" height={24} width={24} className="mb-2 text-[#F2994A]" />
				<p>Error loading data</p>
				<button className="mt-2 text-sm text-(--primary1) hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return <div className="flex items-center justify-center h-full pro-text3">No data available</div>
	}

	const chartType = CHART_TYPES[chart.type]
	const showCumulative = chart.showCumulative || false

	const userMetricTypes = ['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed']
	const valueSymbol = userMetricTypes.includes(chart.type) ? '' : '$'

	if (chartType.chartType === 'bar' && !showCumulative) {
		return (
			<Suspense fallback={<></>}>
				<BarChart
					chartData={data}
					valueSymbol={valueSymbol}
					height="300px"
					color={color}
					hideDataZoom
					hideDownloadButton
				/>
			</Suspense>
		)
	} else {
		return (
			<Suspense fallback={<></>}>
				<AreaChart
					chartData={data}
					valueSymbol={valueSymbol}
					color={color}
					height="300px"
					hideDataZoom
					hideDownloadButton
				/>
			</Suspense>
		)
	}
})

export const ChartCard = memo(function ChartCard({ chart }: ChartCardProps) {
	const { getChainInfo, getProtocolInfo, handleGroupingChange, handleCumulativeChange, isReadOnly } = useProDashboard()
	const { data, isLoading, hasError, refetch } = chart
	const chartTypeDetails = CHART_TYPES[chart.type]
	const isGroupable = chartTypeDetails?.groupable
	const isBarChart = chartTypeDetails?.chartType === 'bar'
	const showCumulative = chart.showCumulative || false

	const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']

	let itemName: string = ''
	let itemIconUrl: string | undefined = undefined
	let itemInfo: Chain | Protocol | undefined
	let itemIdentifier: string = ''
	if (chart.protocol) {
		itemInfo = getProtocolInfo(chart.protocol)
		itemName = itemInfo?.name || chart.protocol
		itemIconUrl = getItemIconUrl('protocol', itemInfo, chart.protocol)
		itemIdentifier = chart.protocol
	} else if (chart.chain) {
		itemInfo = getChainInfo(chart.chain)
		itemName = chart.chain
		itemIconUrl = getItemIconUrl('chain', itemInfo, chart.chain)
		itemIdentifier = chart.chain
	}

	const chartColor = generateChartColor(itemIdentifier, chartTypeDetails?.color)

	const processedData = showCumulative && data ? convertToCumulative(data) : data

	return (
		<div className="p-4 h-full flex flex-col">
			<div className={`flex flex-wrap justify-between items-start gap-2 mb-2 ${!isReadOnly ? 'pr-20' : ''}`}>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					{chart.chain !== 'All' &&
						(itemIconUrl ? (
							<img src={itemIconUrl} alt={itemName} className="w-6 h-6 rounded-full shrink-0" />
						) : (
							<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600 shrink-0">
								{itemName?.charAt(0)?.toUpperCase()}
							</div>
						))}
					<h2 className="text-lg font-semibold truncate">
						{itemName} {chartTypeDetails.title}
					</h2>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{isGroupable && (
						<div className="flex border border-(--form-control-border) overflow-hidden">
							{groupingOptions.map((option, index) => (
								<button
									key={option}
									onClick={() => handleGroupingChange(chart.id, option)}
									className={`px-2 xl:px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out 
										${index > 0 ? 'border-l border-(--form-control-border)' : ''}
										${
											chart.grouping === option
												? 'bg-(--primary1) text-white focus:outline-hidden focus:ring-2 focus:ring-(--primary1) focus:ring-opacity-50'
												: 'bg-transparent pro-hover-bg pro-text2 focus:outline-hidden focus:ring-1 focus:ring-(--form-control-border)'
										}`}
								>
									<span className="xl:hidden">{option.charAt(0).toUpperCase()}</span>
									<span className="hidden xl:inline">{option.charAt(0).toUpperCase() + option.slice(1)}</span>
								</button>
							))}
						</div>
					)}
					{isBarChart && (
						<button
							onClick={() => handleCumulativeChange(chart.id, !showCumulative)}
							className="flex items-center gap-1 px-2 py-1 text-xs border pro-divider pro-hover-bg pro-text2 transition-colors pro-bg2"
							title={showCumulative ? 'Show cumulative values' : 'Show individual values'}
						>
							<Icon name="trending-up" height={12} width={12} />
							<span className="hidden lg:inline">{showCumulative ? 'Cumulative' : 'Individual'}</span>
						</button>
					)}
				</div>
			</div>

			<div style={{ height: '300px', flexGrow: 1 }}>
				<ChartRenderer
					chart={chart}
					data={processedData}
					isLoading={isLoading}
					hasError={hasError}
					refetch={refetch}
					color={chartColor}
				/>
			</div>
		</div>
	)
})
