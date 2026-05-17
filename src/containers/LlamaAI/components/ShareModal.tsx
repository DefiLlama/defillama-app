import { memo, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
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

	useEffect(() => {
		if (!open || hasStartedRef.current) return
		hasStartedRef.current = true

		const shareToastId = 'llamaai-share-link'

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

			const shareLink = buildShareLink(window.location.origin, data.shareToken, messageId)
			await navigator.clipboard.writeText(shareLink)
			trackUmamiEvent('llamaai-copy-share-link')
			toast.success('Share link copied', { id: shareToastId, duration: 2000 })
		})()
			.catch((error) => {
				console.error(error)
				toast.error('Failed to copy share link', { id: shareToastId })
			})
			.finally(() => {
				setOpen(false)
			})
	}, [authorizedFetch, messageId, open, sessionId, setOpen])

	return null
})
