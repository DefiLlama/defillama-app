/* eslint-disable no-unused-vars*/
import React, { useCallback, useEffect } from 'react'
import * as echarts from 'echarts'
import { ChartData, getReadableValue } from '~/utils/liquidations'
import {
	BreakpointPanel,
	BreakpointPanels,
	ChartAndValuesWrapper,
	DownloadButton,
	DownloadIcon,
	PanelHiddenMobile
} from '~/components'
import { getOption } from './utils'

export const LiquidationsContent = (props: ChartData) => {
	return (
		<ChartAndValuesWrapper>
			<BreakpointPanels>
				<BreakpointPanel>
					<h1>Total Liquidable (USD)</h1>
					<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
						${getReadableValue(props.totalLiquidable)}
					</p>
					<DownloadButton href={`javascript:alert("TODO: issa not implemented yet");`}>
						<DownloadIcon />
						<span>&nbsp;&nbsp;.csv</span>
					</DownloadButton>
				</BreakpointPanel>
				<PanelHiddenMobile>
					<h2>Change (7d)</h2>
					<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
						{(props.historicalChange[168] * 100).toFixed(1) || 0}%
					</p>
				</PanelHiddenMobile>
				<PanelHiddenMobile>
					<h2>Within -20% of current price</h2>
					<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
						${getReadableValue(props.dangerousPositionsAmount)}
					</p>
				</PanelHiddenMobile>
			</BreakpointPanels>
			<BreakpointPanel>
				<LiquidationsChart chartData={props} uid={props.symbol} />
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}

const LiquidationsChart = ({ chartData, uid }: { chartData: ChartData; uid: string }) => {
	const [aggregateBy, setAggregateBy] = React.useState<'chain' | 'protocol'>('chain')
	const createInstance = useCallback(() => {
		console.log(uid)
		const instance = echarts.getInstanceByDom(document.getElementById(uid))

		return instance || echarts.init(document.getElementById(uid))
	}, [uid])

	useEffect(() => {
		const chartInstance = createInstance()
		const option = getOption(chartData, aggregateBy)
		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [uid, chartData, createInstance, aggregateBy])

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
