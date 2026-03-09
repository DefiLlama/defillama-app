import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { memo, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { consumePendingPrompt, consumePendingPageContext } from '~/components/LlamaAIFloatingButton'
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
import type { AlertProposedData, ChartSet, Message, SpawnAgentStatus, ToolCall, ToolExecution } from './types'

function mapPersistedMessage(message: any): Message {
	return {
		role: message.role as 'user' | 'assistant',
		content: message.content,
		charts:
			message.charts && message.chartData ? [{ charts: message.charts, chartData: message.chartData }] : undefined,
		citations: message.citations,
		csvExports: message.csvExports,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map((tool: any) => ({
			...tool,
			name: tool.name || tool.toolName
		})),
		thinking: message.metadata?.thinking,
		id: message.messageId,
		timestamp: message.timestamp ? new Date(message.timestamp).getTime() : undefined
	}
}

function mapPersistedMessages(messages: any[] | undefined): Message[] {
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

function mapSharedSessionMessage(message: SharedSession['messages'][number]): Message {
	return {
		role: message.role,
		content: message.content || undefined,
		charts:
			message.charts && message.chartData
				? [
						{
							charts: message.charts,
							chartData: (Array.isArray(message.chartData)
								? { default: message.chartData }
								: message.chartData) as Record<string, any[]>
						}
					]
				: undefined,
		csvExports: message.csvExports,
		citations: message.citations,
		images: message.images,
		toolExecutions: message.metadata?.toolExecutions?.map((tool: any) => ({
			...tool,
			name: tool.name || tool.toolName
		})),
		thinking: message.metadata?.thinking,
		id: message.messageId
	}
}

export interface SharedSession {
	session: { sessionId: string; title: string; createdAt: string; isPublic: boolean }
	messages: Array<{
		role: 'user' | 'assistant'
		content: string
		messageId?: string
		timestamp: number
		images?: Array<{ url: string; mimeType: string; filename?: string }>
		metadata?: any
		charts?: any[]
		chartData?: any[] | Record<string, any[]>
		citations?: string[]
		csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
	}>
	isPublicView: true
}

interface AgenticChatProps {
	initialSessionId?: string
	sharedSession?: SharedSession
	readOnly?: boolean
}

export function AgenticChat({ initialSessionId, sharedSession, readOnly = false }: AgenticChatProps = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const isLlama = !!user?.flags?.is_llama
	const { sessions, isLoading: isLoadingSessions, moveSessionToTop } = useSessionList()
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

	const [messages, setMessages] = useState<Message[]>([])
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [sessionTitle, setSessionTitle] = useState<string | null>(null)
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingText, setStreamingText] = useState('')
	const [streamingCharts, setStreamingCharts] = useState<ChartSet[]>([])
	const [streamingCsvExports, setStreamingCsvExports] = useState<CsvExport[]>([])
	const [streamingAlerts, setStreamingAlerts] = useState<AlertProposedData[]>([])
	const [streamingCitations, setStreamingCitations] = useState<string[]>([])
	const [streamingToolExecutions, setStreamingToolExecutions] = useState<ToolExecution[]>([])
	const [streamingThinking, setStreamingThinking] = useState('')
	const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([])
	const [isCompacting, setIsCompacting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [customInstructions, setCustomInstructions] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-custom-instructions') || '' : ''
	)
	const [enableMemory, setEnableMemory] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-enable-memory') !== 'false' : true
	)
	const [spawnProgress, setSpawnProgress] = useState<Map<string, SpawnAgentStatus>>(new Map())
	const [spawnStartTime, setSpawnStartTime] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null)
	const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null)
	const [rateLimitDetails, setRateLimitDetails] = useState<{
		period: string
		limit: number
		resetTime: string | null
	} | null>(null)
	const researchModalStore = Ariakit.useDialogStore()
	const currentMessageIdRef = useRef<string | null>(null)
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
	const isFirstMessageRef = useRef(true)
	const shouldAutoScrollRef = useRef(true)
	const paginationRef = useRef(paginationState)
	const userScrollCooldownRef = useRef(false)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)

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
		authorizedFetch(`${MCP_SERVER}/user-settings`)
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
	}, [user, authorizedFetch])

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
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore) return

		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))
		try {
			await waitForNextPaint()
			const scrollSnapshot = getScrollSnapshot(scrollContainerRef.current)
			const result = await loadMoreMessages(sessionId, paginationState.cursor!)
			const older = mapPersistedMessages(result.messages)

			setMessages((prev) => [...older, ...prev])

			requestAnimationFrame(() => {
				restoreScrollPosition(scrollSnapshot)
			})

			setPaginationState(normalizePaginationState(result.pagination))
		} catch {
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
		}
	}, [sessionId, paginationState, loadMoreMessages])

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

	const handleNewChat = useCallback(() => {
		if (initialSessionId) {
			void Router.push('/ai/chat', undefined, { shallow: true })
			return
		}
		abortControllerRef.current?.abort()
		setIsStreaming(false)
		setMessages([])
		setSessionId(null)
		setSessionTitle(null)
		setError(null)
		setLastFailedPrompt(null)
		setStreamingText('')
		setStreamingCharts([])
		setStreamingCsvExports([])
		setStreamingAlerts([])
		setStreamingCitations([])
		setStreamingToolExecutions([])
		setStreamingThinking('')
		setActiveToolCalls([])
		setSpawnProgress(new Map())
		setSpawnStartTime(0)
		isFirstMessageRef.current = true
		shouldAutoScrollRef.current = true
		setShowScrollToBottom(false)
		setPaginationState({ hasMore: false, cursor: null, isLoadingMore: false })
		promptInputRef.current?.focus()
	}, [initialSessionId])

	const handleSessionSelect = useCallback(
		(selectedSessionId: string) => {
			if (selectedSessionId === sessionId) return
			setError(null)
			setRestoringSessionId(selectedSessionId)

			return restoreSession(selectedSessionId)
				.then(async (result) => {
					const restored: Message[] = (result.messages || []).map((m: any) => ({
						...mapPersistedMessage(m),
						alerts: m.metadata?.alertIntent
							? [
									{
										alertId: m.metadata?.savedAlertId || `restored_${m.messageId}`,
										title: m.metadata?.alertIntent?.dataQuery || '',
										alertIntent: {
											frequency: m.metadata.alertIntent.frequency || 'daily',
											hour: m.metadata.alertIntent.hour ?? 9,
											timezone: m.metadata.alertIntent.timezone || 'UTC',
											dayOfWeek: m.metadata.alertIntent.dayOfWeek
										},
										schedule_expression: '',
										next_run_at: ''
									}
								]
							: undefined,
						savedAlertIds: m.savedAlertIds
					}))

					setMessages(restored)
					setSessionId(selectedSessionId)
					const match = sessions.find((s) => s.sessionId === selectedSessionId)
					setSessionTitle(match?.title || null)
					window.history.replaceState(null, '', `/ai/chat/${selectedSessionId}`)
					isFirstMessageRef.current = false
					shouldAutoScrollRef.current = true
					setShowScrollToBottom(false)
					setPaginationState({
						hasMore: result.pagination?.hasMore || false,
						cursor: result.pagination?.cursor || null,
						isLoadingMore: false
					})

					const { active } = await checkActiveExecution(selectedSessionId, authorizedFetch)
					if (active) {
						setIsStreaming(true)
						setStreamingText('')
						setStreamingCharts([])
						setStreamingCsvExports([])
						setStreamingAlerts([])
						setStreamingCitations([])
						setStreamingToolExecutions([])
						setStreamingThinking('')
						setActiveToolCalls([])
						setSpawnProgress(new Map())
						setSpawnStartTime(0)

						let accumulatedText = ''
						let accumulatedCharts: ChartSet[] = []
						let accumulatedCsvExports: CsvExport[] = []
						let accumulatedAlerts: AlertProposedData[] = []
						let accumulatedCitations: string[] = []
						let accumulatedToolExecutions: ToolExecution[] = []
						let accumulatedThinking = ''
						let hasStartedText = false
						let spawnStarted = false

						const controller = new AbortController()
						abortControllerRef.current = controller

						const callbacks: AgenticSSECallbacks = {
							onToken: (content) => {
								if (!hasStartedText) {
									hasStartedText = true
									setActiveToolCalls([])
									setSpawnProgress(new Map())
									setSpawnStartTime(0)
								}
								accumulatedText += content
								setStreamingText(accumulatedText)
							},
							onCharts: (charts, chartData) => {
								setActiveToolCalls([])
								accumulatedCharts = [...accumulatedCharts, { charts, chartData }]
								setStreamingCharts(accumulatedCharts)
							},
							onCsvExport: (exports) => {
								accumulatedCsvExports = [...accumulatedCsvExports, ...exports]
								setStreamingCsvExports(accumulatedCsvExports)
							},
							onAlertProposed: (data) => {
								accumulatedAlerts = [...accumulatedAlerts, data]
								setStreamingAlerts(accumulatedAlerts)
							},
							onCitations: (citations) => {
								accumulatedCitations = [...new Set([...accumulatedCitations, ...citations])]
								setStreamingCitations(accumulatedCitations)
							},
							onProgress: (toolName) => {
								const label = TOOL_LABELS[toolName] || toolName
								const id = ++toolCallIdRef.current
								setActiveToolCalls((prev) => [...prev, { id, name: toolName, label }])
							},
							onToolExecution: (data) => {
								accumulatedToolExecutions = [...accumulatedToolExecutions, data]
								setStreamingToolExecutions(accumulatedToolExecutions)
							},
							onThinking: (content) => {
								accumulatedThinking += content
								setStreamingThinking(accumulatedThinking)
							},
							onSpawnProgress: (data: SpawnProgressData) => {
								if (data.status === 'started' && !spawnStarted) {
									spawnStarted = true
									setSpawnStartTime(Date.now())
								}
								setSpawnProgress((prev) => {
									const next = new Map(prev)
									const existing = prev.get(data.agentId)
									next.set(data.agentId, {
										...existing,
										id: data.agentId,
										status: data.status,
										tool: data.tool ?? existing?.tool,
										toolCount: data.toolCount ?? existing?.toolCount,
										chartCount: data.chartCount ?? existing?.chartCount,
										findingsPreview: data.findingsPreview ?? existing?.findingsPreview
									})
									return next
								})
							},
							onCompaction: (data) => {
								setIsCompacting(data.status === 'started')
							},
							onSessionId: () => {},
							onMessageId: (messageId) => {
								currentMessageIdRef.current = messageId
							},
							onTitle: (title) => {
								setSessionTitle(title)
								updateSessionTitle({ sessionId: selectedSessionId, title }).catch(() => {})
								moveSessionToTop(selectedSessionId)
							},
							onError: (content) => {
								setError(content)
							},
							onDone: () => {
								const finalMessageId = currentMessageIdRef.current || undefined
								currentMessageIdRef.current = null
								setMessages((prev) => [
									...prev,
									{
										role: 'assistant',
										content: accumulatedText || undefined,
										charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
										csvExports: accumulatedCsvExports.length > 0 ? accumulatedCsvExports : undefined,
										alerts: accumulatedAlerts.length > 0 ? accumulatedAlerts : undefined,
										citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined,
										toolExecutions: accumulatedToolExecutions.length > 0 ? accumulatedToolExecutions : undefined,
										thinking: accumulatedThinking || undefined,
										id: finalMessageId
									}
								])
								setStreamingText('')
								setStreamingCharts([])
								setStreamingCsvExports([])
								setStreamingAlerts([])
								setStreamingCitations([])
								setStreamingToolExecutions([])
								setStreamingThinking('')
								setActiveToolCalls([])
								setSpawnProgress(new Map())
								setSpawnStartTime(0)
								setIsStreaming(false)
								notify()
							}
						}

						void resumeAgenticStream({
							sessionId: selectedSessionId,
							callbacks,
							abortSignal: controller.signal,
							fetchFn: authorizedFetch
						})
							.catch((err: any) => {
								if (err?.name === 'AbortError') {
									if (accumulatedText || accumulatedCharts.length > 0) {
										const messageId = currentMessageIdRef.current || undefined
										currentMessageIdRef.current = null
										setMessages((prev) => [
											...prev,
											{
												role: 'assistant',
												content: accumulatedText || undefined,
												charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
												csvExports: accumulatedCsvExports.length > 0 ? accumulatedCsvExports : undefined,
												citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined,
												toolExecutions: accumulatedToolExecutions.length > 0 ? accumulatedToolExecutions : undefined,
												thinking: accumulatedThinking || undefined,
												id: messageId
											}
										])
									}
									setStreamingText('')
									setStreamingCharts([])
									setStreamingCsvExports([])
									setStreamingAlerts([])
									setStreamingCitations([])
									setStreamingToolExecutions([])
									setStreamingThinking('')
									setActiveToolCalls([])
									setSpawnProgress(new Map())
									setSpawnStartTime(0)
									setIsStreaming(false)
									return
								}
								setIsStreaming(false)
							})
							.finally(() => {
								abortControllerRef.current = null
							})
					}
				})
				.catch(() => {
					setError('Failed to restore session')
				})
				.finally(() => {
					setRestoringSessionId(null)
				})
		},
		[sessionId, restoreSession, sessions, authorizedFetch, updateSessionTitle, moveSessionToTop, notify]
	)

	const handleSubmit = useCallback(
		(
			prompt: string,
			_entities?: Array<{ term: string; slug: string }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>,
			pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string }
		) => {
			const trimmed = prompt.trim()
			if (!trimmed || isStreaming) return

			requestPermission()
			setError(null)
			setLastFailedPrompt(null)
			setIsStreaming(true)
			setStreamingText('')
			setStreamingCharts([])
			setStreamingCsvExports([])
			setStreamingAlerts([])
			setStreamingCitations([])
			setActiveToolCalls([])
			setSpawnProgress(new Map())
			setSpawnStartTime(0)

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

			let accumulatedText = ''
			let accumulatedCharts: ChartSet[] = []
			let accumulatedCsvExports: CsvExport[] = []
			let accumulatedAlerts: AlertProposedData[] = []
			let accumulatedCitations: string[] = []
			let accumulatedToolExecutions: ToolExecution[] = []
			let accumulatedThinking = ''
			let hasStartedText = false
			let spawnStarted = false

			const controller = new AbortController()
			abortControllerRef.current = controller

			fetchAgenticResponse({
				message: trimmed,
				sessionId: currentSessionId,
				researchMode: isResearchMode,
				images: images?.length ? images : undefined,
				pageContext,
				customInstructions: customInstructions || undefined,
				abortSignal: controller.signal,
				fetchFn: authorizedFetch,
				callbacks: {
					onToken: (content) => {
						if (!hasStartedText) {
							hasStartedText = true
							setActiveToolCalls([])
							setSpawnProgress(new Map())
							setSpawnStartTime(0)
						}
						accumulatedText += content
						setStreamingText(accumulatedText)
					},
					onCharts: (charts, chartData) => {
						setActiveToolCalls([])
						accumulatedCharts = [...accumulatedCharts, { charts, chartData }]
						setStreamingCharts(accumulatedCharts)
					},
					onCsvExport: (exports) => {
						accumulatedCsvExports = [...accumulatedCsvExports, ...exports]
						setStreamingCsvExports(accumulatedCsvExports)
					},
					onAlertProposed: (data) => {
						accumulatedAlerts = [...accumulatedAlerts, data]
						setStreamingAlerts(accumulatedAlerts)
					},
					onCitations: (citations) => {
						accumulatedCitations = [...new Set([...accumulatedCitations, ...citations])]
						setStreamingCitations(accumulatedCitations)
					},
					onProgress: (toolName) => {
						const label = TOOL_LABELS[toolName] || toolName
						const id = ++toolCallIdRef.current
						setActiveToolCalls((prev) => [...prev, { id, name: toolName, label }])
					},
					onToolExecution: (data) => {
						accumulatedToolExecutions = [...accumulatedToolExecutions, data]
						setStreamingToolExecutions(accumulatedToolExecutions)
					},
					onThinking: (content) => {
						accumulatedThinking += content
						setStreamingThinking(accumulatedThinking)
					},
					onSpawnProgress: (data: SpawnProgressData) => {
						if (data.status === 'started' && !spawnStarted) {
							spawnStarted = true
							setSpawnStartTime(Date.now())
						}
						setSpawnProgress((prev) => {
							const next = new Map(prev)
							const existing = prev.get(data.agentId)
							next.set(data.agentId, {
								...existing,
								id: data.agentId,
								status: data.status,
								tool: data.tool ?? existing?.tool,
								toolCount: data.toolCount ?? existing?.toolCount,
								chartCount: data.chartCount ?? existing?.chartCount,
								findingsPreview: data.findingsPreview ?? existing?.findingsPreview
							})
							return next
						})
					},
					onCompaction: (data) => {
						setIsCompacting(data.status === 'started')
					},
					onSessionId: (id) => {
						setSessionId(id)
					},
					onMessageId: (messageId) => {
						currentMessageIdRef.current = messageId
					},
					onTitle: (title) => {
						setSessionTitle(title)
						if (currentSessionId) {
							updateSessionTitle({ sessionId: currentSessionId, title }).catch(() => {})
							moveSessionToTop(currentSessionId)
						}
					},
					onError: (content) => {
						setError(content)
					},
					onDone: () => {
						const finalMessageId = currentMessageIdRef.current || undefined
						currentMessageIdRef.current = null
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: accumulatedText || undefined,
								charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
								csvExports: accumulatedCsvExports.length > 0 ? accumulatedCsvExports : undefined,
								alerts: accumulatedAlerts.length > 0 ? accumulatedAlerts : undefined,
								citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined,
								toolExecutions: accumulatedToolExecutions.length > 0 ? accumulatedToolExecutions : undefined,
								thinking: accumulatedThinking || undefined,
								id: finalMessageId
							}
						])
						setStreamingText('')
						setStreamingCharts([])
						setStreamingCsvExports([])
						setStreamingAlerts([])
						setStreamingCitations([])
						setStreamingToolExecutions([])
						setStreamingThinking('')
						setActiveToolCalls([])
						setSpawnProgress(new Map())
						setSpawnStartTime(0)
						setIsStreaming(false)
						notify()
					}
				}
			})
				.catch((err: any) => {
					if (err?.name === 'AbortError') {
						if (accumulatedText || accumulatedCharts.length > 0) {
							const messageId = currentMessageIdRef.current || undefined
							currentMessageIdRef.current = null
							setMessages((prev) => [
								...prev,
								{
									role: 'assistant',
									content: accumulatedText || undefined,
									charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
									csvExports: accumulatedCsvExports.length > 0 ? accumulatedCsvExports : undefined,
									citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined,
									toolExecutions: accumulatedToolExecutions.length > 0 ? accumulatedToolExecutions : undefined,
									thinking: accumulatedThinking || undefined,
									id: messageId
								}
							])
						}
						setStreamingText('')
						setStreamingCharts([])
						setStreamingCsvExports([])
						setStreamingAlerts([])
						setStreamingCitations([])
						setStreamingToolExecutions([])
						setStreamingThinking('')
						setActiveToolCalls([])
						setSpawnProgress(new Map())
						setSpawnStartTime(0)
						setIsStreaming(false)
						return
					}
					if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
						setRateLimitDetails({
							period: err.details?.period || 'lifetime',
							limit: err.details?.limit || 0,
							resetTime: err.details?.resetTime || null
						})
						researchModalStore.show()
						setIsStreaming(false)
						return
					}
					setError(err?.message || 'Failed to get response')
					setLastFailedPrompt(trimmed)
					if (accumulatedText || accumulatedCharts.length > 0) {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: accumulatedText || undefined,
								charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
								csvExports: accumulatedCsvExports.length > 0 ? accumulatedCsvExports : undefined,
								citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined
							}
						])
					}
					setStreamingText('')
					setStreamingCharts([])
					setStreamingCsvExports([])
					setStreamingCitations([])
					setActiveToolCalls([])
					setSpawnProgress(new Map())
					setSpawnStartTime(0)
					setIsStreaming(false)
				})
				.finally(() => {
					abortControllerRef.current = null
				})
		},
		[
			isStreaming,
			sessionId,
			isResearchMode,
			authorizedFetch,
			createFakeSession,
			updateSessionTitle,
			moveSessionToTop,
			researchModalStore,
			requestPermission,
			notify,
			customInstructions
		]
	)

	const handleStopRequest = useCallback(() => {
		abortControllerRef.current?.abort()
		setIsStreaming(false)
		setStreamingText('')
		setStreamingCharts([])
		setStreamingCsvExports([])
		setStreamingAlerts([])
		setStreamingCitations([])
		setStreamingToolExecutions([])
		setStreamingThinking('')
		setActiveToolCalls([])
		setSpawnProgress(new Map())
		setSpawnStartTime(0)
	}, [])

	const handleActionClick = useCallback(
		(message: string) => {
			if (!isStreaming) handleSubmit(message)
		},
		[isStreaming, handleSubmit]
	)

	const handleRetryLastFailedPrompt = useCallback(() => {
		if (!lastFailedPrompt) return
		setError(null)
		handleSubmit(lastFailedPrompt)
	}, [lastFailedPrompt, handleSubmit])

	const submitPendingPromptEvent = useEffectEvent(
		(
			prompt: string,
			pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain' | 'page'; route: string }
		) => {
			handleSubmit(prompt, undefined, undefined, pageContext)
		}
	)

	const selectInitialSessionEvent = useEffectEvent((nextSessionId: string) => {
		void handleSessionSelect(nextSessionId)
	})

	useEffect(() => {
		if (initialSessionId || sharedSession) return
		const pendingPrompt = consumePendingPrompt()
		const pendingPageContext = consumePendingPageContext()
		if (pendingPrompt) {
			submitPendingPromptEvent(pendingPrompt, pendingPageContext ?? undefined)
		}
	}, [initialSessionId, sharedSession])

	useEffect(() => {
		if (initialSessionId) {
			selectInitialSessionEvent(initialSessionId)
		}
	}, [initialSessionId])

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
				{initialSessionId && !hasMessages ? (
					<LoadingConversationState />
				) : !hasMessages ? (
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
						fetchFn={authorizedFetch}
						isLlama={isLlama}
						isStreaming={isStreaming}
						activeToolCalls={activeToolCalls}
						spawnProgress={spawnProgress}
						spawnStartTime={spawnStartTime}
						streamingThinking={streamingThinking}
						streamingDraft={streamingDraft}
						isCompacting={isCompacting}
						paginationState={paginationState}
						error={error}
						lastFailedPrompt={lastFailedPrompt}
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
			{!readOnly ? (
				<SettingsModal
					dialogStore={settingsModalStore}
					customInstructions={customInstructions}
					onCustomInstructionsChange={setCustomInstructions}
					enableMemory={enableMemory}
					onEnableMemoryChange={setEnableMemory}
					fetchFn={authorizedFetch}
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
		<div className="flex gap-2 max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:p-2.5 lg:absolute lg:top-2.5 lg:left-2.5 lg:z-10 lg:flex-col">
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
		</div>
	)
})
