import * as React from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart as EChartLine } from 'echarts/charts'
import {
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent,
	DataZoomComponent
} from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import type { IOrderBookChartProps } from './types'
import { useMedia } from '~/hooks/useMedia'

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

export default function OrderBookChart({ height = '360px', chartData }: IOrderBookChartProps) {
	const id = React.useMemo(() => crypto.randomUUID(), [])
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const [isDark] = useDarkModeManager()

	const createInstance = React.useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	React.useEffect(() => {
		const chartInstance = createInstance()

		const series = [
			{
				name: 'Ask',
				type: 'line',
				stack: 'Ask',
				step: true,
				scale: true,
				large: true,
				largeThreshold: 0,
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
				largeThreshold: 0,
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
					image: isDark ? logoLight.src : logoDark.src,
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
				containLabel: true
			},
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: function (params) {
					let vals = '<li style="list-style:none">' + params[0].marker + params[0].seriesName + '</li>'

					vals += '<li style="list-style:none">' + 'Amount :  ' + params[0].value[1] + '</li>'
					vals += '<li style="list-style:none">' + 'Price :  ' + params[0].value[0] + ' ETH' + '</li>'
					vals += '<li style="list-style:none">' + 'Avg Price :  ' + params[0].value[2] + ' ETH' + '</li>'
					vals += '<li style="list-style:none">' + 'Total Price :  ' + params[0].value[3] + ' ETH' + '</li>'
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
					formatter: (value) => Number(value.toFixed(2)) + ' ETH'
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
					fontWeight: 400,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
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

		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [id, chartData, createInstance, isDark, isSmall])

	return <div id={id} style={{ height }} />
}
