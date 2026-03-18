import { BarChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useEffectEvent, useId, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formatTooltipValue } from '../formatters'
import type { IHBarChartProps } from '../types'

echarts.use([CanvasRenderer, BarChart, GraphicComponent, GridComponent, TooltipComponent])

function getYAxisLabelWidth(containerWidth: number) {
	return Math.min(Math.max(containerWidth * 0.2, 100), 300)
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
	const emitReady = useEffectEvent((instance: echarts.ECharts | null) => {
		onReady?.(instance)
	})

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		if (!instance) {
			instance = echarts.init(chartDom, null, { renderer: 'canvas' })
		}
		chartRef.current = instance
		emitReady(instance)

		const seriesData = values.map((v, i) => {
			const item: { value: number; itemStyle?: { color: string } } = { value: v }
			const barColor = colors?.[i] ?? color
			if (barColor) item.itemStyle = { color: barColor }
			return item
		})

		const textColor = isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
		const yAxisLabelWidth = getYAxisLabelWidth(chartDom.clientWidth || 600)

		instance.setOption(
			{
				graphic: {
					type: 'image',
					z: 0,
					style: {
						image: isThemeDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
						height: 40,
						opacity: 0.3
					},
					left: '45%',
					top: '130px'
				},
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
						width: yAxisLabelWidth,
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

		const observer = new ResizeObserver((entries) => {
			const inst = chartRef.current
			if (!inst) return
			const entry = entries[0]
			if (!entry) return
			const width = entry.contentRect.width
			inst.resize()
			inst.setOption({ yAxis: { axisLabel: { width: getYAxisLabelWidth(width) } } })
		})
		observer.observe(chartDom)

		return () => {
			observer.disconnect()
			chartRef.current = null
			emitReady(null)
			instance?.dispose()
		}
	}, [id, categories, values, valueSymbol, color, colors, isThemeDark])

	return <div id={id} style={{ height }} />
}
