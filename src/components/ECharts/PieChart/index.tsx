import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart as EPieChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent, GraphicComponent } from 'echarts/components'
import { v4 as uuid } from 'uuid'
import type { IPieChartProps } from '../types'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

echarts.use([CanvasRenderer, EPieChart, TooltipComponent, TitleComponent, GridComponent, GraphicComponent])

export default function PieChart({
	height = '360px',
	stackColors,
	chartData,
	title,
	usdFormat = true,
	radius = null,
	showLegend = false,
	formatTooltip = null,
	customLabel,
	...props
}: IPieChartProps) {
	const id = useMemo(() => uuid(), [])
	const [isDark] = useDarkModeManager()

	const series = useMemo(() => {
		const series: Record<string, any> = {
			name: '',
			type: 'pie',
			left: 0,
			right: 0,
			top: title === '' ? 0 : 25,
			bottom: 0,
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: '{b}: ({d}%)',
				show: showLegend ? false : true
			},
			tooltip: {
				formatter: formatTooltip
			},
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			},

			data: chartData.map((item) => ({
				name: item.name,
				value: item.value,
				itemStyle: {
					color: stackColors?.[item.name] ?? null
				}
			}))
		}
		if (radius) {
			series.radius = radius
		}

		return series
	}, [title, isDark, showLegend, formatTooltip, chartData, radius, stackColors])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
			...(title && {
				title: {
					text: title,
					textStyle: {
						fontFamily: 'sans-serif',
						fontWeight: 600,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					}
				}
			}),
			tooltip: {
				trigger: 'item',
				confine: true,
				valueFormatter: (value) => (usdFormat ? '$' + formattedNum(value) : formattedNum(value))
			},
			grid: {
				left: 0,
				containLabel: true,
				bottom: 0,
				top: 0,
				right: 0
			},
			legend: {
				show: showLegend,
				left: 'right',
				orient: 'vertical',
				data: chartData.map((item) => item.name),
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
				itemGap: 10,
				textStyle: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				formatter: function (name) {
					const maxLength = 18
					return name.length > maxLength ? name.slice(0, maxLength) + '...' : name
				}
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
	}, [createInstance, series, isDark, title, usdFormat, showLegend, chartData])

	return (
		<div style={{ position: 'relative' }} {...props}>
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
