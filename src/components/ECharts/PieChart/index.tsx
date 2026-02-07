import { PieChart as EPieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { useMedia } from '~/hooks/useMedia'
import { formattedNum } from '~/utils'
import type { IPieChartProps } from '../types'
import { formatTooltipValue } from '../useDefaults'

echarts.use([
	CanvasRenderer,
	EPieChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent
])

export default function PieChart({
	height,
	stackColors,
	chartData,
	title,
	valueSymbol = '$',
	radius = null,
	showLegend = false,
	legendPosition,
	legendTextStyle,
	toRight,
	formatTooltip,
	customLabel,
	customComponents,
	exportButtons,
	onReady,
	...props
}: IPieChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportButtonsMode = exportButtons ?? 'hidden'
	const exportButtonsConfig =
		typeof exportButtonsMode === 'object' && exportButtonsMode !== null ? exportButtonsMode : undefined
	const exportButtonsHidden = exportButtonsMode === 'hidden'
	const exportButtonsAuto = exportButtonsMode === 'auto'

	const imageExportEnabled = exportButtonsHidden
		? false
		: exportButtonsConfig
			? (exportButtonsConfig.png ?? true)
			: exportButtonsAuto

	const csvDownloadEnabled = exportButtonsHidden
		? false
		: exportButtonsConfig
			? (exportButtonsConfig.csv ?? true)
			: exportButtonsAuto

	const exportFilename =
		exportButtonsConfig?.filename || (title ? title.replace(/\s+/g, '-').toLowerCase() : 'pie-chart')
	const exportTitle = exportButtonsConfig?.pngTitle || title
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const { percentByName, formatPercent } = useMemo(() => {
		const total = chartData.reduce((acc, item) => acc + item.value, 0)

		const formatPercent = (value: number) => {
			if (total === 0) return '0%'
			const pct = (value / total) * 100
			if (pct === 0) return '0%'
			if (pct < 0.0001) return '< 0.0001%'
			if (pct < 0.01) return formattedNum(pct) + '%'
			return pct.toFixed(2) + '%'
		}

		const percentByName = Object.fromEntries(chartData.map((item) => [item.name, formatPercent(item.value)]))

		return { percentByName, formatPercent }
	}, [chartData])

	const { legendBoxWidth, legendLabelByName, legendAlign } = useMemo(() => {
		// Shrink legend width to its content when possible to avoid big empty columns.
		// When labels must be truncated, use the full available width and left-align so text stays close to the pie.
		if (!showLegend || isSmall)
			return {
				legendBoxWidth: 0,
				legendLabelByName: {} as Record<string, string>,
				legendAlign: undefined as 'left' | 'right' | undefined
			}
		const legendOrient = legendPosition?.orient ?? 'vertical'
		const legendIsRight = legendPosition?.right != null || legendPosition?.left === 'right' || !legendPosition
		if (legendOrient !== 'vertical' || !legendIsRight)
			return {
				legendBoxWidth: 0,
				legendLabelByName: {} as Record<string, string>,
				legendAlign: undefined as 'left' | 'right' | undefined
			}

		const fontSize = typeof legendTextStyle?.fontSize === 'number' ? legendTextStyle.fontSize : 12
		const fontFamily = (legendTextStyle as any)?.fontFamily || 'sans-serif'
		const fontWeight = (legendTextStyle as any)?.fontWeight || 400
		// Keep this small so we don't over-truncate names.
		const iconAndPaddingPx = 22

		const safeMeasure = (text: string) => {
			if (typeof document === 'undefined') return text.length * fontSize * 0.58
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')
			if (!ctx) return text.length * fontSize * 0.58
			ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
			return ctx.measureText(text).width
		}

		const truncateToWidth = (text: string, maxWidthPx: number) => {
			if (maxWidthPx <= 0) return ''
			if (safeMeasure(text) <= maxWidthPx) return text
			const ell = '…'
			const ellW = safeMeasure(ell)
			if (ellW >= maxWidthPx) return ell

			let lo = 0
			let hi = text.length
			while (lo < hi) {
				const mid = Math.ceil((lo + hi) / 2)
				const candidate = text.slice(0, mid) + ell
				if (safeMeasure(candidate) <= maxWidthPx) lo = mid
				else hi = mid - 1
			}
			return text.slice(0, lo) + ell
		}

		// Determine legend box width.
		// - If `toRight` is provided, treat it as a MIN (caller intent),
		//   but allow growing up to a cap to reduce unnecessary ellipsis.
		// - If not provided, shrink-to-fit up to 200px.
		const minWidth = typeof toRight === 'number' ? toRight : 0
		const maxWidth = typeof toRight === 'number' ? Math.max(toRight, 420) : 200
		let maxTextW = 0
		for (const item of chartData) {
			const pct = percentByName[item.name] ?? '0%'
			const full = `${item.name} (${pct})`
			maxTextW = Math.max(maxTextW, safeMeasure(full))
		}
		const desired = Math.ceil(maxTextW + iconAndPaddingPx)
		const boxWidth = Math.max(80, Math.min(Math.max(desired, minWidth), maxWidth))
		const needsTruncation = desired > boxWidth

		const availableTextPx = Math.max(0, boxWidth - iconAndPaddingPx)
		const out: Record<string, string> = {}
		for (const item of chartData) {
			const name = String(item.name)
			const pct = percentByName[item.name] ?? '0%'
			const pctText = ` (${pct})`
			const pctW = safeMeasure(pctText)
			const maxNamePx = Math.max(0, availableTextPx - pctW)
			const finalName = truncateToWidth(name, maxNamePx)
			out[item.name] = `${finalName}${pctText}`
		}

		return {
			legendBoxWidth: boxWidth,
			legendLabelByName: out,
			legendAlign: (needsTruncation ? 'left' : 'right') as 'left' | 'right'
		}
	}, [showLegend, isSmall, legendPosition, legendTextStyle, toRight, chartData, percentByName])

	const reservedRight = useMemo(() => {
		// Space reserved for legend + some breathing room to the card border.
		if (!legendBoxWidth) return 0
		const LEGEND_EDGE_PADDING = 12
		const LEGEND_PIE_GAP = 2
		return legendBoxWidth + LEGEND_EDGE_PADDING + LEGEND_PIE_GAP
	}, [legendBoxWidth])

	const series = useMemo(() => {
		const series: Record<string, any> = {
			name: '',
			type: 'pie',
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: (x) => {
					return `${x.name}: (${formatPercent(x.value)})`
				},
				show: !showLegend
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
					color: stackColors?.[item.name] ?? undefined
				}
			}))
		}

		if (reservedRight > 0) {
			// Reserve pixels on the right for a potentially large legend so it
			// never overlaps the pie (ECharts legend is drawn inside the canvas).
			series.left = 0
			series.right = reservedRight
		}

		if (radius) {
			series.radius = radius
		} else {
			if (!isSmall) {
				// Slightly larger on desktop when a right-side legend exists,
				// so the pie uses the available canvas and reduces "wasted" left space.
				series.radius = reservedRight > 0 ? '78%' : '70%'
			}
		}

		if (customLabel && typeof customLabel === 'object') {
			series.label = { ...series.label, ...customLabel }
		}

		return series
	}, [isDark, showLegend, chartData, radius, stackColors, isSmall, reservedRight, formatPercent, customLabel])

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		if (onReady) {
			onReady(instance)
		}

		const getReservedRight = () => {
			return reservedRight
		}

		const computePieCenterPx = () => {
			const inst = chartRef.current
			if (!inst) return null
			const reserved = getReservedRight()
			const w = inst.getWidth()
			const h = inst.getHeight()
			const availableW = Math.max(1, w - reserved)

			// Center within the drawable pie area (excluding reserved legend width).
			// This keeps the pie visually centered and avoids big left-side dead space,
			// especially for small legends (e.g. the unlocked donut).
			const cx = Math.round(availableW / 2)
			const cy = Math.round(h / 2)
			return { cx, cy, w, h, availableW }
		}

		const setWatermark = () => {
			// If we got disposed/unmounted, bail out (resize can race with cleanup/RAF).
			if (!chartRef.current || typeof (chartRef.current as any).getWidth !== 'function') return
			// ECharts exposes `isDisposed()` on instances.
			if (typeof (chartRef.current as any).isDisposed === 'function' && (chartRef.current as any).isDisposed()) return

			const center = computePieCenterPx()
			if (!center) return
			const { cx, cy, w, h } = center

			// Keep the watermark consistent with MultiSeriesChart2 (40px high on desktop),
			// and only scale down when the chart is extremely small.
			const reservedRight = getReservedRight()
			const minDim = Math.max(1, Math.min(h, w - reservedRight))
			// Match MultiSeriesChart2: 40px-high watermark with natural aspect ratio.
			const baseHeight = 40
			// `defillama-*-neutral.webp` dimensions are 389x133.
			const aspect = 389 / 133

			let watermarkHeight = baseHeight
			let watermarkWidth = Math.round(watermarkHeight * aspect)

			// If the chart is tiny, scale watermark down (but keep it readable).
			const maxWidth = minDim * 0.6
			if (watermarkWidth > maxWidth) {
				const scale = maxWidth / watermarkWidth
				watermarkWidth = Math.round(watermarkWidth * scale)
				watermarkHeight = Math.max(20, Math.round(watermarkHeight * scale))
			}

			chartRef.current.setOption(
				{
					graphic: [
						{
							id: 'defillama-watermark',
							type: 'image',
							zlevel: 10,
							z: 999,
							silent: true,
							left: Math.round(cx - watermarkWidth / 2),
							top: Math.round(cy - watermarkHeight / 2),
							style: {
								image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
								width: watermarkWidth,
								height: watermarkHeight,
								opacity: 0.3
							}
						}
					]
				},
				{ lazyUpdate: true }
			)
		}

		const setPieCenter = () => {
			const inst = chartRef.current
			if (!inst) return
			if (typeof (inst as any).isDisposed === 'function' && (inst as any).isDisposed()) return
			if (!showLegend || isSmall || reservedRight <= 0) return

			const center = computePieCenterPx()
			if (!center) return

			inst.setOption(
				{
					series: {
						// Keep y centered; x is computed in pixels for consistent gap control.
						center: [center.cx, '50%']
					}
				},
				{ lazyUpdate: true }
			)
		}

		instance.setOption({
			tooltip: {
				trigger: 'item',
				confine: true,
				formatter: (params: any) => {
					if (formatTooltip) return formatTooltip(params)
					const p = Array.isArray(params) ? params[0] : params
					const rawValue = typeof p?.value === 'number' ? p.value : Number(p?.value ?? 0)
					const formattedValue = formatTooltipValue(rawValue, valueSymbol)
					return `${p?.marker ?? ''}${p?.name ?? ''}: <b>${formattedValue}</b> (${params.percent}%)`
				}
			},
			grid: {
				left: 0,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel',
				bottom: 0,
				top: 0,
				right: 0
			},
			legend: {
				show: showLegend,
				type: 'scroll',
				right: 12,
				orient: 'vertical', // Default
				data: chartData.map((item) => item.name),
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
				itemGap: 10,
				// If everything fits, right-align looks cleaner. If truncated, left-align maximizes readable label length.
				align: legendAlign,
				textStyle: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)', // Default color
					...(legendTextStyle || {}) // Apply overrides from prop
				},
				formatter: function (name) {
					return legendLabelByName[name] ?? String(name)
				},
				...(legendBoxWidth > 0 ? { width: legendBoxWidth } : {}),
				...legendPosition // Apply overrides from prop (left/right/top/bottom/orient)
			},
			series
		})

		// Apply layout after options are applied, and keep it stable on resize.
		setPieCenter()
		setWatermark()
		let raf = 0
		const onResize = () => {
			if (raf) cancelAnimationFrame(raf)
			raf = requestAnimationFrame(() => {
				setPieCenter()
				setWatermark()
			})
		}
		window.addEventListener('resize', onResize)

		handleChartReady(instance)

		return () => {
			window.removeEventListener('resize', onResize)
			if (raf) cancelAnimationFrame(raf)
			chartRef.current = null
			instance.dispose()
			handleChartReady(null)
			if (onReady) {
				onReady(null)
			}
		}
	}, [
		id,
		series,
		isDark,
		title,
		valueSymbol,
		showLegend,
		chartData,
		legendPosition,
		legendTextStyle,
		toRight,
		formatTooltip,
		customLabel,
		radius,
		isSmall,
		legendBoxWidth,
		legendLabelByName,
		legendAlign,
		reservedRight,
		handleChartReady,
		onReady,
		percentByName
	])

	const showToolbar = title || customComponents || imageExportEnabled || csvDownloadEnabled

	return (
		<div className="relative" {...props}>
			{showToolbar ? (
				<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
					{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
					{customComponents ?? null}
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={exportFilename}
						title={exportTitle}
						showCsv={csvDownloadEnabled}
						showPng={imageExportEnabled}
					/>
				</div>
			) : null}
			<div id={id} className="mx-0 my-auto h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
