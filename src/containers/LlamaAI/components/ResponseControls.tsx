import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useReducer, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { FeedbackForm } from '~/containers/LlamaAI/components/FeedbackForm'
import { PDFExportButton } from '~/containers/LlamaAI/components/PDFExportButton'
import { ShareModalContent, type ShareData } from '~/containers/LlamaAI/components/ShareModalContent'
import type { MessageMetadata } from '~/containers/LlamaAI/types'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { convertLlamaLinksToDefillama } from '~/containers/LlamaAI/utils/entityLinks'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import { handleSimpleFetchResponse } from '~/utils/async'

interface ResponseControlsProps {
	messageId?: string
	content?: string
	initialRating?: 'good' | 'bad' | null
	sessionId?: string | null
	readOnly?: boolean
	messageMetadata?: MessageMetadata
}

type Rating = 'good' | 'bad' | null

interface ResponseControlsState {
	copied: boolean
	showFeedback: boolean
	showShareModal: boolean
	selectedRating: Rating
	submittedRating: Rating
}

type ResponseControlsAction =
	| { type: 'setCopied'; value: boolean }
	| { type: 'setShowFeedback'; value: boolean }
	| { type: 'setShowShareModal'; value: boolean }
	| { type: 'setSelectedRating'; value: Rating }
	| { type: 'setSubmittedRating'; value: Rating }
	| { type: 'openFeedbackWithRating'; value: Rating }

const createInitialState = (initialRating: Rating): ResponseControlsState => ({
	copied: false,
	showFeedback: false,
	showShareModal: false,
	selectedRating: initialRating,
	submittedRating: initialRating
})

function responseControlsReducer(state: ResponseControlsState, action: ResponseControlsAction): ResponseControlsState {
	switch (action.type) {
		case 'setCopied':
			return { ...state, copied: action.value }
		case 'setShowFeedback':
			return { ...state, showFeedback: action.value }
		case 'setShowShareModal':
			return { ...state, showShareModal: action.value }
		case 'setSelectedRating':
			return { ...state, selectedRating: action.value }
		case 'setSubmittedRating':
			return { ...state, submittedRating: action.value }
		case 'openFeedbackWithRating':
			return { ...state, selectedRating: action.value, showFeedback: true }
		default:
			return state
	}
}

interface FeedbackDialogProps {
	open: boolean
	setOpen: (value: boolean) => void
	messageId: string
	selectedRating: Rating
	setSelectedRating: (value: Rating) => void
	onRatingSubmitted: (value: Rating) => void
}

const FeedbackDialog = memo(function FeedbackDialog({
	open,
	setOpen,
	messageId,
	selectedRating,
	setSelectedRating,
	onRatingSubmitted
}: FeedbackDialogProps) {
	return (
		<Ariakit.DialogProvider open={open} setOpen={setOpen}>
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
					setShowFeedback={setOpen}
					onRatingSubmitted={onRatingSubmitted}
				/>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
})

interface ShareDialogProps {
	open: boolean
	setOpen: (value: boolean) => void
	shareData?: ShareData
}

const ShareDialog = memo(function ShareDialog({ open, setOpen, shareData }: ShareDialogProps) {
	return (
		<Ariakit.DialogProvider open={open} setOpen={setOpen}>
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
	)
})

export function ResponseControls({
	messageId,
	content,
	initialRating,
	sessionId,
	readOnly = false,
	messageMetadata
}: ResponseControlsProps) {
	const [state, dispatch] = useReducer(responseControlsReducer, initialRating || null, createInitialState)
	const { copied, showFeedback, showShareModal, selectedRating, submittedRating } = state
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
		}
	}, [])

	const { authorizedFetch } = useAuthContext()

	const {
		data: shareData,
		mutate: shareSession,
		isPending: isSharing
	} = useMutation<ShareData>({
		mutationFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}/share`, {
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
				const shareLink = `${window.location.origin}/ai/chat/shared/${data.shareToken}`
				void navigator.clipboard.writeText(shareLink)
				dispatch({ type: 'setShowShareModal', value: true })
			}
		},
		onError: (err) => {
			toast.error('Failed to fetch session id')
			console.log(err)
		}
	})

	const isRatedAsGood = submittedRating === 'good'
	const isRatedAsBad = submittedRating === 'bad'

	const setShowFeedback = useCallback((value: boolean) => {
		dispatch({ type: 'setShowFeedback', value })
	}, [])

	const setShowShareModal = useCallback((value: boolean) => {
		dispatch({ type: 'setShowShareModal', value })
	}, [])

	const setSelectedRating = useCallback((value: Rating) => {
		dispatch({ type: 'setSelectedRating', value })
	}, [])

	const setSubmittedRating = useCallback((value: Rating) => {
		dispatch({ type: 'setSubmittedRating', value })
	}, [])

	const handleOpenFeedbackWithRating = useCallback((value: Rating) => {
		dispatch({ type: 'openFeedbackWithRating', value })
	}, [])

	const handleRateGood = useCallback(() => {
		trackUmamiEvent('llamaai-feedback-submit', { rating: 'good' })
		handleOpenFeedbackWithRating('good')
	}, [handleOpenFeedbackWithRating])

	const handleRateBad = useCallback(() => {
		trackUmamiEvent('llamaai-feedback-submit', { rating: 'bad' })
		handleOpenFeedbackWithRating('bad')
	}, [handleOpenFeedbackWithRating])

	const handleOpenGeneralFeedback = useCallback(() => {
		handleOpenFeedbackWithRating(null)
	}, [handleOpenFeedbackWithRating])

	const handleShareSession = useCallback(() => {
		trackUmamiEvent('llamaai-share-conversation')
		shareSession()
	}, [shareSession])

	const handleCopy = useCallback(async () => {
		if (!content) return
		trackUmamiEvent('llamaai-copy-response')
		try {
			const convertedContent = convertLlamaLinksToDefillama(content)
			await navigator.clipboard.writeText(convertedContent)
			dispatch({ type: 'setCopied', value: true })
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
			copiedTimeoutRef.current = setTimeout(() => dispatch({ type: 'setCopied', value: false }), 2000)
		} catch (error) {
			console.log('Failed to copy content:', error)
		}
	}, [content])

	if (!messageId) return null

	return (
		<>
			<div className="flex items-center gap-0.5 pt-1">
				{content ? (
					<Tooltip
						content={copied ? 'Copied' : 'Copy'}
						render={
							<button
								onClick={() => {
									void handleCopy()
								}}
							/>
						}
						className="rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]"
					>
						{copied ? (
							<Icon name="check-circle" height={16} width={16} />
						) : (
							<Icon name="clipboard" height={16} width={16} />
						)}
					</Tooltip>
				) : null}
				{!readOnly ? (
					<>
						<Tooltip
							content={isRatedAsGood ? 'Rated as good' : 'Rate as good'}
							render={<button onClick={handleRateGood} disabled={showFeedback || isRatedAsGood || isRatedAsBad} />}
							className={`rounded-md p-1.5 transition-colors hover:bg-black/5 hover:text-[#444] dark:hover:bg-white/5 dark:hover:text-[#ccc] ${isRatedAsGood ? 'text-(--success)' : 'text-[#999] dark:text-[#666]'}`}
						>
							<Icon name="thumbs-up" height={16} width={16} />
							<span className="sr-only">Thumbs Up</span>
						</Tooltip>
						<Tooltip
							content={isRatedAsBad ? 'Rated as bad' : 'Rate as bad'}
							render={<button onClick={handleRateBad} disabled={showFeedback || isRatedAsGood || isRatedAsBad} />}
							className={`rounded-md p-1.5 transition-colors hover:bg-black/5 hover:text-[#444] dark:hover:bg-white/5 dark:hover:text-[#ccc] ${isRatedAsBad ? 'text-(--error)' : 'text-[#999] dark:text-[#666]'}`}
						>
							<Icon name="thumbs-down" height={16} width={16} />
							<span className="sr-only">Thumbs Down</span>
						</Tooltip>
					</>
				) : null}
				{sessionId && !readOnly ? (
					<Tooltip
						content="Share"
						render={<button onClick={handleShareSession} disabled={isSharing || showShareModal} />}
						className="rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]"
					>
						{isSharing ? <LoadingSpinner size={16} /> : <Icon name="share" height={16} width={16} />}
						<span className="sr-only">Share</span>
					</Tooltip>
				) : null}
				{content && sessionId && !readOnly ? (
					<PDFExportButton
						sessionId={sessionId}
						messageId={messageId}
						exportType="single_message"
						className="flex items-center gap-1 rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]"
					/>
				) : null}
				{messageMetadata && (messageMetadata.outputTokens != null || messageMetadata.x402CostUsd) ? (
					<Ariakit.PopoverProvider placement="top">
						<Ariakit.PopoverDisclosure className="rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]">
							<Icon name="circle-help" height={16} width={16} />
						</Ariakit.PopoverDisclosure>
						<Ariakit.Popover
							className="z-50 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-3 shadow-lg dark:border-[#333]"
							portal
							gutter={8}
						>
							<div className="flex flex-col gap-1.5 text-xs text-[#555] dark:text-[#ccc]">
								{messageMetadata.outputTokens != null ? (
									<div className="flex justify-between gap-4">
										<span className="text-[#999] dark:text-[#666]">Output</span>
										<span className="font-mono tabular-nums">
											{messageMetadata.outputTokens.toLocaleString()} tokens
										</span>
									</div>
								) : null}
								{messageMetadata.executionTimeMs ? (
									<div className="flex justify-between gap-4">
										<span className="text-[#999] dark:text-[#666]">Time</span>
										<span className="font-mono tabular-nums">
											{(messageMetadata.executionTimeMs / 1000).toFixed(1)}s
										</span>
									</div>
								) : null}
								{messageMetadata.x402CostUsd ? (
									<div className="flex justify-between gap-4">
										<span className="text-[#999] dark:text-[#666]">Premium data</span>
										<span className="font-mono text-amber-600 tabular-nums dark:text-amber-400">
											${parseFloat(messageMetadata.x402CostUsd).toFixed(3)}
										</span>
									</div>
								) : null}
							</div>
						</Ariakit.Popover>
					</Ariakit.PopoverProvider>
				) : null}
				{!readOnly ? (
					<Tooltip
						content="Provide Feedback"
						render={<button onClick={handleOpenGeneralFeedback} disabled={showFeedback || !!submittedRating} />}
						className="rounded-md p-1.5 text-[#999] transition-colors hover:bg-black/5 hover:text-[#444] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-[#ccc]"
					>
						<Icon name="message-square-warning" height={16} width={16} />
						<span className="sr-only">Provide Feedback</span>
					</Tooltip>
				) : null}
			</div>
			<FeedbackDialog
				open={showFeedback}
				setOpen={setShowFeedback}
				messageId={messageId}
				selectedRating={selectedRating}
				setSelectedRating={setSelectedRating}
				onRatingSubmitted={setSubmittedRating}
			/>
			<ShareDialog open={showShareModal} setOpen={setShowShareModal} shareData={shareData} />
		</>
	)
}
