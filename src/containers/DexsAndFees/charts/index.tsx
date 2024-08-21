import * as React from 'react'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { useFetchChartsSummary } from '~/api/categories/adaptors/client'
import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { capitalizeFirstLetter } from '~/utils'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import type { IProtocolContainerProps } from '../types'
import { ChartOnly, ProtocolChart } from './ProtocolChart'
import { CHART_TYPES } from './types'
import { chartFormatterBy } from './utils'

interface IChartByType {
	type: string
	protocolName: string
	chartType: CHART_TYPES
	breakdownChart?: boolean
	protocolSummary?: IProtocolContainerProps['protocolSummary']
	fullChart?: boolean
}

const chartTitleBy = (chartType: CHART_TYPES, breakdown: boolean) => {
	switch (chartType) {
		case 'version':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by protocol version`
		case 'tokens':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by token`
		case 'chain':
		default:
			return (title: string, type: string) => {
				if (type === 'fees' && !breakdown) return `${capitalizeFirstLetter(type)} and revenue`
				if (type === 'aggregator-derivatives') return 'Derivatives Aggregator' + (breakdown ? ' by chain' : '')
				return title && title !== ''
					? title
					: `${capitalizeFirstLetter(type)}${breakdown ? ' by chain' : ' and revenue'}`
			}
	}
}

export const ChartByType: React.FC<IChartByType> = (props) => {
	const { protocolSummary, error, enableBreakdownChart, fullChart, typeSimple, mainChart } =
		useGetDexsAndFeesChartData(props)

	return !error &&
		(mainChart.dataChart?.[0]?.length > 0 || protocolSummary?.totalDataChartBreakdown?.[0]?.length > 0) ? (
		<LazyChart enable={fullChart}>
			<ProtocolChart
				logo={protocolSummary?.logo}
				data={protocolSummary}
				chartData={chartFormatterBy(props.chartType)(mainChart.dataChart, protocolSummary?.totalDataChartBreakdown)}
				name={protocolSummary?.displayName}
				type={protocolSummary?.type ?? props.type}
				title={fullChart ? chartTitleBy(props.chartType, enableBreakdownChart)(mainChart.title, typeSimple) : undefined}
				totalAllTime={protocolSummary?.totalAllTime}
				fullChart={fullChart}
			/>
		</LazyChart>
	) : (
		<></>
	)
}

export const ChartByType2: React.FC<IChartByType> = (props) => {
	const { protocolSummary, error, enableBreakdownChart, fullChart, typeSimple, mainChart } =
		useGetDexsAndFeesChartData(props)

	return !error &&
		(mainChart.dataChart?.[0]?.length > 0 || protocolSummary?.totalDataChartBreakdown?.[0]?.length > 0) ? (
		<LazyChart enable={fullChart}>
			<ChartOnly
				chartData={chartFormatterBy(props.chartType)(mainChart.dataChart, protocolSummary?.totalDataChartBreakdown)}
				title={fullChart ? chartTitleBy(props.chartType, enableBreakdownChart)(mainChart.title, typeSimple) : undefined}
			/>
		</LazyChart>
	) : (
		<></>
	)
}

export const useGetDexsAndFeesChartData = (props) => {
	const [protocolSummary, setProtocolSummary] = React.useState(props.protocolSummary)
	const { data, error } = useFetchChartsSummary(props.type, props.protocolName, undefined, !!props.protocolSummary)
	React.useEffect(() => {
		if (data && !error) {
			setProtocolSummary(data)
		}
	}, [data, error])

	const enableBreakdownChart = props.type === 'options' ? false : props.breakdownChart ?? true
	const fullChart = props.fullChart ?? true
	const typeSimple = volumeTypes.includes(props.type) ? 'volume' : props.type

	const mainChart = React.useMemo(() => {
		if (!protocolSummary)
			return {
				dataChart: [[], []] as [IJoin2ReturnType, string[]],
				title: 'Loading'
			}
		let chartData: IJoin2ReturnType
		let title: string
		let legend: string[]
		if (!enableBreakdownChart) {
			chartData = protocolSummary?.totalDataChart[0]
			legend = protocolSummary?.totalDataChart[1]
		} else {
			const [cd, lgnd] = chartBreakdownByChain(protocolSummary?.totalDataChartBreakdown)
			chartData = cd
			legend = lgnd
		}

		title = Object.keys(legend).length <= 1 ? `${capitalizeFirstLetter(typeSimple)} by chain` : ''

		if (legend.length === 1 && legend[0] === 'Dexs') {
			title = 'Volume'
		}

		return {
			dataChart: [chartData, legend] as [IJoin2ReturnType, string[]],
			title: title
		}
	}, [protocolSummary, enableBreakdownChart, typeSimple])

	return { protocolSummary, error, enableBreakdownChart, fullChart, typeSimple, mainChart }
}
