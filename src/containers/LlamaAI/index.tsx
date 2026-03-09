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
	type MutableRefObject
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
import { ConversationView, LoadingConversationState } from '~/containers/LlamaAI/components/ConversationView'
import { ResearchLimitModal } from '~/containers/LlamaAI/components/ResearchLimitModal'
import { SettingsModal } from '~/containers/LlamaAI/components/SettingsModal'
import { AgenticSidebar } from '~/containers/LlamaAI/components/sidebar/AgenticSidebar'
import { TOOL_LABELS } from '~/containers/LlamaAI/components/status/StreamingStatus'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { fetchAgenticResponse, checkActiveExecution, resumeAgenticStream } from './fetchAgenticResponse'
import type { SpawnProgressData, CsvExport, AgenticSSECallbacks } from './fetchAgenticResponse'
import {
	buildAssistantMessage,
	createInitialStreamState,
	createStreamBuffer,
	streamReducer,
	type ChatPageContext,
	type RateLimitDetails,
	type StreamBuffer,
	type StreamDispatch
} from './streamState'
import type { AlertProposedData, ChartConfiguration, Message, ToolExecution } from './types'
import { assertResponse } from './utils/assertResponse'

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
}

interface SessionRestoreResult {
	messages?: PersistedMessage[]
	pagination?: { hasMore?: boolean; cursor?: number | null }
}

interface UsageLimitError extends Error {
	code?: 'USAGE_LIMIT_EXCEEDED' | 'FREE_QUESTION_LIMIT'
	details?: Partial<RateLimitDetails>
	upgradeUrl?: string
}

type RequestKind = 'prompt' | 'resume' | 'restore' | 'pagination' | 'idle'

function mapToolExecution(tool: PersistedToolExecution): ToolExecution {
	return {
		...tool,
		name: tool.name || tool.toolName || 'unknown'
	}
}

function mapPersistedMessage(message: PersistedMessage): Message {
	return {
		role: message.role,
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
		csvExports: message.csvExports,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		id: message.messageId,
		timestamp: message.timestamp ? new Date(message.timestamp).getTime() : undefined
	}
}

function mapPersistedMessages(messages: PersistedMessage[] | undefined): Message[] {
	if (!messages || messages.length === 0) return []
	return messages.map(mapPersistedMessage)
}

function getScrollSnapshot(container: HTMLDivElement | null) {
	return {
		container,
		prevScrollHeight: container?.scrollHeight ?? 0
	}
}

function waitForNextPaint() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve())
	})
}

function restoreScrollPosition(snapshot: { container: HTMLDivElement | null; prevScrollHeight: number }) {
	if (!snapshot.container) return
	snapshot.container.scrollTop = snapshot.container.scrollHeight - snapshot.prevScrollHeight
}

function normalizePaginationState(pagination: { hasMore?: boolean; cursor?: number | null } | undefined): {
	hasMore: boolean
	cursor: number | null
	isLoadingMore: false
} {
	return {
		hasMore: pagination?.hasMore || false,
		cursor: pagination?.cursor || null,
		isLoadingMore: false
	}
}

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

function buildRestoredAlert(message: PersistedMessage): AlertProposedData[] | undefined {
	if (!message.metadata?.alertIntent) return undefined

	return [
		{
			alertId: message.metadata.savedAlertId || `restored_${message.messageId}`,
			title: message.metadata.alertIntent.dataQuery || '',
			alertIntent: {
				frequency: message.metadata.alertIntent.frequency || 'daily',
				hour: message.metadata.alertIntent.hour ?? 9,
				timezone: message.metadata.alertIntent.timezone || 'UTC',
				dayOfWeek: message.metadata.alertIntent.dayOfWeek
			},
			schedule_expression: '',
			next_run_at: ''
		}
	]
}

function takeCurrentMessageId(ref: MutableRefObject<string | null>) {
	const messageId = ref.current || undefined
	ref.current = null
	return messageId
}

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

function appendBufferedAssistantMessage(
	buffer: StreamBuffer,
	currentMessageIdRef: MutableRefObject<string | null>,
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

function beginRequest(
	activeRequestIdRef: MutableRefObject<number>,
	activeRequestKindRef: MutableRefObject<RequestKind>,
	activeSessionIdRef: MutableRefObject<string | null>,
	kind: RequestKind,
	sessionId: string | null
) {
	const requestId = activeRequestIdRef.current + 1
	activeRequestIdRef.current = requestId
	activeRequestKindRef.current = kind
	activeSessionIdRef.current = sessionId
	return requestId
}

function isActiveRequest(activeRequestIdRef: MutableRefObject<number>, requestId: number) {
	return activeRequestIdRef.current === requestId
}

function completeRequest(
	activeRequestIdRef: MutableRefObject<number>,
	activeRequestKindRef: MutableRefObject<RequestKind>,
	activeSessionIdRef: MutableRefObject<string | null>,
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

function createRequestSettleState(requestId: number): Exclude<RequestSettleState, null> {
	let resolve = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	return { requestId, promise, resolve }
}

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
	activeRequestIdRef: MutableRefObject<number>
	buffer: StreamBuffer
	dispatch: StreamDispatch
	currentMessageIdRef: MutableRefObject<string | null>
	toolCallIdRef: MutableRefObject<number>
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
	const authorizedFetchStrict = useCallback<typeof fetch>(
		async (input, init) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
			return assertResponse(await authorizedFetch(url, init), 'Authorized request failed')
		},
		[authorizedFetch]
	)
	const isLlama = !!user?.flags?.is_llama
	const { sessions, isLoading: isLoadingSessions, error: sessionListError, moveSessionToTop } = useSessionList()
	const {
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
	const subscribeModalStore = Ariakit.useDialogStore()
	const [shouldRenderSubscribeModal, setShouldRenderSubscribeModal] = useState(false)

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
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [restoringSessionId, setRestoringSessionId] = useState<string | null>(() =>
		initialSessionId && !sharedSession ? initialSessionId : null
	)
	const [viewError, setViewError] = useState<string | null>(null)
	const researchModalStore = Ariakit.useDialogStore()
	const currentMessageIdRef = useRef<string | null>(null)
	const pendingInitialSessionIdRef = useRef(initialSessionId)
	const activeRequestIdRef = useRef(0)
	const activeRequestKindRef = useRef<RequestKind>('idle')
	const activeSessionIdRef = useRef<string | null>(null)
	const activeRequestSettleRef = useRef<RequestSettleState>(null)
	const restoredSessionIdRef = useRef<string | null>(null)
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
	const shouldAutoScrollRef = useRef(true)
	const paginationRef = useRef(paginationState)
	const userScrollCooldownRef = useRef(false)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
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
		error,
		lastFailedRequest,
		rateLimitDetails
	} = streamState

	const scrollToBottom = useCallback(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: 'smooth'
			})
			shouldAutoScrollRef.current = true
			userScrollCooldownRef.current = false
			setShowScrollToBottom(false)
		}
	}, [])

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

	useEffect(() => {
		paginationRef.current = paginationState
	}, [paginationState])

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
			})
			.catch(() => {})
	}, [user, authorizedFetchStrict])

	useEffect(() => {
		if (!isStreaming) {
			const timer = setTimeout(() => {
				requestAnimationFrame(() => {
					const c = scrollContainerRef.current
					if (!c) return
					const isAtBottom = Math.ceil(c.scrollTop + c.clientHeight) >= c.scrollHeight - 150
					if (isAtBottom) {
						shouldAutoScrollRef.current = true
						setShowScrollToBottom(false)
					} else if (c.scrollHeight > c.clientHeight) {
						setShowScrollToBottom(true)
					}
				})
			}, 100)
			return () => clearTimeout(timer)
		}
		const interval = setInterval(() => {
			if (shouldAutoScrollRef.current && scrollContainerRef.current) {
				scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
			}
		}, 200)
		return () => clearInterval(interval)
	}, [isStreaming])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
		}
	}, [effectiveMessages])

	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore || isStreaming) return

		const requestId = beginRequest(
			activeRequestIdRef,
			activeRequestKindRef,
			activeSessionIdRef,
			'pagination',
			sessionId
		)
		setViewError(null)
		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))
		await waitForNextPaint()
		const scrollSnapshot = getScrollSnapshot(scrollContainerRef.current)
		const result = await loadMoreMessages(sessionId, paginationState.cursor!).catch(() => {
			if (isActiveRequest(activeRequestIdRef, requestId) && activeSessionIdRef.current === sessionId) {
				setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
				setViewError('Failed to load older messages')
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

	const handleLoadMoreMessagesEvent = useEffectEvent(() => {
		void handleLoadMoreMessages()
	})

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		let cooldownTimer: ReturnType<typeof setTimeout>
		const onUserScrollIntent = () => {
			shouldAutoScrollRef.current = false
			userScrollCooldownRef.current = true
			clearTimeout(cooldownTimer)
			cooldownTimer = setTimeout(() => {
				userScrollCooldownRef.current = false
			}, 500)
		}

		let ticking = false
		const onScroll = () => {
			if (!ticking) {
				ticking = true
				requestAnimationFrame(() => {
					const { scrollTop, scrollHeight, clientHeight } = container
					const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 150
					if (isAtBottom) {
						shouldAutoScrollRef.current = true
						userScrollCooldownRef.current = false
					}
					setShowScrollToBottom(!shouldAutoScrollRef.current && scrollHeight > clientHeight)
					const pg = paginationRef.current
					if (scrollTop <= 50 && pg.hasMore && !pg.isLoadingMore) {
						handleLoadMoreMessagesEvent()
					}
					ticking = false
				})
			}
		}

		container.addEventListener('wheel', onUserScrollIntent, { passive: true })
		container.addEventListener('touchmove', onUserScrollIntent, { passive: true })
		container.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			clearTimeout(cooldownTimer)
			container.removeEventListener('wheel', onUserScrollIntent)
			container.removeEventListener('touchmove', onUserScrollIntent)
			container.removeEventListener('scroll', onScroll)
		}
	}, [hasMessages])

	const handleSidebarToggle = useCallback(() => {
		setShouldAnimateSidebar(true)
		toggleSidebar()
	}, [toggleSidebar])

	const appendMessage = useCallback((message: Message) => {
		setMessages((prev) => [...prev, message])
	}, [])

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
	}, [])

	const clearConversationRuntimeState = useCallback(() => {
		setViewError(null)
		dispatchStream({ type: 'RESET_STREAM' })
		dispatchStream({ type: 'SET_ERROR', value: null })
		dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
		dispatchStream({ type: 'SET_RATE_LIMIT_DETAILS', value: null })
	}, [])

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
		shouldAutoScrollRef.current = true
		setShowScrollToBottom(false)
		setPaginationState({ hasMore: false, cursor: null, isLoadingMore: false })
		promptInputRef.current?.focus()
	}, [initialSessionId, abortActiveRequest, clearConversationRuntimeState])

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

			try {
				const result: SessionRestoreResult = await restoreSession(selectedSessionId)

				if (!isActiveRequest(activeRequestIdRef, requestId)) return
				const restored: Message[] = (result.messages || []).map((message) => ({
					...mapPersistedMessage(message),
					alerts: buildRestoredAlert(message),
					savedAlertIds: message.savedAlertIds
				}))

				setMessages(restored)
				setSessionId(selectedSessionId)
				const match = sessions.find((s) => s.sessionId === selectedSessionId)
				setSessionTitle(match?.title || null)
				restoredSessionIdRef.current = selectedSessionId
				window.history.replaceState(null, '', `/ai/chat/${selectedSessionId}`)
				isFirstMessageRef.current = false
				shouldAutoScrollRef.current = true
				setShowScrollToBottom(false)
				setPaginationState({
					hasMore: result.pagination?.hasMore || false,
					cursor: result.pagination?.cursor || null,
					isLoadingMore: false
				})
				setRestoringSessionId(null)

				const { active } = await checkActiveExecution(selectedSessionId, authorizedFetchStrict)
				if (!isActiveRequest(activeRequestIdRef, requestId)) return

				if (active) {
					const resumeRequestId = beginRequest(
						activeRequestIdRef,
						activeRequestKindRef,
						activeSessionIdRef,
						'resume',
						selectedSessionId
					)
					dispatchStream({ type: 'START_STREAM' })
					currentMessageIdRef.current = null
					const buffer = createStreamBuffer()
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
							updateSessionTitle({ sessionId: selectedSessionId, title }).catch(() => {})
							moveSessionToTop(selectedSessionId)
						}
					})

					void resumeAgenticStream({
						sessionId: selectedSessionId,
						callbacks,
						abortSignal: controller.signal,
						fetchFn: authorizedFetchStrict
					})
						.catch((err: Error) => {
							if (!isActiveRequest(activeRequestIdRef, resumeRequestId)) return
							if (err?.name === 'AbortError') {
								appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
								dispatchStream({ type: 'RESET_STREAM' })
								return
							}
							dispatchStream({ type: 'RESET_STREAM' })
						})
						.finally(() => {
							if (isActiveRequest(activeRequestIdRef, resumeRequestId)) {
								abortControllerRef.current = null
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, resumeRequestId)
							}
							settleState.resolve()
							if (activeRequestSettleRef.current?.requestId === resumeRequestId) {
								activeRequestSettleRef.current = null
							}
						})
				} else {
					completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				}
			} catch {
				if (!isActiveRequest(activeRequestIdRef, requestId)) return
				setViewError('Failed to restore session')
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			} finally {
				if (isActiveRequest(activeRequestIdRef, requestId) || activeRequestKindRef.current === 'idle') {
					setRestoringSessionId(null)
				}
			}
		},
		[
			sessionId,
			restoreSession,
			sessions,
			authorizedFetchStrict,
			updateSessionTitle,
			moveSessionToTop,
			notify,
			appendMessage,
			abortActiveRequest,
			clearConversationRuntimeState
		]
	)

	const handleSubmit = useCallback(
		(
			prompt: string,
			_entities?: Array<{ term: string; slug: string }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>,
			pageContext?: ChatPageContext,
			isSuggestedQuestion?: boolean
		) => {
			const trimmed = prompt.trim()
			if (!trimmed || isStreaming || promptSubmissionLockRef.current) return
			promptSubmissionLockRef.current = true

			void (async () => {
				try {
					await abortActiveRequest()
					setViewError(null)
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
					shouldAutoScrollRef.current = true
					setShowScrollToBottom(false)

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

					fetchAgenticResponse({
						message: trimmed,
						sessionId: currentSessionId,
						researchMode: isResearchMode,
						images: images?.length ? images : undefined,
						pageContext,
						customInstructions: customInstructions || undefined,
						isSuggestedQuestion,
						abortSignal: controller.signal,
						fetchFn: authorizedFetchStrict,
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
								setSessionId(id)
								currentSessionId = id
								activeSessionIdRef.current = id
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
						.catch((err: UsageLimitError) => {
							if (!isActiveRequest(activeRequestIdRef, requestId)) return
							if (err?.name === 'AbortError') {
								appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
								dispatchStream({ type: 'RESET_STREAM' })
								completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
								return
							}
							if (err?.code === 'FREE_QUESTION_LIMIT') {
								if (!shouldRenderSubscribeModal) setShouldRenderSubscribeModal(true)
								subscribeModalStore.show()
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
							dispatchStream({ type: 'SET_ERROR', value: err?.message || 'Failed to get response' })
							dispatchStream({
								type: 'SET_LAST_FAILED_REQUEST',
								value: {
									prompt: trimmed,
									images: images?.length ? images : undefined,
									pageContext
								}
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
				} catch {
					promptSubmissionLockRef.current = false
				}
			})()
		},
		[
			isStreaming,
			sessionId,
			isResearchMode,
			authorizedFetchStrict,
			createFakeSession,
			updateSessionTitle,
			moveSessionToTop,
			researchModalStore,
			subscribeModalStore,
			shouldRenderSubscribeModal,
			requestPermission,
			notify,
			customInstructions,
			appendMessage,
			abortActiveRequest
		]
	)

	const handleStopRequest = useCallback(() => {
		void abortActiveRequest()
		dispatchStream({ type: 'RESET_STREAM' })
	}, [abortActiveRequest])

	const handleActionClick = useCallback(
		(message: string) => {
			if (!isStreaming) handleSubmit(message)
		},
		[isStreaming, handleSubmit]
	)

	const handleRetryLastFailedPrompt = useCallback(() => {
		if (!lastFailedRequest) return
		dispatchStream({ type: 'SET_ERROR', value: null })
		handleSubmit(lastFailedRequest.prompt, undefined, lastFailedRequest.images, lastFailedRequest.pageContext)
	}, [lastFailedRequest, handleSubmit])

	const submitPendingPromptEvent = useEffectEvent(
		(
			prompt: string,
			pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string },
			isSuggestedQuestion?: boolean
		) => {
			handleSubmit(prompt, undefined, undefined, pageContext, isSuggestedQuestion)
		}
	)

	useEffect(() => {
		if (initialSessionId || sharedSession) return
		const pendingPrompt = consumePendingPrompt()
		const pendingPageContext = consumePendingPageContext()
		const isSuggested = consumePendingSuggestedFlag()
		if (pendingPrompt) {
			submitPendingPromptEvent(pendingPrompt, pendingPageContext ?? undefined, isSuggested || undefined)
		}
	}, [initialSessionId, sharedSession])

	useEffect(() => {
		pendingInitialSessionIdRef.current = initialSessionId
	}, [initialSessionId])

	useEffect(() => {
		const nextSessionId = pendingInitialSessionIdRef.current
		if (!nextSessionId) return

		pendingInitialSessionIdRef.current = undefined
		restoredSessionIdRef.current = null
		void handleSessionSelect(nextSessionId)
	}, [initialSessionId, handleSessionSelect])

	useEffect(() => {
		if (!sharedSession) return
		isFirstMessageRef.current = false
	}, [sharedSession])

	if (!user && !readOnly) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-sm text-[#666] dark:text-[#919296]">Please log in to use LlamaAI</p>
			</div>
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
						onOpenAlerts={alertsModalStore.show}
					/>
				) : (
					<ConversationView
						readOnly={readOnly}
						messages={effectiveMessages}
						sessionId={effectiveSessionId}
						fetchFn={authorizedFetchStrict}
						isLlama={isLlama}
						isStreaming={isStreaming}
						activeToolCalls={activeToolCalls}
						spawnProgress={spawnProgress}
						spawnStartTime={spawnStartTime}
						streamingThinking={streamingThinking}
						streamingDraft={streamingDraft}
						isCompacting={isCompacting}
						paginationState={paginationState}
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
