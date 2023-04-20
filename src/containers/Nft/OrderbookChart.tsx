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
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import type { IOrderBookChartProps } from './types'
import { useMedia } from '~/hooks'
import { stringToColour } from '~/components/ECharts/utils'

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
	const id = React.useMemo(() => uuid(), [])
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
					color: 'blue'
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
					.filter((item) => item.orderType === 'ask')
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
					color: 'green'
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
					.filter((item) => item.orderType === 'bid')
					.map((item) => [item.price, item.amount, item.avgPrice, item.priceTotal, item.orderType])
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

	return (
		<div style={{ position: 'relative' }}>
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`
