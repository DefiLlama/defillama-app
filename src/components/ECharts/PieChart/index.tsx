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

export default function PieChart({ height = '360px', stackColors, chartData, ...props }: IPieChartProps) {
	const id = useMemo(() => uuid(), [])
	const [isDark] = useDarkModeManager()

	const series = useMemo(() => {
		const series = {
			name: '',
			type: 'pie',
			left: 0,
			right: 0,
			label: {
				fontFamily: 'inter, sans-serif',
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
	}, [chartData, isDark, stackColors])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		chartInstance.setOption({
			tooltip: {
				trigger: 'item',
				valueFormatter: (value) => '$' + formattedNum(value)
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
	}, [createInstance, series])

	return (
		<div style={{ position: 'relative' }} {...props}>
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
