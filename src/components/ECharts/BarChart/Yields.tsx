import { useCallback, useEffect, useId } from 'react'
import { BarChart, LineChart } from 'echarts/charts'
import {
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	ToolboxComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { useDarkModeManager } from '~/contexts/LocalStorage'

echarts.use([
	ToolboxComponent,
	TooltipComponent,
	GridComponent,
	LegendComponent,
	BarChart,
	LineChart,
	CanvasRenderer,
	UniversalTransition,
	DataZoomComponent
])

export interface IChartProps {
	chartData: any
}

export default function BarChartYields({ chartData }: IChartProps) {
	const id = useId()

	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const option = {
			color: ['#66c2a5', '#fc8d62'],
			title: {
				text: 'Median APY Trend',
				subtext: 'Calculated over all tracked pools on a given day',
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			grid: {
				left: '3%',
				right: '7%',
				bottom: '7%',
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
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
			legend: {
				data: ['Median APY', '7-day Average'],
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			xAxis: [
				{
					type: 'category',
					scale: true,
					name: '',
					nameLocation: 'middle',
					nameGap: 30,
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 500
					},
					axisLabel: {
						formatter: '{value}',
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
					data: chartData.map((m) => m.timestamp)
				}
			],
			yAxis: [
				{
					type: 'value',
					scale: true,
					name: '',
					position: 'middle',
					nameGap: 40,
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 500
					},
					axisLabel: {
						formatter: '{value} %',
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
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
					end: 100,
					filterMode: 'none'
				}
			],
			series: [
				{
					name: 'Median APY',
					type: 'bar',
					data: chartData.map((m) => m.medianAPY.toFixed(3))
				},
				{
					name: '7-day Average',
					type: 'line',
					data: chartData.map((a) => a.avg7day).map((a) => (a === null ? a : a.toFixed(3)))
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
	}, [id, chartData, createInstance, isDark])

	return (
		<div className="relative flex flex-col items-end rounded-md bg-(--cards-bg) p-3">
			<div id={id} className="min-h-[600px] w-full" />
		</div>
	)
}
