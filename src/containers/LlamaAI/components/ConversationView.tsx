import type { Dispatch, RefObject, SetStateAction } from 'react'
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
	scrollContainerRef: RefObject<HTMLDivElement | null>
	messagesEndRef: RefObject<HTMLDivElement | null>
	promptInputRef: RefObject<HTMLTextAreaElement | null>
	showScrollToBottom: boolean
	scrollToBottom: () => void
	handleSubmit: (
		prompt: string,
		preResolvedEntities?: Array<{ term: string; slug: string; type?: string }>,
		images?: Array<{ data: string; mimeType: string; filename?: string }>,
		pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string }
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

function ConversationMessageItem({
	message,
	nextUserMessage,
	sessionId,
	readOnly,
	isLlama,
	onActionClick,
	onTableFullscreenOpen
}: {
	message: Message
	nextUserMessage?: string
	sessionId: string | null
	readOnly: boolean
	isLlama: boolean
	onActionClick?: (message: string) => void
	onTableFullscreenOpen?: () => void
}) {
	return (
		<MessageBubble
			message={message}
			sessionId={sessionId}
			readOnly={readOnly}
			isLlama={isLlama}
			onActionClick={onActionClick}
			nextUserMessage={nextUserMessage}
			onTableFullscreenOpen={onTableFullscreenOpen}
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
			!hasStreamingCharts(streamingDraft?.charts) ? (
				<TypingIndicator />
			) : null}

			<div style={{ overflowAnchor: 'none' }}>
				{spawnProgress.size > 0 && spawnIsResearchMode ? (
					<SpawnProgressCard agents={spawnProgress} startTime={spawnStartTime} isResearchMode />
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

			{recovery.status === 'reconnecting' ? (
				<div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
					<p className="text-sm font-medium text-amber-900 dark:text-amber-100">Reconnecting...</p>
					<p className="text-sm text-amber-800 dark:text-amber-200">
						Trying to reconnect to the running {isResearchMode ? 'research session' : 'quick chat'}.
					</p>
					<p className="text-xs text-amber-700 dark:text-amber-300">
						Attempt {Math.max(recovery.attemptCount, 1)}. Connection lost temporarily.
					</p>
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
							Retry
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
	// Keep the newest user prompt in the same block as the live response/status UI
	// so the viewport-sized spacer applies to the whole active exchange.
	const activeExchangeMessage =
		messages[messages.length - 1]?.role === 'user' &&
		(isStreaming || recovery.status === 'reconnecting' || Boolean(error))
			? messages[messages.length - 1]
			: null
	const renderedMessages = activeExchangeMessage ? messages.slice(0, -1) : messages

	return (
		<>
			<div ref={scrollContainerRef} className="relative thin-scrollbar flex-1 overflow-y-auto p-2.5 max-lg:px-0">
				<div className="relative mx-auto flex w-full max-w-3xl flex-col">
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
										onActionClick={!readOnly && !isStreaming ? handleActionClick : undefined}
										onTableFullscreenOpen={onTableFullscreenOpen}
									/>
								)
							})}

							{activeExchangeMessage ? (
								<div
									className={`flex flex-col gap-2.5 ${ACTIVE_EXCHANGE_MIN_HEIGHT_CLASS} ${
										animateActiveExchange
											? 'motion-safe:animate-[llamaActiveExchangeEnter_0.42s_cubic-bezier(0.22,1,0.36,1)_both]'
											: ''
									}`}
								>
									<ConversationMessageItem
										key={activeExchangeMessage.id || 'active-exchange-user'}
										message={activeExchangeMessage}
										sessionId={sessionId}
										readOnly={readOnly}
										isLlama={isLlama}
										onTableFullscreenOpen={onTableFullscreenOpen}
									/>

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
										isResearchMode={isResearchMode}
										sessionId={sessionId}
										readOnly={readOnly}
										isLlama={isLlama}
										onTableFullscreenOpen={onTableFullscreenOpen}
									/>
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
				<div className="relative mx-auto w-full max-w-3xl pb-2.5">
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
