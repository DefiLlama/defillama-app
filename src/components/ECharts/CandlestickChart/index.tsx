import { useCallback, useEffect, useId, useMemo } from 'react'
import { BarChart, CandlestickChart } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	GridComponent,
	MarkLineComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { oldBlue } from '~/constants/colors'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useMedia } from '~/hooks/useMedia'
import type { ICandlestickChartProps } from '../types'
import { formatChartEmphasisDate, formatTooltipChartDate, formatTooltipValue } from '../useDefaults'

echarts.use([
	CanvasRenderer,
	CandlestickChart,
	BarChart,
	TooltipComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent
])

export default function CandleStickAndVolumeChart({ data }: ICandlestickChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const defaultChartSettings = useMemo(() => {
		return {
			graphic: {
				type: 'image',
				z: 0,
				style: {
					image: isThemeDark ? '/icons/defillama-light-neutral.webp' : '/icons/defillama-dark-neutral.webp',
					height: 40,
					opacity: 0.3
				},
				left: isSmall ? '40%' : '45%',
				top: '130px'
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'line'
				},
				formatter: (params) => {
					let chartdate = formatTooltipChartDate(params[0].value[0], 'daily')

					let vals = ''

					if (params[0].componentSubType === 'candlestick') {
						vals += '<li style="list-style:none">' + params[0].marker + '</li>'
						for (const param of params) {
							vals += `<li style="list-style:none">Open<span style="float: right; margin-left: 20px"><b>${formatTooltipValue(param.value[1], '$')}</b></span></li>`
							vals += `<li style="list-style:none">Highest<span style="float: right; margin-left: 20px"><b>${formatTooltipValue(param.value[4], '$')}</b></span></li>`
							vals += `<li style="list-style:none">Lowest<span style="float: right; margin-left: 20px"><b>${formatTooltipValue(param.value[3], '$')}</b></span></li>`
							vals += `<li style="list-style:none">Close<span style="float: right; margin-left: 20px"><b>${formatTooltipValue(param.value[2], '$')}</b></span></li>`
						}
					} else {
						vals += params.reduce((prev, curr) => {
							return (
								prev +
								`<li style="list-style:none">${curr.marker}${curr.seriesName}: ${formatTooltipValue(curr.value[1], '$')}</li>`
							)
						}, '')
					}

					return chartdate + vals
				}
			},
			grid: [
				{
					left: 12,
					bottom: 132,
					top: 12,
					right: 12,
					outerBoundsMode: 'same',
					outerBoundsContain: 'axisLabel'
				},
				{
					height: 80,
					left: 54,
					right: 12,
					bottom: 52,
					outerBoundsMode: 'same',
					outerBoundsContain: 'axisLabel'
				}
			],
			xAxis: [
				{
					type: 'time',
					boundaryGap: false,
					axisLine: {
						onZero: false,
						lineStyle: {
							color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
							opacity: 0.2
						}
					},
					splitLine: { show: false },
					min: 'dataMin',
					max: 'dataMax',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					},
					axisLabel: {
						color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					}
				},
				{
					type: 'time',
					gridIndex: 1,
					boundaryGap: false,
					axisLine: {
						onZero: false,
						lineStyle: {
							color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
							opacity: 0.2
						}
					},
					axisTick: { show: false },
					splitLine: { show: false },
					axisLabel: { show: false },
					min: 'dataMin',
					max: 'dataMax',
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					}
				}
			],
			yAxis: [
				{
					scale: true,
					splitArea: {
						show: true,
						areaStyle: {
							color: [isThemeDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', '']
						}
					},
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					},
					axisLabel: {
						formatter: (value) => formatTooltipValue(value, '$'),
						color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					axisLine: {
						lineStyle: {
							color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
							opacity: 0.1
						}
					},
					splitLine: {
						lineStyle: {
							color: isThemeDark ? '#ffffff' : '#000000',
							opacity: isThemeDark ? 0.02 : 0.03
						}
					}
				},
				{
					scale: true,
					gridIndex: 1,
					splitNumber: 2,
					axisLabel: { show: false },
					axisLine: { show: false },
					axisTick: { show: false },
					splitLine: { show: false },
					nameTextStyle: {
						fontFamily: 'sans-serif',
						fontSize: 14,
						fontWeight: 400
					}
				}
			],
			dataZoom: [
				{
					type: 'inside',
					xAxisIndex: [0, 1],
					start: 10,
					end: 100
				},
				{
					show: true,
					xAxisIndex: [0, 1],
					type: 'slider',
					bottom: 10,
					start: 10,
					end: 100,
					textStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
					handleStyle: {
						borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
						color: isThemeDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
					},
					moveHandleStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
					},
					selectedDataBackground: {
						lineStyle: {
							color: oldBlue
						},
						areaStyle: {
							color: oldBlue
						}
					},
					emphasis: {
						handleStyle: {
							borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
						},
						moveHandleStyle: {
							borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
							color: isThemeDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
						}
					},
					fillerColor: isThemeDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
					labelFormatter: formatChartEmphasisDate
				}
			],
			visualMap: {
				show: false,
				seriesIndex: 1,
				dimension: 6,
				pieces: [
					{
						value: 1,
						color: isThemeDark ? '#3eb84f' : '#018a13'
					},
					{
						value: -1,
						color: isThemeDark ? '#e24a42' : '#e60d02'
					}
				]
			}
		}
	}, [isSmall, isThemeDark])

	const series = useMemo(() => {
		const series = [
			{
				type: 'candlestick',
				symbol: 'none',
				large: true,
				data: data.map((item) => [item[0], item[1], item[2], item[3], item[4]]),
				itemStyle: {
					color: isThemeDark ? '#3eb84f' : '#018a13',
					color0: isThemeDark ? '#e24a42' : '#e60d02',
					borderColor: isThemeDark ? '#3eb84f' : '#018a13',
					borderColor0: isThemeDark ? '#e24a42' : '#e60d02'
				},
				encode: {
					x: 0,
					y: [1, 2, 3, 4]
				}
			},
			{
				name: 'Volume',
				type: 'bar',
				symbol: 'none',
				large: true,
				data: data.map((item) => [item[0], item[5]]),
				xAxisIndex: 1,
				yAxisIndex: 1,
				encode: { x: 0, y: 5 },
				itemStyle: { color: oldBlue }
			}
		]

		return series
	}, [data, isThemeDark])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
			...defaultChartSettings,
			dataset: {
				source: data
			},
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, series, data, defaultChartSettings])

	return <div id={id} className="h-[480px]"></div>
}
