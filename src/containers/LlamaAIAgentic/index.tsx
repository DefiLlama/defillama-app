import * as Ariakit from '@ariakit/react'
import Router from 'next/router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { consumePendingPrompt, consumePendingPageContext } from '~/components/LlamaAIFloatingButton'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { AlertArtifact } from '~/containers/LlamaAI/components/AlertArtifact'
import { AlertsModal } from '~/containers/LlamaAI/components/AlertsModal'
import { CSVExportArtifact } from '~/containers/LlamaAI/components/CSVExportArtifact'
import { ImagePreviewModal } from '~/containers/LlamaAI/components/ImagePreviewModal'
import { MarkdownRenderer } from '~/containers/LlamaAI/components/MarkdownRenderer'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import { ResearchLimitModal } from '~/containers/LlamaAI/components/ResearchLimitModal'
import { ResponseControls } from '~/containers/LlamaAI/components/ResponseControls'
import { SettingsModal } from '~/containers/LlamaAI/components/SettingsModal'
import { useSessionList } from '~/containers/LlamaAI/hooks/useSessionList'
import { useSessionMutations } from '~/containers/LlamaAI/hooks/useSessionMutations'
import { useSidebarVisibility } from '~/containers/LlamaAI/hooks/useSidebarVisibility'
import { useStreamNotification } from '~/containers/LlamaAI/hooks/useStreamNotification'
import { parseArtifactPlaceholders } from '~/containers/LlamaAI/utils/markdownHelpers'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { AgenticSidebar } from './AgenticSidebar'
import { ChartRenderer } from './ChartRenderer'
import { fetchAgenticResponse, checkActiveExecution, resumeAgenticStream } from './fetchAgenticResponse'
import type { SpawnProgressData, CsvExport, AgenticSSECallbacks } from './fetchAgenticResponse'
import type { ChartConfiguration, Message, AlertProposedData } from './types'

const TOOL_LABELS: Record<string, string> = {
	execute_sql: 'Querying database',
	resolve_entity: 'Resolving entity',
	load_skill: 'Loading knowledge',
	generate_chart: 'Generating visualization',
	web_search: 'Searching the web',
	x_search: 'Searching X/Twitter',
	spawn_agent: 'Spawning research agents',
	export_csv: 'Exporting CSV',
	create_alert: 'Creating alert'
}

interface ToolCall {
	id: number
	name: string
	label: string
}

type ChartSet = { charts: ChartConfiguration[]; chartData: Record<string, any[]> }

interface SpawnAgentStatus {
	id: string
	status: 'started' | 'tool_call' | 'completed' | 'error'
	tool?: string
	toolCount?: number
	chartCount?: number
	findingsPreview?: string
}

function buildChartIndex(chartSets: ChartSet[]) {
	const index = new Map<string, { chart: ChartConfiguration; chartData: Record<string, any[]> }>()
	for (const set of chartSets) {
		for (const chart of set.charts) {
			index.set(chart.id, { chart, chartData: set.chartData })
		}
	}
	return index
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
	const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [customInstructions, setCustomInstructions] = useState(() =>
		typeof window !== 'undefined' ? localStorage.getItem('llamaai-custom-instructions') || '' : ''
	)
	const customInstructionsRef = useRef(customInstructions)
	customInstructionsRef.current = customInstructions
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

	const hasMessages = messages.length > 0 || isStreaming

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
			})
			.catch(() => {})
	}, [user, authorizedFetch])

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
					if (isAtBottom && !shouldAutoScrollRef.current && !userScrollCooldownRef.current) {
						shouldAutoScrollRef.current = true
					}
					setShowScrollToBottom(!shouldAutoScrollRef.current && scrollHeight > clientHeight)
					const pg = paginationRef.current
					if (scrollTop <= 50 && pg.hasMore && !pg.isLoadingMore) {
						loadMoreRef.current()
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

	useEffect(() => {
		if (!isStreaming) {
			const container = scrollContainerRef.current
			if (container) {
				const { scrollTop, scrollHeight, clientHeight } = container
				const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 150
				if (!isAtBottom && scrollHeight > clientHeight) {
					setShowScrollToBottom(true)
				}
			}
			return
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
	}, [messages])

	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore) return

		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))
		try {
			const result = await loadMoreMessages(sessionId, paginationState.cursor!)
			const older: Message[] = (result.messages || []).map((m: any) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content,
				charts: m.charts && m.chartData ? [{ charts: m.charts, chartData: m.chartData }] : undefined,
				citations: m.citations,
				csvExports: m.csvExports,
				id: m.messageId,
				timestamp: m.timestamp ? new Date(m.timestamp).getTime() : undefined
			}))

			const container = scrollContainerRef.current
			const prevScrollHeight = container?.scrollHeight || 0

			setMessages((prev) => [...older, ...prev])

			requestAnimationFrame(() => {
				if (container) {
					container.scrollTop = container.scrollHeight - prevScrollHeight
				}
			})

			setPaginationState({
				hasMore: result.pagination?.hasMore || false,
				cursor: result.pagination?.cursor || null,
				isLoadingMore: false
			})
		} catch {
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
		}
	}, [sessionId, paginationState, loadMoreMessages])

	const loadMoreRef = useRef(handleLoadMoreMessages)
	useEffect(() => {
		loadMoreRef.current = handleLoadMoreMessages
	}, [handleLoadMoreMessages])

	const handleSidebarToggle = useCallback(() => {
		setShouldAnimateSidebar(true)
		toggleSidebar()
	}, [toggleSidebar])

	const handleNewChat = useCallback(() => {
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
		setActiveToolCalls([])
		setSpawnProgress(new Map())
		setSpawnStartTime(0)
		isFirstMessageRef.current = true
		shouldAutoScrollRef.current = true
		setShowScrollToBottom(false)
		setPaginationState({ hasMore: false, cursor: null, isLoadingMore: false })
		promptInputRef.current?.focus()
		if (initialSessionId) {
			Router.push('/ai/chat', undefined, { shallow: true })
		}
	}, [initialSessionId])

	const handleSessionSelect = useCallback(
		async (selectedSessionId: string) => {
			if (selectedSessionId === sessionId) return
			setError(null)
			setRestoringSessionId(selectedSessionId)

			try {
				const result = await restoreSession(selectedSessionId)
				const restored: Message[] = (result.messages || []).map((m: any) => ({
					role: m.role as 'user' | 'assistant',
					content: m.content,
					charts: m.charts && m.chartData ? [{ charts: m.charts, chartData: m.chartData }] : undefined,
					citations: m.citations,
					csvExports: m.csvExports,
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
					savedAlertIds: m.savedAlertIds,
					id: m.messageId,
					timestamp: m.timestamp ? new Date(m.timestamp).getTime() : undefined
				}))

				setMessages(restored)
				setSessionId(selectedSessionId)
				const match = sessions.find((s) => s.sessionId === selectedSessionId)
				setSessionTitle(match?.title || null)
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
					setActiveToolCalls([])
					setSpawnProgress(new Map())
					setSpawnStartTime(0)

					let accumulatedText = ''
					let accumulatedCharts: ChartSet[] = []
					let accumulatedCsvExports: CsvExport[] = []
					let accumulatedAlerts: AlertProposedData[] = []
					let accumulatedCitations: string[] = []
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
									id: finalMessageId
								}
							])
							setStreamingText('')
							setStreamingCharts([])
							setStreamingCsvExports([])
							setStreamingAlerts([])
							setStreamingCitations([])
							setActiveToolCalls([])
							setSpawnProgress(new Map())
							setSpawnStartTime(0)
							setIsStreaming(false)
							notify()
						}
					}

					resumeAgenticStream({
						sessionId: selectedSessionId,
						callbacks,
						abortSignal: controller.signal,
						fetchFn: authorizedFetch
					})
						.catch((err: any) => {
							if (err?.name === 'AbortError') return
							setIsStreaming(false)
						})
						.finally(() => {
							abortControllerRef.current = null
						})
				}
			} catch {
				setError('Failed to restore session')
			} finally {
				setRestoringSessionId(null)
			}
		},
		[sessionId, restoreSession, sessions, authorizedFetch, updateSessionTitle, moveSessionToTop, notify]
	)

	const handleSubmit = useCallback(
		(
			prompt: string,
			_entities?: Array<{ term: string; slug: string }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>,
			pageContext?: { entitySlug?: string; entityType?: 'protocol' | 'chain'; route: string }
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
				customInstructions: customInstructionsRef.current || undefined,
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
								id: finalMessageId
							}
						])
						setStreamingText('')
						setStreamingCharts([])
						setStreamingCsvExports([])
						setStreamingAlerts([])
						setStreamingCitations([])
						setActiveToolCalls([])
						setSpawnProgress(new Map())
						setSpawnStartTime(0)
						setIsStreaming(false)
						notify()
					}
				}
			})
				.catch((err: any) => {
					if (err?.name === 'AbortError') return
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
			notify
		]
	)

	const handleStopRequest = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const handleSubmitRef = useRef(handleSubmit)
	handleSubmitRef.current = handleSubmit

	const handleActionClick = useCallback(
		(message: string) => {
			if (!isStreaming) handleSubmit(message)
		},
		[isStreaming, handleSubmit]
	)

	const handleSessionSelectRef = useRef(handleSessionSelect)
	handleSessionSelectRef.current = handleSessionSelect

	useEffect(() => {
		if (initialSessionId || sharedSession) return
		const pendingPrompt = consumePendingPrompt()
		const pendingPageContext = consumePendingPageContext()
		if (pendingPrompt) {
			handleSubmitRef.current(pendingPrompt, undefined, undefined, pendingPageContext ?? undefined)
		}
	}, [initialSessionId, sharedSession])

	useEffect(() => {
		if (initialSessionId) {
			handleSessionSelectRef.current(initialSessionId)
		}
	}, [initialSessionId])

	useEffect(() => {
		if (!sharedSession) return
		const mapped: Message[] = sharedSession.messages.map((m) => ({
			role: m.role,
			content: m.content || undefined,
			charts:
				m.charts && m.chartData
					? [
							{
								charts: m.charts,
								chartData: (Array.isArray(m.chartData) ? { default: m.chartData } : m.chartData) as Record<
									string,
									any[]
								>
							}
						]
					: undefined,
			csvExports: m.csvExports,
			citations: m.citations,
			images: m.images,
			id: m.messageId
		}))
		setMessages(mapped)
		setSessionId(sharedSession.session.sessionId)
		setSessionTitle(sharedSession.session.title)
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
			{!readOnly &&
				(sidebarVisible ? (
					<>
						<AgenticSidebar
							sessions={sessions}
							isLoading={isLoadingSessions}
							currentSessionId={sessionId}
							restoringSessionId={restoringSessionId}
							onSessionSelect={handleSessionSelect}
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
				))}

			<div
				className={`relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
			>
				{!hasMessages ? (
					<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5">
						<div className="mt-[100px] flex shrink-0 flex-col items-center justify-center gap-2.5 max-lg:mt-[50px]">
							<img src="/assets/llamaai/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
							<h1 className="text-center text-2xl font-semibold">
								{readOnly ? sessionTitle || 'Shared Conversation' : 'What can I help you with?'}
							</h1>
						</div>
						{!readOnly && (
							<PromptInput
								handleSubmit={handleSubmit}
								promptInputRef={promptInputRef}
								isPending={false}
								handleStopRequest={handleStopRequest}
								isStreaming={isStreaming}
								restoreRequest={null}
								placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
								isResearchMode={isResearchMode}
								setIsResearchMode={setIsResearchMode}
								researchUsage={null}
								onOpenAlerts={alertsModalStore.show}
							/>
						)}
					</div>
				) : (
					<>
						<div ref={scrollContainerRef} className="relative thin-scrollbar flex-1 overflow-y-auto p-2.5 max-lg:px-0">
							<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
								<div className="flex w-full flex-col gap-2 px-2 pb-2.5">
									<div className="flex flex-col gap-2.5">
										{paginationState.isLoadingMore && (
											<div className="flex justify-center py-2">
												<span className="text-xs text-[#666] dark:text-[#919296]">Loading older messages...</span>
											</div>
										)}
										{messages.map((msg, i) => {
											const nextMsg = messages[i + 1]
											const nextUser = nextMsg?.role === 'user' ? nextMsg.content : undefined
											return (
												<MessageBubble
													key={i}
													message={msg}
													sessionId={sessionId}
													isStreaming={isStreaming}
													fetchFn={authorizedFetch}
													readOnly={readOnly}
													onActionClick={!readOnly && !isStreaming ? handleActionClick : undefined}
													nextUserMessage={nextUser}
												/>
											)
										})}

										{isStreaming &&
											activeToolCalls.length === 0 &&
											spawnProgress.size === 0 &&
											!streamingText &&
											streamingCharts.length === 0 && <TypingIndicator />}

										{spawnProgress.size > 0 ? (
											<SpawnProgressCard agents={spawnProgress} startTime={spawnStartTime} />
										) : (
											activeToolCalls.map((tc) => <ToolIndicator key={tc.id} label={tc.label} name={tc.name} />)
										)}

										{isStreaming &&
											(streamingText ||
												streamingCharts.length > 0 ||
												streamingCsvExports.length > 0 ||
												streamingAlerts.length > 0 ||
												streamingCitations.length > 0) && (
												<InlineContent
													text={streamingText}
													chartSets={streamingCharts}
													csvExports={streamingCsvExports}
													alerts={streamingAlerts}
													messageId={currentMessageIdRef.current || undefined}
													citations={streamingCitations}
													isStreaming
													sessionId={sessionId}
													fetchFn={authorizedFetch}
												/>
											)}

										{error && (
											<div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
												<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
												{lastFailedPrompt && (
													<button
														onClick={() => {
															setError(null)
															handleSubmit(lastFailedPrompt)
														}}
														className="mt-1 w-fit rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
													>
														Retry
													</button>
												)}
											</div>
										)}
									</div>
								</div>
								<div ref={messagesEndRef} />
							</div>
						</div>

						<div
							className={`pointer-events-none sticky bottom-32 z-10 mx-auto -mb-8 transition-opacity duration-200 ${showScrollToBottom ? 'opacity-100' : 'opacity-0'}`}
						>
							<Tooltip
								content="Scroll to bottom"
								render={<button onClick={scrollToBottom} />}
								className="pointer-events-auto mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-(--app-bg) shadow-md hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324]"
							>
								<Icon name="arrow-down" height={16} width={16} />
								<span className="sr-only">Scroll to bottom</span>
							</Tooltip>
						</div>

						{!readOnly && (
							<div className="relative mx-auto w-full max-w-3xl pb-2.5">
								<div className="absolute -top-8 right-0 left-0 h-9 bg-gradient-to-b from-transparent to-[#fefefe] dark:to-[#131516]" />
								<PromptInput
									handleSubmit={handleSubmit}
									promptInputRef={promptInputRef}
									isPending={false}
									handleStopRequest={handleStopRequest}
									isStreaming={isStreaming}
									restoreRequest={null}
									placeholder="Reply to LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
									isResearchMode={isResearchMode}
									setIsResearchMode={setIsResearchMode}
									researchUsage={null}
									onOpenAlerts={alertsModalStore.show}
								/>
							</div>
						)}
					</>
				)}
			</div>
			{!readOnly && rateLimitDetails && (
				<ResearchLimitModal
					dialogStore={researchModalStore}
					period={rateLimitDetails.period}
					limit={rateLimitDetails.limit}
					resetTime={rateLimitDetails.resetTime}
				/>
			)}
			{!readOnly && <AlertsModal dialogStore={alertsModalStore} />}
			{!readOnly && (
				<SettingsModal
					dialogStore={settingsModalStore}
					customInstructions={customInstructions}
					onCustomInstructionsChange={setCustomInstructions}
					fetchFn={authorizedFetch}
				/>
			)}
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

const SpawnProgressCard = memo(function SpawnProgressCard({
	agents,
	startTime
}: {
	agents: Map<string, SpawnAgentStatus>
	startTime: number
}) {
	const [elapsed, setElapsed] = useState(0)
	const [isExpanded, setIsExpanded] = useState(true)

	useEffect(() => {
		if (!startTime) return
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime) / 1000))
		}, 1000)
		return () => clearInterval(interval)
	}, [startTime])

	const agentList = useMemo(() => [...agents.values()], [agents])
	const completed = agentList.filter((a) => a.status === 'completed').length
	const total = agentList.length

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-2 sm:p-3 dark:border-[#222324]">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 text-left sm:gap-3"
			>
				<img src="/assets/llamaai/llamaai_animation.webp" alt="" className="h-6 w-6 shrink-0" />

				<span className="flex-1 truncate text-xs text-[#666] sm:text-sm dark:text-[#919296]">
					Researching in parallel...
				</span>

				<span className="flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] text-[#666] sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{completed}/{total} done
				</span>

				<span className="flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[#666] tabular-nums sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{formatTime(elapsed)}
				</span>

				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="hidden shrink-0 text-[#666] sm:block dark:text-[#919296]"
				>
					{isExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
				</svg>
			</button>

			{isExpanded && (
				<div className="flex flex-col gap-1 border-t border-[#e6e6e6] pt-2 dark:border-[#222324]">
					{agentList.map((a) => (
						<div key={a.id} className="flex items-center gap-2 pl-1">
							{a.status === 'completed' ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 text-green-500"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							) : a.status === 'error' ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 text-red-500"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							) : (
								<span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-(--old-blue)" />
							)}
							<span className="text-xs text-[#666] dark:text-[#919296]">
								{a.id}
								{a.status === 'tool_call' && a.tool && (
									<span className="opacity-60"> — {TOOL_LABELS[a.tool] || a.tool}</span>
								)}
								{a.status === 'completed' && (
									<span className="opacity-60">
										{' '}
										— Complete ({a.toolCount} tools{a.chartCount ? `, ${a.chartCount} charts` : ''})
									</span>
								)}
								{a.status === 'started' && <span className="opacity-60"> — Starting...</span>}
								{a.status === 'error' && <span className="opacity-60"> — Error</span>}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
})

function ActionButtonGroup({
	actions,
	onActionClick,
	nextUserMessage
}: {
	actions: Array<{ label: string; message: string }>
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const alreadyClicked = nextUserMessage
		? (actions.find((a) => !a.message.startsWith('url:') && a.message === nextUserMessage)?.message ?? null)
		: null
	const [clicked, setClicked] = useState<string | null>(alreadyClicked)
	const isClicked = clicked !== null

	return (
		<div className="flex flex-wrap items-center gap-2.5">
			{actions.map((action, j) => {
				const isUrl = action.message.startsWith('url:')
				const isPrimary = j === 0 && !isUrl

				if (isUrl) {
					const href = action.message.slice(4)
					return (
						<a
							key={j}
							href={href.startsWith('http') ? href : `https://defillama.com${href}`}
							target={href.startsWith('http') ? '_blank' : undefined}
							rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
							onClick={(e) => {
								if (!href.startsWith('http')) {
									e.preventDefault()
									Router.push(href)
								}
							}}
							className="inline-flex items-center gap-1.5 rounded-full border border-[#2172e5]/15 bg-[#2172e5]/[0.03] px-4 py-2 text-sm font-medium text-[#2172e5] transition-all duration-150 hover:border-[#2172e5]/35 hover:bg-[#2172e5]/[0.08] active:scale-[0.97] dark:border-[#4190f7]/15 dark:bg-[#4190f7]/[0.03] dark:text-[#4190f7] dark:hover:border-[#4190f7]/35 dark:hover:bg-[#4190f7]/[0.08]"
						>
							{action.label}
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M7 17L17 7" />
								<path d="M7 7h10v10" />
							</svg>
						</a>
					)
				}

				if (isPrimary) {
					return (
						<button
							key={j}
							type="button"
							disabled={isClicked || !onActionClick}
							onClick={() => {
								if (onActionClick && !isClicked) {
									setClicked(action.message)
									onActionClick(action.message)
								}
							}}
							className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
								!isClicked
									? onActionClick
										? 'bg-[#2172e5] text-white hover:bg-[#1b5fbd] active:scale-[0.97] dark:bg-[#4190f7] dark:hover:bg-[#3279de]'
										: 'bg-[#e6e6e6] text-[#999] dark:bg-[#333] dark:text-[#666]'
									: clicked === action.message
										? 'bg-[#2172e5] text-white dark:bg-[#4190f7]'
										: 'pointer-events-none bg-[#e6e6e6] text-[#999] opacity-50 dark:bg-[#333] dark:text-[#666]'
							}`}
						>
							{action.label}
						</button>
					)
				}

				return (
					<button
						key={j}
						type="button"
						disabled={isClicked || !onActionClick}
						onClick={() => {
							if (onActionClick && !isClicked) {
								setClicked(action.message)
								onActionClick(action.message)
							}
						}}
						className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-150 ${
							!isClicked
								? onActionClick
									? 'border-[#2172e5]/20 text-[#2172e5] hover:border-[#2172e5]/40 hover:bg-[#2172e5]/[0.06] active:scale-[0.97] dark:border-[#4190f7]/20 dark:text-[#4190f7] dark:hover:border-[#4190f7]/40 dark:hover:bg-[#4190f7]/[0.06]'
									: 'border-[#e6e6e6] text-[#999] dark:border-[#333] dark:text-[#666]'
								: clicked === action.message
									? 'border-[#2172e5] bg-[#2172e5]/10 text-[#2172e5] dark:border-[#4190f7] dark:bg-[#4190f7]/10 dark:text-[#4190f7]'
									: 'pointer-events-none border-[#e6e6e6] text-[#999] opacity-50 dark:border-[#333] dark:text-[#666]'
						}`}
					>
						{action.label}
					</button>
				)
			})}
		</div>
	)
}

function InlineContent({
	text,
	chartSets,
	csvExports = [],
	alerts = [],
	savedAlertIds,
	messageId,
	citations,
	isStreaming = false,
	sessionId,
	fetchFn,
	onActionClick,
	nextUserMessage
}: {
	text: string
	chartSets: ChartSet[]
	csvExports?: CsvExport[]
	alerts?: AlertProposedData[]
	savedAlertIds?: string[]
	messageId?: string
	citations: string[]
	isStreaming?: boolean
	sessionId?: string | null
	fetchFn?: typeof fetch
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const chartIndex = useMemo(() => buildChartIndex(chartSets), [chartSets])
	const csvIndex = useMemo(() => {
		const m = new Map<string, CsvExport>()
		for (const csv of csvExports) m.set(csv.id, csv)
		return m
	}, [csvExports])

	const { parts, referencedChartIds, referencedCsvIds, hasActions } = useMemo(() => {
		const parsed = parseArtifactPlaceholders(text)
		return {
			parts: parsed.parts,
			referencedChartIds: parsed.chartIds,
			referencedCsvIds: parsed.csvIds,
			hasActions: parsed.actionItems.length > 0
		}
	}, [text])

	const hasInlineRefs = referencedChartIds.size > 0 || referencedCsvIds.size > 0 || hasActions

	const groupedParts = useMemo(() => {
		const result: Array<
			(typeof parts)[number] | { type: 'action-group'; actions: Array<{ label: string; message: string }> }
		> = []
		let currentActionGroup: Array<{ label: string; message: string }> = []

		for (let idx = 0; idx < parts.length; idx++) {
			const part = parts[idx]
			if (part.type === 'action' && part.actionLabel && part.actionMessage) {
				currentActionGroup.push({ label: part.actionLabel, message: part.actionMessage })
			} else if (
				currentActionGroup.length > 0 &&
				part.type === 'text' &&
				!part.content.trim() &&
				parts.slice(idx + 1).some((p) => p.type === 'action')
			) {
				continue
			} else {
				if (currentActionGroup.length > 0) {
					result.push({ type: 'action-group', actions: [...currentActionGroup] })
					currentActionGroup = []
				}
				result.push(part)
			}
		}
		if (currentActionGroup.length > 0) {
			result.push({ type: 'action-group', actions: currentActionGroup })
		}
		return result
	}, [parts])

	const unreferencedCharts = useMemo(() => {
		const all: { chart: ChartConfiguration; chartData: Record<string, any[]> }[] = []
		for (const [id, entry] of chartIndex) {
			if (!referencedChartIds.has(id)) all.push(entry)
		}
		return all
	}, [chartIndex, referencedChartIds])

	const unreferencedCsvs = useMemo(() => {
		const all: CsvExport[] = []
		for (const [id, csv] of csvIndex) {
			if (!referencedCsvIds.has(id)) all.push(csv)
		}
		return all
	}, [csvIndex, referencedCsvIds])

	return (
		<div className="flex flex-col gap-2.5">
			{hasInlineRefs
				? groupedParts.map((part, i) => {
						if ('actions' in part && part.type === 'action-group') {
							return (
								<ActionButtonGroup
									key={`actions-${i}`}
									actions={part.actions}
									onActionClick={onActionClick}
									nextUserMessage={nextUserMessage}
								/>
							)
						}
						if (part.type === 'chart' && 'chartId' in part && part.chartId) {
							const entry = chartIndex.get(part.chartId)
							if (entry) {
								return (
									<div key={`inline-chart-${part.chartId}-${i}`} className="my-2">
										<ChartRenderer
											charts={[entry.chart]}
											chartData={entry.chartData}
											sessionId={sessionId}
											fetchFn={fetchFn}
										/>
									</div>
								)
							}
							if (isStreaming) {
								return (
									<div
										key={`chart-loading-${part.chartId}-${i}`}
										className="my-4 flex h-64 animate-pulse items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
									>
										<p className="text-sm text-gray-500">Loading chart...</p>
									</div>
								)
							}
							return null
						}
						if (part.type === 'csv' && 'csvId' in part && part.csvId) {
							const csv = csvIndex.get(part.csvId)
							if (csv) {
								return <CSVExportArtifact key={`inline-csv-${part.csvId}-${i}`} csvExport={csv} />
							}
							return null
						}
						if ('content' in part && !part.content) return null
						if ('content' in part) {
							return (
								<MarkdownRenderer
									key={`text-${i}`}
									content={part.content}
									citations={citations.length > 0 ? citations : undefined}
									isStreaming={isStreaming}
								/>
							)
						}
						return null
					})
				: text && (
						<MarkdownRenderer
							content={text}
							citations={citations.length > 0 ? citations : undefined}
							isStreaming={isStreaming}
						/>
					)}
			{isStreaming && text && <span className="inline-block h-4 w-0.5 animate-pulse bg-(--old-blue)" />}
			{!hasInlineRefs &&
				unreferencedCharts.map((entry, i) => (
					<ChartRenderer
						key={`chart-${entry.chart.id || i}`}
						charts={[entry.chart]}
						chartData={entry.chartData}
						sessionId={sessionId}
						fetchFn={fetchFn}
					/>
				))}
			{!hasInlineRefs && unreferencedCsvs.map((csv) => <CSVExportArtifact key={`csv-${csv.id}`} csvExport={csv} />)}
			{alerts.map((alert) => (
				<AlertArtifact
					key={alert.alertId}
					alertId={alert.alertId}
					defaultTitle={alert.title}
					alertIntent={{ ...alert.alertIntent, detected: true, toolExecutions: [] }}
					messageId={messageId}
					savedAlertIds={savedAlertIds}
				/>
			))}
		</div>
	)
}

function TypingIndicator() {
	return (
		<div className="flex items-center gap-1.5 py-2">
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:0ms] dark:bg-[#919296]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:150ms] dark:bg-[#919296]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] [animation-delay:300ms] dark:bg-[#919296]" />
		</div>
	)
}

function ToolIndicator({ label, name }: { label: string; name: string }) {
	return (
		<div className="flex items-center gap-2 py-1.5">
			<img src="/assets/llamaai/llamaai_animation.webp" alt="" className="h-5 w-5 shrink-0" />
			<span className="text-xs text-[#666] dark:text-[#919296]">
				{label} <span className="font-mono text-[10px] opacity-60">{name}</span>
			</span>
		</div>
	)
}

function MessageBubble({
	message,
	sessionId,
	isStreaming: parentIsStreaming,
	fetchFn,
	readOnly = false,
	onActionClick,
	nextUserMessage
}: {
	message: Message
	sessionId: string | null
	isStreaming: boolean
	fetchFn?: typeof fetch
	readOnly?: boolean
	onActionClick?: (message: string) => void
	nextUserMessage?: string
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)

	if (message.role === 'user') {
		return (
			<div className="ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
				{message.images && message.images.length > 0 && (
					<div className="mb-2.5 flex flex-wrap gap-3">
						{message.images.map((img) => (
							<button
								key={`sent-image-${img.url}`}
								type="button"
								onClick={() => setPreviewImage(img.url)}
								className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg"
							>
								<img src={img.url} alt={img.filename || 'Uploaded image'} className="h-full w-full object-cover" />
							</button>
						))}
					</div>
				)}
				<p>{message.content}</p>
				<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
			</div>
		)
	}

	return (
		<div>
			<InlineContent
				text={message.content || ''}
				chartSets={message.charts || []}
				csvExports={message.csvExports}
				alerts={readOnly ? undefined : message.alerts}
				savedAlertIds={message.savedAlertIds}
				messageId={message.id}
				citations={message.citations || []}
				sessionId={sessionId}
				fetchFn={fetchFn}
				onActionClick={onActionClick}
				nextUserMessage={nextUserMessage}
			/>
			{message.id && !parentIsStreaming && (
				<ResponseControls messageId={message.id} content={message.content} sessionId={sessionId} readOnly={readOnly} />
			)}
		</div>
	)
}
