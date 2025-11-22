import { Suspense, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import * as echarts from 'echarts/core'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SubscribeProModal } from '~/components/SubscribeCards/SubscribeProCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { downloadDataURL } from '~/utils'

interface ImageExportButton2Props {
	chartInstance: echarts.ECharts | null
	className?: string
	smol?: boolean
	title?: string
	filename?: string
}

export const ImageExportButton2 = ({ chartInstance, className, smol, title, filename }: ImageExportButton2Props) => {
	const [isLoading, setIsLoading] = useState(false)
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()
	const subscribeModalStore = Ariakit.useDialogStore()
	const router = useRouter()
	const isClient = useIsClient()

	const [isDark] = useDarkModeManager()

	const loading = loaders.userLoading || isSubscriptionLoading || isLoading

	const handleImageExport = async () => {
		if (loading || !chartInstance) return

		if (!loaders.userLoading && subscription?.status === 'active') {
			try {
				setIsLoading(true)

				// Create a temporary container for the cloned chart
				const tempContainer = document.createElement('div')
				tempContainer.style.width = '1280px'
				tempContainer.style.height = '720px'
				tempContainer.style.position = 'absolute'
				tempContainer.style.left = '-99999px'
				tempContainer.style.top = '0'
				document.body.appendChild(tempContainer)

				let dataURL: string
				try {
					// Create a new chart instance on the temporary container
					const tempChart = echarts.init(tempContainer, null, {
						width: 1280,
						height: 720
					})

					// Get the current options from the original chart
					const currentOptions = chartInstance.getOption()

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
										element.left = `${(1280 - imageWidth) / 2}px`
									}

									return element
								})
							}
							return graphic
						})
					}

					currentOptions.animation = false
					currentOptions.grid = {
						left: 16,
						bottom: 16,
						top: 16 + (title ? 32 + 16 : 0),
						right: 16,
						outerBoundsMode: 'same',
						outerBoundsContain: 'axisLabel'
					}

					currentOptions.title = {
						text: title,
						textStyle: {
							fontSize: 28,
							fontWeight: 600,
							color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
						},
						left: 14
					}

					// Set options on the temporary chart with any modifications you want
					tempChart.setOption(currentOptions)

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
					console.error('Error exporting chart image:', error)
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
				console.error('Error exporting chart image:', error)
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
				data-umami-event="image-export-new"
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
}
