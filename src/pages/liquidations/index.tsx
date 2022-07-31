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
import { ChartData } from '~/utils/liquidations'

type Chart = {
	asset: string
	mode: 'chain' | 'protocol'
	filter: FilterChain | FilterProtocol
}

// this should be pulled dynamically
type FilterChain = 'all' | string
type FilterProtocol = 'all' | string

const defaultCharts: Chart[] = [
	{
		asset: 'ethereum',
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
	console.log({ data })

	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Home', name: 'Liquidation Levels', hideOptions: true, hideSearch: true }}
			/>

			<Header>Liquidation Levels in DeFi 💦</Header>
			{chartsState.map((chart, i) => (
				<LiquidationsChart
					key={`liquidations-${i}-${chart.asset}`}
					chart={chart}
					chartData={{}}
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

const LiquidationsChart = ({ chart, chartData, uid }: { chart: Chart; chartData: any; uid: string }) => {
	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		console.log(uid)
		const instance = echarts.getInstanceByDom(document.getElementById(uid))

		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		const chartInstance = createInstance()
		const option = {
			title: {
				text: 'Ethereum Liquidation Levels',
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
			toolbox: {
				feature: {
					dataZoom: {},
					dataView: {},
					restore: {}
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
				data: ['A', 'B', 'C', 'D', 'E']
			},
			yAxis: {},
			series: [
				{
					name: 'Direct',
					data: [10, 22, 28, 43, 49],
					type: 'bar',
					stack: 'x'
				},
				{
					data: [5, 4, 3, 5, 10],
					type: 'bar',
					stack: 'x'
				}
			]
		}

		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chartData, createInstance, isDark])

	return <div id={uid} style={{ height: '600px', margin: 'auto 0' }} />
}

export default LiquidationsPage
