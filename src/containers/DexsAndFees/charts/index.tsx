import * as React from 'react'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { useFetchChartsSummary } from '~/api/categories/adaptors/client'
import { ProtocolAdaptorSummaryResponse } from '~/api/categories/adaptors/types'
import { chartBreakdownByChain, chartBreakdownByTokens, chartBreakdownByVersion } from '~/api/categories/adaptors/utils'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { capitalizeFirstLetter } from '~/utils'
import { IProtocolContainerProps, ProtocolChart } from '../OverviewItem'

interface IChartByType {
	type: string
	protocolName: string
	chartType: CHART_TYPES
	breakdownChart?: boolean
	protocolSummary?: IProtocolContainerProps['protocolSummary']
	fullChart?: boolean
}

export type CHART_TYPES = 'chain' | 'version' | 'tokens'

const chartFormatterBy = (chartType: CHART_TYPES) => {
	switch (chartType) {
		case 'version':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByVersion(totalDataChartBreakdown ?? [])
		case 'tokens':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByTokens(totalDataChartBreakdown ?? [])
		case 'chain':
		default:
			return (
				mainChart: [IJoin2ReturnType, string[]],
				_totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			): [IJoin2ReturnType, string[]] => mainChart
	}
}

const chartTitleBy = (chartType: CHART_TYPES, breakdown: boolean) => {
	switch (chartType) {
		case 'version':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by protocol version`
		case 'tokens':
			return (_title: string, type: string) => `${capitalizeFirstLetter(type)} by token`
		case 'chain':
		default:
			return (title: string, type: string) =>
				title && title !== '' ? title : `${capitalizeFirstLetter(type)}${breakdown ? ' by chain' : ' and revenue'}`
	}
}

const ChartByType: React.FC<IChartByType> = (props) => {
	const [protocolSummary, setProtocolSummary] = React.useState(props.protocolSummary)
	const { data, error } = useFetchChartsSummary(props.type, props.protocolName, undefined, !!props.protocolSummary)
	React.useEffect(() => {
		if (data && !error) {
			setProtocolSummary(data)
		}
	}, [data, error])

	const enableBreakdownChart = props.breakdownChart ?? true
	const fullChart = props.fullChart ?? true
	const typeSimple = props.type === 'dexs' || props.type === 'options' ? 'volume' : props.type
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
		return {
			dataChart: [chartData, legend] as [IJoin2ReturnType, string[]],
			title: title
		}
	}, [protocolSummary?.totalDataChart, protocolSummary?.totalDataChartBreakdown, enableBreakdownChart, typeSimple])

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

export default ChartByType
