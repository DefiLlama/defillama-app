import { useEffect, useId, useMemo, useRef } from 'react'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type PrimitiveSparklinePoint = [number, number | null | undefined]

export interface SparklineChartProps {
	data?: PrimitiveSparklinePoint[]
	color?: string
	areaColor?: string
	className?: string
	height?: number | string
	smooth?: boolean
	focusable?: boolean
}

export function SparklineChart({
	data,
	color = 'var(--primary)',
	areaColor,
	className,
	height = 48,
	smooth = true,
	focusable
}: SparklineChartProps) {
	const id = useId()
	const chartRef = useRef<echarts.ECharts | null>(null)
	const seriesData = useMemo(() => {
		if (!data) return []
		return data
			.filter((point) => Array.isArray(point) && Number.isFinite(point[1] ?? NaN))
			.map(([timestamp, value]) => [timestamp * 1000, Number(value)])
	}, [data])

	useEffect(() => {
		const dom = document.getElementById(id)
		if (!dom) return

		let instance = echarts.getInstanceByDom(dom)
		if (!instance) {
			instance = echarts.init(dom, undefined, { renderer: 'canvas' })
		}
		chartRef.current = instance

		const resolveColor = (input?: string) => {
			if (!input) return undefined
			const match = input.match(/^var\(([^)]+)\)$/)
			if (!match) {
				return input
			}
			const [variable, fallback] = match[1].split(',').map((part) => part.trim())
			let value = ''
			try {
				const target = document.documentElement || (dom as HTMLElement)
				value = getComputedStyle(target).getPropertyValue(variable)
			} catch (error) {
				value = ''
			}
			return value?.trim() || fallback || input
		}

		let resolvedLine = resolveColor(color) || color
		if (resolvedLine.startsWith('var(')) {
			resolvedLine = '#6BA5FF'
		}

		let resolvedArea = resolveColor(areaColor) || resolvedLine
		if (resolvedArea.startsWith('var(')) {
			resolvedArea = resolvedLine
		}

		const toRgb = (base: string): [number, number, number] | null => {
			const canvas = document.createElement('canvas')
			canvas.width = canvas.height = 1
			const context = canvas.getContext('2d')
			if (!context) return null
			context.fillStyle = '#000'
			context.fillStyle = base
			const computed = context.fillStyle
			if (typeof computed !== 'string') return null

			if (computed.startsWith('#')) {
				const hex = computed.slice(1)
				if (hex.length === 3) {
					const r = parseInt(hex[0] + hex[0], 16)
					const g = parseInt(hex[1] + hex[1], 16)
					const b = parseInt(hex[2] + hex[2], 16)
					return [r, g, b]
				}
				if (hex.length === 6 || hex.length === 8) {
					const r = parseInt(hex.slice(0, 2), 16)
					const g = parseInt(hex.slice(2, 4), 16)
					const b = parseInt(hex.slice(4, 6), 16)
					return [r, g, b]
				}
				return null
			}

			const rgbMatch = computed.match(/rgba?\(([^)]+)\)/)
			if (rgbMatch) {
				const [r, g, b] = rgbMatch[1]
					.split(',')
					.slice(0, 3)
					.map((part) => parseInt(part.trim(), 10))
				if ([r, g, b].every((val) => Number.isFinite(val))) {
					return [r, g, b]
				}
			}
			return null
		}

		const rgb = areaColor ? null : toRgb(resolvedLine)
		const areaFill = areaColor
			? resolvedArea
			: rgb
				? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.28)` },
						{ offset: 1, color: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.04)` }
					])
				: resolvedLine

		const shadowColor = rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.35)` : resolvedLine

		if (!seriesData.length) {
			instance.clear()
		} else {
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
						type: 'time',
						boundaryGap: false,
						axisLine: { show: false },
						axisTick: { show: false },
						axisLabel: { show: false },
						splitLine: { show: false },
						min: seriesData[0]?.[0],
						max: seriesData[seriesData.length - 1]?.[0]
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
							return value.min - pad
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
							type: 'line',
							data: seriesData,
							showSymbol: false,
							lineStyle: {
								color: resolvedLine,
								width: 2,
								cap: 'round',
								join: 'round',
								shadowBlur: rgb ? 6 : 0,
								shadowColor
							},
							smooth,
							smoothMonotone: 'x',
							areaStyle: {
								color: areaFill
							}
						}
					]
				},
				true
			)
		}

		const resize = () => instance?.resize()
		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
		}
	}, [id, seriesData, color, areaColor, smooth])

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
