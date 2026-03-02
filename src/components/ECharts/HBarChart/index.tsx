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
	colors?: string[]
	onReady?: (instance: echarts.ECharts | null) => void
}

export default function HBarChart({
	categories,
	values,
	title: _title,
	valueSymbol = '$',
	height = '360px',
	color = '#1f77b4',
	colors,
	onReady
}: IHBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)

	useChartResize(chartRef)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		if (!instance) {
			instance = echarts.init(chartDom, null, { renderer: 'canvas' })
		}
		chartRef.current = instance
		onReady?.(instance)

		const seriesData = values.map((v, i) => {
			const item: { value: number; itemStyle?: { color: string } } = { value: v }
			const barColor = colors?.[i] ?? color
			if (barColor) item.itemStyle = { color: barColor }
			return item
		})

		const textColor = isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'

		instance.setOption(
			{
				grid: {
					left: 12,
					right: 12,
					top: 12,
					bottom: 12,
					outerBoundsMode: 'same',
					outerBoundsContain: 'axisLabel'
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
						const p = params[0]
						const numericValue = typeof p.value === 'number' ? p.value : (p.data?.value ?? 0)
						return `<div style="font-weight: 600; margin-bottom: 4px;">${p.name}</div><div>${formatTooltipValue(numericValue, valueSymbol)}</div>`
					}
				},
				series: [
					{
						type: 'bar',
						data: seriesData,
						emphasis: { focus: 'series' }
					}
				]
			},
			true
		)

		return () => {
			chartRef.current = null
			onReady?.(null)
			instance?.dispose()
		}
	}, [id, categories, values, valueSymbol, color, colors, isThemeDark, onReady])

	return <div id={id} style={{ height }} />
}
