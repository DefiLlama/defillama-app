import { memo, Suspense, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SubscribeProModal } from '~/components/SubscribeCards/SubscribeProCard'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useSubscribe } from '~/hooks/useSubscribe'
import { captureAllCharts, type CapturedChart } from '../utils/chartCapture'

interface PDFExportButtonProps {
	sessionId: string | null
	messageId?: string | null
	charts?: Array<{ id: string; title: string }>
	exportType: 'single_message' | 'full_conversation'
	className?: string
}

export const PDFExportButton = memo(function PDFExportButton({
	sessionId,
	messageId,
	charts = [],
	exportType,
	className
}: PDFExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders, authorizedFetch } = useAuthContext()
	const subscribeModalStore = Ariakit.useDialogStore()
	const [isDark] = useDarkModeManager()

	const loading = loaders.userLoading || isSubscriptionLoading || isLoading

	const handlePDFExport = async () => {
		if (loading || !sessionId) return

		if (!loaders.userLoading && subscription?.status === 'active') {
			try {
				setIsLoading(true)

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

				if (exportType === 'single_message' && messageId) {
					requestBody.messageId = messageId
				}

				const response = await authorizedFetch(`${MCP_SERVER}/export/pdf`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody)
				})

				const data = await response.json()

				if (!response.ok || !data.success) {
					throw new Error(data.error || 'Failed to generate PDF')
				}

				toast.success('PDF generated!', { id: 'pdf-export' })

				const pdfResponse = await fetch(data.pdfUrl)
				const blob = await pdfResponse.blob()
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = `llama-ai-export-${Date.now()}.pdf`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				window.URL.revokeObjectURL(url)
			} catch (error) {
				console.error('PDF export error:', error)
				toast.error(error instanceof Error ? error.message : 'Failed to export PDF', { id: 'pdf-export' })
			} finally {
				setIsLoading(false)
			}
		} else if (!loading) {
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
						'hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)'
					}
					onClick={handlePDFExport}
					disabled={loading}
				>
					{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
				</button>
			</Tooltip>
			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		</>
	)
})
