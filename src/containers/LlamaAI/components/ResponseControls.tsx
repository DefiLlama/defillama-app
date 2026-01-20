import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { memo, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { handleSimpleFetchResponse } from '~/utils/async'
import { convertLlamaLinksToDefillama } from '../utils/entityLinks'
import { FeedbackForm } from './FeedbackForm'
import { PDFExportButton } from './PDFExportButton'
import { ShareModalContent } from './ShareModalContent'

interface ResponseControlsProps {
	messageId?: string
	content?: string
	initialRating?: 'good' | 'bad' | null
	sessionId?: string | null
	readOnly?: boolean
	charts?: Array<{ id: string; title: string }>
}

export const ResponseControls = memo(function ResponseControls({
	messageId,
	content,
	initialRating,
	sessionId,
	readOnly = false,
	charts = []
}: ResponseControlsProps) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])
	const [showFeedback, setShowFeedback] = useState(false)
	const [showShareModal, setShowShareModal] = useState(false)
	const { authorizedFetch } = useAuthContext()

	const {
		data: shareData,
		mutate: shareSession,
		isPending: isSharing
	} = useMutation({
		mutationFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}/share`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forcePublic: true })
			})
				.then(handleSimpleFetchResponse)
				.then((res: Response) => res.json())

			return res
		},
		onSuccess: (data) => {
			if (data.shareToken) {
				const shareLink = `${window.location.origin}/ai/chat/shared/${data.shareToken}`
				navigator.clipboard.writeText(shareLink)
				setShowShareModal(true)
			}
		},
		onError: (err) => {
			toast.error('Failed to fetch session id')
			console.log(err)
		}
	})

	const [selectedRating, setSelectedRating] = useState<'good' | 'bad' | null>(initialRating || null)
	const [submittedRating, setSubmittedRating] = useState<'good' | 'bad' | null>(initialRating || null)
	const isRatedAsGood = submittedRating === 'good'
	const isRatedAsBad = submittedRating === 'bad'

	const handleCopy = async () => {
		if (!content) return
		try {
			const convertedContent = convertLlamaLinksToDefillama(content)
			await navigator.clipboard.writeText(convertedContent)
			setCopied(true)
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log('Failed to copy content:', error)
		}
	}

	if (!messageId) return null

	return (
		<>
			<div className="-my-0.5 flex items-center justify-end gap-1">
				{content && (
					<Tooltip
						content={copied ? 'Copied' : 'Copy'}
						render={<button onClick={handleCopy} />}
						className="rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					>
						{copied ? (
							<Icon name="check-circle" height={14} width={14} />
						) : (
							<Icon name="clipboard" height={14} width={14} />
						)}
					</Tooltip>
				)}
				{content && sessionId && !readOnly && (
					<PDFExportButton
						sessionId={sessionId}
						messageId={messageId}
						charts={charts}
						exportType="single_message"
						className="flex items-center gap-1 rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					/>
				)}
				{!readOnly && (
					<>
						<Tooltip
							content={isRatedAsGood ? 'Rated as good' : 'Rate as good'}
							render={
								<button
									onClick={() => {
										setSelectedRating('good')
										setShowFeedback(true)
									}}
									disabled={showFeedback || isRatedAsGood || isRatedAsBad}
								/>
							}
							className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsGood ? 'text-(--success)' : 'text-[#666] dark:text-[#919296]'}`}
						>
							<Icon name="thumbs-up" height={14} width={14} />
							<span className="sr-only">Thumbs Up</span>
						</Tooltip>
						<Tooltip
							content={isRatedAsBad ? 'Rated as bad' : 'Rate as bad'}
							render={
								<button
									onClick={() => {
										setSelectedRating('bad')
										setShowFeedback(true)
									}}
									disabled={showFeedback || isRatedAsGood || isRatedAsBad}
								/>
							}
							className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsBad ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'}`}
						>
							<Icon name="thumbs-down" height={14} width={14} />
							<span className="sr-only">Thumbs Down</span>
						</Tooltip>
					</>
				)}
				{sessionId && !readOnly && (
					<Tooltip
						content="Share"
						render={
							<button
								onClick={() => shareSession()}
								disabled={isSharing || showShareModal}
								data-umami-event="llamaai-share-conversation"
							/>
						}
						className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
					>
						{isSharing ? <LoadingSpinner size={14} /> : <Icon name="share" height={14} width={14} />}
						<span className="sr-only">Share</span>
					</Tooltip>
				)}
				{!readOnly && (
					<Tooltip
						content="Provide Feedback"
						render={
							<button
								onClick={() => {
									setSelectedRating(null)
									setShowFeedback(true)
								}}
								disabled={showFeedback || !!submittedRating}
							/>
						}
						className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
					>
						<Icon name="message-square-warning" height={14} width={14} />
						<span className="sr-only">Provide Feedback</span>
					</Tooltip>
				)}
			</div>
			<Ariakit.DialogProvider open={showFeedback} setOpen={setShowFeedback}>
				<Ariakit.Dialog
					className="dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl max-sm:drawer sm:max-w-md"
					unmountOnHide
					portal
					hideOnInteractOutside
				>
					<div className="mb-4 flex items-center justify-between">
						<Ariakit.DialogHeading className="text-lg font-semibold">Provide Feedback</Ariakit.DialogHeading>
						<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</div>
					<FeedbackForm
						messageId={messageId}
						selectedRating={selectedRating}
						setSelectedRating={setSelectedRating}
						setShowFeedback={setShowFeedback}
						onRatingSubmitted={setSubmittedRating}
					/>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
			<Ariakit.DialogProvider open={showShareModal} setOpen={setShowShareModal}>
				<Ariakit.Dialog
					className="dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl max-sm:drawer sm:max-w-md"
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
					<ShareModalContent shareData={shareData} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
})
