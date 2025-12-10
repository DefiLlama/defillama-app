import { memo, Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { LegendComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SubscribeProModal } from '~/components/SubscribeCards/SubscribeProCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks/useIsClient'
import { downloadDataURL } from '~/utils'

const IMAGE_EXPORT_WIDTH = 1280
const approximateTextWidth = (text: string, fontSize: number) => {
	if (!text) return 0
	const averageCharWidthRatio = 0.6
	return text.length * fontSize * averageCharWidthRatio
}

interface ChartExportButtonProps {
	chartInstance: echarts.ECharts | null
	className?: string
	smol?: boolean
	title?: string
	filename?: string
	iconUrl?: string
	expandLegend?: boolean
}

echarts.use([LegendComponent])

export const ChartExportButton = memo(function ChartExportButton({
	chartInstance,
	className,
	smol,
	title,
	filename,
	iconUrl,
	expandLegend
}: ChartExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { isAuthenticated, loaders, hasActiveSubscription } = useAuthContext()
	const subscribeModalStore = Ariakit.useDialogStore()
	const router = useRouter()
	const isClient = useIsClient()

	const [isDark] = useDarkModeManager()

	const loading = loaders.userLoading || isLoading

	const handleImageExport = async () => {
		if (loading || !chartInstance) return

		if (!loaders.userLoading && isAuthenticated && hasActiveSubscription) {
			try {
				setIsLoading(true)

				// Create a temporary container for the cloned chart
				const tempContainer = document.createElement('div')
				tempContainer.style.width = `${IMAGE_EXPORT_WIDTH}px`
				tempContainer.style.height = '720px'
				tempContainer.style.position = 'absolute'
				tempContainer.style.left = '-99999px'
				tempContainer.style.top = '0'
				document.body.appendChild(tempContainer)

				let dataURL: string
				try {
					// Create a new chart instance on the temporary container
					const tempChart = echarts.init(tempContainer, null, {
						width: IMAGE_EXPORT_WIDTH,
						height: 720
					})

					// Get the current options from the original chart
					const currentOptions = chartInstance.getOption()

					let iconBase64: string | null = null
					if (iconUrl) {
						try {
							const proxyUrl = `/api/protocol-icon?url=${encodeURIComponent(iconUrl)}`
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

					currentOptions.textStyle = { ...(currentOptions.textStyle ?? {}), fontSize: 24 }

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
								graphic.elements = graphic.elements.map((element) => {
									if (element.style?.image?.startsWith('/icons/defillama-')) {
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

					// Legend layout calculations
					const legendConfig = currentOptions.legend as any
					const legendArray = Array.isArray(legendConfig) ? legendConfig : legendConfig ? [legendConfig] : []

					const legendItemGap = 20
					const legendFontSize = 24
					const legendItemWidth = 48
					const seriesNames: string[] = Array.isArray(currentOptions.series)
						? currentOptions.series.map((s: any) => s.name || '').filter(Boolean)
						: []
					const totalLegendWidth = seriesNames.reduce(
						(total, name) => total + approximateTextWidth(name, legendFontSize) + legendItemWidth + legendItemGap,
						0
					)

					// If there is no legend on the original chart, we'll still be adding one
					// below (scroll legend), so treat "has legend" based on either existing
					// legend config or presence of series.
					const hasLegend =
						legendArray.length > 0 ||
						(Array.isArray(currentOptions.series) ? currentOptions.series.length > 0 : !!currentOptions.series)

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
					currentOptions.grid = {
						left: 16,
						bottom: expandLegend ? 32 : 16,
						top: gridTop,
						right: 16,
						outerBoundsMode: 'same',
						outerBoundsContain: 'axisLabel'
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
						left: 14
					}

					// Set options on the temporary chart with any modifications you want
					tempChart.setOption(currentOptions)

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
					dataURL = tempChart.getDataURL({
						type: 'png',
						pixelRatio: 2,
						backgroundColor: isDark ? '#0b1214' : '#ffffff',
						excludeComponents: ['toolbox', 'dataZoom']
					})

					// Clean up the temporary chart
					tempChart.dispose()
				} catch (error) {
					console.log('Error exporting chart image:', error)
					toast.error('Failed to export chart image')
					dataURL = null
				} finally {
					// Remove the temporary container
					document.body.removeChild(tempContainer)
				}

				if (!dataURL) return
				const imageFilename = `${filename || 'chart'}_${new Date().toISOString().split('T')[0]}.png`
				downloadDataURL(imageFilename, dataURL)
			} catch (error) {
				console.log('Error exporting chart image:', error)
				toast.error('Failed to export chart image')
			} finally {
				setIsLoading(false)
			}
		} else if (!loading) {
			subscribeModalStore.show()
		}
	}

	return (
		<>
			<button
				data-umami-event="image-export"
				data-umami-event-page={router.pathname}
				className={
					className ??
					'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
				}
				onClick={handleImageExport}
				data-loading={isClient ? loading : true}
				disabled={isClient ? loading || !chartInstance : true}
				title="Download chart as image"
			>
				{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
				<span>{smol ? '.png' : 'Image'}</span>
			</button>
			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</>
	)
})
