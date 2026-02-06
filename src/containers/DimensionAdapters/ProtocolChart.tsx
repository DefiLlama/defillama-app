import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { ChartBuilderConfig } from '~/containers/ProDashboard/types'
import { getAdapterBuilderMetric } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek, slug } from '~/utils'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'
import { getAdapterProtocolChartDataByBreakdownType } from './queries'

const INTERVALS_LIST = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const DimensionProtocolChartByType = ({
	protocolName,
	adapterType,
	dataType,
	chartType,
	breakdownNames,
	metadata,
	title
}: {
	protocolName: string
	adapterType: `${ADAPTER_TYPES}`
	dataType?: `${ADAPTER_DATA_TYPES}`
	chartType: 'chain' | 'version'
	breakdownNames: string[]
	metadata?: { bribeRevenue?: boolean; tokenTax?: boolean }
	title: string
}) => {
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const { data, isLoading, error } = useQuery({
		queryKey: ['dimension-adapter-chart-breakdown', protocolName, adapterType, dataType ?? null, chartType],
		queryFn: () =>
			getAdapterProtocolChartDataByBreakdownType({
				adapterType,
				protocol: protocolName,
				dataType,
				type: chartType
			}),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const {
		data: bribeData,
		isLoading: fetchingBribeData,
		error: fetchingBribeError
	} = useQuery({
		queryKey: [
			'dimension-adapter-chart-breakdown',
			protocolName,
			adapterType,
			'dailyBribesRevenue',
			chartType,
			metadata?.bribeRevenue ?? false,
			feesSettings.bribes ?? false
		],
		queryFn: feesSettings.bribes
			? () =>
					getAdapterProtocolChartDataByBreakdownType({
						adapterType,
						protocol: protocolName,
						dataType: 'dailyBribesRevenue',
						type: chartType
					})
			: () => Promise.resolve(null),
		enabled: !!(metadata?.bribeRevenue && feesSettings.bribes),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const {
		data: tokenTaxData,
		isLoading: fetchingTokenTaxData,
		error: fetchingTokenTaxError
	} = useQuery({
		queryKey: [
			'dimension-adapter-chart-breakdown',
			protocolName,
			adapterType,
			'dailyTokenTaxes',
			chartType,
			metadata?.tokenTax ?? false,
			feesSettings.tokentax ?? false
		],
		queryFn: feesSettings.tokentax
			? () =>
					getAdapterProtocolChartDataByBreakdownType({
						adapterType,
						protocol: protocolName,
						dataType: 'dailyTokenTaxes',
						type: chartType
					})
			: () => Promise.resolve(null),
		enabled: !!(metadata?.tokenTax && feesSettings.tokentax),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (isLoading || fetchingBribeData || fetchingTokenTaxData) {
		return (
			<div className="col-span-2 flex min-h-[418px] flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (error || fetchingBribeError || fetchingTokenTaxError) {
		return (
			<div className="col-span-2 flex min-h-[418px] flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p className="p-3 text-center text-sm text-(--error)">
					Error : {error?.message || fetchingBribeError?.message || fetchingTokenTaxError?.message}
				</p>
			</div>
		)
	}

	return (
		<ChartByType
			data={data}
			bribeData={bribeData}
			tokenTaxData={tokenTaxData}
			breakdownNames={breakdownNames}
			title={title}
			chartType={chartType}
			protocolName={protocolName}
			adapterType={adapterType}
		/>
	)
}

const ChartByType = ({
	data,
	bribeData,
	tokenTaxData,
	title,
	breakdownNames,
	chartType,
	protocolName,
	adapterType
}: {
	data: Array<[number, Record<string, number>]>
	bribeData?: Array<[number, Record<string, number>]>
	tokenTaxData?: Array<[number, Record<string, number>]>
	title?: string
	breakdownNames: string[]
	chartType: 'chain' | 'version'
	protocolName: string
	adapterType: string
}) => {
	const [chartInterval, changeChartInterval] = React.useState<(typeof INTERVALS_LIST)[number]>('Daily')
	const [selectedTypes, setSelectedTypes] = React.useState<string[]>(breakdownNames)
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

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
		if (selectedTypes.length === 0) return { dataset: { source: [], dimensions: ['timestamp'] }, charts: [] }

		// Helper to compute final date based on interval
		const computeFinalDate = (date: number) =>
			chartInterval === 'Weekly'
				? lastDayOfWeek(+date * 1e3) * 1e3
				: chartInterval === 'Monthly'
					? firstDayOfMonth(+date * 1e3) * 1e3
					: +date * 1e3

		// Aggregate by date with interval grouping
		const aggregatedByDate: Map<number, Record<string, number>> = new Map()

		// Process main data
		for (const [date, versions] of data) {
			const finalDate = computeFinalDate(date)

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

		// Add bribe data values
		if (bribeData) {
			for (const [date, versions] of bribeData) {
				const finalDate = computeFinalDate(date)
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
		}

		// Add token tax data values
		if (tokenTaxData) {
			for (const [date, versions] of tokenTaxData) {
				const finalDate = computeFinalDate(date)
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
		}

		// Sort dates and build dataset rows
		const sortedDates = Array.from(aggregatedByDate.keys()).sort((a, b) => a - b)
		const isCumulative = chartInterval === 'Cumulative'
		const cumulative: Record<string, number> = {}

		for (const type of selectedTypes) {
			cumulative[type] = 0
		}

		const source = sortedDates.map((date) => {
			const entry = aggregatedByDate.get(date)!
			const row: Record<string, number | null> = { timestamp: date }
			for (const type of selectedTypes) {
				const value = entry[type] || 0
				if (isCumulative) {
					cumulative[type] += value
					row[type] = cumulative[type]
				} else {
					row[type] = value
				}
			}
			return row
		})

		// Replace leading zeros with null for cleaner charts
		for (const type of selectedTypes) {
			for (let i = 0; i < source.length && source[i][type] === 0; i++) {
				source[i][type] = null
			}
		}

		// Build chart config
		const allColors = getNDistinctColors(breakdownNames.length + 1)
		const stackColors: Record<string, string> = {}
		for (let i = 0; i < breakdownNames.length; i++) {
			stackColors[breakdownNames[i]] = allColors[i]
		}
		stackColors['Others'] = allColors[allColors.length - 1]

		const chartType2: 'line' | 'bar' = isCumulative ? 'line' : 'bar'
		const chartsConfig = selectedTypes.map((type) => ({
			type: chartType2,
			name: type,
			encode: { x: 'timestamp', y: type },
			stack: 'chartType',
			color: stackColors[type]
		}))

		return {
			dataset: { source, dimensions: ['timestamp', ...selectedTypes] },
			charts: chartsConfig
		}
	}, [breakdownNames, chartInterval, selectedTypes, data, bribeData, tokenTaxData])

	return (
		<>
			<div className="flex flex-wrap items-center justify-end gap-1 p-2 pb-0">
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
					allValues={breakdownNames}
					selectedValues={selectedTypes}
					setSelectedValues={setSelectedTypes}
					label={chartType === 'version' ? 'Versions' : 'Chains'}
					labelType="smol"
					variant="filter"
					portal
				/>
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={title ? slug(title) : `${protocolName}-${chartType}`}
					title={title}
				/>
				{chartBuilderConfig && <AddToDashboardButton chartConfig={chartBuilderConfig} smol />}
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={mainChartData.dataset}
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
