import * as React from 'react'
import dynamic from 'next/dynamic'
import { IChart2Props, IChartProps } from '~/components/ECharts/types'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { DataIntervalType, INTERVALS_LIST } from './utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, firstDayOfMonth, lastDayOfWeek } from '~/utils'
import { IDimensionChartTypes } from '../types'
import { ADAPTOR_TYPES } from '../constants'
import { useGetOverviewChartData } from './hooks'

const BarChart2 = dynamic(() => import('~/components/ECharts/BarChart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[406px]" />
}) as React.FC<IChart2Props>

const AreaChart3 = dynamic(() => import('~/components/ECharts/AreaChart3'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[406px]" />
}) as React.FC<IChartProps>

export const DimensionProtocolOverviewChart = ({
	totalDataChart
}: {
	totalDataChart: [IJoin2ReturnType, string[]]
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

			return {
				chartData: finalChartData,
				stackColors: {
					Fees: '#1f67d2',
					Revenue: '#E59421',
					Incentives: '#1cd8a6'
				}
			}
		}

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
				chartData: { ['Volume']: finalChartData },
				stackColors: { ['Volume']: '#1f67d2' }
			}
		}

		return {
			chartData: {
				['Volume']: totalDataChart[0].map(({ date, ...metrics }) => [+date * 1e3, metrics[totalDataChart[1][0]] ?? 0])
			} as IChart2Props['chartData'],
			stackColors: { ['Volume']: '#1f67d2' }
		}
	}, [totalDataChart, enabledSettings, chartInterval])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]">
			<div className="flex items-center justify-end p-3">
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
			</div>
			{chartInterval === 'Cumulative' ? (
				<AreaChart3 chartData={mainChartData.chartData} stackColors={mainChartData.stackColors} />
			) : (
				<BarChart2
					chartData={mainChartData.chartData}
					groupBy={chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly'}
					stackColors={mainChartData.stackColors}
				/>
			)}
		</div>
	)
}

const chartTitleBy = (chartType: IDimensionChartTypes, breakdown: boolean) => {
	switch (chartType) {
		case 'version':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by protocol version`
		case 'tokens':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by token`
		case 'chain':
		default:
			return (title: string, type: string) => {
				if (type === 'fees' && !breakdown) return `${capitalizeFirstLetter(type)} and revenue`
				if (type === 'derivatives') return 'Perps' + (breakdown ? ' by chain' : '')
				if (type === 'aggregator-derivatives') return 'Perps Aggregators' + (breakdown ? ' by chain' : '')
				return title && title !== ''
					? title
					: `${capitalizeFirstLetter(type)}${breakdown ? ' by chain' : ' and revenue'}`
			}
	}
}

export const DimensionProtocolChartByType = ({
	chartType,
	protocolName,
	type,
	overviewChart
}: {
	chartType: IDimensionChartTypes
	protocolName: string
	type: `${ADAPTOR_TYPES}`
	overviewChart?: boolean
}) => {
	const { data, isLoading } = useGetOverviewChartData({
		name: protocolName,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: overviewChart ? false : true,
		disabled: false
	})

	if (isLoading) {
		return <div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]" />
	}

	if (overviewChart) {
		// console.log({ data })
		// return <DimensionProtocolOverviewChart totalDataChart={data.totalDataChart ?? []} />
	}
	return null
	// return !error &&
	// 	(mainChart.dataChart?.[0]?.length > 0 || protocolSummary?.totalDataChartBreakdown?.[0]?.length > 0) ? (
	// 	<LazyChart
	// 		enable={fullChart}
	// 		className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full"
	// 	>
	// 		{/* <ProtocolChart
	// 			logo={protocolSummary?.logo}
	// 			data={protocolSummary}
	// 			chartData={chartFormatterBy(props.chartType)(mainChart.dataChart, protocolSummary?.totalDataChartBreakdown)}
	// 			name={protocolSummary?.displayName}
	// 			type={protocolSummary?.type ?? props.type}
	// 			title={fullChart ? chartTitleBy(props.chartType, enableBreakdownChart)(mainChart.title, typeSimple) : undefined}
	// 			totalAllTime={protocolSummary?.totalAllTime}
	// 			fullChart={fullChart}
	// 		/> */}
	// 		<></>
	// 	</LazyChart>
	// ) : (
	// 	<></>
	// )
}
