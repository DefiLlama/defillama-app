import { useCallback, useEffect, useMemo } from 'react'
import { toK } from '~/utils'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart as EChartScatter } from 'echarts/charts'
import {
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	ToolboxComponent,
	AxisPointerComponent,
	BrushComponent,
	LegendComponent,
	MarkAreaComponent,
	MarkPointComponent,
	MarkLineComponent
} from 'echarts/components'

echarts.use([
	CanvasRenderer,
	EChartScatter,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	ToolboxComponent,
	AxisPointerComponent,
	BrushComponent,
	LegendComponent,
	MarkAreaComponent,
	MarkPointComponent,
	MarkLineComponent
])

export interface IChartProps {
	chartData: any
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function ScatterChart({ chartData }: IChartProps) {
	const id = useMemo(() => uuid(), [])

	// NOTE(this should be a filter)
	chartData = chartData.filter((p) => p.count >= 90)

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
					.map((p) => [p.sigma, p.mu, p.count, p.symbol, p.pool, p.tvlUsd, p.apy])
			})
		}

		const option = {
			title: {
				text: 'Geometric mean and standard deviation'
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
							'Pool: ' +
							params.value[3] +
							'<br/>' +
							'PoolId: ' +
							params.value[4] +
							'<br/>' +
							'TVL: $' +
							toK(params.value[5]) +
							'<br/>' +
							'APY: ' +
							params.value[6].toFixed(2) +
							'%' +
							'<br/>' +
							'Project: ' +
							params.seriesName +
							'<br/>' +
							'Sigma: ' +
							params.value[0].toFixed(5) +
							'<br/>' +
							'Mean: ' +
							params.value[1].toFixed(5)
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
					brush: {
						type: ['rect', 'polygon', 'clear']
					}
				}
			},
			brush: {},
			legend: {
				data: projectNames,
				left: 'center',
				bottom: 10
			},
			xAxis: [
				{
					type: 'value',
					scale: true,
					axisLabel: {
						formatter: '{value} sigma'
					},
					splitLine: {
						show: true
					}
				}
			],
			yAxis: [
				{
					type: 'value',
					scale: true,
					axisLabel: {
						formatter: '{value} mean'
					},
					splitLine: {
						show: true
					}
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
	}, [id])

	return (
		<div style={{ position: 'relative' }}>
			<Wrapper id={id} style={{ height: '600px', margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
