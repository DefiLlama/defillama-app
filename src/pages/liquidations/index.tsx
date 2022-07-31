/* eslint-disable no-unused-vars*/
import { NextPage, GetServerSideProps } from 'next'
import { useQueryState, queryTypes, TransitionOptions } from 'next-usequerystate'
import styled from 'styled-components'
import { PlusCircle } from 'react-feather'
import * as echarts from 'echarts'
import useSWR from 'swr'
import { fetcher, arrayFetcher, retrySWR } from '~/utils/useSWR'

import { ButtonDark } from '~/components/ButtonStyled'
import Layout from '~/layout'
// import { revalidate } from '~/api'

// import { liqs } from '../../components/LiquidationsPage'
import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import { useCallback, useEffect, useMemo } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { ChartData, ChartDataBin } from '~/utils/liquidations'

type Chart = {
	asset: string // symbol for now
	mode: 'chain' | 'protocol'
	filter: FilterChain | FilterProtocol
}

// this should be pulled dynamically
type FilterChain = 'all' | string
type FilterProtocol = 'all' | string

const defaultCharts: Chart[] = [
	{
		asset: 'ETH',
		mode: 'protocol',
		filter: 'all'
	}
]

// es-lint sucks at types
type SetChartsState = (
	value: Chart[] | ((old: Chart[]) => Chart[]),
	transitionOptions?: TransitionOptions
) => Promise<boolean>

const LiquidationsPage: NextPage = () => {
	const [chartsState, setChartsState] = useQueryState('charts', queryTypes.json<Chart[]>().withDefault(defaultCharts))
	const { data, error } = useSWR<ChartData>(
		`http://localhost:3000/api/mock-liquidations/?symbol=${'ETH'}&aggregateBy=${'protocol'}`,
		fetcher
	)
	console.log(data)

	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Home', name: 'Liquidation Levels', hideOptions: true, hideSearch: true }}
			/>

			<Header>Liquidation Levels in DeFi 💦</Header>
			{data &&
				chartsState.map((chart, i) => (
					<LiquidationsChart
						key={`liquidations-${i}-${chart.asset}`}
						chart={chart}
						chartData={data}
						uid={`liquidations-${i}-${chart.asset}`}
					/>
				))}
			<AddChartButton setChartsState={setChartsState} />
		</Layout>
	)
}

const ButtonDarkStyled = styled(ButtonDark)`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	gap: 12px;
	width: 16rem;
	text-align: center;
	user-select: none;
`

// const fillSparseArrayInPlace = (arr: any[]) => {
// 	for (let i = 0; i < arr.length; i++) {
// 		if (arr[i] === undefined) arr[i] = 0
// 	}
// }
const convertChartDataBinsToArray = (obj: ChartDataBin, totalBins: number) => {
	const arr = [...Array(totalBins).keys()].map((i) => obj.bins[i] || 0)
	return arr
}

const AddChartButton = ({ setChartsState }: { setChartsState: SetChartsState }) => {
	const addChart = (chart: Chart) => {
		setChartsState((charts) => [...charts, chart])
	}

	return (
		<ButtonDarkStyled
			onClick={() =>
				addChart({
					asset: 'bitcoin',
					mode: 'chain',
					filter: 'all'
				})
			}
		>
			<PlusCircle /> <span>Search and add another chart</span>
		</ButtonDarkStyled>
	)
}

const getOption = (chart: Chart, chartData: ChartData, isDark: boolean) => {
	const { chartDataBins } = chartData
	// convert chartDataBins to array
	const chartDataBinsArray = Object.keys(chartDataBins).map((key) => ({
		key: key,
		data: convertChartDataBinsToArray(chartDataBins[key], 150)
	}))
	const series = chartDataBinsArray.map((obj) => ({
		name: obj.key,
		type: 'bar',
		data: obj.data,
		stack: 'x'
	}))

	const option = {
		title: {
			text: `${chart.asset} Liquidation Levels`,
			textStyle: {
				fontFamily: 'inter, sans-serif',
				fontWeight: 600,
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			}
		},
		grid: {
			left: '3%',
			right: '7%',
			bottom: '7%',
			containLabel: true
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},
		xAxis: {
			// bins
			type: 'category',
			name: 'Liquidation Price',
			nameLocation: 'middle',
			nameGap: 30,
			nameTextStyle: {
				fontFamily: 'inter, sans-serif',
				fontSize: 14,
				fontWeight: 500,
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisTick: {
				alignWithLabel: true
			},
			data: [...Array(chartData.totalBins).keys()].map((x) => x * chartData.binSize)
		},
		yAxis: {
			type: 'value',
			scale: true,
			// name: 'Liquidable Amount',
			// position: 'middle',
			// nameGap: 40,
			// nameTextStyle: {
			// 	fontFamily: 'inter, sans-serif',
			// 	fontSize: 14,
			// 	fontWeight: 500,
			// 	color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			// },
			axisLabel: {
				formatter: '${value}'
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		},
		series
	}

	return option
}

const LiquidationsChart = ({ chart, chartData, uid }: { chart: Chart; chartData: ChartData; uid: string }) => {
	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		console.log(uid)
		const instance = echarts.getInstanceByDom(document.getElementById(uid))

		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		const chartInstance = createInstance()
		const option = getOption(chart, chartData, isDark)
		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chart, chartData, createInstance, isDark])

	return <div id={uid} style={{ height: '600px', margin: 'auto 0' }} />
}

export default LiquidationsPage
