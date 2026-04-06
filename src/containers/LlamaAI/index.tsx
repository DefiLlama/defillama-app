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
import { LlamaAIChromeContext, useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
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
import { TextSelectionPopup } from '~/containers/LlamaAI/components/TextSelectionPopup'
import { TokenLimitModal } from '~/containers/LlamaAI/components/TokenLimitModal'
import {
	checkActiveExecution,
	fetchAgenticResponse,
	resumeAgenticStream,
	stopAgenticExecution
} from '~/containers/LlamaAI/fetchAgenticResponse'
import type { AgenticSSECallbacks, CsvExport, SpawnProgressData } from '~/containers/LlamaAI/fetchAgenticResponse'
import { useChatScroll } from '~/containers/LlamaAI/hooks/useChatScroll'
import { useLlamaAISettings } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import { useVisualViewport } from '~/containers/LlamaAI/hooks/useVisualViewport'
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
import type {
	AlertProposedData,
	ChartConfiguration,
	DashboardArtifact,
	DashboardItem,
	Message,
	ToolExecution
} from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { useAiBalance } from '~/containers/Subscription/useTopup'
import { useMedia } from '~/hooks/useMedia'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const DashboardPanel = lazy(() =>
	import('~/containers/LlamaAI/components/DashboardPanel').then((m) => ({ default: m.DashboardPanel }))
)

interface PersistedAlertIntent {
	frequency?: 'daily' | 'weekly'
	hour?: number
	timezone?: string
	dayOfWeek?: number
	dataQuery?: string
	title?: string
	deliveryChannel?: 'email' | 'telegram'
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
	quotedText?: string
	dashboardConfig?: {
		dashboardName?: string
		items?: DashboardItem[]
		timePeriod?: string
		sourceDashboardId?: string
	}
	deliveryChannel?: 'email' | 'telegram'
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
	messageMetadata?: { inputTokens?: number; outputTokens?: number; executionTimeMs?: number; x402CostUsd?: string }
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
	code?: 'USAGE_LIMIT_EXCEEDED' | 'FREE_QUESTION_LIMIT' | 'FREE_FORM_LIMIT' | 'FREE_DAILY_LIMIT'
	details?: Partial<RateLimitDetails>
	upgradeUrl?: string
}

type RequestKind = 'prompt' | 'resume' | 'restore' | 'pagination' | 'idle'
type PromptTransitionMode = 'idle' | 'landing' | 'conversation'
const RECOVERY_GRACE_MS = 20000
const RECOVERY_ATTEMPT_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 14000] as const
const CONNECTIVITY_ERROR_PATTERNS = [
	'failed to fetch',
	'networkerror',
	'network error',
	'load failed',
	'err_network_changed',
	'network changed',
	'err_name_not_resolved',
	'name not resolved',
	'stream heartbeat timeout'
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

type DashboardPanelState = {
	isOpen: boolean
	mountedConfig: DashboardArtifact | null
	versions: DashboardArtifact[]
	versionIndex: number
}

type DashboardPanelAction =
	| { type: 'APPEND'; value: DashboardArtifact }
	| { type: 'RESTORE'; value: DashboardArtifact[] }
	| { type: 'RESET' }
	| { type: 'TOGGLE' }
	| { type: 'SELECT_VERSION'; value: number }
	| { type: 'CLOSE' }
	| { type: 'UNMOUNT' }

const INITIAL_DASHBOARD_PANEL_STATE: DashboardPanelState = {
	isOpen: false,
	mountedConfig: null,
	versions: [],
	versionIndex: 0
}

function dashboardPanelReducer(state: DashboardPanelState, action: DashboardPanelAction): DashboardPanelState {
	switch (action.type) {
		case 'APPEND': {
			const versions = [...state.versions, action.value]
			return {
				isOpen: true,
				mountedConfig: action.value,
				versions,
				versionIndex: versions.length - 1
			}
		}
		case 'RESTORE':
			return {
				isOpen: false,
				mountedConfig: null,
				versions: action.value,
				versionIndex: action.value.length > 0 ? action.value.length - 1 : 0
			}
		case 'RESET':
			return INITIAL_DASHBOARD_PANEL_STATE
		case 'TOGGLE':
			return {
				...state,
				isOpen: !state.isOpen,
				mountedConfig: state.isOpen ? state.mountedConfig : (state.versions[state.versionIndex] ?? null)
			}
		case 'SELECT_VERSION':
			if (action.value < 0 || action.value >= state.versions.length) return state
			return {
				...state,
				mountedConfig: state.isOpen ? (state.versions[action.value] ?? null) : state.mountedConfig,
				versionIndex: action.value
			}
		case 'CLOSE':
			return { ...state, isOpen: false }
		case 'UNMOUNT':
			if (state.isOpen) return state
			return { ...state, mountedConfig: null }
		default:
			return state
	}
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
	const dashboardConfig = message.metadata?.dashboardConfig
	return {
		role: message.role,
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
		csvExports: message.csvExports,
		dashboards: dashboardConfig
			? [
					(() => {
						const restoredDashboardIdSuffix =
							message.messageId ??
							(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
								? crypto.randomUUID()
								: `unknown_${Date.now()}_${Math.random().toString(36).slice(2)}`)
						const artifact: DashboardArtifact = {
							id: `dashboard_restored_${restoredDashboardIdSuffix}`,
							dashboardName: dashboardConfig.dashboardName || 'Dashboard',
							items: dashboardConfig.items ?? [],
							timePeriod: dashboardConfig.timePeriod,
							sourceDashboardId: dashboardConfig.sourceDashboardId
						}
						const chartRefs = (dashboardConfig.items ?? []).filter(
							(item): item is Extract<DashboardItem, { kind: 'llamaai-chart' }> & { chartRef: string } =>
								item.kind === 'llamaai-chart' && typeof item.chartRef === 'string'
						)
						if (chartRefs.length > 0 && message.chartData && message.charts) {
							const chartConfigMap = new Map(message.charts.map((chart) => [chart.id, chart]))
							const bundled: NonNullable<DashboardArtifact['chartData']> = {}
							for (const item of chartRefs) {
								const data = (message.chartData as Record<string, unknown[]>)[item.chartRef]
								const config = chartConfigMap.get(item.chartRef)
								if (data && config) {
									bundled[item.chartRef] = { config, data, toolChain: [] }
								}
							}
							if (Object.keys(bundled).length > 0) artifact.chartData = bundled
						}
						return artifact
					})()
				]
			: undefined,
		alerts: buildRestoredAlerts({
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		quotedText: message.metadata?.quotedText,
		messageMetadata: message.messageMetadata,
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
			title: metadata.alertIntent.title || metadata.alertIntent.dataQuery || '',
			alertIntent: {
				frequency: metadata.alertIntent.frequency || 'daily',
				hour: metadata.alertIntent.hour ?? 9,
				timezone: metadata.alertIntent.timezone || 'UTC',
				dayOfWeek: metadata.alertIntent.dayOfWeek,
				deliveryChannel: metadata.alertIntent.deliveryChannel || metadata.deliveryChannel
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
		buffer.dashboards.length > 0 ||
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
	onTokenLimit,
	onDashboardArtifact,
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
	onTokenLimit?: () => void
	onDashboardArtifact?: (dashboard: DashboardArtifact) => void
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
		onDashboard: (dashboard) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.dashboards.push(dashboard)
			dispatch({ type: 'APPEND_DASHBOARD', value: dashboard })
			onDashboardArtifact?.(dashboard)
		},
		onCitations: (citations) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.citations = [...new Set([...buffer.citations, ...citations])]
			dispatch({ type: 'MERGE_CITATIONS', value: citations })
		},
		onProgress: (toolName, isPremium) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			const label = TOOL_LABELS[toolName] || toolName
			const toolCall = { id: ++toolCallIdRef.current, name: toolName, label, ...(isPremium && { isPremium }) }
			dispatch({ type: 'APPEND_TOOL_CALL', value: toolCall })
		},
		onToolExecution: (data) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.toolExecutions.push(data)
			dispatch({ type: 'APPEND_TOOL_EXECUTION', value: data })
		},
		onMessageMetadata: (data) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.messageMetadata = data
			dispatch({ type: 'SET_MESSAGE_METADATA', value: data })
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
				dispatch({ type: 'SET_SPAWN_START_TIME', value: data.startedAt || Date.now() })
				if (data.isResearchMode !== undefined) {
					dispatch({ type: 'SET_SPAWN_RESEARCH_MODE', value: data.isResearchMode })
				}
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
		onSessionId: (sessionId, startedAt) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onSessionId?.(sessionId)
			if (startedAt) dispatch({ type: 'SET_EXECUTION_STARTED_AT', value: startedAt })
		},
		onMessageId: (messageId) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			currentMessageIdRef.current = messageId
		},
		onTitle: (title) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onTitle?.(title)
		},
		onTokenLimit: () => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onTokenLimit?.()
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
	const isMobileChatView = useMedia('(max-width: 1023px)')

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
		isUpdatingTitle,
		bulkDeleteSessions,
		pinSession
	} = useSessionMutations()
	const { sidebarVisible, toggleSidebar, hideSidebar, isFullscreen, toggleFullscreen } = useSidebarVisibility()
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
	const [quotedText, setQuotedText] = useState<string | null>(null)
	const [
		{
			isOpen: dashboardPanelIsOpen,
			mountedConfig: dashboardPanelMountedConfig,
			versions: dashboardVersions,
			versionIndex: dashboardVersionIndex
		},
		dispatchDashboardPanel
	] = useReducer(dashboardPanelReducer, INITIAL_DASHBOARD_PANEL_STATE)
	const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)
	const { settings, actions } = useLlamaAISettings()
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
	const [conversationViewResetKey, setConversationViewResetKey] = useState(0)
	const [promptTransitionMode, setPromptTransitionMode] = useState<PromptTransitionMode>('idle')

	const abortControllerRef = useRef<AbortController | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const { keyboardOpen, viewportHeight } = useVisualViewport()
	const promptInputRef = useRef<HTMLTextAreaElement>(null)
	const toolCallIdRef = useRef(0)
	const promptSubmissionLockRef = useRef(false)
	const isFirstMessageRef = useRef(true)
	const promptTransitionTimerRef = useRef<number | null>(null)
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
		spawnIsResearchMode,
		executionStartedAt,
		recovery,
		error,
		lastFailedRequest,
		rateLimitDetails
	} = streamState

	const sharedMessages = useMemo(() => sharedSession?.messages.map(mapSharedSessionMessage) ?? null, [sharedSession])
	const effectiveMessages = sharedMessages ?? messages
	const effectiveSessionId = sharedSession?.session.sessionId ?? sessionId
	const sessionListTitle = sessionId ? (sessions.find((s) => s.sessionId === sessionId)?.title ?? null) : null
	const effectiveSessionTitle = sharedSession?.session.title ?? sessionTitle ?? sessionListTitle
	const hasMessages = effectiveMessages.length > 0 || isStreaming
	const visibleError = viewError ?? error
	const shouldShowLanding = !hasMessages && !visibleError && !restoringSessionId
	const shouldAnimateLandingTransition =
		promptTransitionMode === 'landing' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldAnimateConversationTransition =
		promptTransitionMode === 'conversation' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldStartDetachedForAnchor =
		Boolean(sharedSession) && readOnly && typeof window !== 'undefined' && /^#msg-/.test(window.location.hash)

	useEffect(() => {
		const timer = setTimeout(() => window.dispatchEvent(new CustomEvent('chartResize')), 250)
		return () => clearTimeout(timer)
	}, [dashboardPanelIsOpen, dashboardPanelMountedConfig])

	const clearPromptTransitionTimer = useCallback(() => {
		if (promptTransitionTimerRef.current !== null) {
			window.clearTimeout(promptTransitionTimerRef.current)
			promptTransitionTimerRef.current = null
		}
	}, [])

	const resetPromptTransition = useCallback(() => {
		clearPromptTransitionTimer()
		setPromptTransitionMode('idle')
	}, [clearPromptTransitionTimer])

	const triggerPromptTransition = useCallback(
		(mode: PromptTransitionMode) => {
			clearPromptTransitionTimer()
			setPromptTransitionMode(mode)
			promptTransitionTimerRef.current = window.setTimeout(() => {
				setPromptTransitionMode('idle')
				promptTransitionTimerRef.current = null
			}, 480)
		},
		[clearPromptTransitionTimer]
	)

	useEffect(() => {
		return () => {
			clearPromptTransitionTimer()
		}
	}, [clearPromptTransitionTimer])

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

	const { attach, scrollToBottom, showScrollToBottom } = useChatScroll({
		scrollContainerRef,
		isStreaming,
		items: effectiveMessages,
		hasMessages,
		paginationState,
		onLoadMoreMessages: handleLoadMoreMessagesEvent,
		keyboardOpen,
		startDetached: shouldStartDetachedForAnchor
	})

	// Trigger the sidebar open/close animation before toggling visibility.
	const handleSidebarToggle = useCallback(() => {
		setShouldAnimateSidebar(true)
		toggleSidebar()
	}, [toggleSidebar])

	const toggleDashboardPanel = useCallback(() => {
		dispatchDashboardPanel({ type: 'TOGGLE' })
	}, [])

	const handleDashboardVersionChange = useCallback((index: number) => {
		dispatchDashboardPanel({ type: 'SELECT_VERSION', value: index })
	}, [])

	const handleDashboardClose = useCallback(() => {
		dispatchDashboardPanel({ type: 'CLOSE' })
	}, [])

	const handleDashboardExited = useCallback(() => {
		dispatchDashboardPanel({ type: 'UNMOUNT' })
	}, [])

	const chromeValue = useMemo(
		() => ({
			toggleSidebar: handleSidebarToggle,
			hideSidebar,
			toggleFullscreen,
			isFullscreen,
			toggleDashboardPanel,
			isDashboardPanelOpen: dashboardPanelIsOpen
		}),
		[handleSidebarToggle, hideSidebar, toggleFullscreen, isFullscreen, toggleDashboardPanel, dashboardPanelIsOpen]
	)

	// Append one message to the live conversation state.
	const appendMessage = useCallback((message: Message) => {
		setMessages((prev) => {
			if (message.id && prev.some((m) => m.id === message.id)) {
				return prev.map((m) => (m.id === message.id ? message : m))
			}
			return [...prev, message]
		})
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
			const { active, status, hasResult, eventCount } = activeExecution
			if (!active) {
				// Skip replay when the client buffer already has all (or more) events than the
				// server — the server buffer was pruned after DB save and only contains {done}.
				const hasNewEvents = eventCount != null && buffer.receivedEventCount < eventCount
				if (status === 'completed' && hasResult && hasNewEvents) {
					setViewError(null)
					dispatchStream({ type: 'SET_ERROR', value: null })
					dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
					dispatchStream({ type: 'RESET_RECOVERY' })
					if (resetStream) {
						dispatchStream({ type: 'START_STREAM' })
						currentMessageIdRef.current = null
					}
					const replayRequestId = beginRequest(
						activeRequestIdRef,
						activeRequestKindRef,
						activeSessionIdRef,
						'resume',
						targetSessionId
					)
					const replayController = new AbortController()
					abortControllerRef.current = replayController
					const replaySettleState = createRequestSettleState(replayRequestId)
					activeRequestSettleRef.current = replaySettleState
					const replayCallbacks = createAgenticCallbacks({
						requestId: replayRequestId,
						activeRequestIdRef,
						buffer,
						dispatch: dispatchStream,
						currentMessageIdRef,
						toolCallIdRef,
						appendMessage,
						notify,
						onDashboardArtifact: (dashboard) => dispatchDashboardPanel({ type: 'APPEND', value: dashboard }),
						onTokenLimit: () => setShowTokenLimitModal(true),
						onTitle: (title) => {
							setSessionTitle(title)
							updateSessionTitle({ sessionId: targetSessionId, title }).catch(() => {})
							moveSessionToTop(targetSessionId)
						}
					})
					const replayEventCounter = { count: buffer.receivedEventCount }
					const replayFrom = buffer.receivedEventCount > 0 ? buffer.receivedEventCount : undefined

					return resumeAgenticStream({
						sessionId: targetSessionId,
						callbacks: replayCallbacks,
						abortSignal: replayController.signal,
						fetchFn: authorizedFetchCompat,
						from: replayFrom,
						eventCounter: replayEventCounter
					})
						.then(() => true)
						.catch(() => {
							// Buffer expired — reset streaming state so the UI doesn't get stuck.
							if (resetStream) {
								dispatchStream({ type: 'RESET_STREAM' })
							}
							return false
						})
						.finally(() => {
							if (abortControllerRef.current === replayController) {
								abortControllerRef.current = null
							}
							completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, replayRequestId)
							replaySettleState.resolve()
							if (activeRequestSettleRef.current?.requestId === replayRequestId) {
								activeRequestSettleRef.current = null
							}
						})
				}
				return false
			}

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
				onDashboardArtifact: (dashboard) => dispatchDashboardPanel({ type: 'APPEND', value: dashboard }),
				onTokenLimit: () => setShowTokenLimitModal(true),
				onTitle: (title) => {
					setSessionTitle(title)
					updateSessionTitle({ sessionId: targetSessionId, title }).catch(() => {})
					moveSessionToTop(targetSessionId)
				}
			})

			const resumeEventCounter = { count: buffer.receivedEventCount }
			void resumeAgenticStream({
				sessionId: targetSessionId,
				callbacks,
				abortSignal: controller.signal,
				fetchFn: authorizedFetchCompat,
				from: buffer.receivedEventCount,
				eventCounter: resumeEventCounter
			})
				.catch((resumeError: Error) => {
					if (!isActiveRequest(activeRequestIdRef, resumeRequestId)) return
					if (resumeError?.name === 'AbortError') {
						appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
						dispatchStream({ type: 'RESET_STREAM' })
						return
					}
					if (onTemporaryDisconnect && isTemporaryConnectivityError(resumeError)) {
						buffer.receivedEventCount = resumeEventCounter.count
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
				.then(() => {
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
			setConversationViewResetKey((current) => current + 1)
			setSessionId(targetSessionId)
			const match = sessions.find((session) => session.sessionId === targetSessionId)
			setSessionTitle(match?.title || null)

			const allDashboards = restored.flatMap((m) => m.dashboards || [])
			dispatchDashboardPanel({ type: 'RESTORE', value: allDashboards })
			restoredSessionIdRef.current = targetSessionId
			isFirstMessageRef.current = false
			attach()
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
		[attach, restoreSession, sessions]
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
					const baseMs = Math.min(250 * Math.pow(2, latest.attemptCount - 1), 8000)
					const backoffMs = Math.round(baseMs * (0.5 + Math.random() * 0.5))
					queueRecoveryAttempt(recoveryId, backoffMs)
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
		})().then(
			() => {
				const latest = recoveryControllerRef.current
				if (!latest || latest.id !== recoveryId) return
				latest.attemptInFlight = false
			},
			() => {
				const latest = recoveryControllerRef.current
				if (!latest || latest.id !== recoveryId) return
				latest.attemptInFlight = false
			}
		)
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
		resetPromptTransition()
		setViewError(null)
		setPaginationError(null)
		dispatchStream({ type: 'RESET_STREAM' })
		dispatchStream({ type: 'SET_ERROR', value: null })
		dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
		dispatchStream({ type: 'SET_RATE_LIMIT_DETAILS', value: null })
	}, [clearRecoveryController, resetPromptTransition])

	// Start a brand-new chat, or route away from a session page back to the base chat route.
	const handleNewChat = useCallback(async () => {
		if (initialSessionId) {
			void Router.push('/ai/chat', undefined, { shallow: true })
			return
		}
		await abortActiveRequest()
		clearConversationRuntimeState()
		setMessages([])
		setConversationViewResetKey((current) => current + 1)
		setSessionId(null)
		setSessionTitle(null)
		dispatchDashboardPanel({ type: 'RESET' })
		restoredSessionIdRef.current = null
		isFirstMessageRef.current = true
		attach()
		setPaginationState({ hasMore: false, cursor: null, isLoadingMore: false })
		promptInputRef.current?.focus()
	}, [initialSessionId, abortActiveRequest, attach, clearConversationRuntimeState])

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
			const { restored: restoredOk, recoveredResponse } = await restoreSessionSnapshot(selectedSessionId, requestId)

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

			// Skip resume when the restored snapshot already contains the assistant response —
			// the session is complete and calling /stream would be a redundant replay.
			if (recoveredResponse) {
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				return
			}

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
			const hasImages = images && images.length > 0
			if ((!trimmed && !hasImages) || isStreaming || promptSubmissionLockRef.current) return
			triggerPromptTransition(shouldShowLanding ? 'landing' : 'conversation')
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

					const currentQuotedText = quotedText
					if (currentQuotedText) setQuotedText(null)

					const userImages = images?.map((img) => ({ url: img.data, mimeType: img.mimeType, filename: img.filename }))
					setMessages((prev) => [
						...prev,
						{
							role: 'user',
							content: trimmed,
							images: userImages?.length ? userImages : undefined,
							quotedText: currentQuotedText || undefined
						}
					])
					attach()

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

					const eventCounter = { count: 0 }
					void fetchAgenticResponse({
						message: trimmed,
						sessionId: currentSessionId,
						researchMode: isResearchMode,
						entities: entities?.length ? entities : undefined,
						images: images?.length ? images : undefined,
						pageContext,
						quotedText: currentQuotedText || undefined,
						customInstructions: settings.customInstructions || undefined,
						enablePremiumTools: settings.enablePremiumTools,
						isSuggestedQuestion,
						blockedSkills: isMobileChatView ? ['dashboard'] : undefined,
						abortSignal: controller.signal,
						fetchFn: authorizedFetchCompat,
						eventCounter,
						callbacks: createAgenticCallbacks({
							requestId,
							activeRequestIdRef,
							buffer,
							dispatch: dispatchStream,
							currentMessageIdRef,
							toolCallIdRef,
							appendMessage,
							notify,
							onDashboardArtifact: (dashboard) => dispatchDashboardPanel({ type: 'APPEND', value: dashboard }),
							onTokenLimit: () => setShowTokenLimitModal(true),
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
							if (
								err?.code === 'FREE_QUESTION_LIMIT' ||
								err?.code === 'FREE_FORM_LIMIT' ||
								err?.code === 'FREE_DAILY_LIMIT'
							) {
								let msg = err.message || "You've reached the free question limit. Subscribe for unlimited access."
								if (err.details?.resetTime) {
									const resetMs = new Date(err.details.resetTime).getTime() - Date.now()
									if (resetMs > 0) {
										const hours = Math.floor(resetMs / 3600000)
										const minutes = Math.floor((resetMs % 3600000) / 60000)
										const timeStr = hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h ${minutes}m`
										msg += `\n\nResets in ${timeStr}.`
									}
								}
								appendMessage({ role: 'assistant', content: msg })
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
							if (currentSessionId && isTemporaryConnectivityError(err) && eventCounter.count > 0) {
								buffer.receivedEventCount = eventCounter.count
								if (
									startRecoveryCycle({
										targetSessionId: currentSessionId,
										buffer,
										failedRequest,
										error: err instanceof Error ? err : new Error(getErrorMessage(err))
									})
								) {
									return
								}
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
						.then(() => {
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
			settings.customInstructions,
			settings.enablePremiumTools,
			appendMessage,
			abortActiveRequest,
			startRecoveryCycle,
			sessionTitle,
			sessions,
			attach,
			shouldShowLanding,
			triggerPromptTransition,
			quotedText,
			isMobileChatView
		]
	)

	// Stop the active streamed response while preserving already-buffered output.
	const handleStopRequest = useCallback(() => {
		if (sessionId) void stopAgenticExecution(sessionId, authorizedFetchCompat)
		void abortActiveRequest()
		dispatchStream({ type: 'RESET_STREAM' })
	}, [sessionId, abortActiveRequest, authorizedFetchCompat])

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
								setSignupSource('llamaai')
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
		<LlamaAIChromeContext.Provider value={chromeValue}>
			<div
				className="isolate flex flex-nowrap overflow-hidden max-lg:fixed max-lg:inset-x-0 max-lg:top-[68px] max-lg:bottom-0 max-lg:z-10 max-lg:flex-col lg:relative lg:h-[calc(100dvh-72px)]"
				style={viewportHeight ? { height: `${viewportHeight - 68}px` } : undefined}
			>
				{!readOnly && sidebarVisible ? (
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
							onDelete={deleteSession}
							onUpdateTitle={updateSessionTitle}
							isDeletingSession={isDeletingSession}
							isUpdatingTitle={isUpdatingTitle}
							shouldAnimate={shouldAnimateSidebar}
							onOpenSettings={settingsModalStore.show}
							hasCustomInstructions={settings.customInstructions.trim().length > 0}
							onBulkDelete={bulkDeleteSessions}
							onPinSession={pinSession}
						/>
						<div className="flex min-h-11 lg:hidden" />
					</>
				) : null}

				<div
					className={`llamaai-chat-panel relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
				>
					{!readOnly && !sidebarVisible ? (
						<ChatControls
							handleNewChat={handleNewChat}
							onOpenSettings={settingsModalStore.show}
							hasCustomInstructions={settings.customInstructions.trim().length > 0}
							sessionTitle={effectiveSessionTitle}
						/>
					) : null}
					{restoringSessionId && !hasMessages ? (
						<LoadingConversationState />
					) : !hasMessages && visibleError ? (
						<EmptyConversationErrorState
							message={visibleError}
							onRetry={lastFailedRequest ? handleRetryLastFailedPrompt : undefined}
						/>
					) : shouldAnimateLandingTransition ? (
						<div className="relative flex flex-1 overflow-hidden">
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 motion-safe:animate-[llamaLandingExit_0.42s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:opacity-0"
							>
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
									quotedText={quotedText}
									onClearQuotedText={() => setQuotedText(null)}
								/>
							</div>
							<div className="absolute inset-0 flex flex-col motion-safe:animate-[llamaConversationEnter_0.5s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none">
								<ConversationView
									key={`shared-${effectiveSessionId ?? 'snapshot'}`}
									readOnly={readOnly}
									messages={effectiveMessages}
									sessionId={effectiveSessionId}
									isLlama={isLlama}
									isStreaming={isStreaming}
									activeToolCalls={activeToolCalls}
									spawnProgress={spawnProgress}
									spawnStartTime={spawnStartTime}
									executionStartedAt={executionStartedAt}
									spawnIsResearchMode={spawnIsResearchMode}
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
									animateActiveExchange={false}
									onOpenAlerts={alertsModalStore.show}
									quotedText={quotedText}
									onClearQuotedText={() => setQuotedText(null)}
									onTableFullscreenOpen={hideSidebar}
								/>
							</div>
						</div>
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
							quotedText={quotedText}
							onClearQuotedText={() => setQuotedText(null)}
						/>
					) : (
						<ConversationView
							key={`conversation-${conversationViewResetKey}`}
							readOnly={readOnly}
							messages={effectiveMessages}
							sessionId={effectiveSessionId}
							isLlama={isLlama}
							isStreaming={isStreaming}
							activeToolCalls={activeToolCalls}
							spawnProgress={spawnProgress}
							spawnStartTime={spawnStartTime}
							executionStartedAt={executionStartedAt}
							streamingThinking={streamingThinking}
							spawnIsResearchMode={spawnIsResearchMode}
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
							animateActiveExchange={shouldAnimateConversationTransition}
							onOpenAlerts={alertsModalStore.show}
							quotedText={quotedText}
							onClearQuotedText={() => setQuotedText(null)}
							onTableFullscreenOpen={hideSidebar}
						/>
					)}
				</div>
				{dashboardVersions.length > 0 ? (
					<Suspense fallback={null}>
						<DashboardPanel
							config={dashboardPanelMountedConfig}
							isOpen={dashboardPanelIsOpen}
							versions={dashboardVersions}
							versionIndex={dashboardVersionIndex}
							onVersionChange={handleDashboardVersionChange}
							onClose={handleDashboardClose}
							onExited={handleDashboardExited}
							sessionId={sessionId}
						/>
					</Suspense>
				) : null}
				{!readOnly ? (
					<TextSelectionPopup
						onSelect={(text) => {
							setQuotedText(text)
							requestAnimationFrame(() => {
								promptInputRef.current?.focus()
							})
						}}
					/>
				) : null}
				{!readOnly && rateLimitDetails ? (
					<ResearchLimitModal
						dialogStore={researchModalStore}
						period={rateLimitDetails.period}
						limit={rateLimitDetails.limit}
						resetTime={rateLimitDetails.resetTime}
					/>
				) : null}
				{!readOnly ? (
					<TokenLimitModal isOpen={showTokenLimitModal} onClose={() => setShowTokenLimitModal(false)} />
				) : null}
				{!readOnly ? <AlertsModal dialogStore={alertsModalStore} /> : null}
				{shouldRenderSubscribeModal ? (
					<Suspense fallback={<></>}>
						<SubscribeProModal dialogStore={subscribeModalStore} />
					</Suspense>
				) : null}
				{!readOnly ? <SettingsModal dialogStore={settingsModalStore} settings={settings} actions={actions} /> : null}
			</div>
		</LlamaAIChromeContext.Provider>
	)
}

const ChatControls = memo(function ChatControls({
	handleNewChat,
	onOpenSettings,
	hasCustomInstructions,
	sessionTitle
}: {
	handleNewChat: () => void
	onOpenSettings: () => void
	hasCustomInstructions: boolean
	sessionTitle: string | null
}) {
	const isMobile = useMedia('(max-width: 1023px)')
	const { isFullscreen, toggleFullscreen, toggleSidebar } = useLlamaAIChrome()
	const { balance, totalAvailable } = useAiBalance()

	const tooltipContent =
		sessionTitle || balance ? (
			<div className="flex items-center gap-3">
				<span>Open</span>
				<div className="flex flex-col items-end text-right">
					{sessionTitle ? <span>{sessionTitle}</span> : null}
					{balance ? <span>${totalAvailable.toFixed(2)}</span> : null}
				</div>
			</div>
		) : (
			'Open Chat History'
		)

	return (
		<div className="llamaai-chat-controls">
			<nav
				className="flex gap-2 max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:p-2.5 lg:absolute lg:top-2.5 lg:left-2.5 lg:z-10 lg:flex-col"
				aria-label="Chat controls"
			>
				<Tooltip
					content={tooltipContent}
					render={
						<button
							onClick={toggleSidebar}
							data-umami-event="llamaai-sidebar-toggle"
							data-umami-event-action="open"
							data-umami-event-source="collapsed_controls"
						/>
					}
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
				{!isMobile ? (
					<Tooltip
						content={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
						render={
							<button
								onClick={toggleFullscreen}
								data-umami-event="llamaai-fullscreen-toggle"
								data-umami-event-action={isFullscreen ? 'exit' : 'enter'}
								data-umami-event-source="collapsed_controls"
							/>
						}
						className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
					>
						<Icon name={isFullscreen ? 'shrink' : 'expand'} height={16} width={16} />
						<span className="sr-only">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
					</Tooltip>
				) : null}
			</nav>
			<Tooltip
				content="Settings"
				render={<button onClick={onOpenSettings} />}
				className="absolute bottom-2.5 left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white max-lg:hidden"
			>
				<div className="relative">
					<Icon name="settings" height={16} width={16} />
					{hasCustomInstructions ? (
						<span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#1853A8] dark:bg-[#4B86DB]" />
					) : null}
				</div>
				<span className="sr-only">Settings</span>
			</Tooltip>
		</div>
	)
})
