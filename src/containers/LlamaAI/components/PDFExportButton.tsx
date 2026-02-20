import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { captureAllCharts, type CapturedChart } from '../utils/chartCapture'

const EMPTY_CHARTS: Array<{ id: string; title: string }> = []

function formatPdfError(error: unknown): string {
	if (!error) return 'Failed to generate PDF'
	if (typeof error === 'string') return error
	if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
		return (error as any).message
	}
	try {
		return JSON.stringify(error)
	} catch {
		return 'Failed to generate PDF'
	}
}

interface PDFExportButtonProps {
	sessionId: string | null
	messageId?: string | null
	charts?: Array<{ id: string; title: string }>
	exportType: 'single_message' | 'full_conversation'
	className?: string
}

export function PDFExportButton({
	sessionId,
	messageId,
	charts = EMPTY_CHARTS,
	exportType,
	className
}: PDFExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { loaders, authorizedFetch, hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })
	const [isDark] = useDarkModeManager()

	const loading = loaders.userLoading || isLoading

	const handlePDFExport = async () => {
		if (loading) return
		if (!sessionId) return

		if (hasActiveSubscription) {
			try {
				setIsLoading(true)

				if (exportType === 'single_message') {
					if (!messageId) {
						toast.error('Unable to export this message. Please try again from a specific message.')
						setIsLoading(false)
						return
					}
				}

				let chartImages: CapturedChart[] = []
				if (charts.length > 0) {
					toast.loading('Capturing charts...', { id: 'pdf-export' })
					chartImages = await captureAllCharts(charts, isDark)
				}

				toast.loading('Generating PDF...', { id: 'pdf-export' })

				const requestBody: any = {
					sessionId,
					exportType,
					chartImages,
					options: {
						includeTimestamps: true,
						includeCitations: true,
						paperSize: 'A4',
						isDark
					}
				}

				if (exportType === 'single_message') {
					requestBody.messageId = messageId
				}

				const response = await authorizedFetch(`${MCP_SERVER}/export/pdf`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody)
				})

				if (!response) {
					toast.error('Not authenticated', { id: 'pdf-export' })
					setIsLoading(false)
					return
				}

				const data = await response.json()

				const pdfErrorMsg = formatPdfError(data.error)

				let hasError = false
				if (!response.ok) {
					hasError = true
				}
				if (!data.success) {
					hasError = true
				}

				if (hasError) {
					console.error('PDF export error:', pdfErrorMsg)
					toast.error(pdfErrorMsg, { id: 'pdf-export' })
					setIsLoading(false)
					return
				}

				const pdfResponse = await fetch(data.pdfUrl)
				if (!pdfResponse.ok) {
					toast.error(`Failed to download PDF (${pdfResponse.status})`, { id: 'pdf-export' })
					setIsLoading(false)
					return
				}

				const blob = await pdfResponse.blob()
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = `llama-ai-export-${Date.now()}.pdf`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				window.URL.revokeObjectURL(url)
				toast.success('PDF downloaded!', { id: 'pdf-export' })
				setIsLoading(false)
			} catch (error) {
				console.error('PDF export error:', error)
				let errorMsg = 'Failed to export PDF'
				if (error instanceof Error) {
					errorMsg = error.message
				}
				toast.error(errorMsg, { id: 'pdf-export' })
				setIsLoading(false)
			}
		} else {
			subscribeModalStore.show()
		}
	}

	if (!sessionId) return null

	return (
		<>
			<Tooltip content="Download PDF">
				<button
					data-umami-event="pdf-export"
					className={
						className ??
						'flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}
					onClick={handlePDFExport}
					disabled={loading}
				>
					{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={14} width={14} />}
				</button>
			</Tooltip>
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}
