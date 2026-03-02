import { LineChart as EChartLine } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	TitleComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import * as React from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useMedia } from '~/hooks/useMedia'
import type { IOrderBookChartProps } from './types'

echarts.use([
	CanvasRenderer,
	EChartLine,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent,
	DataZoomComponent
])

export default function OrderBookChart({ height, chartData }: IOrderBookChartProps) {
	const id = React.useId()
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const [isDark] = useDarkModeManager()
	const chartRef = React.useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	React.useEffect(() => {
		if (!Array.isArray(chartData) || chartData.length === 0) return
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		const series = [
			{
				name: 'Ask',
				type: 'line',
				stack: 'Ask',
				step: true,
				scale: true,
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: '#3b82f6'
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: 'blue'
						},
						{
							offset: 1,
							color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
						}
					])
				},
				data: chartData
					.filter((item) => item.orderType === 'ask' && item.price > 0)
					.map((item) => [item.price, item.amount, item.avgPrice, item.priceTotal, item.orderType])
			},
			{
				name: 'Bid',
				type: 'line',
				stack: 'Bid',
				step: true,
				scale: true,
				large: true,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: '#22c55e'
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: 'green'
						},
						{
							offset: 1,
							color: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
						}
					])
				},
				data: chartData
					.filter((item) => item.orderType === 'bid' && item.price > 0)
					.map((item) => [item.price, item.amount, item.avgPrice, item.priceTotal, item.orderType])
					.slice(0, 62)
			}
		]

		const option = {
			animation: false,
			title: {
				text: 'Orderbook',
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				left: 15
			},
			graphic: {
				type: 'image',
				z: 0,
				style: {
					image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
					height: 40,
					opacity: 0.3
				},
				left: isSmall ? '40%' : '45%',
				top: '130px'
			},
			grid: {
				left: '5%',
				right: '10%',
				bottom: '7%',
				top: (isSmall ? 60 : 10) + 48,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: function (
					params: Array<{ marker: string; seriesName: string; value: [number, number, number, number, string] }>
				) {
					const point = params?.[0]
					if (!point) return ''

					let vals = `<li style="list-style:none">${point.marker}${point.seriesName}</li>`

					vals += `<li style="list-style:none">Amount :  ${point.value[1]}</li>`
					vals += `<li style="list-style:none">Price :  ${point.value[0]} ETH</li>`
					vals += `<li style="list-style:none">Avg Price :  ${point.value[2]} ETH</li>`
					vals += `<li style="list-style:none">Total Price :  ${point.value[3]} ETH</li>`
					return vals
				},
				showDelay: 0
			},
			legend: {
				textStyle: {
					fontFamily: 'sans-serif',
					fontSize: 12,
					fontWeight: 400,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				top: isSmall ? 30 : 0,
				right: isSmall ? null : 20,
				show: true
			},
			xAxis: {
				name: 'Price',
				type: 'log',
				axisLabel: {
					formatter: (value: number) => Number(value.toFixed(2)) + ' ETH',
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				boundaryGap: false,
				nameTextStyle: {
					fontFamily: 'sans-serif',
					fontSize: 14,
					fontWeight: 400
				},
				axisLine: {
					lineStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.2
					}
				},
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				}
			},
			yAxis: {
				name: 'Amount',
				type: 'value',
				axisLabel: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				axisLine: {
					lineStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.1
					}
				},
				boundaryGap: false,
				nameTextStyle: {
					fontFamily: 'sans-serif',
					fontSize: 14,
					fontWeight: 400
				},
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				}
			},
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100,
					filterMode: 'none'
				}
			],
			series: series
		}

		instance.setOption(option)

		return () => {
			chartRef.current = null
			instance.dispose()
		}
	}, [id, chartData, isDark, isSmall])

	return <div id={id} className="h-[360px]" style={height ? { height } : undefined} />
}
