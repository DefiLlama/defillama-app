import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { downloadDataURL } from '~/utils/download'

// --- Shared profile type (single source of truth) ---

export type PngExportProfile = 'default' | 'scatterWithImageSymbols' | 'treemap'

// --- Constants ---

const IMAGE_EXPORT_WIDTH = 1280
const IMAGE_EXPORT_HEIGHT = 720
const TREEMAP_EXPORT_PORTRAIT_WIDTH = 720
const TREEMAP_EXPORT_PORTRAIT_HEIGHT = 1280
const EXPORT_FONT_SIZE = 24
const LEGEND_ITEM_GAP = 20
const LEGEND_ITEM_WIDTH = 48
const BASE_TOP_PADDING = 16

// --- Small utilities ---

const approximateTextWidth = (text: string, fontSize: number) => {
	if (!text) return 0
	return text.length * fontSize * 0.6
}

const parsePixelValue = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (trimmed.endsWith('px')) {
			const parsed = Number.parseFloat(trimmed.slice(0, -2))
			if (Number.isFinite(parsed)) return parsed
		}
	}
	return null
}

const hasSeriesType = (options: Record<string, any>, type: string) =>
	Array.isArray(options.series) &&
	options.series.some((s: any) => s != null && typeof s === 'object' && s.type === type)

// --- Series flags ---

interface SeriesFlags {
	isSankeyChart: boolean
	isPieChart: boolean
	isTreemapChart: boolean
	isScatterChart: boolean
	isHorizontalBarChart: boolean
	yAxisConfig: any
}

function detectSeriesFlags(options: Record<string, any>): SeriesFlags {
	const yAxisConfig = Array.isArray(options.yAxis) ? options.yAxis[0] : options.yAxis
	return {
		isSankeyChart: hasSeriesType(options, 'sankey'),
		isPieChart: hasSeriesType(options, 'pie'),
		isTreemapChart: hasSeriesType(options, 'treemap'),
		isScatterChart: hasSeriesType(options, 'scatter'),
		isHorizontalBarChart: hasSeriesType(options, 'bar') && yAxisConfig?.type === 'category',
		yAxisConfig
	}
}

// --- PNG rasterization ---

/**
 * ECharts' SVG painter ignores the `type` param and always returns an SVG data URL
 * from getDataURL(). This helper detects that case and rasterizes the SVG to a PNG
 * asynchronously (Image.onload + Canvas), which getDataURL() can't do internally
 * because it's synchronous.
 */
async function getChartPngDataURL(
	chart: echarts.ECharts,
	opts: { pixelRatio?: number; backgroundColor?: string; excludeComponents?: string[] }
): Promise<string> {
	const { pixelRatio = 2, backgroundColor = '#ffffff', excludeComponents } = opts

	const dataURL = chart.getDataURL({
		type: 'png',
		pixelRatio,
		backgroundColor,
		excludeComponents
	})

	if (dataURL.startsWith('data:image/png')) {
		return dataURL
	}

	const img = new Image()
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve()
		img.onerror = reject
		img.src = dataURL
	})

	const w = img.naturalWidth || img.width
	const h = img.naturalHeight || img.height
	const canvas = document.createElement('canvas')
	canvas.width = w * pixelRatio
	canvas.height = h * pixelRatio
	const ctx = canvas.getContext('2d')
	if (!ctx) return dataURL

	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.scale(pixelRatio, pixelRatio)
	ctx.drawImage(img, 0, 0, w, h)

	return canvas.toDataURL('image/png')
}

// --- Icon loading ---

async function loadCircularIcon(url: string): Promise<string | null> {
	const slugMatch = url.match(/\/protocols\/([^?]+)/)
	const slug = slugMatch?.[1]
	if (!slug) return null

	try {
		const response = await fetch(`/api/protocol-icon?slug=${encodeURIComponent(slug)}`)
		if (!response.ok) return null

		const blob = await response.blob()
		const base64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result)
					return
				}
				reject(new Error('Failed to convert icon to base64'))
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		const img = new Image()
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve()
			img.onerror = reject
			img.src = base64
		})

		const canvas = document.createElement('canvas')
		canvas.width = img.width
		canvas.height = img.height
		const ctx = canvas.getContext('2d')
		if (!ctx) return base64

		ctx.beginPath()
		ctx.arc(img.width / 2, img.height / 2, Math.min(img.width, img.height) / 2, 0, 2 * Math.PI)
		ctx.closePath()
		ctx.clip()
		ctx.drawImage(img, 0, 0)
		return canvas.toDataURL()
	} catch {
		return null
	}
}

// --- Axis scaling for export ---

function scaleXAxisForExport(xAxis: any[]): any[] {
	return xAxis.map((axis) => {
		const scaled: any = {
			...axis,
			nameTextStyle: { ...(axis.nameTextStyle ?? {}), fontSize: EXPORT_FONT_SIZE },
			axisLabel: { ...(axis.axisLabel ?? {}), fontSize: EXPORT_FONT_SIZE, inside: false, hideOverlap: true }
		}
		if (axis.name) {
			scaled.nameGap = Math.max(axis.nameGap ?? 15, 36)
		}
		return scaled
	})
}

function scaleYAxisForExport(yAxis: any[], isHorizontalBarChart: boolean): any[] {
	return yAxis.map((axis) => {
		const scaled: any = {
			...axis,
			nameTextStyle: { ...(axis.nameTextStyle ?? {}), fontSize: EXPORT_FONT_SIZE },
			axisLabel: { ...(axis.axisLabel ?? {}), fontSize: EXPORT_FONT_SIZE, inside: false, hideOverlap: true },
			axisLine: {
				...(axis.axisLine ?? {}),
				lineStyle: { ...(axis.axisLine?.lineStyle ?? {}), width: 2 }
			}
		}
		if (axis.offset) {
			scaled.offset = axis.offset * 2
		}
		if (axis.name) {
			scaled.nameGap = Math.max(axis.nameGap ?? 15, 36)
		}
		if (isHorizontalBarChart && axis.type === 'category') {
			scaled.boundaryGap = ['4%', '4%']
		}
		return scaled
	})
}

// --- Graphic (watermark) scaling for export ---

function scaleGraphicForExport(graphic: any[]): any[] {
	return graphic.map((g) => {
		if (!g.elements) return g
		return {
			...g,
			elements: g.elements.map((element: any) => {
				if (!element.style?.image?.startsWith('/assets/defillama-')) return element
				const targetHeight = 80
				const imageWidth = Math.round((389 / 133) * targetHeight)
				return {
					...element,
					style: { ...element.style, height: targetHeight, width: imageWidth },
					top: '320px',
					left: `${(IMAGE_EXPORT_WIDTH - imageWidth) / 2}px`
				}
			})
		}
	})
}

// --- Legend item collection ---

function collectLegendItems(options: Record<string, any>, isPieChart: boolean): string[] {
	const legendConfig = options.legend
	const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []

	if (legendArray.length > 0 && Array.isArray(legendArray[0]?.data)) {
		return legendArray[0].data.filter((x: any) => typeof x === 'string')
	}
	if (isPieChart && Array.isArray(options.series)) {
		return options.series
			.filter((s: any) => s.type === 'pie')
			.flatMap((s: any) => (Array.isArray(s.data) ? s.data.flatMap((d: any) => (d?.name ? [d.name] : [])) : []))
	}
	if (Array.isArray(options.series)) {
		return options.series.flatMap((s: any) => (s.name ? [s.name] : []))
	}
	return []
}

function isLegendVisibleForExport(flags: SeriesFlags, options: Record<string, any>): boolean {
	if (flags.isSankeyChart || flags.isTreemapChart) return false
	if (flags.isPieChart) {
		const legendConfig = options.legend
		const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []
		return legendArray.length > 0 ? legendArray.some((l: any) => l?.show !== false) : false
	}
	return true
}

// --- Export layout computation ---

interface ExportLayout {
	gridTop: number
	legendTop: number
	canShareRow: boolean
	hasLegend: boolean
	legendRows: number
	totalLegendWidth: number
}

function computeExportLayout(opts: {
	title: string | undefined
	legendItems: string[]
	shouldShowLegend: boolean
	hasIcon: boolean
	expandLegend: boolean | undefined
}): ExportLayout {
	const { title, legendItems, shouldShowLegend, hasIcon, expandLegend } = opts

	const totalLegendWidth = legendItems.reduce(
		(total, name) => total + approximateTextWidth(name, EXPORT_FONT_SIZE) + LEGEND_ITEM_WIDTH + LEGEND_ITEM_GAP,
		0
	)

	const hasLegend = shouldShowLegend && legendItems.length > 1
	const availableWidth = IMAGE_EXPORT_WIDTH - 32
	let legendRows = 1
	if (expandLegend) {
		legendRows = Math.max(1, Math.ceil(totalLegendWidth / availableWidth))
	}

	const titleHeight = title ? 36 : 0
	const singleRowHeight = 32
	const legendHeight = hasLegend ? singleRowHeight * legendRows : 0
	const verticalGap = 16
	const titleWidth = title ? approximateTextWidth(title, 28) + (hasIcon ? 40 : 0) : 0
	const horizontalGap = 24
	const canShareRow =
		!!title &&
		hasLegend &&
		legendRows === 1 &&
		totalLegendWidth > 0 &&
		titleWidth + horizontalGap + totalLegendWidth <= availableWidth

	const legendTop =
		BASE_TOP_PADDING +
		(canShareRow ? Math.max(0, (titleHeight - singleRowHeight) / 2) : title ? titleHeight + verticalGap : 0)
	const gridTop =
		BASE_TOP_PADDING +
		(canShareRow
			? Math.max(titleHeight, legendHeight) + verticalGap
			: (title ? titleHeight + verticalGap : 0) +
				(hasLegend ? legendHeight + verticalGap + (expandLegend ? 16 : 0) : 0))

	return { gridTop, legendTop, canShareRow, hasLegend, legendRows, totalLegendWidth }
}

// --- Series adjustments for export ---

function adjustSeriesForExport(opts: {
	series: any[]
	flags: SeriesFlags
	layout: ExportLayout
	isDark: boolean
	title: string | undefined
	expandLegend: boolean | undefined
}): any[] {
	const { flags, layout, isDark, title, expandLegend } = opts
	let series = [...opts.series]

	// Scatter: strip image:// symbols and scale labels for export
	series = series.map((s) => {
		if (s?.type !== 'scatter') return s
		const next = { ...s }
		if (Array.isArray(s.data)) {
			next.data = s.data.map((point: any) => {
				if (point && typeof point === 'object' && !Array.isArray(point)) {
					const p = { ...point }
					if (typeof p.symbol === 'string' && p.symbol.startsWith('image://')) {
						delete p.symbol
						p.symbolSize = typeof p.symbolSize === 'number' ? Math.min(p.symbolSize, 12) : 10
					}
					return p
				}
				return point
			})
		}
		if (typeof next.symbol === 'string' && next.symbol.startsWith('image://')) {
			delete next.symbol
			next.symbolSize = typeof next.symbolSize === 'number' ? Math.min(next.symbolSize, 12) : 10
		}
		if (next.label) {
			const labelFontSize = typeof next.label.fontSize === 'number' ? next.label.fontSize : 10
			next.label = { ...next.label, fontSize: Math.round(labelFontSize * 2) }
		}
		return next
	})

	// MarkLine: scale labels and line widths for the larger export canvas
	series = series.map((s) => {
		if (!s?.markLine) return s
		const next = { ...s }
		const ml = { ...s.markLine }
		if (ml.label) {
			ml.label = { ...ml.label, fontSize: EXPORT_FONT_SIZE }
		}
		if (ml.lineStyle) {
			ml.lineStyle = { ...ml.lineStyle, width: Math.max(2, Number(ml.lineStyle.width ?? 1) * 2) }
		}
		if (Array.isArray(ml.data)) {
			ml.data = ml.data.map((segment: any) => {
				if (!Array.isArray(segment)) return segment
				return segment.map((point: any) => {
					if (!point || typeof point !== 'object') return point
					const p = { ...point }
					if (p.label) {
						p.label = { ...p.label, fontSize: EXPORT_FONT_SIZE }
					}
					if (p.emphasis?.label) {
						p.emphasis = { ...p.emphasis, label: { ...p.emphasis.label, fontSize: EXPORT_FONT_SIZE } }
					}
					if (typeof p.y === 'number') {
						p.y = Math.max(p.y * 2, layout.gridTop + 8)
					}
					return p
				})
			})
		}
		next.markLine = ml
		return next
	})

	// Sankey: scale labels and increase spacing for readability
	if (flags.isSankeyChart) {
		series = series.map((s) => {
			if (s.type !== 'sankey') return s
			return {
				...s,
				top: title ? 60 : 30,
				label: {
					...(s.label ?? {}),
					fontSize: 18,
					rich: {
						name: {
							fontSize: 18,
							fontWeight: 'normal',
							color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
						},
						desc: {
							fontSize: 12,
							color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
						}
					}
				},
				nodeGap: 28,
				nodeWidth: 20
			}
		})
	}

	// HBar: scale bar widths to fill the fixed 720px canvas
	if (flags.isHorizontalBarChart) {
		const categoryCount = Array.isArray(flags.yAxisConfig?.data) ? flags.yAxisConfig.data.length : 0
		const bottomPadding = expandLegend ? 32 : 16
		const plotHeight = Math.max(1, IMAGE_EXPORT_HEIGHT - layout.gridTop - bottomPadding)
		const bandHeight = categoryCount > 0 ? plotHeight / categoryCount : plotHeight
		const barStacks = new Set(series.filter((s: any) => s?.type === 'bar').map((s: any) => s.stack ?? s.name ?? ''))
		const barSeriesCount = Math.max(1, barStacks.size)
		const barWidth = Math.max(8, Math.min(80, Math.floor((bandHeight * 0.65) / barSeriesCount)))
		series = series.map((s) => (s?.type === 'bar' ? { ...s, barWidth } : s))
	}

	// Pie: recenter for the fixed export canvas and hide labels when legend is shown
	if (flags.isPieChart && layout.hasLegend) {
		series = series.map((s) => {
			if (s?.type !== 'pie') return s
			const existingLabelLayout = s.labelLayout
			const nextLabelLayout =
				typeof existingLabelLayout === 'function'
					? existingLabelLayout
					: { ...(existingLabelLayout ?? {}), hideOverlap: true }
			const left = parsePixelValue(s.left) ?? 0
			const right = parsePixelValue(s.right) ?? 0
			const drawableWidth = Math.max(1, IMAGE_EXPORT_WIDTH - left - right)
			const nextCenterX = Math.round(left + drawableWidth / 2)
			const nextCenterY = Array.isArray(s.center) && s.center.length > 1 ? s.center[1] : '50%'
			return {
				...s,
				center: [nextCenterX, nextCenterY],
				avoidLabelOverlap: true,
				labelLayout: nextLabelLayout,
				label: { ...(s.label ?? {}), show: false },
				labelLine: { ...(s.labelLine ?? {}), show: false }
			}
		})
	}

	// Treemap: push chart body below title area
	if (flags.isTreemapChart) {
		series = series.map((s) => {
			if (s?.type !== 'treemap') return s
			return {
				...s,
				top: layout.gridTop,
				left: 16,
				right: 16,
				bottom: 16,
				breadcrumb: { ...(s?.breadcrumb ?? {}), show: false }
			}
		})
	}

	return series
}

// --- Export title construction ---

function buildExportTitle(opts: {
	title: string | undefined
	iconBase64: string | null
	isDark: boolean
}): Record<string, any> {
	const { title, iconBase64, isDark } = opts
	return {
		text: iconBase64 ? `{icon|} ${title}` : title,
		textStyle: {
			fontSize: 28,
			fontWeight: 600,
			color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
			rich: iconBase64
				? {
						icon: {
							height: 32,
							width: 32,
							verticalAlign: 'middle',
							backgroundColor: { image: iconBase64 }
						}
					}
				: undefined
		},
		left: 14,
		top: BASE_TOP_PADDING
	}
}

// --- Chart render wait ---

function waitForChartRender(chart: echarts.ECharts, timeoutMs = 1500): Promise<void> {
	return new Promise<void>((resolve) => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null
		const handler = () => {
			if (timeoutId) clearTimeout(timeoutId)
			chart.off('rendered', handler)
			resolve()
		}
		timeoutId = setTimeout(() => {
			chart.off('rendered', handler)
			resolve()
		}, timeoutMs)
		chart.on('rendered', handler)
	})
}

// --- Treemap direct export (preserves zoom/drill-down state) ---

async function exportTreemapWithZoom(
	chart: echarts.ECharts,
	title: string | undefined,
	isDark: boolean
): Promise<string | null> {
	try {
		const chartDataURL = await getChartPngDataURL(chart, {
			pixelRatio: 4,
			backgroundColor: isDark ? '#0b1214' : '#ffffff',
			excludeComponents: ['toolbox']
		})

		const chartImg = new Image()
		await new Promise<void>((resolve, reject) => {
			chartImg.onload = () => resolve()
			chartImg.onerror = reject
			chartImg.src = chartDataURL
		})

		const imageAspect = chartImg.width / Math.max(1, chartImg.height)
		const isPortraitCapture = imageAspect < 1
		const exportWidth = isPortraitCapture ? TREEMAP_EXPORT_PORTRAIT_WIDTH : IMAGE_EXPORT_WIDTH

		const titleText = title || ''
		let chartTop = 12
		const titleHeight = titleText ? 40 : 0
		if (titleText) {
			chartTop = 52
		}

		const chartAreaW = exportWidth - 24
		const naturalChartAreaH = Math.round(chartAreaW / Math.max(imageAspect, 0.0001))
		const exportHeight = Math.max(
			isPortraitCapture ? TREEMAP_EXPORT_PORTRAIT_HEIGHT : 0,
			titleHeight + naturalChartAreaH + 24
		)
		const dpr = 2
		const canvas = document.createElement('canvas')
		canvas.width = exportWidth * dpr
		canvas.height = exportHeight * dpr
		const ctx = canvas.getContext('2d')
		if (!ctx) return null

		ctx.scale(dpr, dpr)

		ctx.fillStyle = isDark ? '#0b1214' : '#ffffff'
		ctx.fillRect(0, 0, exportWidth, exportHeight)

		if (titleText) {
			ctx.font = '600 28px sans-serif'
			ctx.fillStyle = isDark ? '#ffffff' : '#000000'
			ctx.fillText(titleText, 14, 36)
		}

		const chartAreaH = exportHeight - chartTop - 12
		const imgAspect = chartImg.width / chartImg.height
		let drawW = chartAreaW
		let drawH = drawW / imgAspect
		if (drawH > chartAreaH) {
			drawH = chartAreaH
			drawW = drawH * imgAspect
		}
		const drawX = 12 + (chartAreaW - drawW) / 2
		ctx.drawImage(chartImg, drawX, chartTop, drawW, drawH)

		return canvas.toDataURL('image/png')
	} catch (error) {
		console.log('Treemap direct export failed:', error)
		return null
	}
}

// --- Clone export orchestrator ---

async function renderClonedChartExport(
	tempContainer: HTMLDivElement,
	originalChart: echarts.ECharts,
	isDark: boolean,
	title: string | undefined,
	iconUrl: string | undefined,
	expandLegend: boolean | undefined
): Promise<string> {
	const { echarts: echartsCore } = await import('./chartExportEcharts')
	const currentOptions = originalChart.getOption()

	const tempChart = echartsCore.init(tempContainer, null, {
		width: IMAGE_EXPORT_WIDTH,
		height: IMAGE_EXPORT_HEIGHT,
		renderer: 'canvas'
	})

	try {
		const iconBase64 = iconUrl ? await loadCircularIcon(iconUrl) : null
		const flags = detectSeriesFlags(currentOptions)

		// Treemap labels rely on local rich-text sizing; a global boost makes them too large.
		if (!flags.isTreemapChart) {
			currentOptions.textStyle = { ...(currentOptions.textStyle ?? {}), fontSize: EXPORT_FONT_SIZE }
		}

		if (currentOptions.xAxis) {
			currentOptions.xAxis = scaleXAxisForExport(currentOptions.xAxis as any[])
		}
		if (currentOptions.yAxis) {
			currentOptions.yAxis = scaleYAxisForExport(currentOptions.yAxis as any[], flags.isHorizontalBarChart)
		}
		if (currentOptions.graphic) {
			currentOptions.graphic = scaleGraphicForExport(currentOptions.graphic as any[])
		}

		const legendItems = collectLegendItems(currentOptions, flags.isPieChart)
		const showLegend = isLegendVisibleForExport(flags, currentOptions)
		const layout = computeExportLayout({
			title,
			legendItems,
			shouldShowLegend: showLegend,
			hasIcon: !!iconBase64,
			expandLegend
		})

		currentOptions.series = adjustSeriesForExport({
			series: (currentOptions.series as any[]) ?? [],
			flags,
			layout,
			isDark,
			title,
			expandLegend
		})

		currentOptions.title = buildExportTitle({ title, iconBase64, isDark })
		currentOptions.animation = false

		if (!flags.isSankeyChart) {
			const hasYAxisName = Array.isArray(currentOptions.yAxis) && currentOptions.yAxis.some((a: any) => !!a?.name)
			const hasXAxisName = Array.isArray(currentOptions.xAxis) && currentOptions.xAxis.some((a: any) => !!a?.name)
			const scatterLeftPad = flags.isScatterChart && hasYAxisName ? 48 : 16
			const scatterBottomPad = flags.isScatterChart && hasXAxisName ? 48 : expandLegend ? 32 : 16
			currentOptions.grid = {
				left: scatterLeftPad,
				bottom: scatterBottomPad,
				top: layout.gridTop,
				right: 16,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			}
		}

		tempChart.setOption(currentOptions)

		if (layout.hasLegend) {
			tempChart.setOption({
				legend: {
					show: true,
					textStyle: {
						fontSize: EXPORT_FONT_SIZE,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					itemHeight: 24,
					itemWidth: 48,
					itemGap: LEGEND_ITEM_GAP,
					top: layout.legendTop,
					right: 16,
					...(expandLegend
						? { type: 'plain', padding: [0, 0, 0, 0], ...(layout.canShareRow ? {} : { left: 16 }) }
						: { type: 'scroll', padding: [0, 0, 0, 18] }),
					pageButtonPosition: 'end'
				}
			})
		}

		await waitForChartRender(tempChart)

		return await getChartPngDataURL(tempChart, {
			pixelRatio: 2,
			backgroundColor: isDark ? '#0b1214' : '#ffffff',
			excludeComponents: ['toolbox', 'dataZoom']
		})
	} finally {
		tempChart.dispose()
	}
}

// --- Component ---

const DEFAULT_CLASSNAME =
	'flex items-center justify-center gap-1 rounded-md border border-blue-500 px-2 py-1.5 text-xs text-blue-500 hover:bg-(--link-hover-bg) hover:text-black dark:hover:text-white focus-visible:bg-(--link-hover-bg) focus-visible:text-white disabled:text-(--text-disabled)'

interface ChartPngExportButtonProps {
	chartInstance: () => echarts.ECharts | null
	className?: string
	smol?: boolean
	title?: string
	filename?: string
	iconUrl?: string
	expandLegend?: boolean
	pngProfile?: PngExportProfile
}

export function ChartPngExportButton({
	chartInstance,
	className = DEFAULT_CLASSNAME,
	smol = true,
	title,
	filename,
	iconUrl,
	expandLegend,
	pngProfile = 'default'
}: ChartPngExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()

	const [isDark] = useDarkModeManager()

	const handleImageExport = async () => {
		if (isLoading) return

		let safeFilename = filename
		if (!safeFilename) {
			safeFilename = 'chart'
		}
		if (safeFilename.toLowerCase().endsWith('.png')) {
			safeFilename = safeFilename.slice(0, -4)
		}

		const doExport = async () => {
			const _chartInstance = chartInstance()

			if (!_chartInstance) {
				toast.error('Failed to get chart instance')
				return
			}
			setIsLoading(true)

			const isTreemapExport = pngProfile === 'treemap' || hasSeriesType(_chartInstance.getOption(), 'treemap')

			let dataURL: string | null

			if (isTreemapExport) {
				dataURL = await exportTreemapWithZoom(_chartInstance, title, isDark)
			} else {
				const tempContainer = document.createElement('div')
				tempContainer.style.width = `${IMAGE_EXPORT_WIDTH}px`
				tempContainer.style.height = `${IMAGE_EXPORT_HEIGHT}px`
				tempContainer.style.position = 'absolute'
				tempContainer.style.left = '-99999px'
				tempContainer.style.top = '0'
				document.body.appendChild(tempContainer)

				try {
					dataURL = await renderClonedChartExport(tempContainer, _chartInstance, isDark, title, iconUrl, expandLegend)
					document.body.removeChild(tempContainer)
				} catch (error) {
					console.log('Error exporting chart image:', error)
					toast.error('Failed to export chart image')
					dataURL = null
					document.body.removeChild(tempContainer)
				}
			}

			if (!dataURL) {
				setIsLoading(false)
				return
			}
			const imageFilename = `${safeFilename}_${new Date().toISOString().split('T')[0]}.png`
			downloadDataURL(imageFilename, dataURL)
			setIsLoading(false)
		}
		try {
			await doExport()
		} catch (error) {
			console.log('Error exporting chart image:', error)
			toast.error('Failed to export chart image')
			setIsLoading(false)
		}
	}

	return (
		<>
			<button
				data-umami-event="export-image"
				data-umami-event-page={router.pathname}
				className={className}
				onClick={() => {
					void handleImageExport()
				}}
				data-loading={isLoading}
				disabled={isLoading}
				title="Download chart as image"
			>
				{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
				<span>{smol ? '.png' : 'Image'}</span>
			</button>
		</>
	)
}
