import * as Ariakit from '@ariakit/react'
import { memo, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'

interface ShareModalContentProps {
	shareData?: { isPublic: boolean; shareToken?: string }
}

export const ShareModalContent = memo(function ShareModalContent({ shareData }: ShareModalContentProps) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const shareLink = shareData?.shareToken ? `${window.location.origin}/ai/chat/shared/${shareData.shareToken}` : ''

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])

	const handleCopy = async () => {
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
	}

	const handleShareToX = () => {
		const text = encodeURIComponent('Check out this conversation from LlamaAI')
		const url = encodeURIComponent(shareLink)
		window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="text-sm text-[#666] dark:text-[#919296]">
				Your conversation is now public. Anyone with the link can view it.
			</p>
			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#666] dark:text-[#919296]">Share Link</label>
				<div className="flex gap-2">
					<input
						type="text"
						value={shareLink}
						readOnly
						className="flex-1 rounded border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 text-sm dark:border-[#222324]"
					/>
					<button
						onClick={handleCopy}
						data-umami-event="llamaai-copy-share-link"
						className="rounded border border-[#e6e6e6] px-3 py-2 text-sm hover:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324]"
					>
						{copied ? <Icon name="check-circle" height={16} width={16} /> : <Icon name="copy" height={16} width={16} />}
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
	)
})
