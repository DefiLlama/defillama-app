import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useChartResize } from '~/hooks/useChartResize'

echarts.use([BarChart, GridComponent, CanvasRenderer])

type PrimitiveBarPoint = [number, number | null | undefined]

interface BarSparklineProps {
	data?: PrimitiveBarPoint[]
	className?: string
	height?: number | string
	focusable?: boolean
	maxBars?: number
}

// Colors for up/down bars
const SUCCESS_RGB: [number, number, number] = [34, 197, 94] // green-500
const ERROR_RGB: [number, number, number] = [239, 68, 68] // red-500

export function BarSparkline({ data, className, height = 48, focusable, maxBars = 60 }: BarSparklineProps) {
	const id = useId()
	const chartRef = useRef<echarts.ECharts | null>(null)

	useChartResize(chartRef)

	const seriesData = useMemo(() => {
		if (!data) return []
		const filtered = data
			.filter((point) => Array.isArray(point) && Number.isFinite(point[1] ?? NaN))
			.map(([timestamp, value]) => [timestamp * 1000, Number(value)])

		// If we have more data points than maxBars, take evenly spaced samples
		if (filtered.length > maxBars) {
			const step = Math.ceil(filtered.length / maxBars)
			const sampled: typeof filtered = []
			for (let i = 0; i < filtered.length; i += step) {
				sampled.push(filtered[i])
			}
			// Always include the last point
			if (sampled[sampled.length - 1] !== filtered[filtered.length - 1]) {
				sampled.push(filtered[filtered.length - 1])
			}
			return sampled
		}
		return filtered
	}, [data, maxBars])

	// Calculate per-bar colors based on comparison to previous bar
	const barDataWithColors = useMemo(() => {
		return seriesData.map(([, value], index) => {
			let rgb = SUCCESS_RGB // Default to green
			if (index > 0) {
				const prevValue = seriesData[index - 1][1]
				if (value < prevValue) {
					rgb = ERROR_RGB
				}
			}

			return {
				value,
				itemStyle: {
					color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
					borderRadius: [2, 2, 0, 0]
				}
			}
		})
	}, [seriesData])

	useEffect(() => {
		const dom = document.getElementById(id)
		if (!dom) return

		let instance = echarts.getInstanceByDom(dom)
		if (!instance) {
			instance = echarts.init(dom, undefined, { renderer: 'canvas' })
		}
		chartRef.current = instance

		if (!seriesData.length) {
			instance.clear()
		} else {
			// Dynamic bar sizing based on number of data points
			const barCount = seriesData.length
			// For fewer bars, use thicker bars with less gap
			const barMaxWidth = barCount <= 7 ? 20 : barCount <= 15 ? 14 : barCount <= 30 ? 8 : barCount <= 60 ? 5 : 3
			const barCategoryGap = barCount <= 7 ? '25%' : barCount <= 15 ? '35%' : barCount <= 30 ? '40%' : '50%'

			instance.setOption(
				{
					grid: {
						left: 0,
						right: 0,
						top: 2,
						bottom: 0,
						containLabel: false
					},
					animation: false,
					tooltip: {
						show: false
					},
					xAxis: {
						type: 'category',
						data: seriesData.map(([ts]) => ts),
						axisLine: { show: false },
						axisTick: { show: false },
						axisLabel: { show: false },
						splitLine: { show: false }
					},
					yAxis: {
						type: 'value',
						axisLine: { show: false },
						axisTick: { show: false },
						axisLabel: { show: false },
						splitLine: { show: false },
						min: (value) => {
							if (typeof value.min !== 'number' || typeof value.max !== 'number') return undefined
							if (value.min === value.max) {
								const pad = Math.abs(value.min) * 0.05 || 1
								return value.min - pad
							}
							const pad = (value.max - value.min) * 0.08
							return Math.max(0, value.min - pad)
						},
						max: (value) => {
							if (typeof value.min !== 'number' || typeof value.max !== 'number') return undefined
							if (value.min === value.max) {
								const pad = Math.abs(value.max) * 0.05 || 1
								return value.max + pad
							}
							const pad = (value.max - value.min) * 0.08
							return value.max + pad
						}
					},
					series: [
						{
							type: 'bar',
							data: barDataWithColors,
							barMaxWidth,
							barMinWidth: 4,
							barCategoryGap
						}
					]
				},
				true
			)
		}

		return () => {
			chartRef.current = null
		}
	}, [id, seriesData, barDataWithColors])

	useEffect(() => {
		return () => {
			if (chartRef.current) {
				chartRef.current.dispose()
				chartRef.current = null
			}
		}
	}, [])

	if (!seriesData.length) {
		return null
	}

	return (
		<div
			id={id}
			className={className}
			style={{ width: '100%', height, outline: 'none', pointerEvents: 'none' }}
			tabIndex={focusable ? 0 : -1}
		/>
	)
}
