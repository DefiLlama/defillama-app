import * as Ariakit from '@ariakit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { AI_SERVER } from '~/constants'
import { SESSIONS_QUERY_KEY } from '~/containers/LlamaAI/hooks/useSessionList'
import { toShareToken, type ShareToken } from '~/containers/LlamaAI/ids'
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
	shareToken: ShareToken
	isPublic: boolean
}

function buildShareLink(origin: string, shareToken: ShareToken, messageId?: string | null) {
	const baseLink = `${origin}/ai/chat/shared/${shareToken}`
	return messageId ? `${baseLink}#msg-${messageId}` : baseLink
}

function canWriteClipboard() {
	return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function'
}

export const ShareModal = memo(function ShareModal({ open, setOpen, sessionId, messageId }: ShareModalProps) {
	const { authorizedFetch } = useAuthContext()
	const queryClient = useQueryClient()
	const hasStartedRef = useRef(false)
	const [shareResult, setShareResult] = useState<ShareResult | null>(null)
	const [copied, setCopied] = useState(false)
	const [shareError, setShareError] = useState<string | null>(null)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const shareLinkInputId = useId()

	const markCopied = useCallback(() => {
		setCopied(true)
		if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
	}, [])

	const copyShareLink = useCallback(
		async (link: string, failureMessage: string) => {
			if (!canWriteClipboard()) {
				toast.error('Clipboard unavailable. Copy the share link manually.')
				return
			}
			try {
				await navigator.clipboard.writeText(link)
				markCopied()
				trackUmamiEvent('llamaai-copy-share-link')
			} catch (error) {
				console.error(error)
				toast.error(failureMessage)
			}
		},
		[markCopied]
	)

	useEffect(() => {
		if (open) return
		if (copiedTimeoutRef.current) {
			clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = null
		}
		hasStartedRef.current = false
		setShareResult(null)
		setCopied(false)
		setShareError(null)
	}, [open])

	const { mutate: createShareLink, isPending } = useMutation<ShareResult>({
		mutationFn: async () => {
			if (!sessionId) throw new Error('No session to share')

			const data = (await authorizedFetch(`${AI_SERVER}/user/sessions/${sessionId}/share`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forcePublic: true })
			})
				.then((response) => assertResponse(response, 'Failed to share session'))
				.then(handleSimpleFetchResponse)
				.then((res: Response) => res.json())) as { shareToken: string; isPublic: boolean }

			if (!data.shareToken) throw new Error('No share link returned')

			return { ...data, shareToken: toShareToken(data.shareToken) }
		},
		onSuccess: (data) => {
			setShareResult(data)
			setShareError(null)
			void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
			const nextShareLink = buildShareLink(window.location.origin, data.shareToken, messageId)
			void copyShareLink(nextShareLink, 'Failed to copy share link')
		},
		onError: (error) => {
			const message = error instanceof Error ? error.message : 'Failed to share conversation'
			setShareError(message)
			toast.error(message)
		}
	})

	useEffect(() => {
		if (!open || hasStartedRef.current) return
		hasStartedRef.current = true

		if (!sessionId) {
			toast.error('No session to share')
			setOpen(false)
			return
		}

		trackUmamiEvent('llamaai-share-conversation')
		createShareLink()
	}, [open, sessionId, setOpen, createShareLink])

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])

	const origin = typeof window === 'undefined' ? '' : window.location.origin
	const shareLink = shareResult?.shareToken && origin ? buildShareLink(origin, shareResult.shareToken, messageId) : ''

	const handleCopyLink = useCallback(async () => {
		if (!shareLink) return
		await copyShareLink(shareLink, 'Failed to copy link')
	}, [copyShareLink, shareLink])

	const handleShareToX = useCallback(() => {
		if (!shareLink) return
		const text = encodeURIComponent('Check out this conversation from LlamaAI')
		const url = encodeURIComponent(shareLink)
		window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
	}, [shareLink])

	const handleNativeShare = useCallback(async () => {
		if (!shareLink || !navigator.share) return
		try {
			await navigator.share({
				title: 'LlamaAI conversation',
				text: 'Check out this conversation from LlamaAI',
				url: shareLink
			})
			trackUmamiEvent('llamaai-native-share')
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return
			console.error(error)
		}
	}, [shareLink])

	const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
	const heading = shareResult
		? copied
			? 'Share Link Copied'
			: 'Share Link Ready'
		: shareError
			? 'Share Link Failed'
			: 'Creating Share Link'

	return (
		<Ariakit.DialogProvider open={open} setOpen={setOpen}>
			<Ariakit.Dialog
				className="dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl max-sm:drawer sm:max-w-sm"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-4 flex items-center justify-between">
					<Ariakit.DialogHeading className="text-lg font-semibold">{heading}</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
						<Icon name="x" height={16} width={16} />
					</Ariakit.DialogDismiss>
				</div>

				{shareResult ? (
					<div className="flex flex-col gap-4">
						<div className="flex flex-col items-center gap-2 py-2 text-center">
							<div className="flex size-10 items-center justify-center rounded-full bg-(--success)/12 text-(--success)">
								<Icon name="check-circle" height={24} width={24} />
							</div>
							<p className="m-0 text-sm font-medium">
								{copied ? 'Share link copied to clipboard' : 'Share link ready'}
							</p>
							<p className="m-0 text-xs text-[#666] dark:text-[#919296]">
								Anyone with the link can view this conversation. Paste it into your favorite social app or share it
								directly below.
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
									onFocus={(event) => event.currentTarget.select()}
									className="flex-1 rounded border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 text-sm dark:border-[#222324]"
								/>
								<button
									type="button"
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
							{canNativeShare ? (
								<button
									type="button"
									onClick={() => void handleNativeShare()}
									data-umami-event="llamaai-native-share"
									className="rounded border border-[#e6e6e6] px-3 py-2 text-xs hover:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324]"
								>
									Share&hellip;
								</button>
							) : null}
							<button
								type="button"
								onClick={handleShareToX}
								data-umami-event="llamaai-share-to-x"
								className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90"
							>
								Share to X
							</button>
						</div>
					</div>
				) : (
					<>
						{shareError ? (
							<div className="flex flex-col gap-4">
								<p className="m-0 text-sm text-[#666] dark:text-[#919296]">{shareError}</p>
								<div className="flex items-center justify-end gap-3">
									<Ariakit.DialogDismiss className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] dark:text-[#919296] dark:hover:bg-[#222324]">
										Close
									</Ariakit.DialogDismiss>
									<button
										type="button"
										onClick={() => {
											setShareError(null)
											createShareLink()
										}}
										disabled={isPending}
										className="flex items-center gap-2 rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
									>
										{isPending ? <LoadingSpinner size={14} /> : null}
										<span>Retry</span>
									</button>
								</div>
							</div>
						) : (
							<div className="flex items-center gap-3 py-2 text-sm text-[#666] dark:text-[#919296]">
								<LoadingSpinner size={16} />
								<span>Creating and copying your share link&hellip;</span>
							</div>
						)}
					</>
				)}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})
