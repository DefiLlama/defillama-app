import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
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
import { ShareModal } from '~/containers/LlamaAI/components/ShareModal'
import { AgenticSidebar } from '~/containers/LlamaAI/components/sidebar/AgenticSidebar'
import { getToolLabel } from '~/containers/LlamaAI/components/status/StreamingStatus'
import { TextSelectionPopup } from '~/containers/LlamaAI/components/TextSelectionPopup'
import { TipActionProvider } from '~/containers/LlamaAI/components/TipActionContext'
import { TokenLimitModal } from '~/containers/LlamaAI/components/TokenLimitModal'
import {
	isTemporaryConnectivityError,
	RECOVERY_ATTEMPT_DELAYS_MS,
	RECOVERY_GRACE_MS
} from '~/containers/LlamaAI/connectionErrors'
import {
	checkActiveExecution,
	fetchAgenticResponse,
	resumeAgenticStream,
	stopAgenticExecution
} from '~/containers/LlamaAI/fetchAgenticResponse'
import type {
	AgenticSSECallbacks,
	CsvExport,
	MdExport,
	SpawnProgressData
} from '~/containers/LlamaAI/fetchAgenticResponse'
import { useChatScroll } from '~/containers/LlamaAI/hooks/useChatScroll'
import { useLlamaAISetting, useLlamaAISettings } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import { useVisualViewport } from '~/containers/LlamaAI/hooks/useVisualViewport'
import {
	buildAssistantMessage,
	createInitialStreamState,
	createStreamBuffer,
	hasStreamBufferContent,
	streamReducer,
	type ChatPageContext,
	type FailedRequest,
	type RateLimitDetails,
	type StreamBuffer,
	type StreamDispatch
} from '~/containers/LlamaAI/streamState'
import type {
	ChartConfiguration,
	DashboardArtifact,
	DashboardItem,
	Message,
	ToolExecution
} from '~/containers/LlamaAI/types'
import { buildRestoredAlerts } from '~/containers/LlamaAI/utils/restoredAlerts'
import type { RestoredAlertMetadata } from '~/containers/LlamaAI/utils/restoredAlerts'
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

interface PersistedToolExecution extends ToolExecution {
	toolName?: string
}

interface PersistedMessageMetadata extends RestoredAlertMetadata {
	toolExecutions?: PersistedToolExecution[]
	thinking?: string
	quotedText?: string
	dashboardConfig?: {
		dashboardName?: string
		items?: DashboardItem[]
		timePeriod?: string
		sourceDashboardId?: string
	}
	deliveryChannel?: 'email' | 'telegram'
	mdExports?: Array<{ id: string; title: string; url: string; filename: string }>
	x402_cost_usd?: string
}

interface PersistedMessage {
	role: 'user' | 'assistant'
	content?: string
	charts?: ChartConfiguration[]
	chartData?: Record<string, unknown[]>
	citations?: string[]
	csvExports?: CsvExport[]
	mdExports?: MdExport[]
	images?: Array<{
		url: string
		mimeType: string
		filename?: string
		originalFilename?: string
		textContent?: string
		size?: number
	}>
	generatedImages?: Array<{ id?: string; url: string; size?: string; prompt?: string; revised_prompt?: string }>
	metadata?: PersistedMessageMetadata
	messageMetadata?: { inputTokens?: number; outputTokens?: number; executionTimeMs?: number; x402CostUsd?: string }
	messageId?: string
	parentId?: string
	siblingInfo?: Message['siblingInfo']
	timestamp?: string | number
	savedAlertIds?: string[]
}

interface SharedSession {
	session: { sessionId: string; title: string; createdAt: string; isPublic: boolean }
	messages: SharedSessionMessage[]
	activeLeafMessageId?: string
	isPublicView: true
}

interface SharedSessionMessage {
	role: 'user' | 'assistant'
	content: string
	messageId?: string
	timestamp: number
	images?: Array<{
		url: string
		mimeType: string
		filename?: string
		originalFilename?: string
		textContent?: string
		size?: number
	}>
	generatedImages?: Array<{ id?: string; url: string; size?: string; prompt?: string; revised_prompt?: string }>
	metadata?: PersistedMessageMetadata
	charts?: ChartConfiguration[]
	chartData?: unknown[] | Record<string, unknown[]>
	citations?: string[]
	csvExports?: CsvExport[]
	mdExports?: MdExport[]
	savedAlertIds?: string[]
}

interface SessionRestoreResult {
	messages?: PersistedMessage[]
	activeLeafMessageId?: string
	pagination?: { hasMore?: boolean; cursor?: number | null; hasNewer?: boolean; newerCursor?: number | null }
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

type RequestKind = 'prompt' | 'resume' | 'restore' | 'pagination' | 'branch' | 'idle'
type PromptTransitionMode = 'idle' | 'landing' | 'conversation'

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

// Normalize older persisted tool payloads that may still use `toolName`.
function mapToolExecution(tool: PersistedToolExecution): ToolExecution {
	return {
		...tool,
		name: tool.name || tool.toolName || 'unknown'
	}
}

// Convert a persisted API message into the UI message shape used by the chat view.
function mapPersistedMessage(message: PersistedMessage, index?: number): Message {
	const dashboardConfig = message.metadata?.dashboardConfig
	return {
		role: message.role,
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
		csvExports: message.csvExports,
		mdExports: message.mdExports ?? message.metadata?.mdExports,
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
			content: message.content,
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		generatedImages: message.generatedImages,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		quotedText: message.metadata?.quotedText,
		messageMetadata: message.messageMetadata,
		id: message.messageId ?? (index != null ? `persisted-${index}` : undefined),
		parentId: message.parentId,
		siblingInfo: message.siblingInfo,
		timestamp: message.timestamp ? new Date(message.timestamp).getTime() : undefined
	}
}

// Map an entire persisted message list into renderable chat messages.
function mapPersistedMessages(messages: PersistedMessage[] | undefined): Message[] {
	if (!messages || messages.length === 0) return []
	return messages.map((msg, i) => mapPersistedMessage(msg, i))
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
function normalizePaginationState(
	pagination: { hasMore?: boolean; cursor?: number | null; hasNewer?: boolean; newerCursor?: number | null } | undefined
): {
	hasMore: boolean
	cursor: number | null
	hasNewer?: boolean
	newerCursor?: number | null
} {
	return {
		hasMore: pagination?.hasMore || false,
		cursor: pagination?.cursor ?? null,
		hasNewer: pagination?.hasNewer ?? false,
		newerCursor: pagination?.newerCursor ?? null
	}
}

// Shared/public sessions use a slightly different payload shape, so normalize them separately.
function mapSharedSessionMessage(message: SharedSessionMessage, index?: number): Message {
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
		mdExports: message.mdExports ?? message.metadata?.mdExports,
		citations: message.citations,
		alerts: buildRestoredAlerts({
			content: message.content,
			messageId: message.messageId,
			metadata: message.metadata,
			savedAlertIds: message.savedAlertIds
		}),
		savedAlertIds: message.savedAlertIds,
		images: message.images,
		generatedImages: message.generatedImages,
		toolExecutions: message.metadata?.toolExecutions?.map(mapToolExecution),
		thinking: message.metadata?.thinking,
		id: message.messageId ?? (index != null ? `shared-${index}` : undefined)
	}
}

interface AgenticChatProps {
	initialSessionId?: string
	sharedSession?: SharedSession
	readOnly?: boolean
	onForkSubmit?: (prompt: string) => void
	initialPrompt?: string
	shareToken?: string
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
	if (!hasStreamBufferContent(buffer)) {
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

function waitForRequestSettle(settleState: Exclude<RequestSettleState, null>, timeoutMs = 5000) {
	return Promise.race([
		settleState.promise,
		new Promise<void>((resolve) => {
			window.setTimeout(resolve, timeoutMs)
		})
	])
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
	replaceLocalUserMessageId,
	setMessageSiblingInfo,
	deferEmptyDone,
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
	replaceLocalUserMessageId?: (realId: string) => void
	setMessageSiblingInfo?: (messageId: string, siblingInfo: Message['siblingInfo']) => void
	deferEmptyDone?: boolean
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
			const reportIdx = buffer.text.indexOf('[REPORT_START]')
			if (reportIdx !== -1) {
				buffer.text = buffer.text.slice(reportIdx + '[REPORT_START]'.length).trimStart()
			}
			dispatch({ type: 'APPEND_TOKEN', value: content })
		},
		onCharts: (charts, chartData) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			dispatch({ type: 'CLEAR_ACTIVITY' })
			const chartSet = { charts, chartData: chartData as Record<string, any[]> }
			buffer.charts.push(chartSet)
			dispatch({ type: 'APPEND_CHARTS', value: chartSet })
		},
		onGeneratedImages: (images) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			if (!images?.length) return
			dispatch({ type: 'CLEAR_ACTIVITY' })
			buffer.generatedImages.push(...images)
			dispatch({ type: 'APPEND_GENERATED_IMAGES', value: images })
		},
		onCsvExport: (exports) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.csvExports.push(...exports)
			dispatch({ type: 'APPEND_CSV_EXPORTS', value: exports })
		},
		onMdExport: (exports) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.mdExports.push(...exports)
			dispatch({ type: 'APPEND_MD_EXPORTS', value: exports })
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
			const label = getToolLabel(toolName)
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
		onUserMessageId: (messageId) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			replaceLocalUserMessageId?.(messageId)
		},
		onSiblingInfo: (messageId, siblingInfo) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			setMessageSiblingInfo?.(messageId, siblingInfo)
		},
		onTitle: (title) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onTitle?.(title)
		},
		onTokenLimit: () => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			onTokenLimit?.()
		},
		onContextWarning: (warning) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			dispatch({ type: 'SET_CONTEXT_WARNING', value: warning })
		},
		onError: (content) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			buffer.error = content
			dispatch({ type: 'SET_ERROR', value: content })
		},
		onDone: () => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			if (deferEmptyDone && !buffer.error && !hasStreamBufferContent(buffer)) return
			appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
			dispatch({ type: 'RESET_STREAM' })
			notify()
		}
	}
}

export function AgenticChat({
	initialSessionId,
	sharedSession,
	readOnly = false,
	onForkSubmit,
	initialPrompt,
	shareToken
}: AgenticChatProps = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const hasUser = !!user
	const isMobileChatView = useMedia('(max-width: 1023px)')

	// Send shareToken only on the first agentic request so the backend can copy shared messages.
	// Uses a "consumed" flag so we always read the current prop but only forward it once per mount.
	const shareTokenConsumedRef = useRef(false)

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
		async (input: RequestInfo | URL, init?: RequestInit) => {
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
		hasNextPage: hasMoreSessions,
		isFetchingNextPage: isFetchingMoreSessions,
		loadMoreSessionsError,
		fetchNextPage: loadMoreSessions,
		moveSessionToTop
	} = useSessionList()
	const {
		createSession,
		createFakeSession,
		restoreSession,
		loadMoreMessages,
		loadNewerMessages,
		switchActiveLeaf,
		deleteSession,
		updateSessionTitle,
		isDeletingSession,
		isUpdatingTitle,
		bulkDeleteSessions,
		pinSession,
		isSwitchingActiveLeaf
	} = useSessionMutations()
	const { sidebarVisible, toggleSidebar, hideSidebar, isFullscreen, toggleFullscreen } = useSidebarVisibility()
	const enableSoundNotifications = useLlamaAISetting('enableSoundNotifications')
	const { notify, primeAudio } = useStreamNotification({ soundEnabled: enableSoundNotifications })
	const alertsModalStore = Ariakit.useDialogStore()
	const settingsModalStore = Ariakit.useDialogStore()
	const [shouldRenderSubscribeModal, setShouldRenderSubscribeModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({
		open: shouldRenderSubscribeModal,
		setOpen: setShouldRenderSubscribeModal
	})

	const [messages, setMessages] = useState<Message[]>([])
	const [activeLeafMessageId, setActiveLeafMessageId] = useState<string | null>(null)
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
	const [showShareModal, setShowShareModal] = useState(false)
	const [shareTargetMessageId, setShareTargetMessageId] = useState<string | null>(null)
	const { settings, actions, availableModels, availableEfforts } = useLlamaAISettings()
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
		hasNewer?: boolean
		newerCursor?: number | null
	}>({ hasMore: false, cursor: null })
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
		mdExports: streamingMdExports,
		alerts: streamingAlerts,
		citations: streamingCitations,
		toolExecutions: streamingToolExecutions,
		generatedImages: streamingGeneratedImages,
		thinking: streamingThinking,
		activeToolCalls,
		spawnProgress,
		spawnStartTime,
		spawnIsResearchMode,
		executionStartedAt,
		recovery,
		error,
		lastFailedRequest,
		rateLimitDetails,
		contextWarning
	} = streamState

	const sharedMessages = useMemo(
		() => sharedSession?.messages.map((msg, i) => mapSharedSessionMessage(msg, i)) ?? null,
		[sharedSession]
	)
	const forkedFromShared = sharedSession && sessionId
	const isSharedView = !!sharedSession && !forkedFromShared
	const effectiveMessages = (forkedFromShared ? null : sharedMessages) ?? messages
	const effectiveSessionId = (forkedFromShared ? sessionId : sharedSession?.session.sessionId) ?? sessionId
	const sessionListTitle = sessionId ? (sessions.find((s) => s.sessionId === sessionId)?.title ?? null) : null
	const effectiveSessionTitle = sharedSession?.session.title ?? sessionTitle ?? sessionListTitle
	const hasMessages = effectiveMessages.length > 0 || isStreaming
	const visibleError = viewError ?? error
	const shouldShowLanding = !hasMessages && !visibleError && !restoringSessionId
	const shouldAnimateLandingTransition =
		promptTransitionMode === 'landing' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldAnimateConversationTransition =
		promptTransitionMode === 'conversation' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldStartDetachedForAnchor = typeof window !== 'undefined' && /^#msg-/.test(window.location.hash)

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

	const openShareModal = useCallback((messageId?: string) => {
		setShareTargetMessageId(messageId ?? null)
		setShowShareModal(true)
	}, [])

	const setShareModalOpen = useCallback((nextOpen: boolean) => {
		setShowShareModal(nextOpen)
		if (!nextOpen) {
			setShareTargetMessageId(null)
		}
	}, [])

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
			streamingMdExports.length > 0 ||
			streamingAlerts.length > 0 ||
			streamingCitations.length > 0 ||
			streamingGeneratedImages.length > 0
		if (!hasContent) return null
		return {
			role: 'assistant',
			content: streamingText || undefined,
			charts: streamingCharts.length > 0 ? streamingCharts : undefined,
			csvExports: streamingCsvExports.length > 0 ? streamingCsvExports : undefined,
			mdExports: streamingMdExports.length > 0 ? streamingMdExports : undefined,
			alerts: streamingAlerts.length > 0 ? streamingAlerts : undefined,
			citations: streamingCitations.length > 0 ? streamingCitations : undefined,
			toolExecutions: streamingToolExecutions.length > 0 ? streamingToolExecutions : undefined,
			generatedImages: streamingGeneratedImages.length > 0 ? streamingGeneratedImages : undefined
		}
	}, [
		isStreaming,
		streamingText,
		streamingCharts,
		streamingCsvExports,
		streamingMdExports,
		streamingAlerts,
		streamingCitations,
		streamingToolExecutions,
		streamingGeneratedImages
	])

	const loadMoreMessagesMutation = useMutation({
		mutationFn: ({ targetSessionId, cursor }: { targetSessionId: string; cursor: number }) =>
			loadMoreMessages(targetSessionId, cursor)
	})
	const loadNewerMessagesMutation = useMutation({
		mutationFn: ({ targetSessionId, cursor }: { targetSessionId: string; cursor: number }) =>
			loadNewerMessages(targetSessionId, cursor)
	})
	const isLoadingMoreCurrentSession =
		loadMoreMessagesMutation.isPending && loadMoreMessagesMutation.variables?.targetSessionId === sessionId
	const isLoadingNewerCurrentSession =
		loadNewerMessagesMutation.isPending && loadNewerMessagesMutation.variables?.targetSessionId === sessionId
	const renderedPaginationState = useMemo(
		() => ({
			...paginationState,
			isLoadingMore: isLoadingMoreCurrentSession,
			isLoadingNewer: isLoadingNewerCurrentSession
		}),
		[paginationState, isLoadingMoreCurrentSession, isLoadingNewerCurrentSession]
	)

	// Load older messages when the user reaches the top, while preserving the current viewport position.
	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || loadMoreMessagesMutation.isPending || isStreaming) return

		const requestId = beginRequest(
			activeRequestIdRef,
			activeRequestKindRef,
			activeSessionIdRef,
			'pagination',
			sessionId
		)
		setPaginationError(null)
		await waitForNextPaint()
		const scrollSnapshot = getScrollSnapshot(scrollContainerRef.current)
		const result = await loadMoreMessagesMutation
			.mutateAsync({ targetSessionId: sessionId, cursor: paginationState.cursor! })
			.catch(() => {
				if (isActiveRequest(activeRequestIdRef, requestId) && activeSessionIdRef.current === sessionId) {
					setPaginationError('Failed to load older messages')
				}
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				return null
			})
		if (!result) return
		if (!isActiveRequest(activeRequestIdRef, requestId) || activeSessionIdRef.current !== sessionId) {
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
	}, [sessionId, paginationState, loadMoreMessagesMutation, isStreaming])

	// Load newer messages when the user reaches the bottom of a mid-conversation restore window.
	const handleLoadNewerMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasNewer || loadNewerMessagesMutation.isPending || isStreaming) return

		const requestId = beginRequest(
			activeRequestIdRef,
			activeRequestKindRef,
			activeSessionIdRef,
			'pagination',
			sessionId
		)
		setPaginationError(null)
		const result = await loadNewerMessagesMutation
			.mutateAsync({ targetSessionId: sessionId, cursor: paginationState.newerCursor! })
			.catch(() => {
				if (isActiveRequest(activeRequestIdRef, requestId) && activeSessionIdRef.current === sessionId) {
					setPaginationError('Failed to load newer messages')
				}
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				return null
			})
		if (!result) return
		if (!isActiveRequest(activeRequestIdRef, requestId) || activeSessionIdRef.current !== sessionId) {
			completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			return
		}

		const newer = mapPersistedMessages(result.messages)
		setMessages((prev) => [...prev, ...newer])

		setPaginationState((prev) => ({
			...prev,
			hasNewer: result.pagination?.hasNewer ?? false,
			newerCursor: result.pagination?.newerCursor ?? null
		}))
		completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
	}, [sessionId, paginationState, loadNewerMessagesMutation, isStreaming])

	// Expose the load-more callback through a stable event wrapper for the scroll listener.
	const handleLoadMoreMessagesEvent = useEffectEvent(() => {
		void handleLoadMoreMessages()
	})

	const handleLoadNewerMessagesEvent = useEffectEvent(() => {
		void handleLoadNewerMessages()
	})

	const {
		attach,
		scrollToBottom,
		isAttached: isScrollAttached,
		showScrollToBottom
	} = useChatScroll({
		scrollContainerRef,
		isStreaming,
		items: effectiveMessages,
		hasMessages,
		paginationState: renderedPaginationState,
		onLoadMoreMessages: handleLoadMoreMessagesEvent,
		onLoadNewerMessages: handleLoadNewerMessagesEvent,
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
			sidebarVisible,
			toggleDashboardPanel,
			isDashboardPanelOpen: dashboardPanelIsOpen
		}),
		[
			handleSidebarToggle,
			hideSidebar,
			toggleFullscreen,
			isFullscreen,
			sidebarVisible,
			toggleDashboardPanel,
			dashboardPanelIsOpen
		]
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

	// When the backend persists a freshly-sent user message, swap the
	// optimistic `local-N` id for the real UUID so edit/branch controls work.
	const replaceLocalUserMessageId = useCallback((realId: string) => {
		setMessages((prev) => {
			for (let i = prev.length - 1; i >= 0; i--) {
				const m = prev[i]
				if (m.role === 'user' && m.id?.startsWith('local-')) {
					const next = prev.slice()
					next[i] = { ...m, id: realId }
					return next
				}
			}
			return prev
		})
	}, [])

	// Apply siblingInfo to a specific message by id (avoids a full restore roundtrip after edits).
	const setMessageSiblingInfo = useCallback((messageId: string, siblingInfo: Message['siblingInfo']) => {
		setMessages((prev) => {
			const idx = prev.findIndex((m) => m.id === messageId)
			if (idx < 0) return prev
			const next = prev.slice()
			next[idx] = { ...next[idx], siblingInfo }
			return next
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
						replaceLocalUserMessageId,
						setMessageSiblingInfo,
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
						.then(() => {
							// Clear the recovery controller so that tab-return / visibility-change
							// handlers don't re-trigger a replay for the already-completed execution.
							const rc = recoveryControllerRef.current
							if (rc?.sessionId === targetSessionId) {
								clearRecoveryController()
							}
							return true
						})
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
				replaceLocalUserMessageId,
				setMessageSiblingInfo,
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
		[
			authorizedFetchCompat,
			appendMessage,
			clearRecoveryController,
			moveSessionToTop,
			notify,
			replaceLocalUserMessageId,
			setMessageSiblingInfo,
			updateSessionTitle
		]
	)

	const restoreSessionSnapshot = useCallback(
		async (
			targetSessionId: string,
			expectedRequestId: number,
			options?: { around?: string }
		): Promise<RestoreSessionSnapshotResult> => {
			const result = await restoreSession(targetSessionId, 10, options?.around).catch(
				() => null as SessionRestoreResult | null
			)
			if (!result || activeRequestIdRef.current !== expectedRequestId) {
				return { restored: false, recoveredResponse: false }
			}

			const restored: Message[] = (result.messages || []).map(mapPersistedMessage)
			const recoveredResponse = restored[restored.length - 1]?.role === 'assistant'

			if (options?.around) {
				window.location.hash = `msg-${options.around}`
			}

			setMessages(restored)
			setActiveLeafMessageId(
				'activeLeafMessageId' in result
					? (result.activeLeafMessageId ?? restored[restored.length - 1]?.id ?? null)
					: (restored[restored.length - 1]?.id ?? null)
			)
			setConversationViewResetKey((current) => current + 1)
			setSessionId(targetSessionId)
			const match = sessions.find((session) => session.sessionId === targetSessionId)
			setSessionTitle(match?.title || null)

			const allDashboards = restored.flatMap((m) => m.dashboards || [])
			dispatchDashboardPanel({ type: 'RESTORE', value: allDashboards })
			restoredSessionIdRef.current = targetSessionId
			isFirstMessageRef.current = false
			if (!options?.around) {
				attach()
			}
			setPaginationState({
				hasMore: result.pagination?.hasMore ?? false,
				cursor: result.pagination?.cursor ?? null,
				hasNewer: result.pagination?.hasNewer ?? false,
				newerCursor: result.pagination?.newerCursor ?? null
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
				existing.attemptInFlight = false
				dispatchStream({
					type: 'UPDATE_RECOVERY',
					attemptCount: existing.attemptCount,
					lastErrorMessage: existing.lastErrorMessage
				})
				queueRecoveryAttempt(existing.id, 0)
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
			await waitForRequestSettle(settleState)
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
		dispatchStream({ type: 'SET_CONTEXT_WARNING', value: null })
	}, [clearRecoveryController, resetPromptTransition])

	// Start a brand-new chat, or route away from a session page back to the base chat route.
	const handleNewChat = useCallback(async () => {
		if (initialSessionId || sharedSession) {
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
		setPaginationState({ hasMore: false, cursor: null })
		promptInputRef.current?.focus()
	}, [initialSessionId, sharedSession, abortActiveRequest, attach, clearConversationRuntimeState])

	// Restore a saved session, and resume any still-active server execution attached to it.
	const handleSessionSelect = useCallback(
		async (selectedSessionId: string, options?: { around?: string }) => {
			if (selectedSessionId === restoredSessionIdRef.current && selectedSessionId === sessionId && !options?.around)
				return
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
			const { restored: restoredOk, recoveredResponse } = await restoreSessionSnapshot(
				selectedSessionId,
				requestId,
				options
			)

			if (!restoredOk) {
				if (!isActiveRequest(activeRequestIdRef, requestId)) return
				setViewError('Failed to restore session')
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				setRestoringSessionId(null)
				return
			}

			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			window.history.replaceState(
				null,
				'',
				`/ai/chat/${selectedSessionId}${options?.around ? `#msg-${options.around}` : ''}`
			)
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

	const handleSearchMatchClick = useCallback(
		(targetSessionId: string, messageId: string) => {
			void handleSessionSelect(targetSessionId, { around: messageId })
		},
		[handleSessionSelect]
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

			// Shared session: fork in-place — seed messages + sessionId, then continue with normal submit flow
			if (sharedSession && !sessionId) {
				if (!hasUser) {
					onForkSubmit?.(trimmed)
					return
				}
			}
			triggerPromptTransition(shouldShowLanding ? 'landing' : 'conversation')
			promptSubmissionLockRef.current = true

			void abortActiveRequest()
				.then(() => {
					setViewError(null)
					setPaginationError(null)
					primeAudio()
					dispatchStream({ type: 'START_STREAM' })
					currentMessageIdRef.current = null

					let currentSessionId = sessionId

					// Fork shared session in-place: seed messages, create session, update URL
					if (sharedSession && !currentSessionId) {
						currentSessionId = createFakeSession()
						setSessionId(currentSessionId)
						setSessionTitle(sharedSession.session.title)
						const seeded = sharedSession.messages.map((msg, i) => mapSharedSessionMessage(msg, i))
						setMessages(seeded)
						isFirstMessageRef.current = false
						window.history.replaceState(null, '', `/ai/chat/${currentSessionId}`)
					} else if (isFirstMessageRef.current && !currentSessionId) {
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
							quotedText: currentQuotedText || undefined,
							id: `local-${prev.length}`
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
					const currentShareToken = !shareTokenConsumedRef.current ? shareToken : undefined
					if (currentShareToken) shareTokenConsumedRef.current = true
					const failedRequest: FailedRequest = {
						prompt: trimmed,
						entities: entities?.length ? entities : undefined,
						images: images?.length ? images : undefined,
						pageContext
					}
					let didFetchResolve = false

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
						model: settings.model || undefined,
						effort: settings.effort || undefined,
						isSuggestedQuestion,
						blockedSkills: isMobileChatView ? ['dashboard'] : undefined,
						shareToken: currentShareToken,
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
							replaceLocalUserMessageId,
							setMessageSiblingInfo,
							deferEmptyDone: true,
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
						.then(() => {
							didFetchResolve = true
						})
						.catch(async (err: UsageLimitError) => {
							if (!isActiveRequest(activeRequestIdRef, requestId)) return
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
							if (currentSessionId && isTemporaryConnectivityError(err)) {
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
						.then(async () => {
							let handedOffToResume = false
							let recoveryStarted = false
							if (
								didFetchResolve &&
								isActiveRequest(activeRequestIdRef, requestId) &&
								currentSessionId &&
								!buffer.error &&
								!hasStreamBufferContent(buffer)
							) {
								buffer.receivedEventCount = eventCounter.count
								const resumeSessionId = currentSessionId
								handedOffToResume = await resumeRunningExecution({
									targetSessionId: resumeSessionId,
									buffer,
									resetStream: false,
									onTemporaryDisconnect: (disconnectError, streamBuffer) => {
										recoveryStarted = startRecoveryCycle({
											targetSessionId: resumeSessionId,
											buffer: streamBuffer,
											failedRequest,
											error: disconnectError
										})
									}
								})
								if (!handedOffToResume && !recoveryStarted && isActiveRequest(activeRequestIdRef, requestId)) {
									dispatchStream({ type: 'RESET_STREAM' })
								}
							}

							if (!handedOffToResume && isActiveRequest(activeRequestIdRef, requestId)) {
								setActiveLeafMessageId(currentMessageIdRef.current)
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
			primeAudio,
			notify,
			settings.customInstructions,
			settings.enablePremiumTools,
			appendMessage,
			replaceLocalUserMessageId,
			abortActiveRequest,
			resumeRunningExecution,
			startRecoveryCycle,
			setMessageSiblingInfo,
			sessionTitle,
			sessions,
			attach,
			shouldShowLanding,
			triggerPromptTransition,
			quotedText,
			isMobileChatView,
			settings.model,
			settings.effort,
			sharedSession,
			shareToken,
			hasUser,
			onForkSubmit
		]
	)

	const handleEditMessage = useCallback(
		async (messageId: string, newText: string, original: Message): Promise<void> => {
			const trimmed = newText.trim()
			if (!sessionId || !trimmed) return
			const idx = messages.findIndex((message) => message.id === messageId && message.role === 'user')
			if (idx < 0) return

			const messagesSnapshot = messages
			const activeLeafSnapshot = activeLeafMessageId
			const truncated = messages.slice(0, idx)
			const isBranchingEdit = !/^(local|persisted|shared)-/.test(messageId)

			// Abort any in-flight submission FIRST — its `.finally` releases the prompt lock,
			// otherwise the lock check below would always bail during streaming.
			try {
				await abortActiveRequest()
			} catch {
				return
			}

			if (promptSubmissionLockRef.current) return
			promptSubmissionLockRef.current = true
			triggerPromptTransition('conversation')

			setViewError(null)
			setPaginationError(null)
			dispatchStream({ type: 'START_STREAM' })
			currentMessageIdRef.current = null
			setMessages([
				...truncated,
				{
					role: 'user',
					content: trimmed,
					images: original.images,
					quotedText: original.quotedText,
					id: `local-edit-${Date.now()}`
				}
			])
			attach()

			const buffer = createStreamBuffer()
			const controller = new AbortController()
			abortControllerRef.current = controller
			const requestId = beginRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, 'prompt', sessionId)
			const settleState = createRequestSettleState(requestId)
			activeRequestSettleRef.current = settleState
			const eventCounter = { count: 0 }

			try {
				await fetchAgenticResponse({
					message: trimmed,
					sessionId,
					editMessageId: isBranchingEdit ? messageId : undefined,
					researchMode: isResearchMode,
					quotedText: original.quotedText || undefined,
					customInstructions: settings.customInstructions || undefined,
					enablePremiumTools: settings.enablePremiumTools,
					model: settings.model || undefined,
					effort: settings.effort || undefined,
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
						replaceLocalUserMessageId,
						setMessageSiblingInfo,
						deferEmptyDone: true,
						notify,
						onDashboardArtifact: (dashboard) => dispatchDashboardPanel({ type: 'APPEND', value: dashboard }),
						onTokenLimit: () => setShowTokenLimitModal(true),
						onTitle: (title) => {
							setSessionTitle(title)
							updateSessionTitle({ sessionId, title }).catch(() => {})
						}
					})
				})
				if (isActiveRequest(activeRequestIdRef, requestId) && !buffer.error && !hasStreamBufferContent(buffer)) {
					buffer.receivedEventCount = eventCounter.count
					let recoveryStarted = false
					const handedOffToResume = await resumeRunningExecution({
						targetSessionId: sessionId,
						buffer,
						resetStream: false,
						onTemporaryDisconnect: (disconnectError, streamBuffer) => {
							recoveryStarted = startRecoveryCycle({
								targetSessionId: sessionId,
								buffer: streamBuffer,
								failedRequest: null,
								error: disconnectError
							})
						}
					})
					if (handedOffToResume) return
					if (recoveryStarted) {
						completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
						return
					}
					if (isActiveRequest(activeRequestIdRef, requestId)) {
						dispatchStream({ type: 'RESET_STREAM' })
					}
				}
				if (isActiveRequest(activeRequestIdRef, requestId)) {
					setActiveLeafMessageId(currentMessageIdRef.current)
					abortControllerRef.current = null
					completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				}
				// siblingInfo arrives via SSE `sibling_info` mid-stream — no extra restore call needed
			} catch (err) {
				const editError = err as UsageLimitError
				if (controller.signal.aborted || editError?.name === 'AbortError') {
					appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
					dispatchStream({ type: 'RESET_STREAM' })
					completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
					return
				}
				if (isTemporaryConnectivityError(editError)) {
					buffer.receivedEventCount = eventCounter.count
					if (
						startRecoveryCycle({
							targetSessionId: sessionId,
							buffer,
							failedRequest: null,
							error: editError instanceof Error ? editError : new Error(getErrorMessage(editError))
						})
					) {
						completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
						return
					}
				}
				setMessages(messagesSnapshot)
				setActiveLeafMessageId(activeLeafSnapshot)
				setViewError(getErrorMessage(editError))
				dispatchStream({ type: 'RESET_STREAM' })
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
				throw err
			} finally {
				if (abortControllerRef.current === controller) {
					abortControllerRef.current = null
				}
				settleState.resolve()
				if (activeRequestSettleRef.current?.requestId === requestId) {
					activeRequestSettleRef.current = null
				}
				promptSubmissionLockRef.current = false
			}
		},
		[
			activeLeafMessageId,
			appendMessage,
			replaceLocalUserMessageId,
			attach,
			authorizedFetchCompat,
			abortActiveRequest,
			isMobileChatView,
			isResearchMode,
			messages,
			notify,
			resumeRunningExecution,
			sessionId,
			settings.customInstructions,
			settings.enablePremiumTools,
			settings.effort,
			settings.model,
			setMessageSiblingInfo,
			startRecoveryCycle,
			triggerPromptTransition,
			updateSessionTitle
		]
	)

	const handleBranchSwitch = useCallback(
		async (leafMessageId: string) => {
			if (!sessionId || isStreaming) return
			await abortActiveRequest()
			const requestId = beginRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, 'branch', sessionId)
			setViewError(null)
			setPaginationError(null)
			try {
				const result = await switchActiveLeaf({ sessionId, leafMessageId })
				if (!isActiveRequest(activeRequestIdRef, requestId) || activeSessionIdRef.current !== sessionId) return
				setActiveLeafMessageId(result.activeLeafMessageId)
				if (Array.isArray(result.messages)) {
					const restored = mapPersistedMessages(result.messages as PersistedMessage[])
					setMessages(restored)
					setConversationViewResetKey((current) => current + 1)
					dispatchDashboardPanel({ type: 'RESTORE', value: restored.flatMap((message) => message.dashboards || []) })
					setPaginationState(normalizePaginationState(result.pagination))
					dispatchStream({ type: 'SET_ERROR', value: null })
					dispatchStream({ type: 'SET_LAST_FAILED_REQUEST', value: null })
					dispatchStream({ type: 'RESET_RECOVERY' })
				} else {
					await restoreSessionSnapshot(sessionId, requestId)
				}
			} catch (switchError) {
				if (isActiveRequest(activeRequestIdRef, requestId) && activeSessionIdRef.current === sessionId) {
					setViewError(getErrorMessage(switchError))
				}
			} finally {
				completeRequest(activeRequestIdRef, activeRequestKindRef, activeSessionIdRef, requestId)
			}
		},
		[abortActiveRequest, isStreaming, restoreSessionSnapshot, sessionId, switchActiveLeaf]
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

	// Immediately attempt to reconnect to a running or completed server-side execution.
	// Works during active recovery (doesn't require lastFailedRequest).
	const handleReconnectNow = useEffectEvent(() => {
		const controller = recoveryControllerRef.current
		if (controller) {
			attemptRecoveryForController(controller.id)
			return
		}
		if (sessionId) {
			void resumeRunningExecution({ targetSessionId: sessionId })
		}
	})

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
	// Resets the recovery grace period so it doesn't immediately exhaust after mobile sleep
	// (setTimeout timers are frozen during sleep but wall clock advances).
	const reconnectVisibleExecutionEvent = useEffectEvent(() => {
		if (readOnly) return
		const controller = recoveryControllerRef.current
		if (controller) {
			controller.startedAt = Date.now()
			if (controller.expiryTimerId !== null) {
				window.clearTimeout(controller.expiryTimerId)
			}
			controller.expiryTimerId = window.setTimeout(() => {
				const latest = recoveryControllerRef.current
				if (!latest || latest.id !== controller.id || latest.attemptInFlight || latest.streamAttached) return
				exhaustRecovery(latest)
			}, RECOVERY_GRACE_MS)
			attemptRecoveryForController(controller.id)
			return
		}
		if (sessionId && !isStreaming && error) {
			void resumeRunningExecution({ targetSessionId: sessionId })
		}
	})

	useEffect(() => {
		const onVisibilityChange = () => {
			if (!document.hidden) {
				reconnectVisibleExecutionEvent()
			}
		}
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) {
				reconnectVisibleExecutionEvent()
			}
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('pageshow', onPageShow)
		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('pageshow', onPageShow)
		}
	}, [])

	useEffect(() => {
		const onOnline = () => {
			reconnectVisibleExecutionEvent()
		}

		window.addEventListener('online', onOnline)
		return () => window.removeEventListener('online', onOnline)
	}, [])

	// After recovery exhausts, periodically check if the server-side execution completed
	// so we can restore the result without requiring user interaction.
	useEffect(() => {
		if (isStreaming || !error || !sessionId || readOnly) return
		const intervalId = window.setInterval(() => {
			if (document.hidden) return
			void resumeRunningExecution({ targetSessionId: sessionId })
		}, 30_000)
		return () => window.clearInterval(intervalId)
	}, [isStreaming, error, sessionId, readOnly, resumeRunningExecution])

	// Mirror route param updates into a ref so the restore effect can consume them once.
	useEffect(() => {
		pendingInitialSessionIdRef.current = initialSessionId
	}, [initialSessionId])

	// Restore the requested session as soon as the routed session id becomes available.
	// If the URL contains a #msg-<id> hash, extract it and pass as the `around` anchor
	// so the restore window centers on that message instead of loading from the bottom.
	useEffect(() => {
		const nextSessionId = pendingInitialSessionIdRef.current
		if (!nextSessionId) return

		pendingInitialSessionIdRef.current = undefined
		restoredSessionIdRef.current = null
		const hash = typeof window !== 'undefined' ? window.location.hash : ''
		const anchorMatch = hash.match(/^#msg-(.+)$/)
		void handleSessionSelect(nextSessionId, anchorMatch ? { around: anchorMatch[1] } : undefined)
	}, [initialSessionId, handleSessionSelect])

	// Shared/public sessions are read-only snapshots, so they should never create a fake local session.
	useEffect(() => {
		if (!sharedSession) return
		isFirstMessageRef.current = false
	}, [sharedSession])

	// Auto-send the initial prompt after a forked session finishes restoring.
	const initialPromptSentRef = useRef(false)
	useEffect(() => {
		if (!initialPrompt || initialPromptSentRef.current) return
		if (restoringSessionId) return
		initialPromptSentRef.current = true
		const frameId = window.requestAnimationFrame(() => {
			handleSubmit(initialPrompt)
		})

		return () => {
			window.cancelAnimationFrame(frameId)
		}
	}, [initialPrompt, restoringSessionId, handleSubmit])

	const tipActionHandlers = useMemo(
		() => ({
			openSettingsModal: settingsModalStore.show,
			openAlertsModal: alertsModalStore.show,
			toggleResearchMode: () => setIsResearchMode((v) => !v),
			submitPrompt: (prompt: string) => handleSubmit(prompt)
		}),
		[settingsModalStore.show, alertsModalStore.show, setIsResearchMode, handleSubmit]
	)

	if (!user && !readOnly && !sharedSession) {
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
		<TipActionProvider handlers={tipActionHandlers}>
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
								onSearchMatchClick={handleSearchMatchClick}
								hasMoreSessions={hasMoreSessions}
								isFetchingMoreSessions={isFetchingMoreSessions}
								loadMoreSessionsError={loadMoreSessionsError}
								onLoadMoreSessions={loadMoreSessions}
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
								canShare={!isSharedView && effectiveMessages.length > 0}
								onShare={() => openShareModal()}
							/>
						) : null}
						{!readOnly && !isSharedView && effectiveMessages.length > 0 ? (
							<button
								onClick={() => openShareModal()}
								data-umami-event="llamaai-share-modal-open"
								data-umami-event-source="header_controls"
								className="absolute top-2.5 right-2.5 z-10 hidden items-center gap-1.5 rounded-md border border-[#e6e6e6] bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-[#444] transition-colors hover:bg-[#f7f7f7] lg:flex dark:border-[#333] dark:text-[#ccc] dark:hover:bg-[#222324]"
							>
								<Icon name="share" height={14} width={14} />
								Share
							</button>
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
										isSharedView={isSharedView}
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
										enterToSend={settings.enterToSend}
									/>
								</div>
								<div className="absolute inset-0 flex flex-col motion-safe:animate-[llamaConversationEnter_0.5s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none">
									<ConversationView
										key={`shared-${effectiveSessionId ?? 'snapshot'}`}
										readOnly={readOnly}
										isSharedView={isSharedView}
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
										paginationState={renderedPaginationState}
										paginationError={paginationError}
										recovery={recovery}
										error={visibleError}
										lastFailedPrompt={viewError ? null : (lastFailedRequest?.prompt ?? null)}
										onRetryLastFailedPrompt={handleRetryLastFailedPrompt}
										onReconnectNow={handleReconnectNow}
										scrollContainerRef={scrollContainerRef}
										messagesEndRef={messagesEndRef}
										promptInputRef={promptInputRef}
										isScrollAttached={isScrollAttached}
										showScrollToBottom={showScrollToBottom}
										scrollToBottom={scrollToBottom}
										handleSubmit={handleSubmit}
										handleStopRequest={handleStopRequest}
										handleActionClick={handleActionClick}
										onEditMessage={handleEditMessage}
										onBranchSwitch={handleBranchSwitch}
										isBranchSwitching={isSwitchingActiveLeaf}
										isResearchMode={isResearchMode}
										setIsResearchMode={setIsResearchMode}
										researchUsage={researchUsage}
										animateActiveExchange={false}
										onOpenAlerts={alertsModalStore.show}
										quotedText={quotedText}
										onClearQuotedText={() => setQuotedText(null)}
										enterToSend={settings.enterToSend}
										onTableFullscreenOpen={hideSidebar}
										onShare={openShareModal}
									/>
								</div>
							</div>
						) : !hasMessages && !visibleError ? (
							<ChatLanding
								readOnly={readOnly}
								isSharedView={isSharedView}
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
								enterToSend={settings.enterToSend}
							/>
						) : (
							<ConversationView
								key={`conversation-${conversationViewResetKey}`}
								readOnly={readOnly}
								isSharedView={isSharedView}
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
								paginationState={renderedPaginationState}
								paginationError={paginationError}
								recovery={recovery}
								error={visibleError}
								lastFailedPrompt={viewError ? null : (lastFailedRequest?.prompt ?? null)}
								onRetryLastFailedPrompt={handleRetryLastFailedPrompt}
								onReconnectNow={handleReconnectNow}
								scrollContainerRef={scrollContainerRef}
								messagesEndRef={messagesEndRef}
								promptInputRef={promptInputRef}
								isScrollAttached={isScrollAttached}
								showScrollToBottom={showScrollToBottom}
								scrollToBottom={scrollToBottom}
								handleSubmit={handleSubmit}
								handleStopRequest={handleStopRequest}
								handleActionClick={handleActionClick}
								onEditMessage={handleEditMessage}
								onBranchSwitch={handleBranchSwitch}
								isBranchSwitching={isSwitchingActiveLeaf}
								isResearchMode={isResearchMode}
								setIsResearchMode={setIsResearchMode}
								researchUsage={researchUsage}
								animateActiveExchange={shouldAnimateConversationTransition}
								onOpenAlerts={alertsModalStore.show}
								quotedText={quotedText}
								onClearQuotedText={() => setQuotedText(null)}
								enterToSend={settings.enterToSend}
								onTableFullscreenOpen={hideSidebar}
								onShare={openShareModal}
								contextWarning={contextWarning}
								onDismissContextWarning={() => dispatchStream({ type: 'SET_CONTEXT_WARNING', value: null })}
								onStartNewChat={() => void handleNewChat()}
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
					{!readOnly && showShareModal ? (
						<ShareModal
							open={true}
							setOpen={setShareModalOpen}
							sessionId={effectiveSessionId}
							messageId={shareTargetMessageId}
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
							settings={settings}
							actions={actions}
							availableModels={availableModels}
							availableEfforts={availableEfforts}
						/>
					) : null}
				</div>
			</LlamaAIChromeContext.Provider>
		</TipActionProvider>
	)
}

const ChatControls = memo(function ChatControls({
	handleNewChat,
	onOpenSettings,
	hasCustomInstructions,
	sessionTitle,
	canShare,
	onShare
}: {
	handleNewChat: () => void
	onOpenSettings: () => void
	hasCustomInstructions: boolean
	sessionTitle: string | null
	canShare: boolean
	onShare: () => void
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
				className="flex gap-2 max-lg:flex-wrap max-lg:items-center max-lg:p-2.5 lg:absolute lg:top-2.5 lg:left-2.5 lg:z-10 lg:flex-col"
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
					className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue) focus-visible:bg-(--old-blue) max-lg:ml-auto"
				>
					<Icon name="message-square-plus" height={16} width={16} />
					<span className="sr-only">New Chat</span>
				</Tooltip>
				{canShare ? (
					<button
						onClick={onShare}
						data-umami-event="llamaai-share-modal-open"
						data-umami-event-source="header_controls"
						className="flex h-6 items-center gap-1 rounded-sm bg-(--old-blue)/12 px-2 text-[11px] text-(--old-blue) transition-colors hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white lg:hidden"
					>
						<Icon name="share" height={12} width={12} />
						Share
					</button>
				) : null}
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
