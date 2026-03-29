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
import { setSignupSource } from '~/containers/Subscribtion/signupSource'

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
	exportType: 'single_message' | 'full_conversation'
	className?: string
}

export function PDFExportButton({ sessionId, messageId, exportType, className }: PDFExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { loaders, authorizedFetch, hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })
	const loading = loaders.userLoading || isLoading

	const handlePDFExport = async (isDark: boolean) => {
		if (loading) return
		if (!sessionId) return

		if (hasActiveSubscription) {
			try {
				setIsLoading(true)

				if (exportType === 'single_message') {
					if (!messageId) {
						toast.error('Unable to export this message. Please try again from a specific message.', {
							id: 'pdf-export'
						})
						setIsLoading(false)
						return
					}
				}

				toast.loading('Generating PDF...', { id: 'pdf-export' })

				const requestBody: any = {
					sessionId,
					exportType,
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

				let hasError = false
				if (!response.ok) {
					hasError = true
				}
				if (!data.success) {
					hasError = true
				}

				if (hasError) {
					const pdfErrorMsg = formatPdfError(data.error)
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
				const errorMsg = formatPdfError(error)
				console.error('PDF export error:', error)
				toast.error(errorMsg, { id: 'pdf-export' })
				setIsLoading(false)
			}
		} else {
			setSignupSource('llamaai-pdf')
			subscribeModalStore.show()
		}
	}

	if (!sessionId) return null

	return (
		<>
			<Ariakit.MenuProvider>
				<Tooltip content="Download PDF">
					<Ariakit.MenuButton
						aria-label={isLoading ? 'Exporting PDF' : 'Export PDF options'}
						className={
							className ??
							'flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)'
						}
						disabled={loading}
					>
						{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={14} width={14} />}
					</Ariakit.MenuButton>
				</Tooltip>
				<Ariakit.Menu
					portal
					unmountOnHide
					gutter={8}
					className="z-50 flex min-w-[140px] flex-col rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) text-(--text-primary) dark:border-[hsl(204,3%,32%)]"
				>
					<Ariakit.MenuItem
						data-umami-event="export-pdf"
						data-umami-event-theme="light"
						onClick={() => {
							void handlePDFExport(false)
						}}
						disabled={loading}
						className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
					>
						<Icon name="sun" height={14} width={14} className="shrink-0" />
						Light Mode
					</Ariakit.MenuItem>
					<Ariakit.MenuItem
						data-umami-event="export-pdf"
						data-umami-event-theme="dark"
						onClick={() => {
							void handlePDFExport(true)
						}}
						disabled={loading}
						className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
					>
						<Icon name="moon" height={14} width={14} className="shrink-0" />
						Dark Mode
					</Ariakit.MenuItem>
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}
