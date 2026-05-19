import * as Ariakit from '@ariakit/react'
import { memo, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { AI_SERVER } from '~/constants'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { useAuthContext } from '~/containers/Subscription/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { handleSimpleFetchResponse } from '~/utils/async'

interface ShareModalProps {
	open: boolean
	setOpen: (value: boolean) => void
	sessionId: string | null
	messageId?: string | null
}

interface ShareResult {
	shareToken: string
	isPublic: boolean
}

function buildShareLink(origin: string, shareToken: string, messageId?: string | null) {
	const baseLink = `${origin}/ai/chat/shared/${shareToken}`
	return messageId ? `${baseLink}#msg-${messageId}` : baseLink
}

export const ShareModal = memo(function ShareModal({ open, setOpen, sessionId, messageId }: ShareModalProps) {
	const { authorizedFetch } = useAuthContext()
	const hasStartedRef = useRef(false)
	const [shareLink, setShareLink] = useState('')
	const [copyFailed, setCopyFailed] = useState(false)

	useEffect(() => {
		if (open) return
		hasStartedRef.current = false
		setCopyFailed(false)
		setShareLink('')
	}, [open])

	useEffect(() => {
		if (!open || hasStartedRef.current) return
		hasStartedRef.current = true

		const shareToastId = 'llamaai-share-link'
		let generatedShareLink = ''

		void (async () => {
			if (!sessionId) throw new Error('No session to share')

			trackUmamiEvent('llamaai-share-conversation')
			toast.loading('Creating share link...', { id: shareToastId })

			const data = (await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}/share`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forcePublic: true })
			})
				.then((response) => assertResponse(response, 'Failed to share session'))
				.then(handleSimpleFetchResponse)
				.then((res: Response) => res.json())) as ShareResult

			if (!data.shareToken) throw new Error('No share link returned')

			const nextShareLink = buildShareLink(window.location.origin, data.shareToken, messageId)
			generatedShareLink = nextShareLink
			setShareLink(nextShareLink)
			await navigator.clipboard.writeText(nextShareLink)
			trackUmamiEvent('llamaai-copy-share-link')
			toast.success('Share link copied', { id: shareToastId, duration: 2000 })
			setOpen(false)
		})().catch((error) => {
			console.error(error)
			toast.error('Failed to copy share link', { id: shareToastId })
			if (generatedShareLink) {
				setCopyFailed(true)
			} else {
				setOpen(false)
			}
		})
	}, [authorizedFetch, messageId, open, sessionId, setOpen])

	if (!copyFailed) return null

	return (
		<Ariakit.DialogProvider open={open} setOpen={setOpen}>
			<Ariakit.Dialog
				className="dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl max-sm:drawer sm:max-w-sm"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-4 flex items-center justify-between">
					<Ariakit.DialogHeading className="text-lg font-semibold">Copy Share Link</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
						<Icon name="x" height={16} width={16} />
					</Ariakit.DialogDismiss>
				</div>
				<p className="m-0 mb-3 text-sm text-[#666] dark:text-[#919296]">
					Clipboard access failed. Copy this link manually.
				</p>
				<input
					type="text"
					value={shareLink}
					readOnly
					onFocus={(event) => event.currentTarget.select()}
					className="w-full rounded border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 text-sm dark:border-[#222324]"
				/>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
