import { lazy, memo, Suspense, useCallback } from 'react'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { download } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { Chain, CHART_TYPES, ChartConfig, Protocol } from '../types'
import { convertToCumulative, generateChartColor, getItemIconUrl } from '../utils'
import { LoadingSpinner } from './LoadingSpinner'
import { ProTableCSVButton } from './ProTable/CsvButton'

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
			<div className="flex h-full items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="pro-text3 flex h-full flex-col items-center justify-center">
				<Icon name="alert-triangle" height={24} width={24} className="mb-2 text-[#F2994A]" />
				<p>Error loading data</p>
				<button className="mt-2 text-sm text-(--primary) hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return <div className="pro-text3 flex h-full items-center justify-center">No data available</div>
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

	const handleCsvExport = useCallback(() => {
		if (!processedData || processedData.length === 0) return

		const headers = ['Date', `${itemName} ${chartTypeDetails.title}`]
		const rows = processedData.map(([timestamp, value]) => [
			new Date(Number(timestamp) * 1000).toLocaleDateString(),
			value
		])

		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${itemName}_${chartTypeDetails.title.replace(/\s+/g, '_')}_${
			new Date().toISOString().split('T')[0]
		}.csv`
		download(fileName, csvContent)
	}, [processedData, itemName, chartTypeDetails])

	return (
		<div className="flex h-full flex-col px-4 pt-2 pb-4">
			<div>
				<div className="mb-2 flex items-center gap-2">
					{chart.chain !== 'All' &&
						(itemIconUrl ? (
							<img src={itemIconUrl} alt={itemName} className="h-6 w-6 shrink-0 rounded-full" />
						) : (
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs text-gray-600">
								{itemName?.charAt(0)?.toUpperCase()}
							</div>
						))}
					<h2 className="text-lg font-semibold">
						{itemName} {chartTypeDetails.title}
					</h2>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					{!isReadOnly && (
						<>
							{isGroupable && (
								<div className="flex overflow-hidden border border-(--form-control-border)">
									{groupingOptions.map((option, index) => (
										<button
											key={option}
											onClick={() => handleGroupingChange(chart.id, option)}
											className={`px-2 py-1 text-xs font-medium transition-colors duration-150 ease-in-out xl:px-3 ${index > 0 ? 'border-l border-(--form-control-border)' : ''} ${
												chart.grouping === option
													? 'focus:ring-opacity-50 bg-(--primary) text-white focus:ring-2 focus:ring-(--primary) focus:outline-hidden'
													: 'pro-hover-bg pro-text2 bg-transparent focus:ring-1 focus:ring-(--form-control-border) focus:outline-hidden'
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
									className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
									title={showCumulative ? 'Show cumulative values' : 'Show individual values'}
								>
									<Icon name="trending-up" height={12} width={12} />
									<span className="hidden lg:inline">{showCumulative ? 'Cumulative' : 'Individual'}</span>
								</button>
							)}
						</>
					)}
					{processedData && processedData.length > 0 && (
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
						/>
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
