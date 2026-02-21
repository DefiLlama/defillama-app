import { LegendComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { downloadDataURL } from '~/utils/download'
const IMAGE_EXPORT_WIDTH = 1280
const IMAGE_EXPORT_HEIGHT = 720
const TREEMAP_EXPORT_PORTRAIT_WIDTH = 720
const TREEMAP_EXPORT_PORTRAIT_HEIGHT = 1280
const approximateTextWidth = (text: string, fontSize: number) => {
	if (!text) return 0
	const averageCharWidthRatio = 0.6
	return text.length * fontSize * averageCharWidthRatio
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

/**
 * Export a treemap chart by capturing directly from the original ECharts instance.
 * This preserves the current zoom/drill-down state which getOption() loses.
 * The captured chart is composited onto a canvas with a title overlay.
 */
async function exportTreemapWithZoom(
	chart: echarts.ECharts,
	title: string | undefined,
	isDark: boolean
): Promise<string | null> {
	try {
		// Capture exactly what the user sees, including any zoom state.
		// Use a high pixel ratio for sharp output regardless of viewport size.
		const chartDataURL = chart.getDataURL({
			type: 'png',
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
		const exportHeight = isPortraitCapture ? TREEMAP_EXPORT_PORTRAIT_HEIGHT : IMAGE_EXPORT_HEIGHT
		const dpr = 2
		const canvas = document.createElement('canvas')
		canvas.width = exportWidth * dpr
		canvas.height = exportHeight * dpr
		const ctx = canvas.getContext('2d')
		if (!ctx) return null

		ctx.scale(dpr, dpr)

		// Background
		ctx.fillStyle = isDark ? '#0b1214' : '#ffffff'
		ctx.fillRect(0, 0, exportWidth, exportHeight)

		// Title
		const titleText = title || ''
		let chartTop = 12
		if (titleText) {
			ctx.font = '600 28px sans-serif'
			ctx.fillStyle = isDark ? '#ffffff' : '#000000'
			ctx.fillText(titleText, 14, 36)
			chartTop = 52
		}

		// Draw the captured chart image, scaled to fit the export canvas.
		const chartAreaW = exportWidth - 24
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

async function renderClonedChartExport(
	tempContainer: HTMLDivElement,
	originalChart: echarts.ECharts,
	isDark: boolean,
	title: string | undefined,
	iconUrl: string | undefined,
	expandLegend: boolean | undefined
): Promise<string> {
	// Create a new chart instance on the temporary container
	const tempChart = echarts.init(tempContainer, null, {
		width: IMAGE_EXPORT_WIDTH,
		height: IMAGE_EXPORT_HEIGHT
	})

	try {
		// Get the current options from the original chart
		const currentOptions = originalChart.getOption()

		let iconBase64: string | null = null
		if (iconUrl) {
			try {
				const slugMatch = iconUrl.match(/\/protocols\/([^?]+)/)
				const slug = slugMatch?.[1]
				if (!slug) throw new Error('Could not extract slug from icon URL')
				const proxyUrl = `/api/protocol-icon?slug=${encodeURIComponent(slug)}`
				const response = await fetch(proxyUrl)
				if (!response.ok) throw new Error('Network response was not ok')
				const blob = await response.blob()
				const base64 = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader()
					reader.onloadend = () => resolve(reader.result as string)
					reader.onerror = reject
					reader.readAsDataURL(blob)
				})

				try {
					const img = new Image()
					await new Promise((resolve, reject) => {
						img.onload = resolve
						img.onerror = reject
						img.src = base64
					})

					const canvas = document.createElement('canvas')
					canvas.width = img.width
					canvas.height = img.height
					const ctx = canvas.getContext('2d')
					if (ctx) {
						ctx.beginPath()
						ctx.arc(img.width / 2, img.height / 2, Math.min(img.width, img.height) / 2, 0, 2 * Math.PI)
						ctx.closePath()
						ctx.clip()
						ctx.drawImage(img, 0, 0)
						iconBase64 = canvas.toDataURL()
					} else {
						iconBase64 = base64
					}
				} catch (e) {
					console.log('Error processing icon image', e)
					iconBase64 = base64
				}
			} catch (e) {
				console.log('Failed to load icon for export', e)
			}
		}

		const isSankeyChart =
			Array.isArray(currentOptions.series) &&
			currentOptions.series.some(
				(series) => typeof series === 'object' && series != null && 'type' in series && series.type === 'sankey'
			)
		const isPieChart =
			Array.isArray(currentOptions.series) &&
			currentOptions.series.some(
				(series) => typeof series === 'object' && series != null && 'type' in series && series.type === 'pie'
			)
		const isTreemapChart =
			Array.isArray(currentOptions.series) &&
			currentOptions.series.some(
				(series) => typeof series === 'object' && series != null && 'type' in series && series.type === 'treemap'
			)

		// Treemap labels rely on local rich-text sizing. A global textStyle boost makes
		// inline label text (e.g. "DeFi Active TVL") too large vs the value text.
		if (!isTreemapChart) {
			currentOptions.textStyle = { ...(currentOptions.textStyle ?? {}), fontSize: 24 }
		}

		if (currentOptions.xAxis) {
			// @ts-expect-error - all options are in array format
			currentOptions.xAxis = currentOptions.xAxis.map((xAxis) => {
				xAxis.nameTextStyle = { ...(xAxis.nameTextStyle ?? {}), fontSize: 24 }
				xAxis.axisLabel = { ...(xAxis.axisLabel ?? {}), fontSize: 24 }
				return xAxis
			})
		}

		if (currentOptions.yAxis) {
			// @ts-expect-error - all options are in array format
			currentOptions.yAxis = currentOptions.yAxis.map((yAxis) => {
				yAxis.nameTextStyle = { ...(yAxis.nameTextStyle ?? {}), fontSize: 24 }
				yAxis.axisLabel = { ...(yAxis.axisLabel ?? {}), fontSize: 24 }
				if (yAxis.offset) {
					yAxis.offset = yAxis.offset * 2
				}
				yAxis.axisLine = {
					...(yAxis.axisLine ?? {}),
					lineStyle: {
						...(yAxis.axisLine?.lineStyle ?? {}),
						width: 2
					}
				}
				return yAxis
			})
		}

		if (currentOptions.graphic) {
			// @ts-expect-error - all options are in array format
			currentOptions.graphic = currentOptions.graphic.map((graphic) => {
				if (graphic.elements) {
					graphic.elements = graphic.elements.map((element: any) => {
						if (element.style?.image?.startsWith('/assets/defillama-')) {
							const originalWidth = 389
							const originalHeight = 133
							const targetHeight = 80
							const imageWidth = Math.round((originalWidth / originalHeight) * targetHeight)
							element.style.height = targetHeight
							element.style.width = imageWidth
							element.top = '320px'
							element.left = `${(IMAGE_EXPORT_WIDTH - imageWidth) / 2}px`
						}

						return element
					})
				}
				return graphic
			})
		}

		// Handle Sankey chart series - scale up labels for export
		if (isSankeyChart && Array.isArray(currentOptions.series)) {
			currentOptions.series = currentOptions.series.map((series: any) => {
				if (series.type === 'sankey') {
					return {
						...series,
						top: title ? 60 : 30, // Add top padding to avoid collision with title
						label: {
							...(series.label ?? {}),
							fontSize: 18, // Slightly larger than default for export readability
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
						nodeGap: 28, // Slightly increase node gap for better spacing
						nodeWidth: 20 // Slightly increase node width for better visibility
					}
				}
				return series
			})
		}

		// Legend layout calculations
		const legendConfig = currentOptions.legend as any
		const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []

		const legendItemGap = 20
		const legendFontSize = 24
		const legendItemWidth = 48
		const originalLegendShow = legendArray.length > 0 ? legendArray.some((l: any) => l?.show !== false) : false
		const shouldShowLegendForExport = !isSankeyChart && !isTreemapChart && (!isPieChart || originalLegendShow)

		// Legend sizing needs legend item names, not series names (pie legend uses data item names).
		const legendItems: string[] =
			legendArray.length > 0 && Array.isArray(legendArray[0]?.data)
				? legendArray[0].data.filter((x: any) => typeof x === 'string')
				: isPieChart && Array.isArray(currentOptions.series)
					? currentOptions.series
							.filter((s: any) => s.type === 'pie')
							.flatMap((s: any) => (Array.isArray(s.data) ? s.data.flatMap((d: any) => (d?.name ? [d.name] : [])) : []))
					: Array.isArray(currentOptions.series)
						? currentOptions.series.flatMap((s: any) => (s.name ? [s.name] : []))
						: []

		const totalLegendWidth = legendItems.reduce(
			(total, name) => total + approximateTextWidth(name, legendFontSize) + legendItemWidth + legendItemGap,
			0
		)

		// If there is no legend on the original chart, we'll still be adding one
		// below (scroll legend), so treat "has legend" based on either existing
		// legend config or presence of series.
		const hasLegend = shouldShowLegendForExport

		const availableWidth = IMAGE_EXPORT_WIDTH - 32
		let legendRows = 1

		if (expandLegend) {
			legendRows = Math.max(1, Math.ceil(totalLegendWidth / availableWidth))
		}

		const baseTopPadding = 16
		const titleHeight = title ? 36 : 0
		const singleRowHeight = 32
		const legendHeight = hasLegend ? singleRowHeight * legendRows : 0
		const verticalGap = 16
		const titleWidth = title ? approximateTextWidth(title, 28) + (iconBase64 ? 40 : 0) : 0
		const horizontalGap = 24
		const canShareRow =
			!!title &&
			hasLegend &&
			legendRows === 1 &&
			totalLegendWidth > 0 &&
			titleWidth + horizontalGap + totalLegendWidth <= availableWidth

		let legendTop =
			baseTopPadding +
			(canShareRow ? Math.max(0, (titleHeight - singleRowHeight) / 2) : title ? titleHeight + verticalGap : 0)
		let gridTop =
			baseTopPadding +
			(canShareRow
				? Math.max(titleHeight, legendHeight) + verticalGap
				: (title ? titleHeight + verticalGap : 0) +
					(hasLegend ? legendHeight + verticalGap + (expandLegend ? 16 : 0) : 0))

		currentOptions.animation = false
		// Only set grid for non-Sankey charts (Sankey doesn't use grid layout)
		if (!isSankeyChart) {
			currentOptions.grid = {
				left: 16,
				bottom: expandLegend ? 32 : 16,
				top: gridTop,
				right: 16,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			}
		}

		// Pie charts frequently show labels when legend is hidden. The export code used to
		// force-show a legend, which could cause the exported image to show BOTH labels and
		// legend at once, overlapping. Keep pie legend behavior consistent with the chart:
		// only show a legend if the original chart did, and hide labels when a legend is shown.
		if (isPieChart && shouldShowLegendForExport && Array.isArray(currentOptions.series)) {
			currentOptions.series = currentOptions.series.map((series: any) => {
				if (series?.type !== 'pie') return series

				const existingLabelLayout = series.labelLayout
				const nextLabelLayout =
					typeof existingLabelLayout === 'function'
						? existingLabelLayout
						: { ...(existingLabelLayout ?? {}), hideOverlap: true }

				// Runtime pie charts can set `center` in absolute pixels to fit responsive layouts.
				// Recompute x-center for the fixed export canvas so the pie stays centered in its
				// drawable area and doesn't get clipped on the left.
				const left = parsePixelValue(series.left) ?? 0
				const right = parsePixelValue(series.right) ?? 0
				const availableWidth = Math.max(1, IMAGE_EXPORT_WIDTH - left - right)
				const nextCenterX = Math.round(left + availableWidth / 2)
				const nextCenterY = Array.isArray(series.center) && series.center.length > 1 ? series.center[1] : '50%'

				return {
					...series,
					center: [nextCenterX, nextCenterY],
					avoidLabelOverlap: true,
					labelLayout: nextLabelLayout,
					label: { ...(series.label ?? {}), show: false },
					labelLine: { ...(series.labelLine ?? {}), show: false }
				}
			})
		}

		currentOptions.title = {
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
								backgroundColor: {
									image: iconBase64
								}
							}
						}
					: undefined
			},
			left: 14,
			top: baseTopPadding
		}

		// Treemap export layout:
		// - Keep equal horizontal and bottom padding
		// - Push the chart body down to leave a clear gap under the title
		if (isTreemapChart && Array.isArray(currentOptions.series)) {
			currentOptions.series = currentOptions.series.map((series: any) => {
				if (series?.type !== 'treemap') return series

				return {
					...series,
					top: gridTop,
					left: 16,
					right: 16,
					bottom: 16,
					breadcrumb: { ...(series?.breadcrumb ?? {}), show: false }
				}
			})
		}

		// Set options on the temporary chart with any modifications you want
		tempChart.setOption(currentOptions)

		// Only set legend for non-Sankey charts (Sankey doesn't use legends)
		if (shouldShowLegendForExport) {
			tempChart.setOption({
				legend: {
					show: true,
					textStyle: {
						fontSize: 24,
						color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
					},
					itemHeight: 24,
					itemWidth: 48,
					itemGap: legendItemGap,
					top: legendTop,
					right: 16,
					...(expandLegend
						? { type: 'plain', padding: [0, 0, 0, 0], ...(canShareRow ? {} : { left: 16 }) }
						: { type: 'scroll', padding: [0, 0, 0, 18] }),
					pageButtonPosition: 'end'
				}
			})
		}

		// Wait for the chart (including async image loading) to finish rendering.
		// In some cases (many series, large data) the render event may not fire reliably,
		// so we also add a timeout fallback to avoid hanging forever.
		await new Promise<void>((resolve) => {
			let timeoutId: ReturnType<typeof setTimeout> | null = null

			const handler = () => {
				if (timeoutId) {
					clearTimeout(timeoutId)
				}
				tempChart.off('rendered', handler as any)
				resolve()
			}

			timeoutId = setTimeout(() => {
				tempChart.off('rendered', handler as any)
				resolve()
			}, 1500)

			tempChart.on('rendered', handler as any)
		})

		// Get the data URL from the temporary chart
		const dataURL = tempChart.getDataURL({
			type: 'png',
			pixelRatio: 2,
			backgroundColor: isDark ? '#0b1214' : '#ffffff',
			excludeComponents: ['toolbox', 'dataZoom']
		})

		return dataURL
	} finally {
		tempChart.dispose()
	}
}

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
}

echarts.use([LegendComponent])

export function ChartPngExportButton({
	chartInstance,
	className = DEFAULT_CLASSNAME,
	smol = true,
	title,
	filename,
	iconUrl,
	expandLegend
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

			const earlyOptions = _chartInstance.getOption()
			let isTreemapExport = false
			if (Array.isArray(earlyOptions.series)) {
				isTreemapExport = earlyOptions.series.some(
					(series) => typeof series === 'object' && series != null && 'type' in series && series.type === 'treemap'
				)
			}

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
				data-umami-event="image-export"
				data-umami-event-page={router.pathname}
				className={className}
				onClick={handleImageExport}
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
