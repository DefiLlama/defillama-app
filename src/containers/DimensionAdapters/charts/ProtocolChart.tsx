import * as React from 'react'
import dynamic from 'next/dynamic'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { DataIntervalType, INTERVALS_LIST } from './utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek, slug, download, toNiceCsvDate } from '~/utils'
import { ADAPTOR_TYPES } from '../constants'
import { useGetDimensionAdapterChartData } from './hooks'
import { LazyChart } from '~/components/LazyChart'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { oldBlue } from '~/constants/colors'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const LineAndBarChart = dynamic(() => import('~/components/ECharts/LineAndBarChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<ILineAndBarChartProps>

export const DimensionProtocolOverviewChart = ({
	totalDataChart,
	title
}: {
	totalDataChart: [IJoin2ReturnType, string[]]
	title?: string
}) => {
	const [enabledSettings] = useLocalStorageSettingsManager('fees')
	const [chartInterval, changeChartInterval] = React.useState<DataIntervalType>('Daily')

	const mainChartData = React.useMemo(() => {
		const formatDate = (date) =>
			chartInterval === 'Weekly'
				? lastDayOfWeek(+date * 1e3) * 1e3
				: chartInterval === 'Monthly'
				? firstDayOfMonth(+date * 1e3) * 1e3
				: +date * 1e3

		if (totalDataChart[1].includes('Fees')) {
			const chartData = {
				['Fees']: {},
				['Revenue']: {}
			}

			let cumulativeFees = 0
			let cumulativeRevenue = 0

			totalDataChart[0].forEach(({ date, ...metrics }) => {
				const finalDate = formatDate(date)
				let fees = (metrics['Fees'] as number) ?? 0
				let revenue = (metrics['Revenue'] as number) ?? 0

				if (enabledSettings.bribes) {
					fees += (metrics['Bribes'] as number) ?? 0
					revenue += (metrics['Bribes'] as number) ?? 0
				}
				if (enabledSettings.tokentax) {
					fees += (metrics['TokenTax'] as number) ?? 0
					revenue += (metrics['TokenTax'] as number) ?? 0
				}

				chartData['Fees'][finalDate] = (chartData['Fees'][finalDate] || 0) + fees + cumulativeFees
				chartData['Revenue'][finalDate] = (chartData['Revenue'][finalDate] || 0) + revenue + cumulativeRevenue

				if (chartInterval === 'Cumulative') {
					cumulativeFees += fees
					cumulativeRevenue += revenue
				}
			})

			const finalChartData = {}

			for (const chartType in chartData) {
				finalChartData[chartType] = []
				for (const date in chartData[chartType]) {
					finalChartData[chartType].push([+date, chartData[chartType][date]])
				}
			}

			const charts = {}
			for (const chartType in finalChartData) {
				charts[chartType] = {
					data: finalChartData[chartType],
					type: chartInterval === 'Cumulative' ? 'line' : 'bar',
					name: chartType,
					stack: chartType,
					color: chartType === 'Fees' ? oldBlue : '#E59421'
				}
			}

			return { charts }
		}

		if (totalDataChart[1].includes('Notional volume')) {
			const chartData = {
				['Notional Volume']: {},
				['Premium Volume']: {}
			}

			let cumulativeNotionalVolume = 0
			let cumulativePremiumVolume = 0

			totalDataChart[0].forEach(({ date, ...metrics }) => {
				const finalDate = formatDate(date)
				let notionalVolume = (metrics['Notional volume'] as number) ?? 0
				let premiumVolume = (metrics['Premium volume'] as number) ?? 0

				chartData['Notional Volume'][finalDate] =
					(chartData['Notional Volume'][finalDate] || 0) + notionalVolume + cumulativeNotionalVolume
				chartData['Premium Volume'][finalDate] =
					(chartData['Premium Volume'][finalDate] || 0) + premiumVolume + cumulativePremiumVolume

				if (chartInterval === 'Cumulative') {
					cumulativeNotionalVolume += notionalVolume
					cumulativePremiumVolume += premiumVolume
				}
			})

			const finalChartData = {}

			for (const chartType in chartData) {
				finalChartData[chartType] = []
				for (const date in chartData[chartType]) {
					finalChartData[chartType].push([+date, chartData[chartType][date]])
				}
			}

			const charts = {}
			for (const chartType in finalChartData) {
				charts[chartType] = {
					data: finalChartData[chartType],
					type: chartInterval === 'Cumulative' ? 'line' : 'bar',
					name: chartType,
					stack: chartType,
					color: chartType === 'Notional Volume' ? oldBlue : '#E59421'
				}
			}

			return {
				charts
			}
		}

		const stackName = totalDataChart[1].includes('Earnings') ? 'Earnings' : 'Volume'

		if (chartInterval !== 'Daily') {
			const chartData = {}
			let cumulativeVolume = 0
			totalDataChart[0].forEach(({ date, ...metrics }) => {
				const volume = (metrics[totalDataChart[1][0]] ?? 0) as number
				chartData[formatDate(date)] = (chartData[formatDate(date)] || 0) + volume + cumulativeVolume
				if (chartInterval === 'Cumulative') {
					cumulativeVolume += volume
				}
			})
			const finalChartData = []
			for (const date in chartData) {
				finalChartData.push([+date, chartData[date]])
			}

			return {
				charts: {
					[stackName]: {
						data: finalChartData,
						type: chartInterval === 'Cumulative' ? 'line' : 'bar',
						name: stackName,
						stack: stackName,
						color: oldBlue
					}
				}
			}
		}

		return {
			charts: {
				[stackName]: {
					data: totalDataChart[0].map(({ date, ...metrics }) => [+date * 1e3, metrics[totalDataChart[1][0]] ?? 0]),
					type: 'bar',
					name: stackName,
					stack: stackName,
					color: oldBlue
				}
			}
		}
	}, [totalDataChart, enabledSettings, chartInterval])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]">
			<div className="flex items-center justify-end p-3 gap-2">
				{title && <h2 className="text-base font-semibold mr-auto">{title}</h2>}
				<div className="text-xs font-medium ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
					{INTERVALS_LIST.map((dataInterval) => (
						<button
							key={dataInterval}
							onClick={() => changeChartInterval(dataInterval as any)}
							data-active={dataInterval === chartInterval}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
						>
							{dataInterval}
						</button>
					))}
				</div>
				<CSVDownloadButton
					onClick={() => {
						try {
							let rows = []
							const dataToExport = mainChartData.charts
							const chartKeys = Object.keys(dataToExport)
							if (chartKeys.length > 0) {
								rows = [['Timestamp', 'Date', ...chartKeys]]
								const dateMap = new Map()
								chartKeys.forEach((key) => {
									dataToExport[key].data.forEach(([timestamp, value]) => {
										if (!dateMap.has(timestamp)) {
											dateMap.set(timestamp, {})
										}
										dateMap.get(timestamp)[key] = value
									})
								})
								const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a - b)
								sortedDates.forEach((timestamp) => {
									const row = [timestamp, toNiceCsvDate(timestamp / 1000)]
									chartKeys.forEach((key) => {
										row.push(dateMap.get(timestamp)[key] ?? '')
									})
									rows.push(row)
								})
							}

							const csvTitle = title ? slug(title) : 'protocol-overview'
							const filename = `${csvTitle}-${chartInterval.toLowerCase()}-${
								new Date().toISOString().split('T')[0]
							}.csv`
							download(filename, rows.map((r) => r.join(',')).join('\n'))
						} catch (error) {
							console.error('Error generating CSV:', error)
						}
					}}
					smol
					className="!bg-transparent border border-[var(--form-control-border)] !text-[#666] dark:!text-[#919296] hover:!bg-[var(--link-hover-bg)] focus-visible:!bg-[var(--link-hover-bg)]"
				/>
			</div>
			<LineAndBarChart
				charts={mainChartData.charts}
				groupBy={
					chartInterval === 'Cumulative' ? 'daily' : (chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly')
				}
			/>
		</div>
	)
}

const chartTitleBy = ({
	adapterType,
	chartType
}: {
	adapterType: `${ADAPTOR_TYPES}`
	chartType: 'overview' | 'chain' | 'version'
}) => {
	switch (chartType) {
		case 'chain':
			return `${adapterType === 'fees' ? 'Fees' : 'Volume'} by chain`
		case 'version':
			return `${adapterType === 'fees' ? 'Fees' : 'Volume'} by protocol version`
		default:
			return `${adapterType === 'fees' ? 'Fees' : 'Volume'}`
	}
}

export const DimensionProtocolChartByType = ({
	protocolName,
	adapterType,
	chartType,
	metadata
}: {
	protocolName: string
	adapterType: `${ADAPTOR_TYPES}`
	chartType: 'overview' | 'chain' | 'version'
	metadata?: { bribeRevenue?: boolean; tokenTax?: boolean }
}) => {
	const { data, isLoading } = useGetDimensionAdapterChartData({
		protocolName,
		adapterType,
		disabled: false,
		metadata
	})

	if (isLoading) {
		return <div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]" />
	}

	if (chartType === 'overview') {
		return (
			<LazyChart
				enable
				className="relative col-span-full min-h-[418px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full"
			>
				<DimensionProtocolOverviewChart
					totalDataChart={data.totalDataChart}
					title={chartTitleBy({ adapterType, chartType })}
				/>
			</LazyChart>
		)
	}

	return (
		<LazyChart
			enable
			className="relative col-span-full min-h-[418px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full"
		>
			<ChartByType
				totalDataChartBreakdown={data.totalDataChartBreakdown}
				allTypes={chartType === 'chain' ? data.chains : data.linkedProtocols.slice(1)}
				title={chartTitleBy({ adapterType, chartType })}
				chartType={chartType}
			/>
		</LazyChart>
	)
}

const ChartByType = ({
	totalDataChartBreakdown,
	title,
	allTypes,
	chartType
}: {
	totalDataChartBreakdown: any
	title?: string
	allTypes: string[]
	chartType: 'chain' | 'version'
}) => {
	const [chartInterval, changeChartInterval] = React.useState<DataIntervalType>('Daily')
	const [selectedTypes, setSelectedTypes] = React.useState<string[]>(allTypes)

	const mainChartData = React.useMemo(() => {
		const chartData = {}
		if (chartType === 'version') {
			const cumulativeVolumeByVersion = {}
			for (const version of selectedTypes) {
				cumulativeVolumeByVersion[version] = 0
			}

			for (const [date, chains] of totalDataChartBreakdown) {
				const finalDate =
					chartInterval === 'Weekly'
						? lastDayOfWeek(+date * 1e3) * 1e3
						: chartInterval === 'Monthly'
						? firstDayOfMonth(+date * 1e3) * 1e3
						: +date * 1e3

				const dataByVersion = {}
				for (const chain in chains) {
					for (const version of selectedTypes) {
						dataByVersion[version] = dataByVersion[version] || 0
						dataByVersion[version] += chains[chain][version] || 0
					}
				}

				for (const version of selectedTypes) {
					chartData[version] = chartData[version] || {}
					chartData[version][finalDate] = dataByVersion[version] + cumulativeVolumeByVersion[version]

					if (chartInterval === 'Cumulative') {
						cumulativeVolumeByVersion[version] += dataByVersion[version] || 0
					}
				}
			}
		} else {
			const cumulativeVolumeByChain = {}
			for (const chain of selectedTypes) {
				cumulativeVolumeByChain[chain] = 0
			}

			for (const [date, chains] of totalDataChartBreakdown) {
				const finalDate =
					chartInterval === 'Weekly'
						? lastDayOfWeek(+date * 1e3) * 1e3
						: chartInterval === 'Monthly'
						? firstDayOfMonth(+date * 1e3) * 1e3
						: +date * 1e3

				const dataByChain = {}
				for (const chain in chains) {
					for (const version in chains[chain]) {
						dataByChain[chain] = dataByChain[chain] || 0
						dataByChain[chain] += chains[chain][version] || 0
					}
				}

				for (const chain of selectedTypes) {
					const sChain = slug(chain)

					chartData[chain] = chartData[chain] || {}
					chartData[chain][finalDate] =
						(chartData[chain][finalDate] || 0) + (dataByChain[sChain] || 0) + cumulativeVolumeByChain[chain]

					if (chartInterval === 'Cumulative') {
						cumulativeVolumeByChain[chain] += dataByChain[sChain] || 0
					}
				}
			}
		}

		const finalChartData = {}

		for (const chartType in chartData) {
			finalChartData[chartType] = []
			for (const date in chartData[chartType]) {
				finalChartData[chartType].push([+date, chartData[chartType][date]])
			}
		}

		for (const chartType in finalChartData) {
			const zeroIndex = finalChartData[chartType].findIndex(([date, value]) => value !== 0)
			finalChartData[chartType] = finalChartData[chartType]
				.slice(0, zeroIndex)
				.map(([date]) => [date, null])
				.concat(finalChartData[chartType].slice(zeroIndex))
		}

		const allColors = getNDistinctColors(allTypes.length + 1, oldBlue)
		const stackColors = Object.fromEntries(allTypes.map((_, i) => [_, allColors[i]]))
		stackColors['Others'] = allColors[allColors.length - 1]

		const charts = {}
		for (const chartType in finalChartData) {
			charts[chartType] = {
				data: finalChartData[chartType],
				type: chartInterval === 'Cumulative' ? 'line' : 'bar',
				name: chartType,
				stack: chartType,
				color: stackColors[chartType]
			}
		}
		return { charts }
	}, [allTypes, chartInterval, chartType, selectedTypes, totalDataChartBreakdown])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]">
			<div className="flex items-center gap-1 justify-end flex-wrap p-3">
				{title && <h2 className="text-base font-semibold mr-auto">{title}</h2>}
				<div className="text-xs font-medium ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
					{INTERVALS_LIST.map((dataInterval) => (
						<button
							key={dataInterval}
							onClick={() => changeChartInterval(dataInterval as any)}
							data-active={dataInterval === chartInterval}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
						>
							{dataInterval}
						</button>
					))}
				</div>
				<SelectWithCombobox
					allValues={allTypes}
					selectedValues={selectedTypes}
					setSelectedValues={setSelectedTypes}
					label={chartType === 'version' ? 'Versions' : 'Chains'}
					clearAll={() => setSelectedTypes([])}
					toggleAll={() => setSelectedTypes(allTypes)}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium z-10'
					}}
					portal
				/>
				<CSVDownloadButton
					onClick={() => {
						try {
							let rows = []
							const dataToExport = mainChartData.charts
							const chartKeys = Object.keys(dataToExport)

							if (chartKeys.length > 0) {
								rows = [['Timestamp', 'Date', ...selectedTypes]]
								const dateMap = new Map()

								selectedTypes.forEach((type) => {
									if (dataToExport[type]) {
										dataToExport[type].data.forEach(([timestamp, value]) => {
											if (!dateMap.has(timestamp)) {
												dateMap.set(timestamp, {})
											}
											dateMap.get(timestamp)[type] = value
										})
									}
								})

								const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a - b)

								sortedDates.forEach((timestamp) => {
									const row = [timestamp, toNiceCsvDate(timestamp / 1000)]
									selectedTypes.forEach((type) => {
										row.push(dateMap.get(timestamp)?.[type] ?? '')
									})
									rows.push(row)
								})
							}

							const csvTitle = title ? slug(title) : chartType
							const filename = `${csvTitle}-${chartInterval.toLowerCase()}-${
								new Date().toISOString().split('T')[0]
							}.csv`
							download(filename, rows.map((r) => r.join(',')).join('\n'))
						} catch (error) {
							console.error('Error generating CSV:', error)
						}
					}}
					smol
					className="!bg-transparent border border-[var(--form-control-border)] !text-[#666] dark:!text-[#919296] hover:!bg-[var(--link-hover-bg)] focus-visible:!bg-[var(--link-hover-bg)]"
				/>
			</div>
			<LineAndBarChart
				charts={mainChartData.charts}
				groupBy={
					chartInterval === 'Cumulative' ? 'daily' : (chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly')
				}
			/>
		</div>
	)
}
