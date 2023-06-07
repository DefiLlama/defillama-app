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
	...props
}: IPieChartProps) {
	const id = useMemo(() => uuid(), [])
	const [isDark] = useDarkModeManager()

	const series = useMemo(() => {
		const series = {
			name: '',
			type: 'pie',
			left: 0,
			right: 0,
			top: title === '' ? 0 : 25,
			bottom: 0,
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: '{b}: ({d}%)'
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

		return series
	}, [chartData, isDark, stackColors, title])

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
	}, [createInstance, series, isDark, title, usdFormat])

	return (
		<div style={{ position: 'relative' }} {...props}>
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
