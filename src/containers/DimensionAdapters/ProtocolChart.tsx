import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { ChartBuilderConfig } from '~/containers/ProDashboard/types'
import { getAdapterBuilderMetric } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek, slug, toNiceCsvDate } from '~/utils'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'
import { getAdapterProtocolChartDataByType } from './queries'

const INTERVALS_LIST = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

export const DimensionProtocolChartByType = ({
	protocolName,
	adapterType,
	dataType,
	chartType,
	metadata,
	title
}: {
	protocolName: string
	adapterType: `${ADAPTER_TYPES}`
	dataType?: `${ADAPTER_DATA_TYPES}`
	chartType: 'chain' | 'version'
	metadata?: { revenue?: boolean; bribeRevenue?: boolean; tokenTax?: boolean }
	title: string
}) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['dimension-adapter-chart-breakdown', protocolName, adapterType, dataType, chartType],
		queryFn: () =>
			getAdapterProtocolChartDataByType({
				adapterType,
				protocol: protocolName,
				dataType,
				type: chartType
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const allTypes = React.useMemo(() => {
		if (!data || data.length === 0) return []
		return Object.keys(data[data.length - 1][1])
	}, [data])

	if (isLoading) {
		return (
			<div className="col-span-2 flex min-h-[418px] flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (error) {
		return (
			<div className="col-span-2 flex min-h-[418px] flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p className="p-3 text-center text-sm text-(--error)">Error : {error.message}</p>
			</div>
		)
	}

	return (
		<ChartByType
			totalDataChartBreakdown={data}
			allTypes={allTypes}
			title={title}
			chartType={chartType}
			protocolName={protocolName}
			adapterType={adapterType}
		/>
	)
}

const ChartByType = ({
	totalDataChartBreakdown,
	title,
	allTypes,
	chartType,
	protocolName,
	adapterType
}: {
	totalDataChartBreakdown: Array<[number, Record<string, number>]>
	title?: string
	allTypes: string[]
	chartType: 'chain' | 'version'
	protocolName: string
	adapterType: string
}) => {
	const [chartInterval, changeChartInterval] = React.useState<(typeof INTERVALS_LIST)[number]>('Daily')
	const [selectedTypes, setSelectedTypes] = React.useState<string[]>(allTypes)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()

	const chartBuilderConfig = React.useMemo<ChartBuilderConfig | null>(() => {
		const builderMetric = getAdapterBuilderMetric(adapterType)

		if (!builderMetric || chartType === 'version') return null

		const grouping =
			chartInterval === 'Daily'
				? 'day'
				: chartInterval === 'Weekly'
					? 'week'
					: chartInterval === 'Monthly'
						? 'month'
						: 'day'

		return {
			id: generateItemId('builder', `${protocolName}-${adapterType}`),
			kind: 'builder',
			name: title || `${protocolName} – ${adapterType}`,
			config: {
				metric: builderMetric,
				mode: 'protocol',
				protocol: slug(protocolName),
				chains: [],
				categories: [],
				groupBy: 'protocol',
				limit: 10,
				chartType: 'stackedBar',
				displayAs: 'timeSeries'
			},
			grouping
		}
	}, [protocolName, adapterType, chartInterval, title, chartType])

	const mainChartData = React.useMemo(() => {
		if (selectedTypes.length === 0) return { charts: {} }

		// Aggregate by date with interval grouping
		const aggregatedByDate: Map<number, Record<string, number>> = new Map()

		for (const [date, versions] of totalDataChartBreakdown) {
			const finalDate =
				chartInterval === 'Weekly'
					? lastDayOfWeek(+date * 1e3) * 1e3
					: chartInterval === 'Monthly'
						? firstDayOfMonth(+date * 1e3) * 1e3
						: +date * 1e3

			const existing = aggregatedByDate.get(finalDate)
			if (existing) {
				for (const type of selectedTypes) {
					existing[type] = (existing[type] || 0) + (versions[type] || 0)
				}
			} else {
				const entry: Record<string, number> = {}
				for (const type of selectedTypes) {
					entry[type] = versions[type] || 0
				}
				aggregatedByDate.set(finalDate, entry)
			}
		}

		// Sort dates and build chart arrays
		const sortedDates = Array.from(aggregatedByDate.keys()).sort((a, b) => a - b)
		const isCumulative = chartInterval === 'Cumulative'
		const cumulative: Record<string, number> = {}
		const chartArrays: Record<string, Array<[number, number | null]>> = {}

		for (const type of selectedTypes) {
			cumulative[type] = 0
			chartArrays[type] = []
		}

		for (const date of sortedDates) {
			const entry = aggregatedByDate.get(date)!
			for (const type of selectedTypes) {
				const value = entry[type] || 0
				if (isCumulative) {
					cumulative[type] += value
					chartArrays[type].push([date, cumulative[type]])
				} else {
					chartArrays[type].push([date, value])
				}
			}
		}

		// Replace leading zeros with null for cleaner charts
		for (const type of selectedTypes) {
			const arr = chartArrays[type]
			for (let i = 0; i < arr.length && arr[i][1] === 0; i++) {
				arr[i][1] = null
			}
		}

		// Build chart config
		const allColors = getNDistinctColors(allTypes.length + 1)
		const stackColors = Object.fromEntries(allTypes.map((type, i) => [type, allColors[i]]))
		stackColors['Others'] = allColors[allColors.length - 1]

		const chartType2: 'line' | 'bar' = isCumulative ? 'line' : 'bar'
		const charts: Record<
			string,
			{ data: Array<[number, number | null]>; type: 'line' | 'bar'; name: string; stack: string; color: string }
		> = {}

		for (const type of selectedTypes) {
			charts[type] = {
				data: chartArrays[type],
				type: chartType2,
				name: type,
				stack: 'chartType',
				color: stackColors[type]
			}
		}

		return { charts }
	}, [allTypes, chartInterval, selectedTypes, totalDataChartBreakdown])

	const prepareCsv = React.useCallback(() => {
		if (selectedTypes.length === 0) return { filename: '', rows: [] }

		const rows: Array<Array<string | number | null>> = [['Timestamp', 'Date', ...selectedTypes]]

		// Use first type's data as reference since all types share the same timestamps
		const referenceData = mainChartData.charts[selectedTypes[0]]?.data
		if (!referenceData) return { filename: '', rows: [] }

		for (let i = 0; i < referenceData.length; i++) {
			const timestamp = referenceData[i][0]
			const row: Array<string | number | null> = [timestamp, toNiceCsvDate(timestamp / 1000)]
			for (const type of selectedTypes) {
				row.push(mainChartData.charts[type]?.data[i]?.[1] ?? '')
			}
			rows.push(row)
		}

		const csvTitle = `${protocolName}-${title ? slug(title) : chartType}`
		const filename = `${csvTitle}-${chartInterval.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
		return { filename, rows }
	}, [mainChartData.charts, selectedTypes, title, chartInterval, chartType, protocolName])

	return (
		<>
			<div className="flex flex-wrap items-center justify-end gap-1 p-2">
				{title && <h2 className="mr-auto text-base font-semibold">{title}</h2>}
				<div className="ml-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{INTERVALS_LIST.map((dataInterval) => (
						<Tooltip
							content={dataInterval}
							render={<button />}
							className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={dataInterval === chartInterval}
							onClick={() => changeChartInterval(dataInterval as any)}
							key={`${dataInterval}-${chartType}-${title}-${protocolName}`}
						>
							{dataInterval.slice(0, 1).toUpperCase()}
						</Tooltip>
					))}
				</div>
				<SelectWithCombobox
					allValues={allTypes}
					selectedValues={selectedTypes}
					setSelectedValues={setSelectedTypes}
					label={chartType === 'version' ? 'Versions' : 'Chains'}
					clearAll={() => setSelectedTypes([])}
					toggleAll={() => setSelectedTypes(allTypes)}
					selectOnlyOne={(newType) => {
						setSelectedTypes([newType])
					}}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
					portal
				/>
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
				<ChartExportButton
					chartInstance={exportChartInstance}
					filename={title ? slug(title) : `${protocolName}-${chartType}`}
					title={title}
					className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
					smol
				/>
				{chartBuilderConfig && <AddToDashboardButton chartConfig={chartBuilderConfig} smol />}
			</div>
			<React.Suspense fallback={<></>}>
				<LineAndBarChart
					charts={mainChartData.charts}
					groupBy={
						chartInterval === 'Cumulative' ? 'daily' : (chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly')
					}
					valueSymbol="$"
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</>
	)
}
