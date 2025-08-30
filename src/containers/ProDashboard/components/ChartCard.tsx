import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { download } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { Chain, CHART_TYPES, ChartConfig, Protocol } from '../types'
import { convertToCumulative, generateChartColor, getItemIconUrl } from '../utils'
import { LoadingSpinner } from './LoadingSpinner'
import { ProTableCSVButton } from './ProTable/CsvButton'
import { ImageExportButton } from './ProTable/ImageExportButton'

const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>

interface ChartCardProps {
	chart: ChartConfig
}

interface ChartRendererProps {
	name: string
	type: ChartConfig['type']
	showCumulative: ChartConfig['showCumulative']
	data: [string, number][]
	isLoading: boolean
	hasError: boolean
	refetch: () => void
	color: string
	onChartReady: (instance: echarts.ECharts | null) => void
}

const userMetricTypes = ['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed']

const ChartRenderer = memo(function ChartRenderer({
	type,
	showCumulative = false,
	data,
	isLoading,
	hasError,
	refetch,
	color,
	onChartReady
}: ChartRendererProps) {
	const chartType = CHART_TYPES[type]

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<LoadingSpinner />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center">
				<Icon name="alert-triangle" height={24} width={24} className="text-[#F2994A]" />
				<p className="text-(--text-form)">Error loading data</p>
				<button className="text-sm text-(--link-text) hover:underline" onClick={() => refetch()}>
					Try again
				</button>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return <div className="flex flex-1 items-center justify-center text-(--text-form)">No data available</div>
	}

	const valueSymbol = userMetricTypes.includes(type) ? '' : '$'

	return (
		<Suspense fallback={<></>}>
			<SingleSeriesChart
				chartType={chartType.chartType === 'bar' && !showCumulative ? 'bar' : 'line'}
				chartData={data}
				valueSymbol={valueSymbol}
				height="300px"
				color={color}
				hideDataZoom
				onReady={onChartReady}
			/>
		</Suspense>
	)
})

const groupingOptions: ('day' | 'week' | 'month' | 'quarter')[] = ['day', 'week', 'month', 'quarter']

export const ChartCard = memo(function ChartCard({ chart }: ChartCardProps) {
	const { getChainInfo, getProtocolInfo, handleGroupingChange, handleCumulativeChange, isReadOnly } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const {
		itemName,
		itemIconUrl,
		chartTypeDetails,
		isGroupable,
		isBarChart,
		showCumulative,
		processedData,
		chartColor
	} = useMemo(() => {
		const chartTypeDetails = CHART_TYPES[chart.type]
		const isGroupable = chartTypeDetails?.groupable
		const isBarChart = chartTypeDetails?.chartType === 'bar'
		const showCumulative = chart.showCumulative || false

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

		return {
			itemName,
			itemIconUrl,
			itemInfo,
			itemIdentifier,
			chartColor,
			chartTypeDetails,
			isGroupable,
			isBarChart,
			showCumulative,
			processedData: showCumulative && chart.data ? convertToCumulative(chart.data) : chart.data
		}
	}, [chart, getChainInfo, getProtocolInfo])

	const handleCsvExport = useCallback(() => {
		if (!processedData || processedData.length === 0) return
		const headers = ['Date', `${itemName} ${chartTypeDetails.title}`]
		const rows = processedData.map(([timestamp, value]) => [new Date(Number(timestamp)).toLocaleDateString(), value])
		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${itemName}_${chartTypeDetails.title.replace(/\s+/g, '_')}_${
			new Date().toISOString().split('T')[0]
		}.csv`
		download(fileName, csvContent)
	}, [processedData, itemName, chartTypeDetails])

	const imageFilename = `${itemName}_${chartTypeDetails.title.replace(/\s+/g, '_')}`
	const imageTitle = `${itemName} ${chartTypeDetails.title}`

	return (
		<div className="flex min-h-[344px] flex-col p-1 md:min-h-[360px]">
			<div className="flex flex-wrap items-center justify-end gap-2 p-1 md:p-3">
				<div className="mr-auto flex items-center gap-1">
					{chart.chain !== 'All' &&
						(itemIconUrl ? (
							<img src={itemIconUrl} alt={itemName} className="h-6 w-6 shrink-0 rounded-full" />
						) : (
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs text-gray-600">
								{itemName?.charAt(0)?.toUpperCase()}
							</div>
						))}
					<h1 className="text-lg font-semibold">
						{itemName} {chartTypeDetails.title}
					</h1>
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
						<>
							<ImageExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
							<ProTableCSVButton
								onClick={handleCsvExport}
								smol
								className="pro-divider pro-hover-bg pro-text2 pro-bg2 flex min-h-[25px] items-center gap-1 border px-2 py-1 text-xs transition-colors"
							/>
						</>
					)}
				</div>
			</div>
			<ChartRenderer
				name={itemName}
				type={chart.type}
				showCumulative={chart.showCumulative}
				data={processedData}
				isLoading={chart.isLoading}
				hasError={chart.hasError}
				refetch={chart.refetch}
				color={chartColor}
				onChartReady={setChartInstance}
			/>
		</div>
	)
})
