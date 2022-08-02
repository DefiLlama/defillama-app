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
import React, { useCallback, useEffect, useMemo } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { ChartData, ChartDataBin } from '~/utils/liquidations'
import {
	BreakpointPanel,
	BreakpointPanels,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon,
	PanelHiddenMobile
} from '~/components'
import { ResponsiveContainer } from 'recharts'

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
					<LiquidationsContainer
						chart={chart}
						chartData={data}
						uid={`liquidations-${i}-${chart.asset}`}
						key={`liquidations-${i}-${chart.asset}`}
					/>
				))}
			<AddChartButton setChartsState={setChartsState} />
		</Layout>
	)
}

const LiquidationsContainer = ({ chart, chartData, uid }: { chart: Chart; chartData: ChartData; uid: string }) => {
	return (
		<ResponsiveContainer aspect={60 / 28}>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Liquidable (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							${getReadableValue(chartData.totalLiquidable)}
						</p>
						<DownloadButton href={`javascript:alert("TODO: issa not implemented yet");`}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (7d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
							{(chartData.historicalChange[168] * 100).toFixed(1) || 0}%
						</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>Lending Market Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
							{(chartData.lendingDominance * 100).toFixed(1) || 0}%
						</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel>
					<LiquidationsChart chart={chart} chartData={chartData} uid={uid} />
				</BreakpointPanel>
			</ChartAndValuesWrapper>
		</ResponsiveContainer>
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

function getReadableValue(value: number) {
	if (value === 0) return '0'
	const s = ['', 'k', 'm', 'b', 't']
	const e = Math.floor(Math.log(value) / Math.log(1000))
	return (value / Math.pow(1000, e)).toFixed(1) + s[e]
}

const getOption = (chart: Chart, chartData: ChartData, isDark: boolean) => {
	const { chartDataBins } = chartData
	// convert chartDataBins to array
	const chartDataBinsArray = Object.keys(chartDataBins).map((key) => ({
		key: key,
		data: convertChartDataBinsToArray(chartDataBins[key], 150)
	}))
	const series = chartDataBinsArray.map((obj) => ({
		type: 'bar',
		name: obj.key,
		data: obj.data,
		tooltip: {
			valueFormatter: (value: string) => `$${getReadableValue(Number(value))}`
		},
		emphasis: {
			focus: 'series'
		},
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
			left: '2%',
			right: '2%',
			bottom: '6%',
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
			// name: 'Liquidation Price',
			// nameLocation: 'middle',
			// nameGap: 30,
			// nameTextStyle: {
			// 	fontFamily: 'inter, sans-serif',
			// 	fontSize: 14,
			// 	fontWeight: 500,
			// 	color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			// },
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: {
				formatter: (value: string) => `$${Number(value).toFixed(3)}`
			},
			axisTick: {
				alignWithLabel: true
			},
			data: [...Array(chartData.totalBins).keys()].map((x) => x * chartData.binSize)
		},
		yAxis: {
			type: 'value',
			// scale: true,
			// name: 'Liquidable Amount',
			position: 'right',
			// nameGap: 65,
			// nameLocation: 'middle',
			// nameRotate: 270,
			// nameTextStyle: {
			// 	fontFamily: 'inter, sans-serif',
			// 	fontSize: 14,
			// 	fontWeight: 500,
			// 	color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			// },
			axisLabel: {
				formatter: (value: string) => `$${getReadableValue(Number(value))}`
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

	return (
		<div
			id={uid}
			style={{
				minHeight: '320px',
				margin: 'auto 0'
			}}
		/>
	)
}

export default LiquidationsPage
