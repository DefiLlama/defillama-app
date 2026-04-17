import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
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
	const [shareResult, setShareResult] = useState<ShareResult | null>(null)
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const shareLinkInputId = useId()

	const { authorizedFetch } = useAuthContext()

	const shareMutation = useMutation<ShareResult>({
		mutationFn: async () => {
			if (!sessionId) throw new Error('No session to share')

			const res = await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}/share`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forcePublic: true })
			})
				.then((response) => assertResponse(response, 'Failed to share session'))
				.then(handleSimpleFetchResponse)
				.then((res: Response) => res.json())

			return res
		},
		onSuccess: (data) => {
			if (data.shareToken) {
				setShareResult(data)
				const shareLink = buildShareLink(window.location.origin, data.shareToken, messageId)
				void navigator.clipboard.writeText(shareLink)
			}
		},
		onError: () => {
			toast.error('Failed to share conversation')
		}
	})

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])

	const origin = typeof window === 'undefined' ? '' : window.location.origin
	const shareLink = shareResult?.shareToken && origin ? buildShareLink(origin, shareResult.shareToken, messageId) : ''

	const handleCopyLink = useCallback(async () => {
		if (!shareLink) return
		try {
			await navigator.clipboard.writeText(shareLink)
			setCopied(true)
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log(error)
			toast.error('Failed to copy link')
		}
	}, [shareLink])

	const handleShareToX = useCallback(() => {
		const text = encodeURIComponent('Check out this conversation from LlamaAI')
		const url = encodeURIComponent(shareLink)
		window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
	}, [shareLink])

	return (
		<Ariakit.DialogProvider open={open} setOpen={setOpen}>
			<Ariakit.Dialog
				className="dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl max-sm:drawer sm:max-w-sm"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-4 flex items-center justify-between">
					<Ariakit.DialogHeading className="text-lg font-semibold">Share Conversation</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
						<Icon name="x" height={16} width={16} />
					</Ariakit.DialogDismiss>
				</div>

				{shareResult ? (
					<div className="flex flex-col gap-4">
						<div className="flex flex-col items-center gap-2 py-2 text-center">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--success)/12 text-(--success)">
								<Icon name="check-circle" height={24} width={24} />
							</div>
							<p className="m-0 text-sm font-medium">Your conversation is now public</p>
							<p className="m-0 text-xs text-[#666] dark:text-[#919296]">
								Anyone with the link can view this conversation
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor={shareLinkInputId} className="text-xs text-[#666] dark:text-[#919296]">
								Share Link
							</label>
							<div className="flex gap-2">
								<input
									id={shareLinkInputId}
									type="text"
									value={shareLink}
									readOnly
									className="flex-1 rounded border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 text-sm dark:border-[#222324]"
								/>
								<button
									onClick={() => void handleCopyLink()}
									data-umami-event="llamaai-copy-share-link"
									className="rounded border border-[#e6e6e6] px-3 py-2 text-sm hover:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324]"
								>
									{copied ? (
										<Icon name="check-circle" height={16} width={16} />
									) : (
										<Icon name="copy" height={16} width={16} />
									)}
								</button>
							</div>
						</div>
						<div className="flex items-center justify-end gap-3">
							<Ariakit.DialogDismiss className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] dark:text-[#919296] dark:hover:bg-[#222324]">
								Close
							</Ariakit.DialogDismiss>
							<button
								onClick={handleShareToX}
								data-umami-event="llamaai-share-to-x"
								className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90"
							>
								Share to X
							</button>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						<p className="m-0 text-sm text-[#666] dark:text-[#919296]">
							This will create a public link to your conversation. Anyone with the link can view it.
						</p>
						<div className="flex items-center justify-end gap-3">
							<Ariakit.DialogDismiss className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] dark:text-[#919296] dark:hover:bg-[#222324]">
								Cancel
							</Ariakit.DialogDismiss>
							<button
								type="button"
								onClick={() => {
									trackUmamiEvent('llamaai-share-conversation')
									shareMutation.mutate()
								}}
								disabled={!sessionId || shareMutation.isPending}
								data-umami-event="llamaai-share-submit"
								className="flex items-center gap-2 rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
							>
								{shareMutation.isPending ? (
									<>
										<LoadingSpinner size={14} />
										<span>Sharing...</span>
									</>
								) : (
									<>
										<Icon name="share" height={14} width={14} />
										<span>Share</span>
									</>
								)}
							</button>
						</div>
					</div>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
