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

const LOGO_SIZE = 18
const LOGO_GAP = 8
const LEFT_PAD = 12
const LABEL_FONT = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const LABEL_MAX_WIDTH = 240

let _measureCtx: CanvasRenderingContext2D | null = null
function measureLabelWidth(text: string): number {
	if (!_measureCtx) {
		const c = document.createElement('canvas')
		_measureCtx = c.getContext('2d')
	}
	if (!_measureCtx) return text.length * 7
	_measureCtx.font = LABEL_FONT
	return Math.ceil(_measureCtx.measureText(text).width)
}

export default function HBarChart({
	categories,
	values,
	title: _title,
	valueSymbol = '$',
	height = '360px',
	color = '#1f77b4',
	colors,
	logos,
	onReady
}: IHBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)
	const overlayRef = useRef<HTMLDivElement>(null)
	const emitReady = useEffectEvent((instance: echarts.ECharts | null) => {
		onReady?.(instance)
	})

	const hasLogos = !!(logos && logos.length === categories.length && logos.some(Boolean))

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
		const watermarkHeight = 40
		const watermarkWidth = Math.round((389 / 133) * watermarkHeight)
		const overlayLabelWidth = hasLogos
			? Math.min(
					LABEL_MAX_WIDTH,
					categories.reduce((m, c) => Math.max(m, measureLabelWidth(c)), 0)
				)
			: 0
		const leftGridWidth = hasLogos ? LEFT_PAD + LOGO_SIZE + LOGO_GAP + overlayLabelWidth + 8 : 12

		instance.setOption(
			{
				graphic: [
					{
						type: 'image',
						zlevel: 10,
						z: 999,
						silent: true,
						left: 'center',
						top: 'middle',
						style: {
							image: isThemeDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
							width: watermarkWidth,
							height: watermarkHeight,
							opacity: 0.3
						}
					}
				],
				grid: {
					left: leftGridWidth,
					right: 12,
					top: 12,
					bottom: 12,
					outerBoundsMode: 'same',
					outerBoundsContain: hasLogos ? undefined : 'axisLabel'
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
					axisLine: { show: !hasLogos },
					axisTick: { show: !hasLogos },
					axisLabel: hasLogos ? { show: false } : { color: textColor, width: yAxisLabelWidth, overflow: 'truncate' }
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

		if (hasLogos) {
			;(instance as any).__llamaChartLogos = {
				kind: 'hbar',
				logos: logos!,
				categories
			}
		} else {
			delete (instance as any).__llamaChartLogos
		}

		const syncLogos = () => {
			const layer = overlayRef.current
			const inst = chartRef.current
			if (!layer) return
			layer.innerHTML = ''
			if (!inst || inst.isDisposed() || !hasLogos) return
			for (let i = 0; i < categories.length; i++) {
				const y = inst.convertToPixel({ yAxisIndex: 0 }, i)
				if (typeof y !== 'number' || !Number.isFinite(y)) continue
				const url = logos![i]
				const row = document.createElement('div')
				row.style.cssText = `position:absolute;left:${LEFT_PAD}px;top:${y - LOGO_SIZE / 2}px;height:${LOGO_SIZE}px;pointer-events:none;white-space:nowrap;`
				const spacerCss = `display:inline-block;width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;vertical-align:middle;`
				if (url) {
					const img = document.createElement('img')
					img.src = url
					img.alt = ''
					img.loading = 'lazy'
					img.decoding = 'async'
					img.style.cssText = `width:${LOGO_SIZE}px;height:${LOGO_SIZE}px;border-radius:50%;object-fit:cover;background:${isThemeDark ? '#1a1a1a' : '#fff'};display:inline-block;vertical-align:middle;`
					img.onerror = () => {
						const spacer = document.createElement('span')
						spacer.style.cssText = spacerCss
						img.replaceWith(spacer)
					}
					row.appendChild(img)
				} else {
					const spacer = document.createElement('span')
					spacer.style.cssText = spacerCss
					row.appendChild(spacer)
				}
				const text = document.createElement('span')
				text.textContent = categories[i]
				text.title = categories[i]
				text.style.cssText = `display:inline-block;vertical-align:middle;color:${textColor};font-size:12px;line-height:${LOGO_SIZE}px;margin-left:${LOGO_GAP}px;max-width:${overlayLabelWidth}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`
				row.appendChild(text)
				layer.appendChild(row)
			}
		}

		if (!instance.isDisposed()) {
			instance.on('finished', syncLogos)
		}
		const syncLogosFrame = requestAnimationFrame(syncLogos)

		const observer = new ResizeObserver((entries) => {
			const inst = chartRef.current
			if (!inst || inst.isDisposed()) return
			const entry = entries[0]
			if (!entry) return
			const width = entry.contentRect.width
			inst.resize()
			if (!hasLogos) {
				inst.setOption({ yAxis: { axisLabel: { width: getYAxisLabelWidth(width) } } })
			}
			syncLogos()
		})
		observer.observe(chartDom)

		return () => {
			cancelAnimationFrame(syncLogosFrame)
			observer.disconnect()
			chartRef.current = null
			emitReady(null)
			if (!instance.isDisposed()) {
				instance.off('finished', syncLogos)
				instance.dispose()
			}
		}
	}, [id, categories, values, valueSymbol, color, colors, logos, hasLogos, isThemeDark])

	return (
		<div style={{ position: 'relative', height }}>
			<div id={id} style={{ width: '100%', height: '100%' }} />
			<div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden />
		</div>
	)
}
