/* eslint-disable no-unused-vars*/
import styled from 'styled-components'
import * as echarts from 'echarts'
import React, { useCallback, useEffect } from 'react'
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
import { ProtocolName, Symbol } from '~/containers/ProtocolContainer'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { RowBetween } from '~/components/Row'
import { ChartState, getOption, getReadableValue } from './utils'
import { LiquidationsChartFilters } from './Dropdowns'

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
export const LiquidationsContainer = ({ chartState, chartData }: { chartState: ChartState; chartData: ChartData }) => {
	const { aggregateBy } = chartState
	return (
		<>
			<LiquidationsHeaderWrapper>
				<ProtocolName>
					<TokenLogo logo={chartData.coingeckoAsset.thumb} size={24} />
					<FormattedName text={chartData.coingeckoAsset.name} maxCharacters={16} fontWeight={700} />
					<Symbol>({chartData.symbol})</Symbol>
				</ProtocolName>
				<LiquidationsChartFilters />
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
					<LiquidationsChart chart={chartState} chartData={chartData} uid={`liquidations-chart-${chartState.asset}`} />
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
