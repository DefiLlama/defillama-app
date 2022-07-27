import { useCallback, useEffect, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import * as echarts from 'echarts/core'
import { ToolboxComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { BarChart, LineChart } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { YieldsChartWrapper } from './shared'

echarts.use([
	ToolboxComponent,
	TooltipComponent,
	GridComponent,
	LegendComponent,
	BarChart,
	LineChart,
	CanvasRenderer,
	UniversalTransition
])

export interface IChartProps {
	chartData: any
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

export default function BarChartYields({ chartData }: IChartProps) {
	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const median = chartData
			.map((e) => ({ ...e, timestamp: e.timestamp.split('T')[0] }))
			.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
		// add rolling 7d avg of median values (first 6days == null)
		const windowSize = 7
		const apyMedianValues = median.map((m) => m.medianAPY)
		const avg = []
		for (let i = 0; i < apyMedianValues.length; i++) {
			if (i + 1 < windowSize) {
				avg[i] = null
			} else {
				avg[i] = apyMedianValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
			}
		}

		const option = {
			color: ['#66c2a5', '#fc8d62'],
			title: {
				text: 'Median APY Trend',
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
			legend: {
				data: ['Median APY', '7-day Average'],
				textStyle: {
					fontFamily: 'inter, sans-serif',
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
					},
					axisTick: {
						alignWithLabel: true
					},
					data: median.map((m) => m.timestamp)
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
						fontFamily: 'inter, sans-serif',
						fontSize: 14,
						fontWeight: 500,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					axisLabel: {
						formatter: '{value} %'
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
			series: [
				{
					name: 'Median APY',
					type: 'bar',
					data: median.map((m) => m.medianAPY.toFixed(3))
				},
				{
					name: '7-day Average',
					type: 'line',
					data: avg.map((a) => (a === null ? a : a.toFixed(3)))
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
		<YieldsChartWrapper>
			<Wrapper id={id} style={{ height: '600px', margin: 'auto 0' }}></Wrapper>
		</YieldsChartWrapper>
	)
}
