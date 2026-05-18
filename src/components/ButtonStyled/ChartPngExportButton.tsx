import * as Ariakit from '@ariakit/react'
import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { exportChartAsPng, type PngExportProfile } from '~/components/ButtonStyled/chartPngExport'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { downloadDataURL } from '~/utils/download'

export type { PngExportProfile } from '~/components/ButtonStyled/chartPngExport'

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
	onExport?: (info: { kind: 'download' | 'copy'; filename: string }) => void
}

export function ChartPngExportButton({
	chartInstance,
	className = DEFAULT_CLASSNAME,
	smol = true,
	title,
	filename,
	iconUrl,
	expandLegend,
	pngProfile = 'default',
	onExport
}: ChartPngExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()
	const popover = Ariakit.usePopoverStore({ placement: 'bottom-end' })

	const [isDark] = useDarkModeManager()

	const generateDataURL = async (): Promise<string | null> => {
		const _chartInstance = chartInstance()

		if (!_chartInstance) {
			toast.error('Failed to get chart instance')
			return null
		}
		setIsLoading(true)

		const dataURL = await exportChartAsPng(_chartInstance, {
			isDark,
			title,
			iconUrl,
			expandLegend,
			pngProfile
		})

		if (!dataURL) {
			toast.error('Failed to export chart image')
		}
		return dataURL
	}

	const handleDownload = async () => {
		if (isLoading) return
		popover.hide()
		try {
			const dataURL = await generateDataURL()
			if (!dataURL) return
			let safeFilename = filename || 'chart'
			if (safeFilename.toLowerCase().endsWith('.png')) {
				safeFilename = safeFilename.slice(0, -4)
			}
			const imageFilename = `${safeFilename}_${new Date().toISOString().split('T')[0]}.png`
			downloadDataURL(imageFilename, dataURL)
			onExport?.({ kind: 'download', filename: imageFilename })
		} catch (error) {
			console.log('Error exporting chart image:', error)
			toast.error('Failed to export chart image')
		} finally {
			setIsLoading(false)
		}
	}

	const handleCopyToClipboard = () => {
		if (isLoading) return
		popover.hide()
		// Safari requires clipboard.write() to be called synchronously within
		// the user gesture. Passing a Promise<Blob> to ClipboardItem defers the
		// async work while keeping the write() call in the gesture context.
		const blobPromise = (async () => {
			const dataURL = await generateDataURL()
			if (!dataURL) throw new Error('Failed to generate image')
			const response = await fetch(dataURL)
			return await response.blob()
		})()

		navigator.clipboard
			.write([new ClipboardItem({ 'image/png': blobPromise })])
			.then(() => {
				toast.success('Image copied to clipboard')
				onExport?.({ kind: 'copy', filename: filename || 'chart' })
			})
			.catch((error) => {
				console.log('Error copying chart image:', error)
				toast.error('Failed to copy image to clipboard')
			})
			.finally(() => setIsLoading(false))
	}

	return (
		<Ariakit.PopoverProvider store={popover}>
			<Ariakit.PopoverDisclosure
				className={className}
				data-loading={isLoading}
				disabled={isLoading}
				title="Export chart as image"
			>
				{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
				<span>{smol ? '.png' : 'Image'}</span>
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				gutter={8}
				unmountOnHide
				className="z-50 flex flex-col rounded-lg border border-(--cards-border) bg-(--cards-bg) py-1 shadow-lg"
			>
				<button
					data-umami-event="export-image"
					data-umami-event-page={router.pathname}
					className="flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-(--link-hover-bg)"
					onClick={() => void handleDownload()}
				>
					<Icon name="download-paper" height={14} width={14} />
					<span>Download image</span>
				</button>
				<button
					data-umami-event="copy-image"
					data-umami-event-page={router.pathname}
					className="flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-(--link-hover-bg)"
					onClick={() => void handleCopyToClipboard()}
				>
					<Icon name="copy" height={14} width={14} />
					<span>Copy to clipboard</span>
				</button>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
