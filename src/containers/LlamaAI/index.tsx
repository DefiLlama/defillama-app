import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import {
	lazy,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useReducer,
	useRef,
	useState,
	type RefObject
} from 'react'
import { Icon } from '~/components/Icon'
import {
	consumePendingPrompt,
	consumePendingPageContext,
	consumePendingSuggestedFlag
} from '~/components/LlamaAIFloatingButton'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { AlertsModal } from '~/containers/LlamaAI/components/AlertsModal'
import { ChatLanding } from '~/containers/LlamaAI/components/ChatLanding'
import {
	ConversationView,
	EmptyConversationErrorState,
	LoadingConversationState
} from '~/containers/LlamaAI/components/ConversationView'
import { ResearchLimitModal } from '~/containers/LlamaAI/components/ResearchLimitModal'
import { SettingsModal } from '~/containers/LlamaAI/components/SettingsModal'
import { AgenticSidebar } from '~/containers/LlamaAI/components/sidebar/AgenticSidebar'
import { TOOL_LABELS } from '~/containers/LlamaAI/components/status/StreamingStatus'
import {
	checkActiveExecution,
	fetchAgenticResponse,
	resumeAgenticStream
} from '~/containers/LlamaAI/fetchAgenticResponse'
import type { AgenticSSECallbacks, CsvExport, SpawnProgressData } from '~/containers/LlamaAI/fetchAgenticResponse'
import { useChatScroll } from '~/containers/LlamaAI/hooks/useChatScroll'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import {
	buildAssistantMessage,
	createInitialStreamState,
	createStreamBuffer,
	streamReducer,
	type ChatPageContext,
	type FailedRequest,
	type RateLimitDetails,
	type StreamBuffer,
	type StreamDispatch
} from '~/containers/LlamaAI/streamState'
import type { AlertProposedData, ChartConfiguration, Message, ToolExecution } from '~/containers/LlamaAI/types'
import { assertResponse } from '~/containers/LlamaAI/utils/assertResponse'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

interface PersistedAlertIntent {
	frequency?: 'daily' | 'weekly'
	hour?: number
	timezone?: string
	dayOfWeek?: number
	dataQuery?: string
}

interface PersistedToolExecution extends ToolExecution {
	toolName?: string
}

interface PersistedMessageMetadata {
	toolExecutions?: PersistedToolExecution[]
	thinking?: string
	alertIntent?: PersistedAlertIntent
	savedAlertId?: string
	savedAlertIds?: string[]
}

interface PersistedMessage {
	role: 'user' | 'assistant'
	content?: string
	charts?: ChartConfiguration[]
	chartData?: Record<string, unknown[]>
	citations?: string[]
	csvExports?: CsvExport[]
	images?: Array<{ url: string; mimeType: string; filename?: string }>
	metadata?: PersistedMessageMetadata
	messageId?: string
	timestamp?: string | number
	savedAlertIds?: string[]
}

interface SharedSession {
	session: { sessionId: string; title: string; createdAt: string; isPublic: boolean }
	messages: SharedSessionMessage[]
	isPublicView: true
}

interface SharedSessionMessage {
	role: 'user' | 'assistant'
	content: string
	messageId?: string
	timestamp: number
	images?: Array<{ url: string; mimeType: string; filename?: string }>
	metadata?: PersistedMessageMetadata
	charts?: ChartConfiguration[]
	chartData?: unknown[] | Record<string, unknown[]>
	citations?: string[]
	csvExports?: CsvExport[]
	savedAlertIds?: string[]
}

interface SessionRestoreResult {
	messages?: PersistedMessage[]
	pagination?: { hasMore?: boolean; cursor?: number | null }
}

interface RestoreSessionSnapshotResult {
	restored: boolean
	recoveredResponse: boolean
}

interface UsageLimitError extends Error {
	code?: 'USAGE_LIMIT_EXCEEDED' | 'FREE_QUESTION_LIMIT'
	details?: Partial<RateLimitDetails>
	upgradeUrl?: string
}

type RequestKind = 'prompt' | 'resume' | 'restore' | 'pagination' | 'idle'
const RECOVERY_GRACE_MS = 8000
const RECOVERY_ATTEMPT_DELAYS_MS = [0, 1000, 3000, 7000] as const
const CONNECTIVITY_ERROR_PATTERNS = [
	'failed to fetch',
	'networkerror',
	'network error',
	'load failed',
	'err_network_changed',
	'network changed',
	'err_name_not_resolved',
	'name not resolved'
] as const

type RecoveryController = {
	id: number
	sessionId: string
	startedAt: number
	buffer: StreamBuffer
	failedRequest: FailedRequest | null
	lastErrorMessage: string | null
	attemptCount: number
	retryTimerIds: number[]
	expiryTimerId: number | null
	attemptInFlight: boolean
	streamAttached: boolean
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
}

function isTemporaryConnectivityError(error: unknown): boolean {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		return true
	}

	const message = getErrorMessage(error).toLowerCase()
	return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

// Normalize older persisted tool payloads that may still use `toolName`.
function mapToolExecution(tool: PersistedToolExecution): ToolExecution {
	return {
		...tool,
		name: tool.name || tool.toolName || 'unknown'
	}
}

// Convert a persisted API message into the UI message shape used by the chat view.
function mapPersistedMessage(message: PersistedMessage): Message {
	return {
		role: message.role,
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
		csvExports: message.csvExports,
		alerts: buildRestoredAlerts({
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		id: message.messageId,
		timestamp: message.timestamp ? new Date(message.timestamp).getTime() : undefined
	}
}

// Map an entire persisted message list into renderable chat messages.
function mapPersistedMessages(messages: PersistedMessage[] | undefined): Message[] {
	if (!messages || messages.length === 0) return []
	return messages.map(mapPersistedMessage)
}

// Capture the current scroll height so older messages can be prepended without jumping the viewport.
function getScrollSnapshot(container: HTMLDivElement | null) {
	return {
		container,
		prevScrollHeight: container?.scrollHeight ?? 0
	}
}

// Wait for the next paint before measuring or restoring scroll positions.
function waitForNextPaint() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve())
	})
}

// Restore the user's relative scroll position after older messages are added above.
function restoreScrollPosition(snapshot: { container: HTMLDivElement | null; prevScrollHeight: number }) {
	if (!snapshot.container) return
	snapshot.container.scrollTop = snapshot.container.scrollHeight - snapshot.prevScrollHeight
}

// Keep pagination state shape consistent across restore and load-more responses.
function normalizePaginationState(pagination: { hasMore?: boolean; cursor?: number | null } | undefined): {
	hasMore: boolean
	cursor: number | null
	isLoadingMore: false
} {
	return {
		hasMore: pagination?.hasMore || false,
		cursor: pagination?.cursor ?? null,
		isLoadingMore: false
	}
}

// Shared/public sessions use a slightly different payload shape, so normalize them separately.
function mapSharedSessionMessage(message: SharedSessionMessage): Message {
	return {
		role: message.role,
		content: message.content || undefined,
		charts:
			message.charts && message.chartData
				? [
						{
							charts: message.charts,
							chartData: normalizeSharedChartDataByChartId(message.charts, message.chartData) as Record<string, any[]>
						}
					]
				: undefined,
		csvExports: message.csvExports,
		citations: message.citations,
		alerts: buildRestoredAlerts({
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		id: message.messageId
	}
}

interface AgenticChatProps {
	initialSessionId?: string
	sharedSession?: SharedSession
	readOnly?: boolean
}

// Rebuild alert artifacts from persisted assistant metadata when restoring a session.
function buildRestoredAlerts({
	messageId,
	metadata,
	savedAlertIds
}: {
	messageId?: string
	metadata?: PersistedMessageMetadata
	savedAlertIds?: string[]
}): AlertProposedData[] | undefined {
	if (!metadata?.alertIntent) return undefined
	const persistedAlertId =
		metadata.savedAlertIds?.[0] || savedAlertIds?.[0] || metadata.savedAlertId || `restored_${messageId}`

	return [
		{
			alertId: persistedAlertId,
			title: metadata.alertIntent.dataQuery || '',
			alertIntent: {
				frequency: metadata.alertIntent.frequency || 'daily',
				hour: metadata.alertIntent.hour ?? 9,
				timezone: metadata.alertIntent.timezone || 'UTC',
				dayOfWeek: metadata.alertIntent.dayOfWeek
			},
			schedule_expression: '',
			next_run_at: ''
		}
	]
}

// Consume the current streamed message id once the buffered assistant message is committed.
function takeCurrentMessageId(ref: RefObject<string | null>) {
	const messageId = ref.current || undefined
	ref.current = null
	return messageId
}

// Shared session chart data may arrive as a flat array; remap it to the keyed shape the renderer expects.
function normalizeSharedChartDataByChartId(
	charts: ChartConfiguration[] | undefined,
	chartData: SharedSessionMessage['chartData']
): Record<string, unknown[]> | undefined {
	if (!charts || charts.length === 0 || !chartData) return undefined
	if (!Array.isArray(chartData)) return chartData

	const fallbackKey = charts[0]?.datasetName || charts[0]?.id || 'default'
	return {
		[fallbackKey]: chartData
	}
}

// Commit the in-memory streamed assistant payload only if anything meaningful was actually received.
function appendBufferedAssistantMessage(
	buffer: StreamBuffer,
	currentMessageIdRef: RefObject<string | null>,
	appendMessage: (message: Message) => void
) {
	const hasBufferedContent =
		buffer.text ||
		buffer.charts.length > 0 ||
		buffer.csvExports.length > 0 ||
		buffer.alerts.length > 0 ||
		buffer.citations.length > 0 ||
		buffer.toolExecutions.length > 0 ||
		buffer.thinking

	if (!hasBufferedContent) {
		currentMessageIdRef.current = null
		return
	}

	appendMessage(buildAssistantMessage(buffer, takeCurrentMessageId(currentMessageIdRef)))
}

// Start tracking a new async request and mark it as the only request allowed to update UI state.
function beginRequest(
	activeRequestIdRef: RefObject<number>,
	activeRequestKindRef: RefObject<RequestKind>,
	activeSessionIdRef: RefObject<string | null>,
	kind: RequestKind,
	sessionId: string | null
) {
	const requestId = activeRequestIdRef.current + 1
	activeRequestIdRef.current = requestId
	activeRequestKindRef.current = kind
	activeSessionIdRef.current = sessionId
	return requestId
}

// Request callbacks use this guard to ignore stale async completions.
function isActiveRequest(activeRequestIdRef: RefObject<number>, requestId: number) {
	return activeRequestIdRef.current === requestId
}

// Clear request bookkeeping once the current request fully settles.
function completeRequest(
	activeRequestIdRef: RefObject<number>,
	activeRequestKindRef: RefObject<RequestKind>,
	activeSessionIdRef: RefObject<string | null>,
	requestId: number
) {
	if (!isActiveRequest(activeRequestIdRef, requestId)) return
	activeRequestKindRef.current = 'idle'
	activeSessionIdRef.current = null
}

type RequestSettleState = {
	requestId: number
	promise: Promise<void>
	resolve: () => void
} | null

// Create a promise that lets abort paths wait for the active request to finish its cleanup work.
function createRequestSettleState(requestId: number): Exclude<RequestSettleState, null> {
	let resolve = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	return { requestId, promise, resolve }
}

// Build one callback bundle shared by live prompt submits and resumed server-side streams.
function createAgenticCallbacks({
	requestId,
	activeRequestIdRef,
	buffer,
	dispatch,
	currentMessageIdRef,
	toolCallIdRef,
	onSessionId,
	onTitle,
	appendMessage,
	notify
}: {
	requestId: number
	activeRequestIdRef: RefObject<number>
	buffer: StreamBuffer
	dispatch: StreamDispatch
	currentMessageIdRef: RefObject<string | null>
	toolCallIdRef: RefObject<number>
	onSessionId?: (sessionId: string) => void
	onTitle?: (title: string) => void
	appendMessage: (message: Message) => void
	notify: () => void
}): AgenticSSECallbacks {
	return {
		onToken: (content) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			if (!buffer.hasStartedText) {
				buffer.hasStartedText = true
				dispatch({ type: 'CLEAR_ACTIVITY' })
			}
			buffer.text += content
			dispatch({ type: 'APPEND_TOKEN', value: content })
		},
		onCharts: (charts, chartData) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			dispatch({ type: 'CLEAR_ACTIVITY' })
			const chartSet = { charts, chartData: chartData as Record<string, any[]> }
			buffer.charts.push(chartSet)
			dispatch({ type: 'APPEND_CHARTS', value: chartSet })
		},
		onCsvExport: (exports) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.csvExports.push(...exports)
			dispatch({ type: 'APPEND_CSV_EXPORTS', value: exports })
		},
		onAlertProposed: (data) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.alerts.push(data)
			dispatch({ type: 'APPEND_ALERT', value: data })
		},
		onCitations: (citations) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.citations = [...new Set([...buffer.citations, ...citations])]
			dispatch({ type: 'MERGE_CITATIONS', value: citations })
		},
		onProgress: (toolName) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			const label = TOOL_LABELS[toolName] || toolName
			const toolCall = { id: ++toolCallIdRef.current, name: toolName, label }
			dispatch({ type: 'APPEND_TOOL_CALL', value: toolCall })
		},
		onToolExecution: (data) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.toolExecutions.push(data)
			dispatch({ type: 'APPEND_TOOL_EXECUTION', value: data })
		},
		onThinking: (content) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.thinking += content
			dispatch({ type: 'APPEND_THINKING', value: content })
		},
		onSpawnProgress: (data: SpawnProgressData) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			if (data.status === 'started' && !buffer.spawnStarted) {
				buffer.spawnStarted = true
				dispatch({ type: 'SET_SPAWN_START_TIME', value: Date.now() })
			}
			dispatch({
				type: 'UPSERT_SPAWN_PROGRESS',
				value: {
					id: data.agentId,
					status: data.status,
					tool: data.tool,
					toolCount: data.toolCount,
					chartCount: data.chartCount,
					findingsPreview: data.findingsPreview
				}
			})
		},
		onCompaction: (data) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			dispatch({ type: 'SET_COMPACTING', value: data.status === 'started' })
		},
		onSessionId: (sessionId) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onSessionId?.(sessionId)
		},
		onMessageId: (messageId) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			currentMessageIdRef.current = messageId
		},
		onTitle: (title) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onTitle?.(title)
		},
		onError: (content) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			dispatch({ type: 'SET_ERROR', value: content })
		},
		onDone: () => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
			dispatch({ type: 'RESET_STREAM' })
			notify()
		}
	}
}

export function AgenticChat({ initialSessionId, sharedSession, readOnly = false }: AgenticChatProps = {}) {
	const { authorizedFetch, user } = useAuthContext()

	const getAuthorizedFetchInput = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
		if (!(input instanceof Request)) {
			const url = typeof input === 'string' ? input : input.toString()
			return { url, init }
		}

		const mergedHeaders = new Headers(input.headers)
		if (init?.headers) {
			new Headers(init.headers).forEach((value, key) => {
				mergedHeaders.set(key, value)
			})
		}

		const mergedInit: RequestInit = {
			method: init?.method ?? input.method,
			headers: mergedHeaders,
			body: init?.body ?? input.body,
			cache: init?.cache ?? input.cache,
			credentials: init?.credentials ?? input.credentials,
			integrity: init?.integrity ?? input.integrity,
			keepalive: init?.keepalive ?? input.keepalive,
			mode: init?.mode ?? input.mode,
			priority: init?.priority,
			redirect: init?.redirect ?? input.redirect,
			referrer: init?.referrer ?? input.referrer,
			referrerPolicy: init?.referrerPolicy ?? input.referrerPolicy,
			signal: init?.signal ?? input.signal,
			window: init?.window
		}

		return { url: input.url, init: mergedInit }
	}, [])

	// Adapt the auth helper to the native fetch signature while preserving non-2xx responses for downstream error handling.
	const authorizedFetchCompat = useCallback<typeof fetch>(
		async (input, init) => {
			const request = getAuthorizedFetchInput(input, init)
			const response = await authorizedFetch(request.url, request.init)
			if (!response) {
				throw new Error('Authorized request failed')
			}
			return response
		},
		[authorizedFetch, getAuthorizedFetchInput]
	)
	// Guard authenticated fetches so downstream code never has to handle a null/empty response object.
	const authorizedFetchStrict = useCallback<typeof fetch>(
		async (input, init) => {
			const request = getAuthorizedFetchInput(input, init)
			return assertResponse(await authorizedFetch(request.url, request.init), 'Authorized request failed')
		},
		[authorizedFetch, getAuthorizedFetchInput]
	)
	const isLlama = !!user?.flags?.is_llama
	const {
		sessions,
		researchUsage,
		isLoading: isLoadingSessions,
		error: sessionListError,
		moveSessionToTop
	} = useSessionList()
	const {
		createSession,
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		deleteSession,
		updateSessionTitle,
		isDeletingSession,
		isUpdatingTitle
	} = useSessionMutations()
	const { sidebarVisible, toggleSidebar } = useSidebarVisibility()
	const { notify, requestPermission } = useStreamNotification()
	const alertsModalStore = Ariakit.useDialogStore()
	const settingsModalStore = Ariakit.useDialogStore()
	const [shouldRenderSubscribeModal, setShouldRenderSubscribeModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({
		open: shouldRenderSubscribeModal,
		setOpen: setShouldRenderSubscribeModal
	})

	const [messages, setMessages] = useState<Message[]>([])
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [sessionTitle, setSessionTitle] = useState<string | null>(null)
	const [streamState, dispatchStream] = useReducer(streamReducer, undefined, createInitialStreamState)
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [customInstructions, setCustomInstructions] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-custom-instructions') || '' : ''
	)
	const [enableMemory, setEnableMemory] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-enable-memory') !== 'false' : true
	)
	const [hackerMode, setHackerMode] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-hacker-mode') === 'true' : false
	)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [restoringSessionId, setRestoringSessionId] = useState<string | null>(() =>
		initialSessionId && !sharedSession ? initialSessionId : null
	)
	const [viewError, setViewError] = useState<string | null>(null)
	const [paginationError, setPaginationError] = useState<string | null>(null)
	const researchModalStore = Ariakit.useDialogStore()
	const currentMessageIdRef = useRef<string | null>(null)
	const pendingInitialSessionIdRef = useRef(initialSessionId)
	const activeRequestIdRef = useRef(0)
	const activeRequestKindRef = useRef<RequestKind>('idle')
	const activeSessionIdRef = useRef<string | null>(null)
	const activeRequestSettleRef = useRef<RequestSettleState>(null)
	const restoredSessionIdRef = useRef<string | null>(null)
	const recoveryIdRef = useRef(0)
	const recoveryControllerRef = useRef<RecoveryController | null>(null)
	const attemptRecoveryForControllerRef = useRef<(recoveryId: number) => void>(() => {})
	const [paginationState, setPaginationState] = useState<{
		hasMore: boolean
		cursor: number | null
		isLoadingMore: boolean
	}>({ hasMore: false, cursor: null, isLoadingMore: false })

	const abortControllerRef = useRef<AbortController | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const promptInputRef = useRef<HTMLTextAreaElement>(null)
	const toolCallIdRef = useRef(0)
	const promptSubmissionLockRef = useRef(false)
	const isFirstMessageRef = useRef(true)
	const {
		isStreaming,
		isCompacting,
		text: streamingText,
		charts: streamingCharts,
		csvExports: streamingCsvExports,
		alerts: streamingAlerts,
		citations: streamingCitations,
		toolExecutions: streamingToolExecutions,
		thinking: streamingThinking,
		activeToolCalls,
		spawnProgress,
		spawnStartTime,
		recovery,
		error,
		lastFailedRequest,
		rateLimitDetails
	} = streamState

	const sharedMessages = useMemo(() => sharedSession?.messages.map(mapSharedSessionMessage) ?? null, [sharedSession])
	const effectiveMessages = sharedMessages ?? messages
	const effectiveSessionId = sharedSession?.session.sessionId ?? sessionId
	const effectiveSessionTitle = sharedSession?.session.title ?? sessionTitle
	const hasMessages = effectiveMessages.length > 0 || isStreaming
	const visibleError = viewError ?? error

	const streamingDraft = useMemo((): Message | null => {
		if (!isStreaming) return null
		const hasContent =
			streamingText ||
			streamingCharts.length > 0 ||
			streamingCsvExports.length > 0 ||
			streamingAlerts.length > 0 ||
			streamingCitations.length > 0
		if (!hasContent) return null
		return {
			role: 'assistant',
			content: streamingText || undefined,
			charts: streamingCharts.length > 0 ? streamingCharts : undefined,
			csvExports: streamingCsvExports.length > 0 ? streamingCsvExports : undefined,
			alerts: streamingAlerts.length > 0 ? streamingAlerts : undefined,
			citations: streamingCitations.length > 0 ? streamingCitations : undefined,
			toolExecutions: streamingToolExecutions.length > 0 ? streamingToolExecutions : undefined
		}
	}, [
		isStreaming,
		streamingText,
		streamingCharts,
		streamingCsvExports,
		streamingAlerts,
		streamingCitations,
		streamingToolExecutions
	])

	// Hydrate per-user settings once auth is ready.
	useEffect(() => {
		if (!user) return
		authorizedFetchStrict(`${MCP_SERVER}/user-settings`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				const serverValue = data?.settings?.customInstructions
				if (typeof serverValue === 'string') {
					setCustomInstructions(serverValue)
					localStorage.setItem('llamaai-custom-instructions', serverValue)
				}
				if (typeof data?.settings?.enableMemory === 'boolean') {
					setEnableMemory(data.settings.enableMemory)
					localStorage.setItem('llamaai-enable-memory', String(data.settings.enableMemory))
				}
				if (typeof data?.settings?.hackerMode === 'boolean') {
					setHackerMode(data.settings.hackerMode)
					localStorage.setItem('llamaai-hacker-mode', String(data.settings.hackerMode))
					window.dispatchEvent(new Event('llamaai-hacker-mode-changed'))
				}
			})
			.catch(() => {})
	}, [user, authorizedFetchStrict])

	// Load older messages when the user reaches the top, while preserving the current viewport position.
	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore || isStreaming) return

		const requestId = beginRequest(
			activeRequestIdRef,
			activeRequestKindRef,
			activeSessionIdRef,
			'pagination',
			sessionId
		)
		setPaginationError(null)
		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))
		await waitForNextPaint()
		const scrollSnapshot = getScrollSnapshot(scrollContainerRef.current)
		const result = await loadMoreMessages(sessionId, paginationState.cursor!).catch(() => {
			if (isActiveRequest(activeRequestIdRef, requestId) && activeSessionIdRef.current === sessionId) {
				setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
				setPaginationError('Failed to load older messages')
			}
			completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			return null
		})
		if (!result) return
		if (!isActiveRequest(activeRequestIdRef, requestId) || activeSessionIdRef.current !== sessionId) {
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
			completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			return
		}
		const older = mapPersistedMessages(result.messages)

		setMessages((prev) => [...older, ...prev])

		requestAnimationFrame(() => {
			restoreScrollPosition(scrollSnapshot)
		})

		setPaginationState(normalizePaginationState(result.pagination))
		completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
	}, [sessionId, paginationState, loadMoreMessages, isStreaming])

	// Expose the load-more callback through a stable event wrapper for the scroll listener.
	const handleLoadMoreMessagesEvent = useEffectEvent(() => {
		void handleLoadMoreMessages()
	})

	const { enableAutoScroll, scrollToBottom, showScrollToBottom } = useChatScroll({
		scrollContainerRef,
		isStreaming,
		items: effectiveMessages,
		hasMessages,
		paginationState,
		onLoadMoreMessages: handleLoadMoreMessagesEvent
	})

	// Trigger the sidebar open/close animation before toggling visibility.
	const handleSidebarToggle = useCallback(() => {
		setShouldAnimateSidebar(true)
		toggleSidebar()
	}, [toggleSidebar])

	// Append one message to the live conversation state.
	const appendMessage = useCallback((message: Message) => {
		setMessages((prev) => [...prev, message])
	}, [])

	const clearRecoveryRetryTimers = useCallback((controller: RecoveryController) => {
		for (const timerId of controller.retryTimerIds) {
			window.clearTimeout(timerId)
		}
		controller.retryTimerIds = []
	}, [])

	const clearRecoveryController = useCallback(
		(resetState: boolean = true) => {
			const controller = recoveryControllerRef.current
			if (controller) {
				clearRecoveryRetryTimers(controller)
				if (controller.expiryTimerId !== null) {
					window.clearTimeout(controller.expiryTimerId)
				}
			}
			recoveryControllerRef.current = null
			if (resetState) {
				dispatchStream({ type: 'RESET_RECOVERY' })
			}
		},
		[clearRecoveryRetryTimers]
	)

	// Reattach to a server-side execution that is still running for the current session.
	const resumeRunningExecution = useCallback(
		async ({
			targetSessionId,
			buffer = createStreamBuffer(),
			resetStream = true,
			onTemporaryDisconnect
		}: {
			targetSessionId: string
			buffer?: StreamBuffer
			resetStream?: boolean
			onTemporaryDisconnect?: (error: Error, streamBuffer: StreamBuffer) => void
		}) => {
			let activeExecution: Awaited<ReturnType<typeof checkActiveExecution>>
			try {
				activeExecution = await checkActiveExecution(targetSessionId, authorizedFetchCompat)
			} catch (checkActiveExecutionError) {
				const checkError =
					checkActiveExecutionError instanceof Error
						? checkActiveExecutionError
						: new Error(getErrorMessage(checkActiveExecutionError))
				if (onTemporaryDisconnect && isTemporaryConnectivityError(checkError)) {
					onTemporaryDisconnect(checkError, buffer)
					return false
				}
				dispatchStream({ type: 'SET_ERROR', value: checkError.message })
				return false
			}
			const { active } = activeExecution
			if (!active) return false

			setViewError(null)
			setPaginationError(null)
			dispatchStream({ type: 'SET_ERROR', value: null })
			dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
			dispatchStream({ type: 'RESET_RECOVERY' })

			if (resetStream) {
				dispatchStream({ type: 'START_STREAM' })
				currentMessageIdRef.current = null
			}

			const resumeRequestId = beginRequest(
				activeRequestIdRef,
				activeRequestKindRef,
				activeSessionIdRef,
				'resume',
				targetSessionId
			)
			const controller = new AbortController()
			abortControllerRef.current = controller
			const settleState = createRequestSettleState(resumeRequestId)
			activeRequestSettleRef.current = settleState

			const callbacks = createAgenticCallbacks({
				requestId: resumeRequestId,
				activeRequestIdRef,
				buffer,
				dispatch: dispatchStream,
				currentMessageIdRef,
				toolCallIdRef,
				appendMessage,
				notify,
				onTitle: (title) => {
					setSessionTitle(title)
					updateSessionTitle({ sessionId: targetSessionId, title }).catch(() => {})
					moveSessionToTop(targetSessionId)
				}
			})

			void resumeAgenticStream({
				sessionId: targetSessionId,
				callbacks,
				abortSignal: controller.signal,
				fetchFn: authorizedFetchCompat
			})
				.catch((resumeError: Error) => {
					if (!isActiveRequest(activeRequestIdRef, resumeRequestId)) return
					if (resumeError?.name === 'AbortError') {
						appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
						dispatchStream({ type: 'RESET_STREAM' })
						return
					}
					if (onTemporaryDisconnect && isTemporaryConnectivityError(resumeError)) {
						onTemporaryDisconnect(resumeError, buffer)
						return
					}
					clearRecoveryController()
					dispatchStream({
						type: 'SET_ERROR',
						value: 'Lost connection while waiting for the running execution. Retry to reconnect.'
					})
					dispatchStream({ type: 'RESET_STREAM' })
				})
				.finally(() => {
					const recoveryController = recoveryControllerRef.current
					if (recoveryController?.sessionId === targetSessionId && recoveryController.streamAttached) {
						clearRecoveryController()
					}
					if (isActiveRequest(activeRequestIdRef, resumeRequestId)) {
						abortControllerRef.current = null
						completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, resumeRequestId)
					}
					settleState.resolve()
					if (activeRequestSettleRef.current?.requestId === resumeRequestId) {
						activeRequestSettleRef.current = null
					}
				})

			return true
		},
		[authorizedFetchCompat, appendMessage, clearRecoveryController, moveSessionToTop, notify, updateSessionTitle]
	)

	const restoreSessionSnapshot = useCallback(
		async (targetSessionId: string, expectedRequestId: number): Promise<RestoreSessionSnapshotResult> => {
			const result = await restoreSession(targetSessionId).catch(() => null as SessionRestoreResult | null)
			if (!result || activeRequestIdRef.current !== expectedRequestId) {
				return { restored: false, recoveredResponse: false }
			}

			const restored: Message[] = (result.messages || []).map(mapPersistedMessage)
			const recoveredResponse = restored[restored.length - 1]?.role === 'assistant'

			setMessages(restored)
			setSessionId(targetSessionId)
			const match = sessions.find((session) => session.sessionId === targetSessionId)
			setSessionTitle(match?.title || null)
			restoredSessionIdRef.current = targetSessionId
			isFirstMessageRef.current = false
			enableAutoScroll()
			setPaginationState({
				hasMore: result.pagination?.hasMore ?? false,
				cursor: result.pagination?.cursor ?? null,
				isLoadingMore: false
			})
			setViewError(null)
			setPaginationError(null)
			dispatchStream({ type: 'SET_ERROR', value: null })
			dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
			dispatchStream({ type: 'RESET_RECOVERY' })
			return { restored: true, recoveredResponse }
		},
		[enableAutoScroll, restoreSession, sessions]
	)

	const exhaustRecovery = useCallback(
		(controller: RecoveryController) => {
			if (recoveryControllerRef.current?.id !== controller.id) return
			clearRecoveryController()
			appendBufferedAssistantMessage(controller.buffer, currentMessageIdRef, appendMessage)
			dispatchStream({ type: 'RESET_STREAM' })
			dispatchStream({
				type: 'SET_ERROR',
				value: controller.lastErrorMessage || 'Failed to reconnect. Please try again.'
			})
			dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: controller.failedRequest })
		},
		[appendMessage, clearRecoveryController]
	)

	const queueRecoveryAttempt = useCallback((recoveryId: number, delay: number) => {
		return window.setTimeout(() => {
			attemptRecoveryForControllerRef.current(recoveryId)
		}, delay)
	}, [])

	const attemptRecoveryForController = useEffectEvent((recoveryId: number) => {
		const controller = recoveryControllerRef.current
		if (!controller || controller.id !== recoveryId || controller.attemptInFlight) return

		controller.attemptInFlight = true
		controller.attemptCount += 1
		dispatchStream({
			type: 'UPDATE_RECOVERY',
			attemptCount: controller.attemptCount,
			lastErrorMessage: controller.lastErrorMessage
		})

		void (async () => {
			const currentController = recoveryControllerRef.current
			if (!currentController || currentController.id !== recoveryId) return

			const didResume = await resumeRunningExecution({
				targetSessionId: currentController.sessionId,
				buffer: currentController.buffer,
				resetStream: false,
				onTemporaryDisconnect: (disconnectError, streamBuffer) => {
					const latest = recoveryControllerRef.current
					if (!latest || latest.id !== recoveryId) return
					latest.streamAttached = false
					latest.buffer = streamBuffer
					latest.lastErrorMessage = getErrorMessage(disconnectError)
					dispatchStream({
						type: 'UPDATE_RECOVERY',
						attemptCount: latest.attemptCount,
						lastErrorMessage: latest.lastErrorMessage
					})
					if (Date.now() >= latest.startedAt + RECOVERY_GRACE_MS) {
						exhaustRecovery(latest)
						return
					}
					queueRecoveryAttempt(recoveryId, 250)
				}
			})
			if (didResume) {
				const latest = recoveryControllerRef.current
				if (!latest || latest.id !== recoveryId) return
				latest.streamAttached = true
				clearRecoveryRetryTimers(latest)
				return
			}

			const { restored: didRestore } = await restoreSessionSnapshot(
				currentController.sessionId,
				activeRequestIdRef.current
			)
			if (didRestore) {
				dispatchStream({ type: 'RESET_STREAM' })
				clearRecoveryController()
				return
			}

			const latest = recoveryControllerRef.current
			if (!latest || latest.id !== recoveryId) return
			if (Date.now() >= latest.startedAt + RECOVERY_GRACE_MS) {
				exhaustRecovery(latest)
			}
		})().finally(() => {
			const latest = recoveryControllerRef.current
			if (!latest || latest.id !== recoveryId) return
			latest.attemptInFlight = false
		})
	})

	useEffect(() => {
		attemptRecoveryForControllerRef.current = attemptRecoveryForController
	}, [])

	const startRecoveryCycle = useCallback(
		({
			targetSessionId,
			buffer,
			failedRequest,
			error: recoveryError
		}: {
			targetSessionId: string
			buffer: StreamBuffer
			failedRequest: FailedRequest | null
			error: Error
		}) => {
			const existing = recoveryControllerRef.current
			if (existing?.sessionId === targetSessionId) {
				existing.buffer = buffer
				existing.failedRequest = failedRequest
				existing.lastErrorMessage = getErrorMessage(recoveryError)
				dispatchStream({
					type: 'UPDATE_RECOVERY',
					attemptCount: existing.attemptCount,
					lastErrorMessage: existing.lastErrorMessage
				})
				return true
			}

			clearRecoveryController(false)

			const startedAt = Date.now()
			const controller: RecoveryController = {
				id: recoveryIdRef.current + 1,
				sessionId: targetSessionId,
				startedAt,
				buffer,
				failedRequest,
				lastErrorMessage: getErrorMessage(recoveryError),
				attemptCount: 0,
				retryTimerIds: [],
				expiryTimerId: null,
				attemptInFlight: false,
				streamAttached: false
			}
			recoveryIdRef.current = controller.id
			recoveryControllerRef.current = controller
			dispatchStream({
				type: 'START_RECOVERY',
				startedAt,
				lastErrorMessage: controller.lastErrorMessage
			})

			for (const delay of RECOVERY_ATTEMPT_DELAYS_MS) {
				const timerId = queueRecoveryAttempt(controller.id, delay)
				controller.retryTimerIds.push(timerId)
			}

			controller.expiryTimerId = window.setTimeout(() => {
				const latest = recoveryControllerRef.current
				if (!latest || latest.id !== controller.id || latest.attemptInFlight || latest.streamAttached) return
				exhaustRecovery(latest)
			}, RECOVERY_GRACE_MS)
			return true
		},
		[clearRecoveryController, exhaustRecovery, queueRecoveryAttempt]
	)

	// Abort the active request and wait for its cleanup path to finish before starting another one.
	const abortActiveRequest = useCallback(async () => {
		const controller = abortControllerRef.current
		const requestId = activeRequestIdRef.current
		const settleState = activeRequestSettleRef.current

		if (controller && settleState?.requestId === requestId) {
			controller.abort()
			await settleState.promise.catch(() => {})
		}

		activeRequestIdRef.current += 1
		activeRequestKindRef.current = 'idle'
		activeSessionIdRef.current = null
		currentMessageIdRef.current = null
		abortControllerRef.current = null
		activeRequestSettleRef.current = null
		clearRecoveryController()
	}, [clearRecoveryController])

	// Reset transient streaming and error state without touching the actual message history.
	const clearConversationRuntimeState = useCallback(() => {
		clearRecoveryController()
		setViewError(null)
		setPaginationError(null)
		dispatchStream({ type: 'RESET_STREAM' })
		dispatchStream({ type: 'SET_ERROR', value: null })
		dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
		dispatchStream({ type: 'SET_RATE_LIMIT_DETAILS', value: null })
	}, [clearRecoveryController])

	// Start a brand-new chat, or route away from a session page back to the base chat route.
	const handleNewChat = useCallback(async () => {
		if (initialSessionId) {
			void Router.push('/ai/chat', undefined, { shallow: true })
			return
		}
		await abortActiveRequest()
		clearConversationRuntimeState()
		setMessages([])
		setSessionId(null)
		setSessionTitle(null)
		restoredSessionIdRef.current = null
		isFirstMessageRef.current = true
		enableAutoScroll()
		setPaginationState({ hasMore: false, cursor: null, isLoadingMore: false })
		promptInputRef.current?.focus()
	}, [initialSessionId, abortActiveRequest, clearConversationRuntimeState, enableAutoScroll])

	// Restore a saved session, and resume any still-active server execution attached to it.
	const handleSessionSelect = useCallback(
		async (selectedSessionId: string) => {
			if (selectedSessionId === restoredSessionIdRef.current && selectedSessionId === sessionId) return
			setRestoringSessionId(selectedSessionId)
			await abortActiveRequest()
			clearConversationRuntimeState()

			const requestId = beginRequest(
				activeRequestIdRef,
				activeRequestKindRef,
				activeSessionIdRef,
				'restore',
				selectedSessionId
			)
			const { restored: restoredOk } = await restoreSessionSnapshot(selectedSessionId, requestId)

			if (!restoredOk) {
				if (!isActiveRequest(activeRequestIdRef, requestId)) return
				setViewError('Failed to restore session')
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				setRestoringSessionId(null)
				return
			}

			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			window.history.replaceState(null, '', `/ai/chat/${selectedSessionId}`)
			setRestoringSessionId(null)

			if (!isActiveRequest(activeRequestIdRef, requestId)) return

			const didResume = await resumeRunningExecution({
				targetSessionId: selectedSessionId,
				onTemporaryDisconnect: (disconnectError, buffer) => {
					startRecoveryCycle({
						targetSessionId: selectedSessionId,
						buffer,
						failedRequest: null,
						error: disconnectError
					})
				}
			})
			if (!isActiveRequest(activeRequestIdRef, requestId) && !didResume) return

			if (!didResume) {
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			}
		},
		[
			sessionId,
			abortActiveRequest,
			clearConversationRuntimeState,
			restoreSessionSnapshot,
			resumeRunningExecution,
			startRecoveryCycle
		]
	)

	// Submit a new prompt, create a fake local session for the first message if needed, and stream the response.
	const handleSubmit = useCallback(
		(
			prompt: string,
			entities?: Array<{ term: string; slug: string; type?: string }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>,
			pageContext?: ChatPageContext,
			isSuggestedQuestion?: boolean
		) => {
			const trimmed = prompt.trim()
			if (!trimmed || isStreaming || promptSubmissionLockRef.current) return
			promptSubmissionLockRef.current = true

			void abortActiveRequest()
				.then(() => {
					setViewError(null)
					setPaginationError(null)
					requestPermission()
					dispatchStream({ type: 'START_STREAM' })
					currentMessageIdRef.current = null

					let currentSessionId = sessionId

					if (isFirstMessageRef.current && !currentSessionId) {
						currentSessionId = createFakeSession()
						setSessionId(currentSessionId)
						isFirstMessageRef.current = false
					}

					const userImages = images?.map((img) => ({ url: img.data, mimeType: img.mimeType, filename: img.filename }))
					setMessages((prev) => [
						...prev,
						{ role: 'user', content: trimmed, images: userImages?.length ? userImages : undefined }
					])
					enableAutoScroll()

					const buffer = createStreamBuffer()
					const controller = new AbortController()
					abortControllerRef.current = controller
					const requestId = beginRequest(
						activeRequestIdRef,
						activeRequestKindRef,
						activeSessionIdRef,
						'prompt',
						currentSessionId
					)
					const settleState = createRequestSettleState(requestId)
					activeRequestSettleRef.current = settleState

					void fetchAgenticResponse({
						message: trimmed,
						sessionId: currentSessionId,
						researchMode: isResearchMode,
						entities: entities?.length ? entities : undefined,
						images: images?.length ? images : undefined,
						pageContext,
						customInstructions: customInstructions || undefined,
						isSuggestedQuestion,
						abortSignal: controller.signal,
						fetchFn: authorizedFetchCompat,
						callbacks: createAgenticCallbacks({
							requestId,
							activeRequestIdRef,
							buffer,
							dispatch: dispatchStream,
							currentMessageIdRef,
							toolCallIdRef,
							appendMessage,
							notify,
							onSessionId: (id) => {
								if (!isActiveRequest(activeRequestIdRef, requestId)) return
								const previousSessionId = currentSessionId
								setSessionId(id)
								currentSessionId = id
								activeSessionIdRef.current = id
								if (previousSessionId !== id && !sessions.some((session) => session.sessionId === id)) {
									void createSession({
										sessionId: id,
										title: sessionTitle ?? undefined
									}).catch((createSessionError) => {
										console.error('[llama-ai] [createSession] failed:', getErrorMessage(createSessionError))
									})
								}
							},
							onTitle: (title) => {
								if (!isActiveRequest(activeRequestIdRef, requestId)) return
								setSessionTitle(title)
								if (currentSessionId) {
									updateSessionTitle({ sessionId: currentSessionId, title }).catch(() => {})
									moveSessionToTop(currentSessionId)
								}
							}
						})
					})
						.catch(async (err: UsageLimitError) => {
							if (!isActiveRequest(activeRequestIdRef, requestId)) return
							const failedRequest: FailedRequest = {
								prompt: trimmed,
								entities: entities?.length ? entities : undefined,
								images: images?.length ? images : undefined,
								pageContext
							}
							if (err?.name === 'AbortError') {
								appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
								dispatchStream({ type: 'RESET_STREAM' })
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
								return
							}
							if (err?.code === 'FREE_QUESTION_LIMIT') {
								appendMessage({
									role: 'assistant',
									content: err.message || "You've reached the free question limit. Subscribe for unlimited access."
								})
								dispatchStream({ type: 'RESET_STREAM' })
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
								return
							}
							if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
								dispatchStream({
									type: 'SET_RATE_LIMIT_DETAILS',
									value: {
										period: err.details?.period || 'lifetime',
										limit: err.details?.limit || 0,
										resetTime: err.details?.resetTime || null
									}
								})
								dispatchStream({ type: 'RESET_STREAM' })
								researchModalStore.show()
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
								return
							}
							if (
								currentSessionId &&
								isTemporaryConnectivityError(err) &&
								startRecoveryCycle({
									targetSessionId: currentSessionId,
									buffer,
									failedRequest,
									error: err instanceof Error ? err : new Error(getErrorMessage(err))
								})
							) {
								return
							}
							dispatchStream({ type: 'SET_ERROR', value: err?.message || 'Failed to get response' })
							dispatchStream({
								type: 'SET_LAST_FAILED_REQUEST',
								value: failedRequest
							})
							appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
							dispatchStream({ type: 'RESET_STREAM' })
							completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
						})
						.finally(() => {
							if (isActiveRequest(activeRequestIdRef, requestId)) {
								abortControllerRef.current = null
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
							}
							settleState.resolve()
							if (activeRequestSettleRef.current?.requestId === requestId) {
								activeRequestSettleRef.current = null
							}
							promptSubmissionLockRef.current = false
						})
				})
				.catch(() => {
					promptSubmissionLockRef.current = false
				})
		},
		[
			isStreaming,
			sessionId,
			isResearchMode,
			authorizedFetchCompat,
			createSession,
			createFakeSession,
			updateSessionTitle,
			moveSessionToTop,
			researchModalStore,
			requestPermission,
			notify,
			customInstructions,
			appendMessage,
			abortActiveRequest,
			startRecoveryCycle,
			sessionTitle,
			sessions,
			enableAutoScroll
		]
	)

	// Stop the active streamed response while preserving already-buffered output.
	const handleStopRequest = useCallback(() => {
		void abortActiveRequest()
		dispatchStream({ type: 'RESET_STREAM' })
	}, [abortActiveRequest])

	// Reuse the same submit path for assistant action buttons.
	const handleActionClick = useCallback(
		(message: string) => {
			if (!isStreaming) handleSubmit(message)
		},
		[isStreaming, handleSubmit]
	)

	// Retry the last failed prompt submission with the same prompt, images, and page context.
	const handleRetryLastFailedPrompt = useCallback(() => {
		if (!lastFailedRequest) return
		dispatchStream({ type: 'SET_ERROR', value: null })
		void (async () => {
			if (sessionId) {
				await abortActiveRequest()
				const didResume = await resumeRunningExecution({ targetSessionId: sessionId })
				if (didResume) return
				const restoreResult = await restoreSessionSnapshot(sessionId, activeRequestIdRef.current)
				if (restoreResult.recoveredResponse) return
			}
			handleSubmit(
				lastFailedRequest.prompt,
				lastFailedRequest.entities,
				lastFailedRequest.images,
				lastFailedRequest.pageContext
			)
		})()
	}, [abortActiveRequest, handleSubmit, lastFailedRequest, restoreSessionSnapshot, resumeRunningExecution, sessionId])

	// Consume pending prompts injected by the floating button once the base chat page mounts.
	const submitPendingPromptEvent = useEffectEvent(
		(
			prompt: string,
			pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string },
			isSuggestedQuestion?: boolean
		) => {
			handleSubmit(prompt, undefined, undefined, pageContext, isSuggestedQuestion)
		}
	)

	// Auto-submit prompts forwarded from elsewhere in the app when landing on the base chat route.
	useEffect(() => {
		if (initialSessionId || sharedSession) return
		const pendingPrompt = consumePendingPrompt()
		const pendingPageContext = consumePendingPageContext()
		const isSuggested = consumePendingSuggestedFlag()
		if (pendingPrompt) {
			submitPendingPromptEvent(pendingPrompt, pendingPageContext ?? undefined, isSuggested || undefined)
		}
	}, [initialSessionId, sharedSession])

	// When returning to the tab after a dropped stream, try to reconnect to any still-running execution.
	const reconnectVisibleExecutionEvent = useEffectEvent(() => {
		const controller = recoveryControllerRef.current
		if (!controller || readOnly) return
		attemptRecoveryForController(controller.id)
	})

	useEffect(() => {
		const onVisibilityChange = () => {
			if (!document.hidden) {
				reconnectVisibleExecutionEvent()
			}
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		return () => document.removeEventListener('visibilitychange', onVisibilityChange)
	}, [])

	useEffect(() => {
		const onOnline = () => {
			reconnectVisibleExecutionEvent()
		}

		window.addEventListener('online', onOnline)
		return () => window.removeEventListener('online', onOnline)
	}, [])

	// Mirror route param updates into a ref so the restore effect can consume them once.
	useEffect(() => {
		pendingInitialSessionIdRef.current = initialSessionId
	}, [initialSessionId])

	// Restore the requested session as soon as the routed session id becomes available.
	useEffect(() => {
		const nextSessionId = pendingInitialSessionIdRef.current
		if (!nextSessionId) return

		pendingInitialSessionIdRef.current = undefined
		restoredSessionIdRef.current = null
		void handleSessionSelect(nextSessionId)
	}, [initialSessionId, handleSessionSelect])

	// Shared/public sessions are read-only snapshots, so they should never create a fake local session.
	useEffect(() => {
		if (!sharedSession) return
		isFirstMessageRef.current = false
	}, [sharedSession])

	if (!user && !readOnly) {
		return (
			<>
				<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<p className="flex items-center gap-1 text-center">
						Please{' '}
						<button
							onClick={() => {
								if (!shouldRenderSubscribeModal) setShouldRenderSubscribeModal(true)
								subscribeModalStore.show()
							}}
							className="underline"
						>
							log in
						</button>{' '}
						to use LlamaAI.
					</p>
				</div>
				{shouldRenderSubscribeModal ? (
					<Suspense fallback={<></>}>
						<SubscribeProModal dialogStore={subscribeModalStore} />
					</Suspense>
				) : null}
			</>
		)
	}

	return (
		<div className="relative isolate flex h-[calc(100dvh-68px)] flex-nowrap overflow-hidden max-lg:flex-col lg:h-[calc(100dvh-72px)]">
			{!readOnly ? (
				sidebarVisible ? (
					<>
						<AgenticSidebar
							sessions={sessions}
							isLoading={isLoadingSessions}
							loadError={sessionListError}
							currentSessionId={sessionId}
							restoringSessionId={restoringSessionId}
							onSessionSelect={(nextSessionId) => {
								void handleSessionSelect(nextSessionId)
							}}
							onNewChat={handleNewChat}
							handleSidebarToggle={handleSidebarToggle}
							onDelete={deleteSession}
							onUpdateTitle={updateSessionTitle}
							isDeletingSession={isDeletingSession}
							isUpdatingTitle={isUpdatingTitle}
							shouldAnimate={shouldAnimateSidebar}
							onOpenSettings={settingsModalStore.show}
							hasCustomInstructions={customInstructions.trim().length > 0}
						/>
						<div className="flex min-h-11 lg:hidden" />
					</>
				) : (
					<ChatControls handleSidebarToggle={handleSidebarToggle} handleNewChat={handleNewChat} />
				)
			) : null}

			<div
				className={`relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
			>
				{restoringSessionId && !hasMessages ? (
					<LoadingConversationState />
				) : !hasMessages && visibleError ? (
					<EmptyConversationErrorState message={visibleError} />
				) : !hasMessages && !visibleError ? (
					<ChatLanding
						readOnly={readOnly}
						title={readOnly ? effectiveSessionTitle || 'Shared Conversation' : 'What can I help you with?'}
						handleSubmit={handleSubmit}
						promptInputRef={promptInputRef}
						handleStopRequest={handleStopRequest}
						isStreaming={isStreaming}
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
						onOpenAlerts={alertsModalStore.show}
					/>
				) : (
					<ConversationView
						readOnly={readOnly}
						messages={effectiveMessages}
						sessionId={effectiveSessionId}
						isLlama={isLlama}
						isStreaming={isStreaming}
						activeToolCalls={activeToolCalls}
						spawnProgress={spawnProgress}
						spawnStartTime={spawnStartTime}
						streamingThinking={streamingThinking}
						streamingDraft={streamingDraft}
						isCompacting={isCompacting}
						paginationState={paginationState}
						paginationError={paginationError}
						recovery={recovery}
						error={visibleError}
						lastFailedPrompt={viewError ? null : (lastFailedRequest?.prompt ?? null)}
						onRetryLastFailedPrompt={handleRetryLastFailedPrompt}
						scrollContainerRef={scrollContainerRef}
						messagesEndRef={messagesEndRef}
						promptInputRef={promptInputRef}
						showScrollToBottom={showScrollToBottom}
						scrollToBottom={scrollToBottom}
						handleSubmit={handleSubmit}
						handleStopRequest={handleStopRequest}
						handleActionClick={handleActionClick}
						isResearchMode={isResearchMode}
						setIsResearchMode={setIsResearchMode}
						researchUsage={researchUsage}
						onOpenAlerts={alertsModalStore.show}
					/>
				)}
			</div>
			{!readOnly && rateLimitDetails ? (
				<ResearchLimitModal
					dialogStore={researchModalStore}
					period={rateLimitDetails.period}
					limit={rateLimitDetails.limit}
					resetTime={rateLimitDetails.resetTime}
				/>
			) : null}
			{!readOnly ? <AlertsModal dialogStore={alertsModalStore} /> : null}
			{shouldRenderSubscribeModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
			{!readOnly ? (
				<SettingsModal
					dialogStore={settingsModalStore}
					customInstructions={customInstructions}
					onCustomInstructionsChange={setCustomInstructions}
					enableMemory={enableMemory}
					onEnableMemoryChange={setEnableMemory}
					hackerMode={hackerMode}
					onHackerModeChange={setHackerMode}
					fetchFn={authorizedFetchStrict}
				/>
			) : null}
		</div>
	)
}

const ChatControls = memo(function ChatControls({
	handleSidebarToggle,
	handleNewChat
}: {
	handleSidebarToggle: () => void
	handleNewChat: () => void
}) {
	return (
		<nav
			className="flex gap-2 max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:p-2.5 lg:absolute lg:top-2.5 lg:left-2.5 lg:z-10 lg:flex-col"
			aria-label="Chat controls"
		>
			<Tooltip
				content="Open Chat History"
				render={<button onClick={handleSidebarToggle} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
			>
				<Icon name="panel-left-open" height={16} width={16} />
				<span className="sr-only">Open Chat History</span>
			</Tooltip>
			<Tooltip
				content="New Chat"
				render={<button onClick={handleNewChat} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue) focus-visible:bg-(--old-blue)"
			>
				<Icon name="message-square-plus" height={16} width={16} />
				<span className="sr-only">New Chat</span>
			</Tooltip>
		</nav>
	)
})
