import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type RefCallback,
	type RefObject,
	type SetStateAction
} from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MessageBubble } from '~/containers/LlamaAI/components/messages/MessageBubble'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import {
	SpawnProgressCard,
	ToolProgressIndicator,
	TypingIndicator
} from '~/containers/LlamaAI/components/status/StreamingStatus'
import type { RecoveryState } from '~/containers/LlamaAI/streamState'
import type { ChartSet, Message, ResearchUsage, SpawnAgentStatus, ToolCall } from '~/containers/LlamaAI/types'

interface ConversationViewProps {
	readOnly: boolean
	messages: Message[]
	sessionId: string | null
	isLlama: boolean
	isStreaming: boolean
	activeToolCalls: ToolCall[]
	spawnProgress: Map<string, SpawnAgentStatus>
	spawnStartTime: number
	executionStartedAt: number
	spawnIsResearchMode: boolean
	streamingThinking: string
	streamingDraft: Message | null
	isCompacting: boolean
	paginationState: {
		hasMore: boolean
		cursor: number | null
		isLoadingMore: boolean
	}
	paginationError: string | null
	recovery: RecoveryState
	error: string | null
	lastFailedPrompt: string | null
	onRetryLastFailedPrompt: () => void
	onReconnectNow: () => void
	scrollContainerRef: RefObject<HTMLDivElement | null>
	messagesEndRef: RefObject<HTMLDivElement | null>
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	showScrollToBottom: boolean
	scrollToBottom: () => void
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string; type?: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string }>,
		pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string },
		isSuggestedQuestion?: boolean
	) => void
	handleStopRequest: () => void
	handleActionClick: (message: string) => void
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
	animateActiveExchange: boolean
	onOpenAlerts: () => void
	quotedText?: string | null
	onClearQuotedText?: () => void
	onTableFullscreenOpen?: () => void
}

// Keep the active exchange tall enough that scrolling to its bottom places the
// submitted prompt slightly below the top edge on both mobile and desktop.
const ACTIVE_EXCHANGE_MIN_HEIGHT_CLASS = 'min-h-[calc(100dvh-265px)] lg:min-h-[calc(100dvh-225px)]'

function getMessageTailSnapshot(messages: Message[]): readonly [Message | null, Message | null] {
	return [messages.at(-2) ?? null, messages.at(-1) ?? null] as const
}

function getMessageAnchorId(messageId?: string | null) {
	return messageId ? `msg-${messageId}` : undefined
}

function getMessageAnchorIdFromHash(hash: string) {
	return /^#msg-[A-Za-z0-9_-]+$/.test(hash) ? hash.slice(1) : null
}

function ConversationMessageItem({
	message,
	nextUserMessage,
	sessionId,
	readOnly,
	isLlama,
	isLatestAssistant,
	onActionClick,
	onTableFullscreenOpen,
	anchorId,
	anchorRef
}: {
	message: Message
	nextUserMessage?: string
	sessionId: string | null
	readOnly: boolean
	isLlama: boolean
	isLatestAssistant?: boolean
	onActionClick?: (message: string) => void
	onTableFullscreenOpen?: () => void
	anchorId?: string
	anchorRef?: RefCallback<HTMLDivElement>
}) {
	return (
		<MessageBubble
			message={message}
			sessionId={sessionId}
			readOnly={readOnly}
			isLlama={isLlama}
			isLatestAssistant={isLatestAssistant}
			onActionClick={onActionClick}
			nextUserMessage={nextUserMessage}
			onTableFullscreenOpen={onTableFullscreenOpen}
			anchorId={anchorId}
			anchorRef={anchorRef}
			anchorClassName={anchorId ? 'message-anchor' : undefined}
		/>
	)
}

function ConversationLiveStatus({
	isStreaming,
	activeToolCalls,
	spawnProgress,
	spawnStartTime,
	executionStartedAt,
	spawnIsResearchMode,
	streamingThinking,
	streamingDraft,
	isCompacting,
	recovery,
	error,
	lastFailedPrompt,
	onRetryLastFailedPrompt,
	onReconnectNow,
	isResearchMode,
	sessionId,
	readOnly,
	isLlama,
	onTableFullscreenOpen
}: {
	isStreaming: boolean
	activeToolCalls: ToolCall[]
	spawnProgress: Map<string, SpawnAgentStatus>
	spawnStartTime: number
	executionStartedAt: number
	spawnIsResearchMode: boolean
	streamingThinking: string
	streamingDraft: Message | null
	isCompacting: boolean
	recovery: RecoveryState
	error: string | null
	lastFailedPrompt: string | null
	onRetryLastFailedPrompt: () => void
	onReconnectNow: () => void
	isResearchMode: boolean
	sessionId: string | null
	readOnly: boolean
	isLlama: boolean
	onTableFullscreenOpen?: () => void
}) {
	return (
		<>
			{isStreaming &&
			activeToolCalls.length === 0 &&
			spawnProgress.size === 0 &&
			!streamingDraft?.content &&
			!streamingThinking &&
			!isCompacting &&
			!hasStreamingCharts(streamingDraft?.charts) ? (
				<TypingIndicator />
			) : null}

			<div style={{ overflowAnchor: 'none' }}>
				{spawnProgress.size > 0 && spawnIsResearchMode ? (
					<SpawnProgressCard
						agents={spawnProgress}
						startTime={spawnStartTime}
						isResearchMode
						recovery={recovery}
						onReconnect={onReconnectNow}
					/>
				) : (
					<ToolProgressIndicator
						toolCalls={activeToolCalls}
						thinking={streamingThinking}
						isCompacting={isCompacting}
						spawnProgress={spawnProgress.size > 0 ? spawnProgress : undefined}
						executionStartedAt={executionStartedAt}
					/>
				)}
			</div>

			{streamingDraft ? (
				<div style={{ overflowAnchor: 'none' }}>
					<MessageBubble
						key={streamingDraft.id || 'streaming-draft'}
						message={streamingDraft}
						sessionId={sessionId}
						isDraft
						readOnly={readOnly}
						isLlama={isLlama}
						onTableFullscreenOpen={onTableFullscreenOpen}
					/>
				</div>
			) : null}

			{recovery.status === 'reconnecting' && !(spawnProgress.size > 0 && spawnIsResearchMode) ? (
				<div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
					<p className="text-sm font-medium text-amber-900 dark:text-amber-100">Reconnecting...</p>
					<p className="text-sm text-amber-800 dark:text-amber-200">
						Trying to reconnect to the running {isResearchMode ? 'research session' : 'quick chat'}.
					</p>
					<div className="flex items-center justify-between">
						<p className="text-xs text-amber-700 dark:text-amber-300">
							Attempt {Math.max(recovery.attemptCount, 1)}. Connection lost temporarily.
						</p>
						<button
							onClick={onReconnectNow}
							className="shrink-0 rounded-md bg-amber-200 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
						>
							Reconnect now
						</button>
					</div>
				</div>
			) : null}

			{recovery.status !== 'reconnecting' && error ? (
				<div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
					<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
					{lastFailedPrompt ? (
						<button
							onClick={onRetryLastFailedPrompt}
							className="mt-1 w-fit rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
						>
							Reconnect
						</button>
					) : null}
				</div>
			) : null}
		</>
	)
}

export function ConversationView({
	readOnly,
	messages,
	sessionId,
	isLlama,
	isStreaming,
	activeToolCalls,
	spawnProgress,
	spawnStartTime,
	executionStartedAt,
	spawnIsResearchMode,
	streamingThinking,
	streamingDraft,
	isCompacting,
	paginationState,
	paginationError,
	recovery,
	error,
	lastFailedPrompt,
	onRetryLastFailedPrompt,
	onReconnectNow,
	scrollContainerRef,
	messagesEndRef,
	promptInputRef,
	showScrollToBottom,
	scrollToBottom,
	handleSubmit,
	handleStopRequest,
	handleActionClick,
	isResearchMode,
	setIsResearchMode,
	researchUsage,
	animateActiveExchange,
	onOpenAlerts,
	quotedText,
	onClearQuotedText,
	onTableFullscreenOpen
}: ConversationViewProps) {
	const isLiveExchange = isStreaming || recovery.status === 'reconnecting' || Boolean(error)
	const handledAnchorIdRef = useRef<string | null>(null)
	const highlightTimeoutRef = useRef<number | null>(null)
	const pendingScrollHighlightRef = useRef<(() => void) | null>(null)
	const targetAnchorId = typeof window !== 'undefined' ? getMessageAnchorIdFromHash(window.location.hash) : null

	useEffect(() => {
		return () => {
			pendingScrollHighlightRef.current?.()
			if (highlightTimeoutRef.current !== null) {
				window.clearTimeout(highlightTimeoutRef.current)
				highlightTimeoutRef.current = null
			}
			handledAnchorIdRef.current = null
		}
	}, [])

	const getAnchorRef = (anchorId?: string): RefCallback<HTMLDivElement> | undefined => {
		if (!anchorId || anchorId !== targetAnchorId) return undefined

		return (node) => {
			if (!node || handledAnchorIdRef.current === anchorId) return
			if (window.location.hash !== `#${anchorId}` || node.id !== anchorId) return

			handledAnchorIdRef.current = anchorId
			requestAnimationFrame(() => {
				const container = scrollContainerRef.current
				let fallbackTimer: number | null = null
				const applyHighlight = () => {
					if (fallbackTimer !== null) {
						window.clearTimeout(fallbackTimer)
					}
					container?.removeEventListener('scrollend', applyHighlight)
					pendingScrollHighlightRef.current = null
					node.classList.remove('anchor-highlight')
					void node.offsetWidth
					node.classList.add('anchor-highlight')
					if (highlightTimeoutRef.current !== null) {
						window.clearTimeout(highlightTimeoutRef.current)
					}
					highlightTimeoutRef.current = window.setTimeout(() => {
						node.classList.remove('anchor-highlight')
						highlightTimeoutRef.current = null
					}, 2000)
				}

				pendingScrollHighlightRef.current?.()
				pendingScrollHighlightRef.current = () => {
					if (fallbackTimer !== null) {
						window.clearTimeout(fallbackTimer)
					}
					container?.removeEventListener('scrollend', applyHighlight)
					pendingScrollHighlightRef.current = null
				}

				container?.addEventListener('scrollend', applyHighlight, { once: true })
				fallbackTimer = window.setTimeout(applyHighlight, 500)
				node.scrollIntoView({ behavior: 'smooth', block: 'end' })
			})
		}
	}

	const [initialTailSnapshot] = useState(() => getMessageTailSnapshot(messages))
	const currentTailSnapshot = getMessageTailSnapshot(messages)
	const hasTailChangedSinceMount =
		currentTailSnapshot[0] !== initialTailSnapshot[0] || currentTailSnapshot[1] !== initialTailSnapshot[1]

	// Find the last user message index for the exchange spacer
	const lastUserIndex = (() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === 'user') return i
		}
		return -1
	})()

	// During streaming: the last message is the user prompt (response is a separate draft).
	// After streaming: keep the last user→response pair wrapped in the viewport-sized
	// spacer so the scroll position keeps the user message near the top of the viewport.
	const shouldSpaceLastExchange =
		!readOnly &&
		lastUserIndex >= 0 &&
		(isLiveExchange ? messages[messages.length - 1]?.role === 'user' : hasTailChangedSinceMount)

	const lastExchangeMessages = shouldSpaceLastExchange ? messages.slice(lastUserIndex) : []
	const renderedMessages = shouldSpaceLastExchange ? messages.slice(0, lastUserIndex) : messages

	// Find the last assistant message to keep its controls always visible
	const lastAssistantId = (() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === 'assistant' && messages[i].id) return messages[i].id
		}
		return null
	})()

	return (
		<>
			<div ref={scrollContainerRef} className="relative thin-scrollbar flex-1 overflow-y-auto p-2.5 max-lg:px-0">
				<div className="llamaai-chat-width relative mx-auto flex w-full flex-col">
					<div className="flex w-full flex-col gap-2 px-2">
						<div className="flex flex-col gap-2.5">
							{paginationState.isLoadingMore ? (
								<div className="flex justify-center py-2">
									<p className="m-0 text-xs text-[#666] dark:text-[#919296]">Loading older messages...</p>
								</div>
							) : null}

							{paginationError ? (
								<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
									<p className="text-xs text-red-700 dark:text-red-300">{paginationError}</p>
								</div>
							) : null}

							{renderedMessages.map((message, index) => {
								const originalIndex =
									message.id != null ? messages.findIndex((candidate) => candidate.id === message.id) : index
								const nextMessage = originalIndex >= 0 ? messages[originalIndex + 1] : undefined
								const nextUserMessage = nextMessage?.role === 'user' ? nextMessage.content : undefined

								return (
									<ConversationMessageItem
										key={message.id || `msg-${originalIndex >= 0 ? originalIndex : index}`}
										message={message}
										nextUserMessage={nextUserMessage}
										sessionId={sessionId}
										readOnly={readOnly}
										isLlama={isLlama}
										isLatestAssistant={message.id === lastAssistantId}
										onActionClick={!readOnly && !isStreaming ? handleActionClick : undefined}
										onTableFullscreenOpen={onTableFullscreenOpen}
										anchorId={getMessageAnchorId(message.id)}
										anchorRef={getAnchorRef(getMessageAnchorId(message.id))}
									/>
								)
							})}

							{shouldSpaceLastExchange ? (
								<div
									className={`flex flex-col gap-2.5 ${ACTIVE_EXCHANGE_MIN_HEIGHT_CLASS} ${
										animateActiveExchange && isLiveExchange
											? 'motion-safe:animate-[llamaActiveExchangeEnter_0.42s_cubic-bezier(0.22,1,0.36,1)_both]'
											: ''
									}`}
								>
									{lastExchangeMessages.map((message, i) => (
										<ConversationMessageItem
											key={message.id || `exchange-${i}`}
											message={message}
											sessionId={sessionId}
											readOnly={readOnly}
											isLlama={isLlama}
											isLatestAssistant={message.id === lastAssistantId}
											onActionClick={!readOnly && !isStreaming ? handleActionClick : undefined}
											onTableFullscreenOpen={onTableFullscreenOpen}
											anchorId={getMessageAnchorId(message.id)}
											anchorRef={getAnchorRef(getMessageAnchorId(message.id))}
										/>
									))}

									{isLiveExchange ? (
										<ConversationLiveStatus
											isStreaming={isStreaming}
											activeToolCalls={activeToolCalls}
											spawnProgress={spawnProgress}
											spawnStartTime={spawnStartTime}
											executionStartedAt={executionStartedAt}
											spawnIsResearchMode={spawnIsResearchMode}
											streamingThinking={streamingThinking}
											streamingDraft={streamingDraft}
											isCompacting={isCompacting}
											recovery={recovery}
											error={error}
											lastFailedPrompt={lastFailedPrompt}
											onRetryLastFailedPrompt={onRetryLastFailedPrompt}
											onReconnectNow={onReconnectNow}
											isResearchMode={isResearchMode}
											sessionId={sessionId}
											readOnly={readOnly}
											isLlama={isLlama}
											onTableFullscreenOpen={onTableFullscreenOpen}
										/>
									) : null}
								</div>
							) : (
								<ConversationLiveStatus
									isStreaming={isStreaming}
									activeToolCalls={activeToolCalls}
									spawnProgress={spawnProgress}
									spawnStartTime={spawnStartTime}
									executionStartedAt={executionStartedAt}
									streamingThinking={streamingThinking}
									spawnIsResearchMode={spawnIsResearchMode}
									streamingDraft={streamingDraft}
									isCompacting={isCompacting}
									recovery={recovery}
									error={error}
									lastFailedPrompt={lastFailedPrompt}
									onRetryLastFailedPrompt={onRetryLastFailedPrompt}
									onReconnectNow={onReconnectNow}
									isResearchMode={isResearchMode}
									sessionId={sessionId}
									readOnly={readOnly}
									isLlama={isLlama}
									onTableFullscreenOpen={onTableFullscreenOpen}
								/>
							)}
						</div>
					</div>
					<div ref={messagesEndRef} />
				</div>
			</div>

			<div
				className={`pointer-events-none sticky z-10 mx-auto transition-opacity duration-200 ${
					readOnly ? 'bottom-8 -mb-2' : 'bottom-32 -mb-8'
				} ${showScrollToBottom ? 'opacity-100' : 'opacity-0'}`}
			>
				<Tooltip
					content="Scroll to bottom"
					render={<button onClick={scrollToBottom} />}
					className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-(--app-bg) shadow-md hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324] ${showScrollToBottom ? 'pointer-events-auto' : 'pointer-events-none'}`}
				>
					<Icon name="arrow-down" height={16} width={16} />
					<span className="sr-only">Scroll to bottom</span>
				</Tooltip>
			</div>

			{!readOnly ? (
				<div className="llamaai-chat-width relative mx-auto w-full pb-2.5">
					<div className="absolute -top-8 right-0 left-0 h-9 bg-linear-to-b from-transparent to-[#fefefe] dark:to-[#131516]" />
					<PromptInput
						handleSubmit={handleSubmit}
						promptInputRef={promptInputRef}
						isPending={isStreaming}
						handleStopRequest={handleStopRequest}
						isStreaming={isStreaming}
						restoreRequest={null}
						placeholder="Reply to LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
						onOpenAlerts={onOpenAlerts}
						quotedText={quotedText}
						onClearQuotedText={onClearQuotedText}
					/>
				</div>
			) : null}
		</>
	)
}

export function LoadingConversationState() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<p className="flex items-center gap-1 text-[#666] dark:text-[#919296]">
				Loading
				<LoadingDots />
			</p>
		</div>
	)
}

export function EmptyConversationErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2">
			<p className="text-sm text-red-700 dark:text-red-300">{message}</p>
			{onRetry ? (
				<button
					onClick={onRetry}
					className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
				>
					Retry
				</button>
			) : null}
		</div>
	)
}

function hasStreamingCharts(charts?: ChartSet[]) {
	return Boolean(charts && charts.length > 0)
}
