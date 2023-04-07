import * as React from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart as EChartScatter, LineChart as EChartLine, BarChart as EChartBar } from 'echarts/charts'
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
import type { ICollectionScatterChartProps } from './types'
import { useMedia } from '~/hooks'

echarts.use([
	CanvasRenderer,
	EChartScatter,
	EChartLine,
	EChartBar,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent,
	DataZoomComponent
])

export default function CollectionScatterChart({
	height = '360px',
	sales,
	salesMedian1d,
	volume
}: ICollectionScatterChartProps) {
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
				name: '',
				type: 'scatter',
				large: true,
				largeThreshold: 0,
				symbols: 5,
				emphasis: {
					focus: 'series'
				},
				symbolSize: 3,
				data: sales.map((p) => [new Date(p[0]), p[1]])
			},
			{
				name: 'RollingMedian1d',
				type: 'line',
				itemStyle: {
					color: '#ffc300'
				},
				data: salesMedian1d.map((p) => [new Date(p[0]), p[1]]),
				showSymbol: false,
				connectNulls: true
			},
			{
				name: 'Volume',
				type: 'bar',
				data: volume.map((p) => [new Date(p[0] * 1e3), p[1]]),
				itemStyle: {
					color: '#424ef5',
					opacity: 0.5
				},
				yAxisIndex: 1
			}
		]

		const option = {
			animation: false,
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
				left: '3%',
				right: '7%',
				bottom: '7%',
				containLabel: true
			},
			tooltip: {
				showDelay: 0,
				formatter: function (params) {
					const chartdate = new Date(params.value[0]).toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})

					let vals = '<li style="list-style:none">' + 'Sale Price:' + '&nbsp;&nbsp;' + params.value[1]

					return chartdate + vals
				}
			},
			xAxis: {
				type: 'time',
				boundaryGap: false,
				min: new Date(salesMedian1d[0][0]),
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
			yAxis: [
				{
					type: 'value',
					min: 'dataMin',
					axisLabel: {
						formatter: (value) => value + ' ETH'
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
				{
					type: 'value',
					name: '', // Volume
					show: false,
					max: (value) => value.max * 4,
					position: 'right',
					axisLine: {
						show: false
					},
					axisLabel: {
						show: false
					},
					splitLine: {
						show: false
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
	}, [id, sales, createInstance, isDark, isSmall, salesMedian1d])

	return (
		<div style={{ position: 'relative' }}>
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`
