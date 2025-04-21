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
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import type { ICollectionScatterChartProps } from './types'
import { useMedia } from '~/hooks/useMedia'

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

export default function CollectionScatterChart({ height, sales, salesMedian1d, volume }: ICollectionScatterChartProps) {
	const id = React.useId()
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const [isDark] = useDarkModeManager()

	const createInstance = React.useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	React.useEffect(() => {
		const chartInstance = createInstance()

		const series =
			sales.length > 0
				? [
						{
							name: 'Sale Price',
							type: 'scatter',
							large: true,
							largeThreshold: 0,
							symbols: 5,
							emphasis: {
								focus: 'series'
							},
							itemStyle: {
								color: '#3b82f6'
							},
							symbolSize: 3,
							data: sales.map((p) => [new Date(p[0]), p[1]])
						},
						{
							name: 'Moving Average',
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
								color: '#22c55e'
							},
							yAxisIndex: 1
						}
				  ]
				: []

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
				left: '20',
				right: '20',
				bottom: 0,
				containLabel: true
			},
			tooltip: {
				showDelay: 0,
				confine: true,
				formatter: function (params) {
					const chartdate = new Date(params.value[0]).toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})

					let vals =
						chartdate +
						'<li style="list-style:none">' +
						params.marker +
						params.seriesName +
						':' +
						'&nbsp;&nbsp;' +
						params.value[1].toFixed(2) +
						'&nbsp;' +
						'ETH' +
						'</li>'

					if (params.seriesName !== 'Volume') {
						const date = new Date(params.value[0]).getTime()

						vals +=
							'<li style="list-style:none">' +
							'<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#ffc300;"></span>' +
							'Moving Average:' +
							'&nbsp;&nbsp;' +
							findClosest(salesMedian1d, salesMedian1d.length, date, false) +
							'&nbsp;' +
							'ETH' +
							'</li>'

						vals +=
							'<li style="list-style:none">' +
							'<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#22c55e;"></span>' +
							'Volume:' +
							'&nbsp;&nbsp;' +
							findClosest(volume, volume.length, date, true) +
							'&nbsp;' +
							'ETH' +
							'</li>'
					}

					return vals
				}
			},
			xAxis: {
				type: 'time',
				boundaryGap: false,
				min: salesMedian1d.length > 0 ? new Date(salesMedian1d[0][0]) : 0,
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
						formatter: (value) => Number(value.toFixed(2)) + ' ETH'
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
					name: 'Volume',
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
	}, [id, sales, volume, createInstance, isDark, isSmall, salesMedian1d])

	return <div id={id} className="min-h-[360px]" style={height ? { height } : undefined} />
}

const findClosest = (arr, n, target, isDateInSeconds) => {
	let left = 0,
		right = n - 1
	while (left < right) {
		if (
			Math.abs((isDateInSeconds ? arr[left][0] * 1e3 : arr[left][0]) - target) <=
			Math.abs((isDateInSeconds ? arr[right][0] * 1e3 : arr[right][0]) - target)
		) {
			right--
		} else {
			left++
		}
	}
	return arr?.[left]?.[1]?.toFixed(2) ?? 0
}
