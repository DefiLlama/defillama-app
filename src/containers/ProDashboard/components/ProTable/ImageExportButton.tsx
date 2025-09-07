import { memo, useState } from 'react'
import { useRouter } from 'next/router'
import * as echarts from 'echarts/core'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { downloadDataURL } from '~/utils'

interface ImageExportButtonProps {
	chartInstance: echarts.ECharts | null
	filename?: string
	smol?: boolean
	title?: string
}

export const ImageExportButton = memo(function ImageExportButton({
	chartInstance,
	filename = 'chart',
	smol = false,
	title
}: ImageExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders } = useAuthContext()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const isClient = useIsClient()
	const router = useRouter()
	const [isDark] = useDarkModeManager()

	const loading = loaders.userLoading || isSubscriptionLoading || isLoading

	const handleImageExport = async () => {
		if (loading || !chartInstance) return

		if (!loaders.userLoading && subscription?.status === 'active') {
			try {
				setIsLoading(true)

				const tempContainer = document.createElement('div')
				tempContainer.style.width = '1280px'
				tempContainer.style.height = '720px'
				tempContainer.style.position = 'absolute'
				tempContainer.style.left = '-99999px'
				tempContainer.style.top = '0'
				document.body.appendChild(tempContainer)

				let baseURL: string
				try {
					const tempChart = echarts.init(tempContainer, null, {
						width: 1280,
						height: 720
					})

					const currentOptions = chartInstance.getOption()

					tempChart.setOption({
						...currentOptions,
						animation: false,
						animationDuration: 0,
						animationEasing: 'linear',
						animationDelay: 0,
						animationDurationUpdate: 0,
						animationEasingUpdate: 'linear',
						animationDelayUpdate: 0
					})

					baseURL = tempChart.getDataURL({
						type: 'png',
						pixelRatio: 2,
						backgroundColor: isDark ? '#0b1214' : '#ffffff'
					})

					tempChart.dispose()
				} finally {
					document.body.removeChild(tempContainer)
				}

				const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
					const img = new Image()
					img.onload = () => resolve(img)
					img.onerror = reject
					img.src = baseURL
				})

				const scale = 2
				const headerHeight = title ? 36 * scale : 0
				const footerHeight = 36 * scale
				const sidePadding = 16 * scale
				const canvas = document.createElement('canvas')
				canvas.width = baseImg.naturalWidth
				canvas.height = baseImg.naturalHeight + headerHeight + footerHeight
				const ctx = canvas.getContext('2d')!

				const bgColor = isDark ? '#0b1214' : '#ffffff'
				ctx.fillStyle = bgColor
				ctx.fillRect(0, 0, canvas.width, canvas.height)

				if (title && headerHeight > 0) {
					ctx.fillStyle = bgColor
					ctx.fillRect(0, 0, canvas.width, headerHeight)
					ctx.font = `${14 * scale}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
					ctx.fillStyle = isDark ? '#ffffff' : '#111111'
					ctx.textBaseline = 'middle'
					ctx.fillText(title, sidePadding, headerHeight / 2)
				}

				ctx.drawImage(baseImg, 0, headerHeight)

				ctx.fillStyle = bgColor
				ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight)
				const wmText = 'Made with DefiLlama PRO'
				ctx.font = `${16 * scale}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
				ctx.fillStyle = isDark ? '#ffffff' : '#111111'
				ctx.textBaseline = 'middle'
				try {
					const icon = await new Promise<HTMLImageElement>((resolve, reject) => {
						const i = new Image()
						i.onload = () => resolve(i)
						i.onerror = reject
						i.src = '/icons/llamafeed.svg'
					})
					const iconSize = 18 * scale
					const gap = 6 * scale
					const textW = ctx.measureText(wmText).width
					const totalW = iconSize + gap + textW
					const yCenter = canvas.height - footerHeight / 2
					let cursorX = canvas.width - sidePadding - totalW
					ctx.drawImage(icon, cursorX, yCenter - iconSize / 2, iconSize, iconSize)
					cursorX += iconSize + gap
					ctx.fillText(wmText, cursorX, yCenter)
				} catch (e) {
					const textW = ctx.measureText(wmText).width
					const yCenter = canvas.height - footerHeight / 2
					ctx.fillText(wmText, canvas.width - sidePadding - textW, yCenter)
				}

				const outURL = canvas.toDataURL('image/png')
				const imageFilename = `${filename}_${new Date().toISOString().split('T')[0]}.png`
				downloadDataURL(imageFilename, outURL)
			} catch (error) {
				toast.error('Failed to export chart image')
				console.error('Image export error:', error)
			} finally {
				setIsLoading(false)
			}
		} else if (!loading) {
			setShowSubscribeModal(true)
		}
	}

	return (
		<>
			<button
				className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
				onClick={handleImageExport}
				data-loading={isClient ? loading : true}
				disabled={isClient ? loading || !chartInstance : true}
				title="Download chart as image"
			>
				{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
				<span>{smol ? '.png' : 'Image'}</span>
			</button>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}
		</>
	)
})
