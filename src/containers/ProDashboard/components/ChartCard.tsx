import { Icon } from '~/components/Icon'
import dynamic from 'next/dynamic'
import { ChartConfig, CHART_TYPES, Chain, Protocol } from '../types'
import { LoadingSpinner } from './LoadingSpinner'
import { getItemIconUrl } from '../utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { memo } from 'react'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
})

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
})

interface ChartCardProps {
	chart: ChartConfig
}

interface ChartRendererProps {
	chart: ChartConfig
	data: [string, number][]
	isLoading: boolean
	hasError: boolean
	refetch: () => void
}

const ChartRenderer = memo(function ChartRenderer({ chart, data, isLoading, hasError, refetch }: ChartRendererProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-[var(--text3)]">
				<Icon name="alert-triangle" height={24} width={24} className="mb-2 text-[#F2994A]" />
				<p>Error loading data</p>
				<button className="mt-2 text-sm text-[var(--primary1)] hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return <div className="flex items-center justify-center h-full text-[var(--text3)]">No data available</div>
	}

	const chartType = CHART_TYPES[chart.type]

	if (chartType.chartType === 'bar') {
		return (
			<BarChart
				chartData={data}
				valueSymbol="$"
				height="300px"
				color={chartType.color}
				hideDataZoom
				hideDownloadButton
			/>
		)
	} else {
		return (
			<AreaChart
				chartData={data}
				valueSymbol="$"
				color={chartType.color}
				height="300px"
				hideDataZoom
				hideDownloadButton
			/>
		)
	}
})

export const ChartCard = memo(function ChartCard({ chart }: ChartCardProps) {
	const { getChainInfo, getProtocolInfo, handleGroupingChange } = useProDashboard()
	const { data, isLoading, hasError, refetch } = chart
	const chartTypeDetails = CHART_TYPES[chart.type]
	const isGroupable = chartTypeDetails?.groupable

	const groupingOptions: ('day' | 'week' | 'month')[] = ['day', 'week', 'month']

	let itemName: string = ''
	let itemIconUrl: string | undefined = undefined
	let itemInfo: Chain | Protocol | undefined

	if (chart.protocol) {
		itemInfo = getProtocolInfo(chart.protocol)
		console.log(itemInfo, chart)
		itemName = itemInfo?.name || chart.protocol
		itemIconUrl = getItemIconUrl('protocol', itemInfo, chart.protocol)
	} else if (chart.chain) {
		itemInfo = getChainInfo(chart.chain)
		itemName = chart.chain
		itemIconUrl = getItemIconUrl('chain', itemInfo, chart.chain)
	}

	return (
		<div className="p-4 h-full flex flex-col">
			<div className="flex justify-between items-center mb-2 pr-28">
				<div className="flex items-center gap-2">
					{itemIconUrl ? (
						<img src={itemIconUrl} alt={itemName} className="w-6 h-6 rounded-full" />
					) : (
						<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
							{itemName?.charAt(0)?.toUpperCase()}
						</div>
					)}
					<h2 className="text-lg font-semibold">
						{itemName} {chartTypeDetails.title}
					</h2>
				</div>
				<div className="flex items-center gap-2">
					{isGroupable && (
						<div className="flex border border-[var(--form-control-border)] overflow-hidden">
							{groupingOptions.map((option, index) => (
								<button
									key={option}
									onClick={() => handleGroupingChange(chart.id, option)}
									className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out 
										${index > 0 ? 'border-l border-[var(--form-control-border)]' : ''}
										${
											chart.grouping === option
												? 'bg-[var(--primary1)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary1)] focus:ring-opacity-50'
												: 'bg-transparent hover:bg-[var(--bg3)] text-[var(--text2)] focus:outline-none focus:ring-1 focus:ring-[var(--form-control-border)]'
										}`}
								>
									{option.charAt(0).toUpperCase() + option.slice(1)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			<div style={{ height: '300px', flexGrow: 1 }}>
				<ChartRenderer chart={chart} data={data} isLoading={isLoading} hasError={hasError} refetch={refetch} />
			</div>
		</div>
	)
})