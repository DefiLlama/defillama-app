import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select'
import { Tooltip } from '~/components/Tooltip'
import { capitalizeFirstLetter, download } from '~/utils'
import {
	useProDashboardCatalog,
	useProDashboardEditorActions,
	useProDashboardPermissions
} from '../ProDashboardAPIContext'
import { Chain, CHART_TYPES, ChartConfig, Protocol } from '../types'
import { convertToCumulative, generateChartColor, getItemIconUrl } from '../utils'
import { LoadingSpinner } from './LoadingSpinner'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

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
const percentMetricTypes = ['medianApy']
const ratioMetricTypes = ['pfRatio', 'psRatio']

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

	const valueSymbol =
		userMetricTypes.includes(type) || ratioMetricTypes.includes(type)
			? ''
			: percentMetricTypes.includes(type)
				? '%'
				: '$'

	return (
		<Suspense fallback={<div className="h-[300px]" />}>
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
	const { getChainInfo, getProtocolInfo } = useProDashboardCatalog()
	const { handleGroupingChange, handleCumulativeChange } = useProDashboardEditorActions()
	const { isReadOnly } = useProDashboardPermissions()
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

		const chartColor = chart.color || generateChartColor(itemIdentifier, chartTypeDetails?.color)

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
							<img src={itemIconUrl} alt={itemName} className="h-5 w-5 shrink-0 rounded-full" />
						) : (
							<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs text-gray-600">
								{itemName?.charAt(0)?.toUpperCase()}
							</div>
						))}
					<h1 className="text-base font-semibold">
						{itemName} {chartTypeDetails.title}
					</h1>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					{!isReadOnly && (
						<>
							{isGroupable && (
								<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
									{groupingOptions.map((dataInterval) => (
										<Tooltip
											content={capitalizeFirstLetter(dataInterval)}
											render={<button />}
											className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue shrink-0 px-2 py-1 text-xs whitespace-nowrap data-[active=true]:bg-(--old-blue) data-[active=true]:font-medium data-[active=true]:text-white"
											data-active={chart.grouping === dataInterval}
											onClick={() => handleGroupingChange(chart.id, dataInterval)}
											key={`${chart.id}-options-groupBy-${dataInterval}`}
										>
											{dataInterval.slice(0, 1).toUpperCase()}
										</Tooltip>
									))}
								</div>
							)}
							{isBarChart && (
								<Select
									allValues={[
										{ name: 'Show individual values', key: 'Individual' },
										{ name: `Show cumulative values`, key: `Cumulative` }
									]}
									selectedValues={showCumulative ? 'Cumulative' : 'Individual'}
									setSelectedValues={(value) => {
										handleCumulativeChange(chart.id, value === 'Cumulative' ? true : false)
									}}
									label={showCumulative ? 'Cumulative' : 'Individual'}
									labelType="none"
									triggerProps={{
										className:
											'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
									}}
								/>
							)}
						</>
					)}
					{processedData && processedData.length > 0 && (
						<>
							<ChartExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
							<ProTableCSVButton
								onClick={handleCsvExport}
								smol
								className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
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
