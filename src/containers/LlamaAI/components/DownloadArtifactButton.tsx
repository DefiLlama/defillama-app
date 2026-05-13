import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import type { Message } from '~/containers/LlamaAI/types'
import { useChartInstanceRegistry } from '~/containers/LlamaAI/utils/chartInstanceRegistry'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { downloadDataURL } from '~/utils/download'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const TOAST_ID = 'artifact-export'

interface DownloadArtifactButtonProps {
	message: Message
	sessionId: string
	className?: string
}

/**
 * Pro-gated message-toolbar button that exports a research-mode message as a
 * standalone, branded HTML artifact. Menu offers Preview (opens in new tab)
 * and Download. Reads chart instance getters from the surrounding registry
 * provided by MessageBubble.
 *
 * The exportArtifact module (which pulls in the unified/remark/rehype markdown
 * pipeline) is dynamically imported on first click — keeps it out of the
 * LlamaAI bundle's hot path.
 */
export function DownloadArtifactButton({ message, sessionId, className }: DownloadArtifactButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const { loaders, hasActiveSubscription } = useAuthContext()
	const [isDark] = useDarkModeManager()
	const chartInstances = useChartInstanceRegistry()
	const subscribeStore = Ariakit.useDialogStore()
	const menu = Ariakit.useMenuStore()
	const loading = loaders.userLoading || isLoading

	const runExport = async (action: 'preview' | 'download'): Promise<void> => {
		if (loading || !chartInstances) return

		if (!hasActiveSubscription) {
			setSignupSource('llamaai-artifact')
			subscribeStore.show()
			return
		}

		try {
			setIsLoading(true)
			toast.loading('Generating report...', { id: TOAST_ID })
			const { exportMessageAsHtml } = await import('~/containers/LlamaAI/utils/exportArtifact')
			const { blobUrl, filename } = await exportMessageAsHtml({
				message,
				chartInstances,
				isDark
			})

			if (action === 'preview') {
				// Don't revoke — the new tab needs the blob URL to stay valid for
				// reloads, "view source", or copy-link. Browser GCs the blob when
				// both originating and destination tabs are closed.
				window.open(blobUrl, '_blank', 'noopener,noreferrer')
				trackUmamiEvent('llamaai-download', {
					kind: 'artifact-html-preview',
					filename,
					sessionId,
					messageId: message.id ?? ''
				})
				toast.success('Preview opened in new tab', { id: TOAST_ID })
			} else {
				downloadDataURL(filename, blobUrl)
				URL.revokeObjectURL(blobUrl)
				trackUmamiEvent('llamaai-download', {
					kind: 'artifact-html',
					filename,
					sessionId,
					messageId: message.id ?? ''
				})
				toast.success('Report downloaded', { id: TOAST_ID })
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Failed to generate report'
			console.error('Artifact export error:', error)
			toast.error(errorMsg, { id: TOAST_ID })
		} finally {
			setIsLoading(false)
		}
	}

	if (!chartInstances) return null

	return (
		<>
			<Ariakit.MenuProvider store={menu}>
				<Tooltip content="Export as HTML report">
					<Ariakit.MenuButton
						aria-label={isLoading ? 'Exporting report' : 'Export as HTML report'}
						className={
							className ??
							'flex items-center gap-1 rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]'
						}
						disabled={loading}
					>
						{isLoading ? <LoadingSpinner size={14} /> : <Icon name="file-text" height={16} width={16} />}
						<span className="sr-only">Download report</span>
					</Ariakit.MenuButton>
				</Tooltip>
				<Ariakit.Menu
					portal
					unmountOnHide
					gutter={8}
					className="z-50 flex min-w-[160px] flex-col rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) text-(--text-primary) dark:border-[hsl(204,3%,32%)]"
				>
					<Ariakit.MenuItem
						data-umami-event="export-artifact"
						data-umami-event-action="preview"
						onClick={() => {
							menu.hide()
							void runExport('preview')
						}}
						disabled={loading}
						className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
					>
						<Icon name="external-link" height={14} width={14} className="shrink-0" />
						Preview in new tab
					</Ariakit.MenuItem>
					<Ariakit.MenuItem
						data-umami-event="export-artifact"
						data-umami-event-action="download"
						onClick={() => {
							menu.hide()
							void runExport('download')
						}}
						disabled={loading}
						className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) aria-disabled:cursor-not-allowed aria-disabled:opacity-60 data-active-item:bg-(--primary-hover)"
					>
						<Icon name="download-paper" height={14} width={14} className="shrink-0" />
						Download HTML
					</Ariakit.MenuItem>
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
			<Suspense fallback={null}>
				<SubscribeProModal dialogStore={subscribeStore} />
			</Suspense>
		</>
	)
}
