import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { formatTooltipValue } from '../formatters'

echarts.use([CanvasRenderer, BarChart, GridComponent, TooltipComponent])

interface IHBarChartProps {
	categories: string[]
	values: number[]
	title?: string
	valueSymbol?: string
	height?: string
	color?: string
}

export default function HBarChart({
	categories,
	values,
	title: _title,
	valueSymbol = '$',
	height = '360px',
	color = '#1f77b4'
}: IHBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		if (!instance) {
			instance = echarts.init(chartDom)
		}
		chartRef.current = instance

		const textColor = isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'

		instance.setOption({
			grid: {
				left: 120,
				right: 20,
				top: 20,
				bottom: 40
			},
			xAxis: {
				type: 'value',
				axisLabel: {
					color: textColor,
					formatter: (value: number) => formatTooltipValue(value, valueSymbol)
				},
				splitLine: {
					lineStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
					}
				}
			},
			yAxis: {
				type: 'category',
				data: categories,
				inverse: true,
				axisLabel: {
					color: textColor,
					width: 100,
					overflow: 'truncate'
				}
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params: any) => {
					if (!Array.isArray(params) || !params[0]) return ''
					const { name, value } = params[0]
					return `<div style="font-weight: 600; margin-bottom: 4px;">${name}</div><div>${formatTooltipValue(value, valueSymbol)}</div>`
				}
			},
			series: [
				{
					type: 'bar',
					data: values,
					itemStyle: { color },
					emphasis: { focus: 'series' }
				}
			]
		})

		return () => {
			chartRef.current = null
			instance?.dispose()
		}
	}, [id, categories, values, valueSymbol, color, isThemeDark])

	return <div id={id} style={{ height }} />
}
