import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, BarChart as EBarChart, LineChart } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	TitleComponent,
	ToolboxComponent,
	TooltipComponent
} from 'echarts/components'
import { v4 as uuid } from 'uuid'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import { useMedia } from '~/hooks'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { toK } from '~/utils'
import { stringToColour } from '../utils'
import type { IChartProps } from '../types'
import 'echarts/lib/component/grid'
import { UniversalTransition } from 'echarts/features'
import { lastDayOfMonth } from '../ProtocolChart/useFetchAndFormatChartData'

echarts.use([
	EBarChart,
	CanvasRenderer,
	TitleComponent,
	ToolboxComponent,
	TooltipComponent,
	GridComponent,
	LegendComponent,
	BarChart,
	LineChart,
	CanvasRenderer,
	UniversalTransition,
	DataZoomComponent,
	GraphicComponent
])

export interface IStackedBarChartProps extends Omit<IChartProps, 'title' | 'chartData'> {
	title?: string
	chartData: Array<{
		name: string
		data: [Date, number][]
	}>
	stackColors?: { name: string; color: string }
	showLegend?: boolean
}

type series = Array<{
	data: [Date, number][]
	type: 'bar'
	stack: 'value'
}>

export default function StackedBarChart({
	chartData,
	valueSymbol = '$',
	title,
	color,
	stackColors,
	showLegend,
	isMonthly
}: IStackedBarChartProps) {
	const id = useMemo(() => uuid(), [])

	const [isDark] = useDarkModeManager()
	const series = useMemo(() => {
		const chartColor = color || stringToColour()
		const series: series = chartData.map((cd) => {
			return {
				name: cd.name,
				type: 'bar',
				large: true,
				largeThreshold: 0,
				stack: 'value',
				data: cd.data,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: stackColors
					? {
							color: stackColors[cd.name]
					  }
					: chartData.length <= 1
					? {
							color: chartColor
					  }
					: undefined
			}
		})

		return series
	}, [chartData, color, stackColors])

	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
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
			legend: showLegend
				? {
						right: '2%',
						textStyle: {
							fontFamily: 'sans-serif',
							fontWeight: 600,
							color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
						}
				  }
				: false,
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: function (params) {
					let chartdate = new Date(params[0].value[0]).toLocaleDateString('en-US', {
						year: isMonthly ? undefined : 'numeric',
						month: 'short',
						day: 'numeric'
					})

					chartdate +=
						params[0].value[2] === 'monthly'
							? ' - ' + lastDayOfMonth(params[0].value[0]) + ', ' + new Date(params[0].value[0]).getFullYear()
							: ''

					let vals
					if (valueSymbol !== '%' && valueSymbol !== 'ETH') {
						vals = params
							.sort((a, b) => a.value[1] - b.value[1])
							.reduce((prev, curr) => {
								if (curr.value[1] !== 0) {
									return (prev +=
										'<li style="list-style:none">' +
										curr.marker +
										curr.seriesName +
										'&nbsp;&nbsp;' +
										valueSymbol +
										toK(curr.value[1]) +
										'</li>')
								} else return prev
							}, '')
					} else {
						vals = params
							.sort((a, b) => b.value[1] - a.value[1])
							.reduce((prev, curr) => {
								if (curr.value[1] !== 0 && curr.value[1] !== null) {
									return (prev +=
										'<li style="list-style:none">' +
										curr.marker +
										curr.seriesName +
										'&nbsp;&nbsp;' +
										curr.value[1] +
										'&nbsp;' +
										valueSymbol +
										'</li>')
								} else return prev
							}, '')
					}

					return chartdate + vals
				}
			},
			title: {
				text: title,
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			grid: {
				left: 8,
				containLabel: true,
				bottom: 60,
				top: 28,
				right: 8
			},
			xAxis: {
				type: 'time',
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
				}
			},
			yAxis: {
				type: 'value',
				axisLabel: {
					formatter: (value) =>
						valueSymbol === '%' || valueSymbol === 'ETH' ? value + ' ' + valueSymbol : valueSymbol + toK(value)
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
			series,
			dataZoom: [
				{
					type: 'inside',
					start: 0,
					end: 100,
					filterMode: 'none'
				},
				{
					start: 0,
					end: 100,
					filterMode: 'none',
					textStyle: {
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
					handleStyle: {
						borderColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
						color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
					},
					moveHandleStyle: {
						color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
					},
					selectedDataBackground: {
						lineStyle: {
							color
						},
						areaStyle: {
							color
						}
					},
					emphasis: {
						handleStyle: {
							borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
						},
						moveHandleStyle: {
							borderColor: isDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
						}
					},
					fillerColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
					labelFormatter: (val) => {
						const date = new Date(val)
						return date.toLocaleDateString()
					}
				}
			]
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [id, valueSymbol, title, createInstance, series, isDark, color, isSmall, stackColors, showLegend, isMonthly])

	return (
		<div style={{ position: 'relative' }}>
			<div id={id} style={{ height: '360px', margin: 'auto 0' }}></div>
		</div>
	)
}
