/* eslint-disable no-unused-vars*/

import { useRouter } from 'next/router'
import styled from 'styled-components'
import * as echarts from 'echarts'
import { useSelectState } from 'ariakit/select'
import React, { useCallback, useEffect, useState } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { ChartData, ChartDataBin } from '~/utils/liquidations'
import {
	BreakpointPanel,
	BreakpointPanels,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon,
	PanelHiddenMobile,
	Checkbox
} from '~/components'
import { ProtocolName, Symbol } from '~/containers/ProtocolContainer'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { RowBetween } from '~/components/Row'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { MenuButtonArrow } from 'ariakit'
import { Stats, Item } from '~/components/Filters/shared'
import { ChartState } from './Chart'
import { defaultChartState } from '../../pages/liquidations/index'
import { LiquidationsChartFilters, DropdownOption } from './Dropdowns'

const LiquidationsHeaderWrapper = styled.div`
	flex: 1;
	isolation: isolate;
	z-index: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 10px;
	position: relative;
	margin-top: 1rem;

	@media (min-width: 80rem) {
		flex-direction: row;
	}
`
export const LiquidationsContainer = ({
	chartState: chart,
	chartData,
	uid,
	aggregateBy
}: {
	chartState: ChartState
	chartData: ChartData
	uid: string
	aggregateBy: 'chain' | 'protocol'
}) => {
	return (
		<>
			<LiquidationsHeaderWrapper>
				<ProtocolName>
					<TokenLogo logo={chartData.coingeckoAsset.thumb} size={24} />
					<FormattedName text={chartData.coingeckoAsset.name} maxCharacters={16} fontWeight={700} />
					<Symbol>({chartData.symbol})</Symbol>
				</ProtocolName>
				<LiquidationsChartFilters aggregateBy={aggregateBy} />
			</LiquidationsHeaderWrapper>
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
					<LiquidationsChartHeader assetSymbol={chartData.coingeckoAsset.symbol} />
					<LiquidationsChart chart={chart} chartData={chartData} uid={uid} />
				</BreakpointPanel>
			</ChartAndValuesWrapper>
		</>
	)
}
const LiquidationsChartHeader = ({ assetSymbol }: { assetSymbol: string }) => {
	return (
		<RowBetween>
			<h2 style={{ userSelect: 'none' }}>{assetSymbol} liquidation levels</h2>
		</RowBetween>
	)
}
const convertChartDataBinsToArray = (obj: ChartDataBin, totalBins: number) => {
	// // this line below suddenly throws error in browser that the iterator cant iterate??
	// const arr = [...Array(totalBins).keys()].map((i) => obj.bins[i] || 0)
	const arr = Array.from({ length: totalBins }, (_, i) => i).map((i) => obj.bins[i] || 0)
	return arr
}
function getReadableValue(value: number) {
	if (value === 0) return '0'
	const s = ['', 'k', 'm', 'b', 't']
	const e = Math.floor(Math.log(value) / Math.log(1000))
	return (value / Math.pow(1000, e)).toFixed(1) + s[e]
}
const getOption = (chart: ChartState, chartData: ChartData, isDark: boolean) => {
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
		// title: {
		// 	text: `${chart.asset} Liquidation Levels`,
		// 	textStyle: {
		// 		fontFamily: 'inter, sans-serif',
		// 		fontWeight: 600,
		// 		color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
		// 	}
		// },
		grid: {
			left: '2%',
			right: '1%',
			top: '2%',
			bottom: '2%',
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
			// data: [...Array(chartData.totalBins).keys()].map((x) => x * chartData.binSize)
			data: Array.from({ length: chartData.totalBins }, (_, i) => i).map((x) => x * chartData.binSize)
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
const LiquidationsChart = ({ chart, chartData, uid }: { chart: ChartState; chartData: ChartData; uid: string }) => {
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
				minHeight: '360px',
				margin: 'auto 0'
			}}
		/>
	)
}
