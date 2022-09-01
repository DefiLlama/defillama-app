import { useCallback, useEffect, useMemo } from 'react'
import { toK } from '~/utils'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart as EChartScatter } from 'echarts/charts'
import {
	TooltipComponent,
	ToolboxComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	AxisPointerComponent,
	BrushComponent,
	LegendComponent,
	DataZoomComponent
} from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { YieldsChartWrapper } from '../shared'

echarts.use([
	CanvasRenderer,
	EChartScatter,
	TooltipComponent,
	ToolboxComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	AxisPointerComponent,
	BrushComponent,
	LegendComponent,
	DataZoomComponent
])

export interface IChartProps {
	chartData: any
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function ScatterChart({ chartData }: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const projectNames = [...new Set(chartData.map((p) => p.projectName))]
		const series = []
		for (const project of projectNames) {
			series.push({
				name: project,
				type: 'scatter',
				symbols: 5,
				emphasis: {
					focus: 'series'
				},
				data: chartData
					.filter((p) => p.projectName === project)
					.map((p) => [p.sigma, p.mu, p.count, p.symbol, p.pool, p.tvlUsd, p.apy, p.chain])
			})
		}

		const option = {
			title: {
				text: 'APY Average vs Volatility',
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
				showDelay: 0,
				formatter: function (params) {
					if (params.value.length > 1) {
						return (
							'Symbol: ' +
							params.value[3] +
							'<br/>' +
							'Pool: ' +
							params.value[4] +
							'<br/>' +
							'TVL: $' +
							toK(params.value[5]) +
							'<br/>' +
							'APY Spot: ' +
							params.value[6].toFixed(2) +
							'%' +
							'<br/>' +
							'Chain: ' +
							params.value[7] +
							'<br/>' +
							'Project: ' +
							params.seriesName +
							'<br/>' +
							'APY Geometric Average: ' +
							params.value[1].toFixed(2) +
							'%' +
							'<br/>' +
							'APY Standard Deviation: ' +
							params.value[0].toFixed(2) +
							'%' +
							'<br/>' +
							'Nb of collected daily datapoints: ' +
							params.value[2]
						)
					} else {
						return params.seriesName + ' :<br/>' + params.name + ' : ' + params.value.toFixed(5) + 'mean '
					}
				},
				axisPointer: {
					show: true,
					type: 'cross',
					lineStyle: {
						type: 'dashed',
						width: 1
					}
				}
			},
			toolbox: {
				feature: {
					dataZoom: {},
					restore: {}
				}
			},
			xAxis: [
				{
					type: 'value',
					scale: true,
					name: 'APY Standard Deviation',
					nameLocation: 'middle',
					nameGap: 30,
					nameTextStyle: {
						fontFamily: 'inter, sans-serif',
						fontSize: 14,
						fontWeight: 500,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					axisLabel: {
						formatter: '{value}'
					},
					splitLine: {
						lineStyle: {
							color: '#a1a1aa',
							opacity: 0.1
						}
					}
				}
			],
			yAxis: [
				{
					type: 'value',
					scale: true,
					name: 'APY Geometric Average',
					nameLocation: 'middle',
					nameGap: 40,
					nameTextStyle: {
						fontFamily: 'inter, sans-serif',
						fontSize: 14,
						fontWeight: 500,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					axisLabel: {
						formatter: '{value}'
					},
					splitLine: {
						lineStyle: {
							color: '#a1a1aa',
							opacity: 0.1
						}
					}
				}
			],
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100
				}
			],
			series: series
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
	}, [id, chartData, createInstance, isDark])

	return (
		<YieldsChartWrapper>
			<Wrapper id={id} style={{ height: '600px', margin: 'auto 0' }}></Wrapper>
		</YieldsChartWrapper>
	)
}
