import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
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
	useState
} from 'react'
import { Icon } from '~/components/Icon'
import {
	consumePendingPrompt,
	consumePendingPageContext,
	consumePendingSuggestedFlag
} from '~/components/LlamaAIFloatingButton'
import { Tooltip } from '~/components/Tooltip'
import { authorizedFetchAsFetch } from '~/containers/LlamaAI/authorizedFetchAdapter'
import { LlamaAIChromeContext, useLlamaAIChrome } from '~/containers/LlamaAI/chrome'
import { AlertsModal } from '~/containers/LlamaAI/components/AlertsModal'
import { ChatSurface, type LandingOverrideApi } from '~/containers/LlamaAI/components/ChatSurface'
import {
	EmptyConversationErrorState,
	LoadingConversationState,
	type ConversationViewModel
} from '~/containers/LlamaAI/components/ConversationView'
import { ResearchLimitModal } from '~/containers/LlamaAI/components/ResearchLimitModal'
import { SettingsModal } from '~/containers/LlamaAI/components/SettingsModal'
import { ShareModal } from '~/containers/LlamaAI/components/ShareModal'
import { AgenticSidebar } from '~/containers/LlamaAI/components/sidebar/AgenticSidebar'
import { TextSelectionPopup } from '~/containers/LlamaAI/components/TextSelectionPopup'
import { TipActionProvider } from '~/containers/LlamaAI/components/TipActionContext'
import { TokenLimitModal } from '~/containers/LlamaAI/components/TokenLimitModal'
import {
	isTemporaryConnectivityError,
	RECOVERY_ATTEMPT_DELAYS_MS,
	RECOVERY_GRACE_MS
} from '~/containers/LlamaAI/connectionErrors'
import { dashboardPanelReducer, INITIAL_DASHBOARD_PANEL_STATE } from '~/containers/LlamaAI/dashboardPanelState'
import {
	checkActiveExecution,
	fetchAgenticResponse,
	resumeAgenticStream,
	stopAgenticExecution
} from '~/containers/LlamaAI/fetchAgenticResponse'
import { useChatScroll } from '~/containers/LlamaAI/hooks/useChatScroll'
import { useLlamaAISetting, useLlamaAISettings } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSettingsRouteIntent } from '~/containers/LlamaAI/hooks/useSettingsRouteIntent'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import { useVisualViewport } from '~/containers/LlamaAI/hooks/useVisualViewport'
import { toSessionId } from '~/containers/LlamaAI/ids'
import {
	mapPersistedMessage,
	mapPersistedMessages,
	mapSharedSessionMessage,
	type PersistedMessage,
	type SessionRestoreResult,
	type SharedSession
} from '~/containers/LlamaAI/messageMappers'
import { ProjectLanding } from '~/containers/LlamaAI/projects/ProjectLanding'
import { ProjectsGrid } from '~/containers/LlamaAI/projects/ProjectsGrid'
import { getProjectTier } from '~/containers/LlamaAI/projects/tier'
import {
	beginRequest,
	completeRequest,
	isActiveRequest,
	waitForRequestSettle,
	type RequestKind,
	type RequestSettleState
} from '~/containers/LlamaAI/requestLifecycle'
import { isFreeLimitError, runAgenticRequest, type UsageLimitError } from '~/containers/LlamaAI/runAgenticRequest'
import { appendBufferedAssistantMessage, createAgenticCallbacks } from '~/containers/LlamaAI/streamCallbacks'
import {
	createInitialStreamState,
	createStreamBuffer,
	hasStreamBufferContent,
	streamReducer,
	type ChatPageContext,
	type FailedRequest,
	type StreamBuffer
} from '~/containers/LlamaAI/streamState'
import type { Message, UpgradeOffer } from '~/containers/LlamaAI/types'
import type { SettingsInitialState, SettingsTabId } from '~/containers/LlamaAI/utils/settingsIntent'
import { useAuthContext } from '~/containers/Subscription/auth'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { useAiBalance } from '~/containers/Subscription/useTopup'
import { useLlamaAINavigate, useProjectHomeSignal } from '~/contexts/LlamaAINavigate'
import { useLlamaAIRouteContext } from '~/contexts/LlamaAIRouteState'
import { useOptionalSessionAliases } from '~/contexts/SessionAliasRegistry'
import { useMedia } from '~/hooks/useMedia'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import {
	isSameAgenticRouteTransition,
	shouldSkipCurrentSessionRouteRestore,
	type AgenticRouteTransition
} from './routeTransition'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const DashboardPanel = lazy(() =>
	import('~/containers/LlamaAI/components/DashboardPanel').then((m) => ({ default: m.DashboardPanel }))
)

interface RestoreSessionSnapshotResult {
	restored: boolean
	recoveredResponse: boolean
}

function buildFreeLimitMessage(err: UsageLimitError & { code: UpgradeOffer['code'] }): Message {
	const isDaily = err.code === 'FREE_DAILY_LIMIT'
	let content = isDaily ? "You've reached today's free question limit." : "You've reached your free question limit."
	if (err.details?.resetTime) {
		const resetMs = new Date(err.details.resetTime).getTime() - Date.now()
		if (resetMs > 0) {
			const hours = Math.floor(resetMs / 3600000)
			const minutes = Math.floor((resetMs % 3600000) / 60000)
			const timeStr = hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h ${minutes}m`
			content += ` Resets in ${timeStr}.`
		}
	}
	return {
		role: 'assistant',
		content,
		upgradeOffer: {
			code: err.code,
			resetTime: err.details?.resetTime ?? null
		}
	}
}

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

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
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

interface AgenticChatProps {
	sharedSession?: SharedSession
	readOnly?: boolean
	onForkSubmit?: (prompt: string) => void
	onSharedSessionFork?: (sessionId: string) => void
	initialPrompt?: string
	shareToken?: string
	rightPanel?: React.ReactNode
}

export function AgenticChat({
	sharedSession,
	readOnly = false,
	onForkSubmit,
	onSharedSessionFork,
	initialPrompt,
	shareToken,
	rightPanel
}: AgenticChatProps = {}) {
	const { authorizedFetch, user, hasActiveSubscription, isTrial } = useAuthContext()
	const hasUser = !!user
	const isMobileChatView = useMedia('(max-width: 1023px)')
	const route = useLlamaAIRouteContext()
	const navigate = useLlamaAINavigate()
	const projectHomeSignal = useProjectHomeSignal()
	const projectHomeSignalRef = useRef(projectHomeSignal)
	const sessionAliases = useOptionalSessionAliases()
	const resolveSessionAlias = useCallback((id: string) => sessionAliases?.resolve(id) ?? id, [sessionAliases])
	const registerSessionAlias = useCallback(
		(fakeId: string, realId: string) => {
			sessionAliases?.register(fakeId, realId)
		},
		[sessionAliases]
	)
	const routeProjectId = route.kind === 'project' ? route.projectId : null
	const routeInitialPrompt = route.kind === 'chat-session' ? route.initialPrompt : initialPrompt
	const routeShareToken = route.kind === 'chat-session' ? route.shareToken : undefined
	const effectiveShareToken = shareToken ?? routeShareToken
	const projectTier = getProjectTier(user, hasActiveSubscription, isTrial)

	// Send shareToken only on the first agentic request so the backend can copy shared messages.
	// Uses a "consumed" flag so we always read the current prop but only forward it once per mount.
	const shareTokenConsumedRef = useRef(false)

	// Adapt the auth helper to the native fetch signature while preserving non-2xx responses for downstream error handling.
	const authorizedFetchCompat = useMemo(() => authorizedFetchAsFetch(authorizedFetch), [authorizedFetch])
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
		isSwitchingActiveLeaf,
		replaceOptimisticSessionId
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
	const [currentSessionProjectId, setCurrentSessionProjectId] = useState<string | null>(null)
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
	const [initialIntegrationsState, setInitialIntegrationsState] = useState<SettingsInitialState | null>(null)
	const router = useRouter()
	const {
		settings,
		actions,
		availableModels,
		availableEfforts,
		telegramStatus,
		queryState: settingsQueryState
	} = useLlamaAISettings()
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null)
	const [viewError, setViewError] = useState<string | null>(null)
	const [paginationError, setPaginationError] = useState<string | null>(null)
	const researchModalStore = Ariakit.useDialogStore()
	const currentMessageIdRef = useRef<string | null>(null)
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
	const currentSessionIdRef = useRef<string | null>(null)
	const currentSessionProjectIdRef = useRef<string | null>(null)
	const previousRouteTransitionRef = useRef<AgenticRouteTransition | null>(null)
	const consumedInitialPromptRef = useRef<{ sessionId: string; prompt: string } | null>(null)
	const {
		isStreaming,
		isCompacting,
		text: streamingText,
		charts: streamingCharts,
		csvExports: streamingCsvExports,
		mdExports: streamingMdExports,
		alerts: streamingAlerts,
		dashboards: streamingDashboards,
		citations: streamingCitations,
		toolExecutions: streamingToolExecutions,
		generatedImages: streamingGeneratedImages,
		thinking: streamingThinking,
		activeToolCalls,
		spawnProgress,
		spawnStartTime,
		spawnIsResearchMode,
		todos: streamingTodos,
		todosStartTime,
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
	const routeSessionId = route.kind === 'chat-session' ? resolveSessionAlias(route.sessionId) : null
	const lookupSessionId = sessionId ?? routeSessionId ?? null
	const sessionListEntry = lookupSessionId ? (sessions.find((s) => s.sessionId === lookupSessionId) ?? null) : null
	const sessionListTitle = sessionListEntry?.title ?? null
	const effectiveSessionTitle = sharedSession?.session.title ?? sessionTitle ?? sessionListTitle
	const effectiveSessionProjectId = currentSessionProjectId ?? sessionListEntry?.projectId ?? null
	const hasMessages = effectiveMessages.length > 0 || isStreaming
	const visibleError = viewError ?? error
	const shouldShowLanding = !hasMessages && !visibleError && !restoringSessionId
	const shouldAnimateLandingTransition =
		promptTransitionMode === 'landing' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldAnimateConversationTransition =
		promptTransitionMode === 'conversation' && hasMessages && !visibleError && !restoringSessionId && !readOnly
	const shouldStartDetachedForAnchor = typeof window !== 'undefined' && /^#msg-/.test(window.location.hash)

	useEffect(() => {
		currentSessionIdRef.current = sessionId
	}, [sessionId])

	useEffect(() => {
		currentSessionProjectIdRef.current = currentSessionProjectId
	}, [currentSessionProjectId])

	useEffect(() => {
		const timer = setTimeout(() => window.dispatchEvent(new CustomEvent('chartResize')), 250)
		return () => clearTimeout(timer)
	}, [dashboardPanelIsOpen, dashboardPanelMountedConfig])

	useSettingsRouteIntent({ router, user, settingsModalStore, setInitialIntegrationsState })

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
			streamingDashboards.length > 0 ||
			streamingCitations.length > 0 ||
			streamingToolExecutions.length > 0 ||
			streamingThinking ||
			streamingGeneratedImages.length > 0
		if (!hasContent) return null
		return {
			role: 'assistant',
			content: streamingText || undefined,
			charts: streamingCharts.length > 0 ? streamingCharts : undefined,
			csvExports: streamingCsvExports.length > 0 ? streamingCsvExports : undefined,
			mdExports: streamingMdExports.length > 0 ? streamingMdExports : undefined,
			alerts: streamingAlerts.length > 0 ? streamingAlerts : undefined,
			dashboards: streamingDashboards.length > 0 ? streamingDashboards : undefined,
			citations: streamingCitations.length > 0 ? streamingCitations : undefined,
			toolExecutions: streamingToolExecutions.length > 0 ? streamingToolExecutions : undefined,
			thinking: streamingThinking || undefined,
			generatedImages: streamingGeneratedImages.length > 0 ? streamingGeneratedImages : undefined
		}
	}, [
		isStreaming,
		streamingText,
		streamingCharts,
		streamingCsvExports,
		streamingMdExports,
		streamingAlerts,
		streamingDashboards,
		streamingCitations,
		streamingToolExecutions,
		streamingThinking,
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
					let replaySucceeded = true
					const replayFrom = buffer.receivedEventCount > 0 ? buffer.receivedEventCount : undefined

					await runAgenticRequest({
						mode: 'replay',
						sessionId: toSessionId(targetSessionId),
						requestKind: 'resume',
						activeRequestIdRef,
						activeRequestKindRef,
						activeSessionIdRef,
						abortControllerRef,
						activeRequestSettleRef,
						initialEventCount: buffer.receivedEventCount,
						createCallbacks: ({ requestId }) =>
							createAgenticCallbacks({
								requestId,
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
									updateSessionTitle({
										sessionId: targetSessionId,
										title,
										projectId: currentSessionProjectIdRef.current
									}).catch(() => {})
									moveSessionToTop(targetSessionId)
								}
							}),
						execute: ({ callbacks, signal, eventCounter }) =>
							resumeAgenticStream({
								sessionId: targetSessionId,
								callbacks,
								abortSignal: signal,
								fetchFn: authorizedFetchCompat,
								from: replayFrom,
								eventCounter
							}),
						onSuccess: () => {
							// Clear the recovery controller so that tab-return / visibility-change
							// handlers don't re-trigger a replay for the already-completed execution.
							const rc = recoveryControllerRef.current
							if (rc?.sessionId === targetSessionId) {
								clearRecoveryController()
							}
						},
						onError: () => {
							replaySucceeded = false
							// Buffer expired — reset streaming state so the UI doesn't get stuck.
							if (resetStream) {
								dispatchStream({ type: 'RESET_STREAM' })
							}
						}
					})
					return replaySucceeded
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

			await runAgenticRequest({
				mode: 'resume',
				sessionId: toSessionId(targetSessionId),
				requestKind: 'resume',
				activeRequestIdRef,
				activeRequestKindRef,
				activeSessionIdRef,
				abortControllerRef,
				activeRequestSettleRef,
				initialEventCount: buffer.receivedEventCount,
				detached: true,
				createCallbacks: ({ requestId }) =>
					createAgenticCallbacks({
						requestId,
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
							updateSessionTitle({
								sessionId: targetSessionId,
								title,
								projectId: currentSessionProjectIdRef.current
							}).catch(() => {})
							moveSessionToTop(targetSessionId)
						}
					}),
				execute: ({ callbacks, signal, eventCounter }) =>
					resumeAgenticStream({
						sessionId: targetSessionId,
						callbacks,
						abortSignal: signal,
						fetchFn: authorizedFetchCompat,
						from: buffer.receivedEventCount,
						eventCounter
					}),
				onError: ({ kind, error: resumeError }, { requestId, eventCounter }) => {
					if (!isActiveRequest(activeRequestIdRef, requestId)) return
					if (kind === 'abort') {
						appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
						dispatchStream({ type: 'RESET_STREAM' })
						return
					}
					if (onTemporaryDisconnect && kind === 'temporary-connectivity') {
						buffer.receivedEventCount = eventCounter.count
						onTemporaryDisconnect(resumeError, buffer)
						return
					}
					clearRecoveryController()
					dispatchStream({
						type: 'SET_ERROR',
						value: 'Lost connection while waiting for the running execution. Retry to reconnect.'
					})
					dispatchStream({ type: 'RESET_STREAM' })
				},
				onSuccess: () => {
					const recoveryController = recoveryControllerRef.current
					if (recoveryController?.sessionId === targetSessionId && recoveryController.streamAttached) {
						clearRecoveryController()
					}
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
			dispatchStream({ type: 'SET_TODOS', value: Array.isArray(result.todos) ? result.todos : [] })
			setActiveLeafMessageId(
				'activeLeafMessageId' in result
					? (result.activeLeafMessageId ?? restored[restored.length - 1]?.id ?? null)
					: (restored[restored.length - 1]?.id ?? null)
			)
			setConversationViewResetKey((current) => current + 1)
			setSessionId(targetSessionId)
			const match = sessions.find((session) => session.sessionId === targetSessionId)
			setSessionTitle(match?.title || null)
			setCurrentSessionProjectId(result.projectId ?? null)

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

			const { restored: didRestore, recoveredResponse } = await restoreSessionSnapshot(
				currentController.sessionId,
				activeRequestIdRef.current
			)
			if (didRestore && recoveredResponse) {
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
				// Reuse the controller for repeat drops on the same execution so timers,
				// event offsets, and the partially accumulated buffer stay in one place.
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

	const clearConversationState = useCallback(async () => {
		await abortActiveRequest()
		clearConversationRuntimeState()
		setMessages([])
		setActiveLeafMessageId(null)
		setConversationViewResetKey((current) => current + 1)
		setSessionId(null)
		setSessionTitle(null)
		setCurrentSessionProjectId(null)
		dispatchDashboardPanel({ type: 'RESET' })
		restoredSessionIdRef.current = null
		isFirstMessageRef.current = true
		attach()
		setPaginationState({ hasMore: false, cursor: null })
	}, [abortActiveRequest, attach, clearConversationRuntimeState])

	// Start a brand-new chat, keeping project-owned sessions inside their project.
	const handleNewChat = useCallback(async () => {
		const projectIdForNewChat = route.kind === 'project' ? route.projectId : currentSessionProjectId
		if (projectIdForNewChat && !sharedSession) {
			await clearConversationState()
			const nextSessionId = createFakeSession(projectIdForNewChat)
			setSessionId(nextSessionId)
			setSessionTitle('New Chat')
			setCurrentSessionProjectId(projectIdForNewChat)
			restoredSessionIdRef.current = nextSessionId
			isFirstMessageRef.current = false
			const persistSession = createSession({
				sessionId: nextSessionId,
				title: 'New Chat',
				projectId: projectIdForNewChat
			})
			if (route.kind !== 'project') {
				try {
					await persistSession
					void navigate.toSession(nextSessionId)
				} catch (createSessionError) {
					console.error('[llama-ai] [createSession] failed:', getErrorMessage(createSessionError))
				}
			} else {
				void persistSession.catch((createSessionError) => {
					console.error('[llama-ai] [createSession] failed:', getErrorMessage(createSessionError))
				})
			}
			promptInputRef.current?.focus()
			return
		}

		if (route.kind !== 'chat-new' || sharedSession) {
			void navigate.toNewChat()
			return
		}
		await clearConversationState()
		promptInputRef.current?.focus()
	}, [
		clearConversationState,
		createFakeSession,
		createSession,
		currentSessionProjectId,
		navigate,
		route,
		sharedSession
	])

	// Restore a saved session, and resume any still-active server execution attached to it.
	const handleSessionSelect = useCallback(
		async (selectedSessionId: string, options?: { around?: string }) => {
			if (
				selectedSessionId === restoredSessionIdRef.current &&
				selectedSessionId === currentSessionIdRef.current &&
				!options?.around
			)
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
			abortActiveRequest,
			clearConversationRuntimeState,
			restoreSessionSnapshot,
			resumeRunningExecution,
			startRecoveryCycle
		]
	)

	const handleSearchMatchClick = useCallback(
		(targetSessionId: string, messageId: string) => {
			void navigate.toSession(targetSessionId, { around: messageId })
		},
		[navigate]
	)

	const routeTransition = useMemo<AgenticRouteTransition | null>(() => {
		if (readOnly || sharedSession) return null
		if (route.kind === 'chat-new') return { kind: 'new-chat' }
		if (route.kind === 'chat-session') {
			return {
				kind: 'session',
				sessionId: resolveSessionAlias(route.sessionId),
				aroundMessageId: route.aroundMessageId
			}
		}
		if (route.kind === 'project-list') return { kind: 'project-list' }
		if (route.kind === 'project') return { kind: 'project', projectId: route.projectId }
		return null
	}, [readOnly, sharedSession, route, resolveSessionAlias])

	// Same-URL project clicks (sidebar click while already on /ai/projects/[id]) bump the project-home
	// signal so we can reset the inline chat back to the project landing — Next.js doesn't fire route
	// change events for same-URL navigation, so we need a separate trigger.
	useEffect(() => {
		if (projectHomeSignal === projectHomeSignalRef.current) return
		projectHomeSignalRef.current = projectHomeSignal
		if (readOnly || sharedSession) return
		if (route.kind !== 'project') return
		void clearConversationState()
	}, [projectHomeSignal, route.kind, readOnly, sharedSession, clearConversationState])

	useEffect(() => {
		if (!routeTransition) return

		const previousTransition = previousRouteTransitionRef.current

		// Bail out if the route hasn't actually changed. The effect can re-fire if a callback
		// in its dep list re-creates (e.g. after we dispatch state changes inside the transition),
		// and re-running the transition body would loop the clear/restore actions indefinitely.
		if (previousTransition && isSameAgenticRouteTransition(previousTransition, routeTransition)) return
		previousRouteTransitionRef.current = routeTransition

		const transition = async () => {
			if (routeTransition.kind === 'new-chat') {
				await clearConversationState()
				promptInputRef.current?.focus()
				return
			}

			if (routeTransition.kind === 'session') {
				const nextSessionId = routeTransition.sessionId
				if (shouldSkipCurrentSessionRouteRestore(routeTransition, previousTransition, currentSessionIdRef.current))
					return

				setMessages([])
				setActiveLeafMessageId(null)
				setSessionTitle(null)
				dispatchDashboardPanel({ type: 'RESET' })
				setPaginationState({ hasMore: false, cursor: null })
				restoredSessionIdRef.current = null
				await handleSessionSelect(
					nextSessionId,
					routeTransition.aroundMessageId ? { around: routeTransition.aroundMessageId } : undefined
				)
				return
			}

			if (routeTransition.kind === 'project-list') {
				await clearConversationState()
				return
			}

			if (routeTransition.kind === 'project') {
				// Always reset to the project landing on navigation. The submit-from-landing flow
				// keeps the inline chat visible because URL doesn't change (no transition fires);
				// any actual navigation to /ai/projects/[id] should land you on the project home.
				await clearConversationState()
			}
		}

		void transition()
	}, [routeTransition, clearConversationState, handleSessionSelect])

	// Submit a new prompt, create a fake local session for the first message if needed, and stream the response.
	const handleSubmit = useCallback(
		(
			prompt: string,
			entities?: Array<{ term: string; slug: string; type?: string }>,
			images?: Array<{ data: string; mimeType: string; filename?: string; isPasted?: boolean }>,
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
					const submitProjectId = routeProjectId ?? currentSessionProjectId

					// Fork shared session in-place: seed messages, create session, update URL
					if (sharedSession && !currentSessionId) {
						currentSessionId = createFakeSession(submitProjectId)
						setSessionId(currentSessionId)
						setCurrentSessionProjectId(submitProjectId)
						setSessionTitle(sharedSession.session.title)
						const seeded = sharedSession.messages.map((msg, i) => mapSharedSessionMessage(msg, i))
						setMessages(seeded)
						isFirstMessageRef.current = false
					} else if (isFirstMessageRef.current && !currentSessionId) {
						currentSessionId = createFakeSession(submitProjectId)
						setSessionId(currentSessionId)
						setCurrentSessionProjectId(submitProjectId)
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
					// A share token forks a public snapshot exactly once; later messages
					// continue against the newly created private session.
					const currentShareToken = !shareTokenConsumedRef.current ? effectiveShareToken : undefined
					if (currentShareToken) shareTokenConsumedRef.current = true
					const failedRequest: FailedRequest = {
						prompt: trimmed,
						entities: entities?.length ? entities : undefined,
						images: images?.length ? images : undefined,
						pageContext
					}

					void runAgenticRequest({
						mode: 'prompt',
						sessionId: currentSessionId ? toSessionId(currentSessionId) : null,
						requestKind: 'prompt',
						activeRequestIdRef,
						activeRequestKindRef,
						activeSessionIdRef,
						abortControllerRef,
						activeRequestSettleRef,
						createCallbacks: ({ requestId }) =>
							createAgenticCallbacks({
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
									if (previousSessionId && previousSessionId !== id) {
										registerSessionAlias(previousSessionId, id)
										replaceOptimisticSessionId(previousSessionId, id, submitProjectId)
									}
									if (sharedSession) {
										onSharedSessionFork?.(id)
									}
									if (previousSessionId !== id && !sessions.some((session) => session.sessionId === id)) {
										void createSession({
											sessionId: id,
											title: sessionTitle ?? undefined,
											projectId: submitProjectId
										}).catch((createSessionError) => {
											console.error('[llama-ai] [createSession] failed:', getErrorMessage(createSessionError))
										})
									}
								},
								onTitle: (title) => {
									if (!isActiveRequest(activeRequestIdRef, requestId)) return
									setSessionTitle(title)
									if (currentSessionId) {
										updateSessionTitle({ sessionId: currentSessionId, title, projectId: submitProjectId }).catch(
											() => {}
										)
										moveSessionToTop(currentSessionId)
									}
								}
							}),
						execute: ({ callbacks, signal, eventCounter }) =>
							fetchAgenticResponse({
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
								projectId: submitProjectId,
								abortSignal: signal,
								fetchFn: authorizedFetchCompat,
								eventCounter,
								callbacks
							}),
						onError: async ({ kind, error: err }, { requestId, eventCounter }) => {
							if (!isActiveRequest(activeRequestIdRef, requestId)) return
							if (kind === 'abort') {
								appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
								dispatchStream({ type: 'RESET_STREAM' })
								return
							}
							if (kind === 'free-limit' && isFreeLimitError(err)) {
								appendMessage(buildFreeLimitMessage(err))
								dispatchStream({ type: 'RESET_STREAM' })
								return
							}
							if (kind === 'usage-limit') {
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
								return
							}
							if (kind === 'temporary-connectivity' && currentSessionId) {
								buffer.receivedEventCount = eventCounter.count
								if (
									startRecoveryCycle({
										targetSessionId: currentSessionId,
										buffer,
										failedRequest,
										error: err
									})
								) {
									return
								}
							}
							dispatchStream({ type: 'SET_ERROR', value: err.message || 'Failed to get response' })
							dispatchStream({
								type: 'SET_LAST_FAILED_REQUEST',
								value: failedRequest
							})
							appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
							dispatchStream({ type: 'RESET_STREAM' })
						},
						onSuccess: async ({ requestId, eventCounter }) => {
							let handedOffToResume = false
							let recoveryStarted = false
							if (
								isActiveRequest(activeRequestIdRef, requestId) &&
								currentSessionId &&
								!buffer.error &&
								!hasStreamBufferContent(buffer)
							) {
								// The HTTP stream can finish without local content if the result was
								// persisted server-side first; attach to that execution before clearing UI.
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
							}
						},
						onFinally: () => {
							promptSubmissionLockRef.current = false
						}
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
			effectiveShareToken,
			routeProjectId,
			currentSessionProjectId,
			registerSessionAlias,
			replaceOptimisticSessionId,
			onSharedSessionFork,
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
			// Backend message ids create a branch; synthetic local/persisted/shared ids
			// can only replay from the truncated local history.
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
			let shouldThrowEditError: UsageLimitError | null = null
			let handedOffToResume = false

			await runAgenticRequest({
				mode: 'edit',
				sessionId: toSessionId(sessionId),
				requestKind: 'prompt',
				activeRequestIdRef,
				activeRequestKindRef,
				activeSessionIdRef,
				abortControllerRef,
				activeRequestSettleRef,
				createCallbacks: ({ requestId }) =>
					createAgenticCallbacks({
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
							updateSessionTitle({ sessionId, title, projectId: currentSessionProjectId }).catch(() => {})
						}
					}),
				execute: ({ callbacks, signal, eventCounter }) =>
					fetchAgenticResponse({
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
						projectId: currentSessionProjectId,
						abortSignal: signal,
						fetchFn: authorizedFetchCompat,
						eventCounter,
						callbacks
					}),
				onSuccess: async ({ requestId, eventCounter }) => {
					if (isActiveRequest(activeRequestIdRef, requestId) && !buffer.error && !hasStreamBufferContent(buffer)) {
						buffer.receivedEventCount = eventCounter.count
						let recoveryStarted = false
						handedOffToResume = await resumeRunningExecution({
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
						if (handedOffToResume || recoveryStarted) return
						if (isActiveRequest(activeRequestIdRef, requestId)) {
							dispatchStream({ type: 'RESET_STREAM' })
						}
					}
					if (isActiveRequest(activeRequestIdRef, requestId)) {
						setActiveLeafMessageId(currentMessageIdRef.current)
					}
					// siblingInfo arrives via SSE `sibling_info` mid-stream — no extra restore call needed
				},
				onError: ({ kind, error: editError }, { eventCounter }) => {
					if (kind === 'abort') {
						appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
						dispatchStream({ type: 'RESET_STREAM' })
						return
					}
					if (kind === 'temporary-connectivity') {
						buffer.receivedEventCount = eventCounter.count
						if (
							startRecoveryCycle({
								targetSessionId: sessionId,
								buffer,
								failedRequest: null,
								error: editError
							})
						) {
							return
						}
					}
					if (kind === 'free-limit' && isFreeLimitError(editError)) {
						setMessages(messagesSnapshot)
						setActiveLeafMessageId(activeLeafSnapshot)
						appendMessage(buildFreeLimitMessage(editError))
						dispatchStream({ type: 'RESET_STREAM' })
						return
					}
					setMessages(messagesSnapshot)
					setActiveLeafMessageId(activeLeafSnapshot)
					setViewError(getErrorMessage(editError))
					dispatchStream({ type: 'RESET_STREAM' })
					shouldThrowEditError = editError
				},
				onFinally: () => {
					promptSubmissionLockRef.current = false
				}
			})
			if (!handedOffToResume && shouldThrowEditError) {
				const editError = new Error(shouldThrowEditError.message)
				editError.name = shouldThrowEditError.name
				Object.assign(editError, {
					code: shouldThrowEditError.code,
					details: shouldThrowEditError.details,
					upgradeUrl: shouldThrowEditError.upgradeUrl,
					cause: shouldThrowEditError
				})
				throw editError
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
			currentSessionProjectId,
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
	const deepLinkPrompt = route.kind === 'chat-new' ? route.initialPrompt?.trim() || undefined : undefined
	const deepLinkUtmSource = typeof router.query.utm_source === 'string' ? router.query.utm_source : null
	const deepLinkUtmCampaign = typeof router.query.utm_campaign === 'string' ? router.query.utm_campaign : null
	const deepLinkConsumedKeyRef = useRef<string | null>(null)

	useEffect(() => {
		if (route.kind !== 'chat-new' || sharedSession) return

		// Shareable deep link (/ai/chat?prompt=...): hold until the account is verified,
		// then submit once and strip the param so a reload/back can't re-run it.
		if (deepLinkPrompt) {
			if (!user?.verified) return
			const deepLinkKey = `${deepLinkPrompt}\n${deepLinkUtmSource ?? ''}\n${deepLinkUtmCampaign ?? ''}`
			if (deepLinkConsumedKeyRef.current === deepLinkKey) return
			deepLinkConsumedKeyRef.current = deepLinkKey
			trackUmamiEvent('llamaai-deeplink-run', {
				source: deepLinkUtmSource,
				campaign: deepLinkUtmCampaign,
				prompt: deepLinkPrompt.replace(/\s+/g, ' ').slice(0, 100)
			})
			void navigate.refineCurrent('/ai/chat')
			submitPendingPromptEvent(deepLinkPrompt)
			return
		}

		const pendingPrompt = consumePendingPrompt()
		const pendingPageContext = consumePendingPageContext()
		const isSuggested = consumePendingSuggestedFlag()
		if (pendingPrompt) {
			submitPendingPromptEvent(pendingPrompt, pendingPageContext ?? undefined, isSuggested || undefined)
		}
	}, [route.kind, deepLinkPrompt, deepLinkUtmSource, deepLinkUtmCampaign, user?.verified, sharedSession, navigate])

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

	// Shared/public sessions are read-only snapshots, so they should never create a fake local session.
	useEffect(() => {
		if (!sharedSession) return
		isFirstMessageRef.current = false
	}, [sharedSession])

	// Auto-send the initial prompt after a forked session finishes restoring.
	useEffect(() => {
		if (!routeInitialPrompt) return
		if (!sharedSession && !routeSessionId) return
		const nextToken = { sessionId: routeSessionId ?? 'shared', prompt: routeInitialPrompt }
		const currentToken = consumedInitialPromptRef.current
		if (currentToken?.sessionId === nextToken.sessionId && currentToken.prompt === nextToken.prompt) return
		consumedInitialPromptRef.current = nextToken
	}, [routeInitialPrompt, routeSessionId, sharedSession])

	useEffect(() => {
		const token = consumedInitialPromptRef.current
		if (!token) return
		if (restoringSessionId) return
		if (!sharedSession && resolveSessionAlias(token.sessionId) !== sessionId) return
		consumedInitialPromptRef.current = null
		const frameId = window.requestAnimationFrame(() => {
			handleSubmit(token.prompt)
		})

		return () => {
			window.cancelAnimationFrame(frameId)
		}
	}, [restoringSessionId, sessionId, sharedSession, resolveSessionAlias, handleSubmit])

	const tipActionHandlers = useMemo(
		() => ({
			openSettingsModal: (tab?: SettingsTabId) => {
				if (tab) setInitialIntegrationsState({ tab, tgloginToken: null })
				settingsModalStore.show()
			},
			openAlertsModal: alertsModalStore.show,
			toggleResearchMode: () => setIsResearchMode((v) => !v),
			submitPrompt: (prompt: string) => handleSubmit(prompt)
		}),
		[settingsModalStore, alertsModalStore.show, setIsResearchMode, handleSubmit]
	)

	const landingProps = {
		readOnly,
		isSharedView,
		title: readOnly ? effectiveSessionTitle || 'Shared Conversation' : 'What can I help you with?',
		handleSubmit,
		promptInputRef,
		handleStopRequest,
		isStreaming,
		isResearchMode,
		setIsResearchMode,
		researchUsage,
		onOpenAlerts: alertsModalStore.show,
		quotedText,
		onClearQuotedText: () => setQuotedText(null),
		enterToSend: settings.enterToSend
	}

	const conversationViewModel: ConversationViewModel = {
		readOnly,
		isSharedView,
		messages: effectiveMessages,
		sessionId: effectiveSessionId,
		isLlama,
		isStreaming,
		activeToolCalls,
		spawnProgress,
		spawnStartTime,
		todos: streamingTodos,
		todosStartTime,
		executionStartedAt,
		spawnIsResearchMode,
		streamingThinking,
		streamingDraft,
		isCompacting,
		paginationState: renderedPaginationState,
		paginationError,
		recovery,
		error: visibleError,
		lastFailedPrompt: viewError ? null : (lastFailedRequest?.prompt ?? null),
		onRetryLastFailedPrompt: handleRetryLastFailedPrompt,
		onReconnectNow: handleReconnectNow,
		scrollContainerRef,
		messagesEndRef,
		promptInputRef,
		isScrollAttached,
		showScrollToBottom,
		scrollToBottom,
		handleSubmit,
		handleStopRequest,
		handleActionClick,
		onEditMessage: handleEditMessage,
		onBranchSwitch: handleBranchSwitch,
		isBranchSwitching: isSwitchingActiveLeaf,
		isResearchMode,
		setIsResearchMode,
		researchUsage,
		onOpenAlerts: alertsModalStore.show,
		quotedText,
		onClearQuotedText: () => setQuotedText(null),
		enterToSend: settings.enterToSend,
		onTableFullscreenOpen: hideSidebar,
		onShare: openShareModal,
		contextWarning,
		onDismissContextWarning: () => dispatchStream({ type: 'SET_CONTEXT_WARNING', value: null }),
		onStartNewChat: () => void handleNewChat()
	}

	const landingOverride =
		route.kind === 'project-list'
			? () => <ProjectsGrid />
			: route.kind === 'project'
				? (api: LandingOverrideApi) => (
						<ProjectLanding
							projectId={route.projectId}
							tier={projectTier}
							sessionList={sessions}
							initialTab={route.initialTab}
							onSubmit={api.handleSubmit}
							isStreaming={api.isStreaming}
							enterToSend={settings.enterToSend}
							onPickSession={(nextSessionId) => {
								void navigate.toSession(nextSessionId)
							}}
						/>
					)
				: null
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
								currentSessionId={routeSessionId ?? sessionId ?? null}
								restoringSessionId={restoringSessionId}
								onSessionSelect={(nextSessionId) => {
									void navigate.toSession(nextSessionId)
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
								currentProjectId={routeProjectId}
								currentSessionProjectId={effectiveSessionProjectId}
							/>
							<div className="flex min-h-11 lg:hidden" />
						</>
					) : null}

					<div
						className={`llamaai-chat-panel relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
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
						) : (
							<ChatSurface
								showLanding={!hasMessages && !visibleError}
								animateLandingTransition={shouldAnimateLandingTransition}
								animateConversationTransition={shouldAnimateConversationTransition}
								landingOverride={landingOverride}
								landingProps={landingProps}
								conversationViewModel={conversationViewModel}
								conversationKey={`conversation-${conversationViewResetKey}`}
								transitionConversationKey={`shared-${effectiveSessionId ?? 'snapshot'}`}
							/>
						)}
					</div>
					{rightPanel ? (
						<aside className="hidden w-[340px] shrink-0 flex-col overflow-y-auto rounded-lg border border-[#e6e6e6] bg-(--cards-bg) lg:ml-2 lg:flex dark:border-[#222324]">
							{rightPanel}
						</aside>
					) : null}
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
								promptInputRef.current?.focus()
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
							telegramStatus={telegramStatus}
							isSettingsLoading={
								settingsQueryState.isLoading || (settingsQueryState.isFetching && !settingsQueryState.data)
							}
							initialState={initialIntegrationsState}
							onInitialStateConsumed={() => setInitialIntegrationsState(null)}
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
					className="flex size-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
				>
					<Icon name="panel-left-open" height={16} width={16} />
					<span className="sr-only">Open Chat History</span>
				</Tooltip>
				<Tooltip
					content="New Chat"
					render={<button onClick={handleNewChat} />}
					className="flex size-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue) focus-visible:bg-(--old-blue) max-lg:ml-auto"
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
						className="flex size-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
					>
						<Icon name={isFullscreen ? 'shrink' : 'expand'} height={16} width={16} />
						<span className="sr-only">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
					</Tooltip>
				) : null}
			</nav>
			<Tooltip
				content="Settings"
				render={<button onClick={onOpenSettings} />}
				className="absolute bottom-2.5 left-2.5 z-10 flex size-6 items-center justify-center rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white max-lg:hidden"
			>
				<div className="relative">
					<Icon name="settings" height={16} width={16} />
					{hasCustomInstructions ? (
						<span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#1853A8] dark:bg-[#4B86DB]" />
					) : null}
				</div>
				<span className="sr-only">Settings</span>
			</Tooltip>
		</div>
	)
})
