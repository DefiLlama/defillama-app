import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { getBucketTimestampMs } from '~/components/ECharts/utils'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ChartBuilderConfig } from '~/containers/ProDashboard/types'
import { getAdapterBuilderMetric } from '~/containers/ProDashboard/utils/adapterChartMapping'
import { generateItemId } from '~/containers/ProDashboard/utils/dashboardUtils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { getNDistinctColors, slug } from '~/utils'
import { fetchAdapterProtocolChartDataByBreakdownType } from './api'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const DimensionProtocolChartByType = ({
	protocolName,
	adapterType,
	dataType,
	chartType,
	breakdownNames,
	metadata,
	hallmarks,
	title
}: {
	protocolName: string
	adapterType: `${ADAPTER_TYPES}`
	dataType?: `${ADAPTER_DATA_TYPES}`
	chartType: 'chain' | 'version'
	breakdownNames: string[]
	metadata?: { bribeRevenue?: boolean; tokenTax?: boolean }
	hallmarks?: [number, string][]
	title: string
}) => {
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const { data, isLoading, error } = useQuery({
		queryKey: ['dimension-adapter-chart-breakdown', protocolName, adapterType, dataType ?? null, chartType],
		queryFn: () =>
			fetchAdapterProtocolChartDataByBreakdownType({
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
					fetchAdapterProtocolChartDataByBreakdownType({
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
					fetchAdapterProtocolChartDataByBreakdownType({
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

	const failedApiErrors = React.useMemo(() => {
		const errors: string[] = []
		const pushError = (label: string, value: unknown) => {
			if (!value) return
			const message = value instanceof Error ? value.message : typeof value === 'string' ? value : JSON.stringify(value)
			if (!message) return
			errors.push(message.startsWith(`${label}:`) ? message : `${label}: ${message}`)
		}

		pushError('main', error)

		if (metadata?.bribeRevenue && feesSettings.bribes) {
			pushError('dailyBribesRevenue', fetchingBribeError)
		}
		if (metadata?.tokenTax && feesSettings.tokentax) {
			pushError('dailyTokenTaxes', fetchingTokenTaxError)
		}

		return errors
	}, [
		error,
		fetchingBribeError,
		fetchingTokenTaxError,
		metadata?.bribeRevenue,
		metadata?.tokenTax,
		feesSettings.bribes,
		feesSettings.tokentax
	])

	if (isLoading || fetchingBribeData || fetchingTokenTaxData) {
		return (
			<div className="col-span-2 flex min-h-[398px] flex-col items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (failedApiErrors.length > 0) {
		return (
			<div className="col-span-2 flex min-h-[398px] flex-col items-center justify-center">
				<div className="flex flex-col gap-2 p-2">
					<ul className="flex flex-col gap-4 text-xs text-(--error)">
						{failedApiErrors.map((apiError, index) => (
							<li key={`${apiError}-${index}`} className="break-all">
								{apiError}
							</li>
						))}
					</ul>
				</div>
			</div>
		)
	}

	return (
		<ChartByType
			data={data ?? []}
			bribeData={bribeData ?? undefined}
			tokenTaxData={tokenTaxData ?? undefined}
			breakdownNames={breakdownNames}
			title={title}
			chartType={chartType}
			protocolName={protocolName}
			adapterType={adapterType}
			hallmarks={hallmarks}
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
	adapterType,
	hallmarks
}: {
	data: Array<[number, Record<string, number>]>
	bribeData?: Array<[number, Record<string, number>]>
	tokenTaxData?: Array<[number, Record<string, number>]>
	title?: string
	breakdownNames: string[]
	chartType: 'chain' | 'version'
	protocolName: string
	adapterType: string
	hallmarks?: [number, string][]
}) => {
	const [chartInterval, changeChartInterval] = React.useState<LowercaseDwmcGrouping>('daily')
	const [selectedTypes, setSelectedTypes] = React.useState<string[]>(breakdownNames)
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const chartBuilderConfig = React.useMemo<ChartBuilderConfig | null>(() => {
		const builderMetric = getAdapterBuilderMetric(adapterType)

		if (!builderMetric || chartType === 'version') return null

		let grouping: ChartBuilderConfig['grouping']
		switch (chartInterval) {
			case 'weekly':
				grouping = 'week'
				break
			case 'monthly':
				grouping = 'month'
				break
			case 'quarterly':
				grouping = 'quarter'
				break
			case 'yearly':
				grouping = 'year'
				break
			default:
				grouping = 'day'
				break
		}

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
			chartInterval === 'cumulative'
				? +date * 1e3
				: getBucketTimestampMs(+date * 1e3, chartInterval as ChartTimeGrouping)

		// Aggregate by date with interval grouping
		const aggregatedByDate: Map<number, Record<string, number>> = new Map()

		// Process main data
		for (const [date, versions] of data) {
			const finalDate = computeFinalDate(date)

			const existing = aggregatedByDate.get(finalDate)
			if (existing) {
				for (const type of selectedTypes) {
					existing[type] = (existing[type] ?? 0) + (versions[type] ?? 0)
				}
			} else {
				const entry: Record<string, number> = {}
				for (const type of selectedTypes) {
					entry[type] = versions[type] ?? 0
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
						existing[type] = (existing[type] ?? 0) + (versions[type] ?? 0)
					}
				} else {
					const entry: Record<string, number> = {}
					for (const type of selectedTypes) {
						entry[type] = versions[type] ?? 0
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
						existing[type] = (existing[type] ?? 0) + (versions[type] ?? 0)
					}
				} else {
					const entry: Record<string, number> = {}
					for (const type of selectedTypes) {
						entry[type] = versions[type] ?? 0
					}
					aggregatedByDate.set(finalDate, entry)
				}
			}
		}

		// Sort dates and build dataset rows
		const sortedDates = Array.from(aggregatedByDate.keys()).sort((a, b) => a - b)
		const isCumulative = chartInterval === 'cumulative'
		const cumulative: Record<string, number> = {}

		for (const type of selectedTypes) {
			cumulative[type] = 0
		}

		const source = sortedDates.map((date) => {
			const entry = aggregatedByDate.get(date)!
			const row: Record<string, number | null> = { timestamp: date }
			for (const type of selectedTypes) {
				const value = entry[type] ?? 0
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
		const allColors = getNDistinctColors(breakdownNames.length)
		const stackColors: Record<string, string> = {}
		for (let i = 0; i < breakdownNames.length; i++) {
			stackColors[breakdownNames[i]] = allColors[i]
		}

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
	const deferredMainChartData = React.useDeferredValue(mainChartData)

	return (
		<>
			<div className="flex flex-wrap items-center justify-end gap-1 p-2 pb-0">
				{title ? <h2 className="mr-auto text-base font-semibold">{title}</h2> : null}
				<ChartGroupingSelector
					value={chartInterval}
					setValue={changeChartInterval}
					options={DWMC_GROUPING_OPTIONS_LOWERCASE}
					className="ml-auto text-xs font-medium"
				/>
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
					filename={title ? title : `${protocolName}-${chartType}`}
					title={title}
				/>
				{chartBuilderConfig ? <AddToDashboardButton chartConfig={chartBuilderConfig} smol /> : null}
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={deferredMainChartData.dataset}
					charts={deferredMainChartData.charts}
					groupBy={chartInterval}
					valueSymbol="$"
					showTotalInTooltip
					hallmarks={hallmarks}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</>
	)
}
