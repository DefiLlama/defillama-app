import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { ChartRenderer } from './components/ChartRenderer'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { InlineSuggestions } from './components/InlineSuggestions'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { PromptInput } from './components/PromptInput'
import { PromptResponse, QueryMetadata, SuggestedActions } from './components/PromptResponse'
import { RecommendedPrompts } from './components/RecommendedPrompts'
import { ResearchLimitModal } from './components/ResearchLimitModal'
import { ResponseControls } from './components/ResponseControls'
import { useChatHistory } from './hooks/useChatHistory'
import { useStreamNotification } from './hooks/useStreamNotification'
import { fetchPromptResponse } from './utils/fetchPromptResponse'
import { parseChartInfo } from './utils/parseChartInfo'
import { debounce, throttle } from './utils/scrollUtils'
import { StreamingContent } from './utils/textUtils'

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	messages: Array<{
		question: string
		response: {
			answer: string
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[]
			citations?: string[]
			csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
		}
		messageId?: string
		timestamp: number
	}>
	isPublicView: true
}

interface LlamaAIProps {
	initialSessionId?: string
	sharedSession?: SharedSession
	isPublicView?: boolean
	readOnly?: boolean
	showDebug?: boolean
}

export function LlamaAI({ initialSessionId, sharedSession, readOnly = false, showDebug = false }: LlamaAIProps = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const {
		sidebarVisible,
		toggleSidebar,
		createFakeSession,
		loadMoreMessages,
		moveSessionToTop,
		updateSessionTitle,
		restoreSession,
		isRestoringSession,
		researchUsage,
		decrementResearchUsage
	} = useChatHistory()
	const { notify, requestPermission } = useStreamNotification()

	const [sessionId, setSessionId] = useState<string | null>(null)
	const sessionIdRef = useRef<string | null>(null)
	const newlyCreatedSessionsRef = useRef<Set<string>>(new Set())

	const [messages, setMessages] = useState<
		Array<{
			role?: string
			content?: string
			question?: string
			images?: Array<{ url: string; mimeType: string; filename?: string }>
			response?: {
				answer: string
				metadata?: any
				suggestions?: any[]
				charts?: any[]
				chartData?: any[]
				citations?: string[]
				inlineSuggestions?: string
				csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
			}
			timestamp: number
			messageId?: string
			userRating?: 'good' | 'bad' | null
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[]
			citations?: string[]
			inlineSuggestions?: string
			csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
		}>
	>([])
	const [paginationState, setPaginationState] = useState<{
		hasMore: boolean
		isLoadingMore: boolean
		cursor?: number
		totalMessages?: number
	}>({ hasMore: false, isLoadingMore: false })

	const [hasRestoredSession, setHasRestoredSession] = useState<string | null>(null)
	const [streamingResponse, setStreamingResponse] = useState('')
	const [streamingError, setStreamingError] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [progressMessage, setProgressMessage] = useState('')
	const [_progressStage, setProgressStage] = useState('')
	const [streamingSuggestions, setStreamingSuggestions] = useState<any[] | null>(null)
	const [streamingCharts, setStreamingCharts] = useState<any[] | null>(null)
	const [streamingChartData, setStreamingChartData] = useState<any[] | null>(null)
	const [streamingCitations, setStreamingCitations] = useState<string[] | null>(null)
	const [streamingCsvExports, setStreamingCsvExports] = useState<Array<{
		id: string
		title: string
		url: string
		rowCount: number
		filename: string
	}> | null>(null)
	const [pendingImages, setPendingImages] = useState<Array<{ url: string; mimeType: string; filename?: string }>>([])
	const [isGeneratingCharts, setIsGeneratingCharts] = useState(false)
	const [isAnalyzingForCharts, setIsAnalyzingForCharts] = useState(false)
	const [hasChartError, setHasChartError] = useState(false)
	const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
	const [expectedChartInfo, setExpectedChartInfo] = useState<{ count?: number; types?: string[] } | null>(null)
	const [resizeTrigger, setResizeTrigger] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [prompt, setPrompt] = useState('')
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [showRateLimitModal, setShowRateLimitModal] = useState(false)
	const [rateLimitDetails, setRateLimitDetails] = useState<{
		period: string
		limit: number
		resetTime: string | null
	} | null>(null)
	const [researchState, setResearchState] = useState<{
		isActive: boolean
		startTime: number
		currentIteration: number
		totalIterations: number
		phase: 'planning' | 'fetching' | 'analyzing' | 'synthesizing'
		dimensionsCovered: string[]
		dimensionsPending: string[]
		discoveries: string[]
		toolsExecuted: number
	} | null>(null)
	const [lastFailedRequest, setLastFailedRequest] = useState<{
		userQuestion: string
		suggestionContext?: any
		preResolvedEntities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const lastInputRef = useRef<{
		text: string
		entities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const [restoreRequest, setRestoreRequest] = useState<{
		key: number
		text: string
		entities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const [isDraggingOnChat, setIsDraggingOnChat] = useState(false)
	const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null)
	const chatDragCounterRef = useRef(0)

	const abortControllerRef = useRef<AbortController | null>(null)
	const streamingContentRef = useRef<StreamingContent>(new StreamingContent())
	const researchStartTimeRef = useRef<number | null>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const shouldAutoScrollRef = useRef(true)
	const rafIdRef = useRef<number | null>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const isAutoScrollingRef = useRef(false) // Flag during session restoration auto-scroll
	const promptInputRef = useRef<HTMLTextAreaElement>(null)

	const resetScrollState = useCallback(() => {
		setShowScrollToBottom(false)
		shouldAutoScrollRef.current = true
		isAutoScrollingRef.current = true
	}, [])

	useEffect(() => {
		sessionIdRef.current = sessionId
	}, [sessionId])

	useEffect(() => {
		if (initialSessionId && !sessionId) {
			resetScrollState()
			setSessionId(initialSessionId)
			setHasRestoredSession(null)
		}
	}, [initialSessionId, sessionId, resetScrollState])

	useEffect(() => {
		if (sharedSession) {
			resetScrollState()
			setMessages(sharedSession.messages)
			setSessionId(sharedSession.session.sessionId)
		}
	}, [sharedSession, resetScrollState])

	const reconnectToStream = useCallback(
		(sid: string, initialContent: string) => {
			setIsStreaming(true)
			setStreamingResponse(initialContent)

			fetchPromptResponse({
				userQuestion: '',
				sessionId: sid,
				mode: 'auto',
				resume: true,
				authorizedFetch,
				onProgress: (data) => {
					if (data.type === 'token') {
						setStreamingResponse((prev) => prev + data.content)
					} else if (data.type === 'progress') {
						setProgressMessage(data.content || '')
						if (data.stage) setProgressStage(data.stage)
						if (data.stage === 'research' && (data as any).researchProgress) {
							const rp = (data as any).researchProgress
							const serverStartTime = (data as any).startedAt ? new Date((data as any).startedAt).getTime() : null
							if (!researchStartTimeRef.current || serverStartTime) {
								researchStartTimeRef.current = serverStartTime || Date.now()
							}
							setResearchState({
								isActive: true,
								startTime: researchStartTimeRef.current,
								currentIteration: rp.iteration,
								totalIterations: rp.totalIterations,
								phase: rp.phase,
								dimensionsCovered: rp.dimensionsCovered || [],
								dimensionsPending: rp.dimensionsPending || [],
								discoveries: rp.discoveries || [],
								toolsExecuted: rp.toolsExecuted || 0
							})
						}
					} else if (data.type === 'suggestions' && data.suggestions) {
						setStreamingSuggestions(data.suggestions)
					} else if (data.type === 'charts' && data.charts) {
						setStreamingCharts(data.charts)
						if (data.chartData) setStreamingChartData(data.chartData)
					} else if (data.type === 'citations' && data.citations) {
						setStreamingCitations(data.citations)
					} else if (data.type === 'error') {
						setIsStreaming(false)
						setStreamingError(data.content || 'Generation failed')
					} else if (data.type === 'title') {
						updateSessionTitle({ sessionId: sid, title: data.title || data.content })
					}
				}
			})
				.then((result) => {
					setIsStreaming(false)
					if (result?.response) {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: result.response.answer,
								charts: result.response.charts,
								chartData: result.response.chartData,
								suggestions: result.response.suggestions,
								citations: result.response.citations,
								timestamp: Date.now()
							}
						])
					}
				})
				.catch((err) => {
					console.log('Reconnect stream error:', err)
					setIsStreaming(false)
				})
		},
		[authorizedFetch]
	)

	useEffect(() => {
		if (
			sessionId &&
			user &&
			!sharedSession &&
			!readOnly &&
			hasRestoredSession !== sessionId &&
			!newlyCreatedSessionsRef.current.has(sessionId) &&
			!isStreaming
		) {
			resetScrollState()
			setHasRestoredSession(sessionId)
			restoreSession(sessionId)
				.then((result: any) => {
					setMessages(result.messages)
					setPaginationState(result.pagination)

					if (result.streaming?.status === 'streaming') {
						reconnectToStream(sessionId, result.streaming.content || '')
					} else if (result.streaming?.status === 'completed' && result.streaming.result) {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: result.streaming.result.response,
								charts: result.streaming.result.charts,
								chartData: result.streaming.result.chartData,
								suggestions: result.streaming.result.suggestions,
								citations: result.streaming.result.citations,
								timestamp: Date.now()
							}
						])
					}
				})
				.catch((error) => {
					console.log('Failed to restore session:', error)
				})
		}
	}, [
		sessionId,
		user,
		sharedSession,
		readOnly,
		hasRestoredSession,
		restoreSession,
		resetScrollState,
		isStreaming,
		reconnectToStream
	])

	const {
		data: promptResponse,
		mutate: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: ({
			userQuestion,
			suggestionContext,
			preResolvedEntities,
			images
		}: {
			userQuestion: string
			suggestionContext?: any
			preResolvedEntities?: Array<{ term: string; slug: string }>
			images?: Array<{ data: string; mimeType: string; filename?: string }>
		}) => {
			let currentSessionId = sessionId

			if (!currentSessionId && user) {
				currentSessionId = createFakeSession()
				newlyCreatedSessionsRef.current.add(currentSessionId)
				setSessionId(currentSessionId)
				sessionIdRef.current = currentSessionId
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			abortControllerRef.current = new AbortController()

			requestPermission()
			setIsStreaming(true)
			setStreamingResponse('')
			setStreamingError('')
			setProgressMessage('')
			setProgressStage('')
			setStreamingSuggestions(null)
			setStreamingCharts(null)
			setStreamingChartData(null)
			setStreamingCitations(null)
			setStreamingCsvExports(null)
			setIsGeneratingCharts(false)
			setIsAnalyzingForCharts(false)
			setHasChartError(false)
			setIsGeneratingSuggestions(false)
			setExpectedChartInfo(null)

			streamingContentRef.current.reset()

			// et pendingImages immediately so they display during streaming
			if (images && images.length > 0) {
				setPendingImages(
					images.map((img) => ({
						url: img.data,
						mimeType: img.mimeType,
						filename: img.filename
					}))
				)
			} else {
				setPendingImages([])
			}

			return fetchPromptResponse({
				userQuestion,
				sessionId: currentSessionId,
				suggestionContext,
				preResolvedEntities,
				images,
				mode: 'auto',
				forceIntent: isResearchMode ? 'comprehensive_report' : undefined,
				authorizedFetch,
				onProgress: (data) => {
					if (data.type === 'token') {
						const processedContent = streamingContentRef.current.addChunk(data.content)
						setStreamingResponse(processedContent)
					} else if (data.type === 'message_id') {
						setCurrentMessageId(data.messageId || null)
					} else if (data.type === 'progress') {
						setProgressMessage(data.content)
						setProgressStage(data.stage || '')

						if (data.stage === 'chart_pre_analysis') {
							setIsAnalyzingForCharts(true)
							const chartInfo = parseChartInfo(data.content)
							setExpectedChartInfo(chartInfo)
						} else if (data.stage === 'chart_generation') {
							if (data.content.includes('encountered an issue')) {
								setIsAnalyzingForCharts(false)
								setIsGeneratingCharts(false)
								setHasChartError(true)
							} else {
								setIsAnalyzingForCharts(false)
								setIsGeneratingCharts(true)
							}
						} else if (data.stage === 'suggestions_loading') {
							setIsGeneratingSuggestions(true)
						} else if (data.stage === 'research' && (data as any).researchProgress) {
							const rp = (data as any).researchProgress
							if (!researchStartTimeRef.current) {
								researchStartTimeRef.current = Date.now()
							}
							setResearchState({
								isActive: true,
								startTime: researchStartTimeRef.current,
								currentIteration: rp.iteration,
								totalIterations: rp.totalIterations,
								phase: rp.phase,
								dimensionsCovered: rp.dimensionsCovered || [],
								dimensionsPending: rp.dimensionsPending || [],
								discoveries: rp.discoveries || [],
								toolsExecuted: rp.toolsExecuted || 0
							})
						}
					} else if (data.type === 'session' && data.sessionId) {
						newlyCreatedSessionsRef.current.add(data.sessionId)
						setSessionId(data.sessionId)
						sessionIdRef.current = data.sessionId
						// Mark as restored to prevent restoration after streaming completes
						setHasRestoredSession(data.sessionId)
					} else if (data.type === 'suggestions') {
						setStreamingSuggestions(data.suggestions)
						setIsGeneratingSuggestions(false)
					} else if (data.type === 'charts') {
						setStreamingCharts(data.charts)
						setStreamingChartData(data.chartData)
						setIsGeneratingCharts(false)
						setIsAnalyzingForCharts(false)
					} else if (data.type === 'citations') {
						setStreamingCitations(data.citations)
					} else if (data.type === 'csv_export') {
						setStreamingCsvExports(data.csvExports || null)
					} else if (data.type === 'images') {
						setPendingImages(data.images || [])
					} else if (data.type === 'error') {
						setStreamingError(data.content)
					} else if (data.type === 'title') {
						updateSessionTitle({ sessionId: currentSessionId, title: data.title || data.content })
					} else if (data.type === 'reset') {
						// Don't clear the streaming response on a "reset" hint from the server.
						// This was causing the visible answer area to blank out mid-stream even
						// though the backend wasn't actually restarting the whole response.
						setProgressMessage(data.content || 'Retrying due to output error...')
					}
				},
				abortSignal: abortControllerRef.current.signal
			})
		},
		onMutate: ({
			userQuestion,
			suggestionContext,
			preResolvedEntities
		}: {
			userQuestion: string
			suggestionContext?: any
			preResolvedEntities?: Array<{ term: string; slug: string }>
			image?: any
		}) => {
			setLastFailedRequest({ userQuestion, suggestionContext, preResolvedEntities })
		},
		onSuccess: (data, variables) => {
			setIsStreaming(false)
			setResearchState(null)
			researchStartTimeRef.current = null
			abortControllerRef.current = null
			setLastFailedRequest(null)
			lastInputRef.current = null

			if (isResearchMode) {
				decrementResearchUsage()
			}

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			notify()

			const currentImages = pendingImages.length > 0 ? [...pendingImages] : undefined
			setMessages((prev) => [
				...prev,
				{
					role: 'user',
					content: variables.userQuestion,
					images: currentImages,
					timestamp: Date.now()
				},
				{
					role: 'assistant',
					content: data?.response?.answer || finalContent,
					metadata: data?.response?.metadata,
					inlineSuggestions: data?.response?.inlineSuggestions,
					suggestions: data?.response?.suggestions,
					charts: data?.response?.charts,
					chartData: data?.response?.chartData,
					citations: data?.response?.citations,
					csvExports: data?.response?.csvExports,
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])

			setPendingImages([])
			setPrompt('')
			resetPrompt()
			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		},
		onError: (error: any, variables) => {
			setIsStreaming(false)
			setResearchState(null)
			researchStartTimeRef.current = null
			abortControllerRef.current = null

			if (error?.code === 'USAGE_LIMIT_EXCEEDED') {
				setRateLimitDetails({
					period: error.details?.period || 'lifetime',
					limit: error.details?.limit || 0,
					resetTime: error.details?.resetTime || null
				})
				setShowRateLimitModal(true)
				setLastFailedRequest(null)
				return
			}

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			const wasUserStopped = error?.message === 'Request aborted'

			if (wasUserStopped && finalContent.trim()) {
				setLastFailedRequest(null)
				lastInputRef.current = null
				const stoppedImages = pendingImages.length > 0 ? [...pendingImages] : undefined
				setMessages((prev) => [
					...prev,
					{
						role: 'user',
						content: variables.userQuestion,
						images: stoppedImages,
						timestamp: Date.now()
					},
					{
						role: 'assistant',
						content: finalContent,
						metadata: { stopped: true, partial: true },
						suggestions: streamingSuggestions,
						charts: streamingCharts,
						chartData: streamingChartData,
						messageId: currentMessageId,
						timestamp: Date.now()
					}
				])

				setPendingImages([])
				setStreamingResponse('')
				setStreamingSuggestions(null)
				setStreamingCharts(null)
				setStreamingChartData(null)
				setStreamingCitations(null)
				setPrompt('')
			} else if (wasUserStopped && !finalContent.trim()) {
				setPendingImages([])
				setPrompt(variables.userQuestion)
				setLastFailedRequest(null)
			} else if (!wasUserStopped) {
				console.log('Request failed:', error)
				setPendingImages([])
				setLastFailedRequest(null)
				lastInputRef.current = null
			}

			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		}
	})

	const handleStopRequest = useCallback(async () => {
		if (!isStreaming) return

		const currentSessionId = sessionIdRef.current
		const finalContent = streamingContentRef.current.getContent()
		setIsStreaming(false)

		if (currentSessionId) {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						sessionId: currentSessionId
					})
				})

				if (response.ok) {
					console.log('Successfully stopped streaming session')
				} else {
					const errorData = await response.json()
					console.log('Failed to stop streaming session:', errorData)
				}
			} catch (error) {
				console.log('Error stopping streaming session:', error)
			}
		}

		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		if (finalContent.trim()) {
			setMessages((prev) => [
				...prev,
				{
					role: 'user',
					content: prompt,
					timestamp: Date.now()
				},
				{
					role: 'assistant',
					content: finalContent,
					metadata: { stopped: true, partial: true },
					suggestions: streamingSuggestions,
					charts: streamingCharts,
					chartData: streamingChartData,
					citations: streamingCitations,
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])
			setPrompt('')
			lastInputRef.current = null
		} else {
			// No content streamed yet – restore the last submitted input to the text field
			const lastInput = lastInputRef.current
			if (lastInput) {
				setPrompt(lastInput.text)
				setRestoreRequest((prev) => ({
					key: (prev?.key ?? 0) + 1,
					text: lastInput.text,
					entities: lastInput.entities
				}))
			}
		}

		setStreamingResponse('')
		setStreamingSuggestions(null)
		setStreamingCharts(null)
		setStreamingChartData(null)
		setStreamingCitations(null)
		setCurrentMessageId(null)
		resetPrompt()
		setTimeout(() => {
			promptInputRef.current?.focus()
		}, 100)
	}, [
		isStreaming,
		streamingSuggestions,
		streamingCharts,
		streamingChartData,
		streamingCitations,
		currentMessageId,
		prompt,
		lastInputRef,
		setRestoreRequest,
		setMessages,
		setStreamingResponse,
		setStreamingSuggestions,
		setStreamingCharts,
		setStreamingChartData,
		setStreamingCitations,
		setCurrentMessageId,
		resetPrompt,
		promptInputRef,
		authorizedFetch
	])

	const handleRetry = useCallback(() => {
		if (lastFailedRequest) {
			submitPrompt(lastFailedRequest)
		}
	}, [lastFailedRequest, submitPrompt])

	const handleSubmit = useCallback(
		(
			prompt: string,
			preResolved?: Array<{ term: string; slug: string; type: 'chain' | 'protocol' | 'subprotocol' }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>
		) => {
			if (isStreaming) {
				return
			}

			const finalPrompt = prompt.trim()
			setPrompt(finalPrompt)
			lastInputRef.current = { text: finalPrompt, entities: preResolved }
			shouldAutoScrollRef.current = true

			if (sessionId) {
				moveSessionToTop(sessionId)
			}

			submitPrompt({
				userQuestion: finalPrompt,
				preResolvedEntities: preResolved,
				images
			})
		},
		[sessionId, moveSessionToTop, submitPrompt, isStreaming]
	)

	const handleSubmitWithSuggestion = useCallback(
		(prompt: string, suggestion: any) => {
			if (isStreaming) {
				return
			}

			const finalPrompt = prompt.trim()
			setPrompt(finalPrompt)
			shouldAutoScrollRef.current = true

			if (sessionId) {
				moveSessionToTop(sessionId)
			}

			submitPrompt({
				userQuestion: finalPrompt,
				suggestionContext: suggestion
			})
		},
		[sessionId, moveSessionToTop, submitPrompt, isStreaming]
	)

	const router = useRouter()

	const handleNewChat = useCallback(async () => {
		if (initialSessionId) {
			router.push('/ai/chat', undefined, { shallow: true })
			return
		}

		if (sessionId && isStreaming) {
			try {
				await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						sessionId: sessionId
					})
				})
			} catch (error) {
				console.log('Error stopping streaming session:', error)
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}

		if (sessionId) {
			try {
				await authorizedFetch(`${MCP_SERVER}/chatbot-agent/session/${sessionId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				console.log('Failed to reset backend session:', error)
			}
		}

		setSessionId(null)
		setHasRestoredSession(null)
		newlyCreatedSessionsRef.current.clear()
		setPrompt('')
		resetPrompt()
		setStreamingResponse('')
		setStreamingError('')
		setProgressMessage('')
		setProgressStage('')
		setStreamingSuggestions(null)
		setStreamingCharts(null)
		setStreamingChartData(null)
		setStreamingCitations(null)
		setIsGeneratingCharts(false)
		setIsAnalyzingForCharts(false)
		setHasChartError(false)
		setIsGeneratingSuggestions(false)
		setExpectedChartInfo(null)
		setMessages([])
		streamingContentRef.current.reset()
		setResizeTrigger((prev) => prev + 1)
		promptInputRef.current?.focus()
	}, [initialSessionId, sessionId, isStreaming, authorizedFetch, abortControllerRef, resetPrompt, router])

	const handleSessionSelect = async (selectedSessionId: string, data: { messages: any[]; pagination?: any }) => {
		resetScrollState()

		if (sessionId && isStreaming) {
			try {
				await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						sessionId: sessionId
					})
				})
			} catch (error) {
				console.log('Error stopping streaming session:', error)
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}

		setSessionId(selectedSessionId)
		setHasRestoredSession(selectedSessionId)
		setMessages(data.messages)
		setPaginationState(data.pagination || { hasMore: false, isLoadingMore: false })
		setPrompt('')
		resetPrompt()
		setStreamingResponse('')
		setStreamingError('')
		setProgressMessage('')
		setProgressStage('')
		setStreamingSuggestions(null)
		setStreamingCharts(null)
		setStreamingChartData(null)
		setStreamingCitations(null)
		setIsGeneratingCharts(false)
		setIsAnalyzingForCharts(false)
		setHasChartError(false)
		setIsGeneratingSuggestions(false)
		setExpectedChartInfo(null)
		streamingContentRef.current.reset()
		setResizeTrigger((prev) => prev + 1)

		promptInputRef.current?.focus()
	}

	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore || !paginationState.cursor) return

		const scrollContainer = scrollContainerRef.current
		if (!scrollContainer) return

		const previousScrollHeight = scrollContainer.scrollHeight
		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))

		try {
			const result = await loadMoreMessages(sessionId, paginationState.cursor)
			setMessages((prev) => [...result.messages, ...prev])
			setPaginationState(result.pagination)

			setTimeout(() => {
				if (scrollContainer) {
					const newScrollHeight = scrollContainer.scrollHeight
					const heightDifference = newScrollHeight - previousScrollHeight
					scrollContainer.scrollTop = scrollContainer.scrollTop + heightDifference
				}
			}, 0)
		} catch (error) {
			console.log('Failed to load more messages:', error)
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
		}
	}, [sessionId, paginationState.hasMore, paginationState.isLoadingMore, paginationState.cursor, loadMoreMessages])

	const handleSuggestionClick = useCallback(
		(suggestion: any) => {
			let promptText = ''

			promptText = suggestion.title || suggestion.description

			handleSubmitWithSuggestion(promptText, suggestion)
		},
		[handleSubmitWithSuggestion]
	)

	const handleSidebarToggle = useCallback(() => {
		toggleSidebar()
		setShouldAnimateSidebar(true)
		setResizeTrigger((prev) => prev + 1)
	}, [toggleSidebar])

	const handleChatDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current++
		if (e.dataTransfer.types.includes('Files')) {
			setIsDraggingOnChat(true)
		}
	}, [])

	const handleChatDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current--
		if (chatDragCounterRef.current === 0) {
			setIsDraggingOnChat(false)
		}
	}, [])

	const handleChatDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
	}, [])

	const handleChatDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current = 0
		setIsDraggingOnChat(false)
		const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
		if (files.length > 0) {
			setDroppedFiles(files)
		}
	}, [])

	const clearDroppedFiles = useCallback(() => {
		setDroppedFiles(null)
	}, [])

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const checkScrollState = () => {
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current)
			}

			rafIdRef.current = requestAnimationFrame(() => {
				if (!container) return
				const { scrollTop, scrollHeight, clientHeight } = container

				const scrollBottom = Math.ceil(scrollTop + clientHeight)
				const threshold = scrollHeight - 150
				const isAtBottom = scrollBottom >= threshold
				const hasScrollableContent = scrollHeight > clientHeight

				if (isAutoScrollingRef.current && hasScrollableContent) {
					container.scrollTop = scrollHeight
					setTimeout(() => {
						isAutoScrollingRef.current = false
					}, 300)
					return
				}

				shouldAutoScrollRef.current = isAtBottom

				const shouldShowButton = hasScrollableContent && !isAtBottom && !isStreaming && !isAutoScrollingRef.current
				setShowScrollToBottom(shouldShowButton)

				if (sessionId && paginationState.hasMore && !paginationState.isLoadingMore && scrollTop <= 50) {
					handleLoadMoreMessages()
				}
			})
		}

		const throttledScroll = throttle(checkScrollState, 150)
		const debouncedResize = debounce(checkScrollState, 100)

		if ('ResizeObserver' in window) {
			resizeObserverRef.current = new ResizeObserver(debouncedResize)
			resizeObserverRef.current.observe(container)
		}

		container.addEventListener('scroll', throttledScroll, { passive: true })
		container.addEventListener('scrollend', checkScrollState, { passive: true })
		checkScrollState()

		return () => {
			container.removeEventListener('scroll', throttledScroll)
			container.removeEventListener('scrollend', checkScrollState)
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
			}
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current)
			}
		}
	}, [sessionId, paginationState.hasMore, paginationState.isLoadingMore, handleLoadMoreMessages, isStreaming])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && (streamingResponse || isStreaming)) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current) {
					scrollContainerRef.current.scrollTo({
						top: scrollContainerRef.current.scrollHeight,
						behavior: 'smooth'
					})
				}
			})
		}
	}, [streamingResponse, isStreaming])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && messages.length > 0) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current && shouldAutoScrollRef.current) {
					scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
				}
			})
		}
	}, [messages.length])

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	useEffect(() => {
		if (shouldAnimateSidebar) {
			const timer = setTimeout(() => {
				setShouldAnimateSidebar(false)
			}, 220)
			return () => clearTimeout(timer)
		}
	}, [shouldAnimateSidebar])

	const isSubmitted = isPending || isStreaming || error || promptResponse ? true : false

	return (
		<Layout
			title="LlamaAI - DefiLlama"
			description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
		>
			<div className="relative isolate flex h-[calc(100dvh-68px)] flex-nowrap overflow-hidden max-lg:flex-col lg:h-[calc(100dvh-72px)]">
				{!readOnly && (
					<>
						{sidebarVisible ? (
							<>
								<ChatHistorySidebar
									handleSidebarToggle={handleSidebarToggle}
									currentSessionId={sessionId}
									onSessionSelect={handleSessionSelect}
									onNewChat={handleNewChat}
									shouldAnimate={shouldAnimateSidebar}
								/>
								<div className="flex min-h-11 lg:hidden" />
							</>
						) : (
							<ChatControls handleSidebarToggle={handleSidebarToggle} handleNewChat={handleNewChat} />
						)}
					</>
				)}
				<div
					className={`relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
					onDragEnter={handleChatDragEnter}
					onDragLeave={handleChatDragLeave}
					onDragOver={handleChatDragOver}
					onDrop={handleChatDrop}
				>
					{messages.length === 0 && prompt.length === 0 && !isRestoringSession && !isPending && !isStreaming ? (
						initialSessionId ? (
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
										Failed to restore session,{' '}
										<button
											onClick={handleNewChat}
											data-umami-event="llamaai-new-chat"
											className="text-(--link-text) underline"
										>
											Start a new chat
										</button>
									</p>
								</div>
							</div>
						) : (
							<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5">
								<div className="mt-[100px] flex shrink-0 flex-col items-center justify-center gap-2.5 max-lg:mt-[50px]">
									<img
										src="/assets/llamaai/llama-ai.svg"
										alt="LlamaAI"
										className="object-contain"
										width={64}
										height={77}
									/>
									<h1 className="text-center text-2xl font-semibold">What can I help you with?</h1>
								</div>
								{!readOnly && (
									<>
										<PromptInput
											handleSubmit={handleSubmit}
											promptInputRef={promptInputRef}
											isPending={isPending}
											handleStopRequest={handleStopRequest}
											isStreaming={isStreaming}
											restoreRequest={restoreRequest}
											placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
											isResearchMode={isResearchMode}
											setIsResearchMode={setIsResearchMode}
											researchUsage={researchUsage}
											droppedFiles={droppedFiles}
											clearDroppedFiles={clearDroppedFiles}
											externalDragging={isDraggingOnChat}
										/>
										<RecommendedPrompts
											setPrompt={setPrompt}
											submitPrompt={submitPrompt}
											isPending={isPending}
											isResearchMode={isResearchMode}
										/>
									</>
								)}
							</div>
						)
					) : (
						<>
							<div
								ref={scrollContainerRef}
								className="thin-scrollbar relative flex-1 overflow-y-auto p-2.5 max-lg:px-0"
							>
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									{isRestoringSession && messages.length === 0 ? (
										<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
											Loading conversation
											<LoadingDots />
										</p>
									) : messages.length > 0 || isSubmitted ? (
										<div className="flex w-full flex-col gap-2 px-2 pb-2.5">
											{paginationState.isLoadingMore && (
												<p className="flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
													Loading more messages
													<LoadingDots />
												</p>
											)}
											{messages.length > 0 && (
												<div className="flex flex-col gap-2.5">
													{messages.map((item, index) => {
														if (item.role === 'user') {
															return (
																<SentPrompt
																	key={`user-${item.timestamp}-${index}`}
																	prompt={item.content}
																	images={item.images}
																/>
															)
														}
														if (item.role === 'assistant') {
															const hasInlineCharts = item.content?.includes('[CHART:')
															return (
																<div
																	key={`assistant-${item.messageId || item.timestamp}-${index}`}
																	className="flex flex-col gap-2.5"
																>
																	<MarkdownRenderer
																		content={item.content}
																		citations={item.citations}
																		charts={hasInlineCharts ? item.charts : undefined}
																		chartData={hasInlineCharts ? item.chartData : undefined}
																		inlineChartConfig={
																			hasInlineCharts
																				? {
																						resizeTrigger,
																						saveableChartIds:
																							readOnly || !showDebug ? [] : item.metadata?.saveableChartIds,
																						savedChartIds: item.metadata?.savedChartIds,
																						messageId: item.messageId
																					}
																				: undefined
																		}
																		csvExports={item.csvExports}
																	/>
																	{!hasInlineCharts && item.charts && item.charts.length > 0 && (
																		<ChartRenderer
																			charts={item.charts}
																			chartData={item.chartData || []}
																			resizeTrigger={resizeTrigger}
																			messageId={item.messageId}
																		/>
																	)}
																	{item.inlineSuggestions && <InlineSuggestions text={item.inlineSuggestions} />}
																	<ResponseControls
																		messageId={item.messageId}
																		content={item.content}
																		initialRating={item.userRating}
																		sessionId={sessionId}
																		readOnly={readOnly}
																		charts={item.charts?.map((c: any) => ({ id: c.id, title: c.title }))}
																	/>
																	{!readOnly && item.suggestions && item.suggestions.length > 0 && (
																		<SuggestedActions
																			suggestions={item.suggestions}
																			handleSuggestionClick={handleSuggestionClick}
																			isPending={isPending}
																			isStreaming={isStreaming}
																		/>
																	)}
																	{showDebug && item.metadata && <QueryMetadata metadata={item.metadata} />}
																</div>
															)
														}
														if (item.question) {
															const hasInlineCharts = item.response?.answer?.includes('[CHART:')
															const itemCharts = item.response?.charts || item.charts || []
															const itemChartData = item.response?.chartData || item.chartData
															return (
																<div key={`${item.messageId}-${item.timestamp}`} className="flex flex-col gap-2.5">
																	<SentPrompt prompt={item.question} images={item.images} />
																	<div className="flex flex-col gap-2.5">
																		<MarkdownRenderer
																			content={item.response?.answer || ''}
																			citations={item.response?.citations || item.citations}
																			charts={hasInlineCharts ? itemCharts : undefined}
																			chartData={hasInlineCharts ? itemChartData : undefined}
																			inlineChartConfig={
																				hasInlineCharts
																					? {
																							resizeTrigger,
																							saveableChartIds:
																								readOnly || !showDebug ? [] : item.response?.metadata?.saveableChartIds,
																							savedChartIds: item.response?.metadata?.savedChartIds,
																							messageId: item.messageId
																						}
																					: undefined
																			}
																			csvExports={item.response?.csvExports || item.csvExports}
																		/>
																		{!hasInlineCharts &&
																			((item.response?.charts && item.response.charts.length > 0) ||
																				(item.charts && item.charts.length > 0)) && (
																				<ChartRenderer
																					charts={itemCharts}
																					chartData={itemChartData}
																					resizeTrigger={resizeTrigger}
																					messageId={item.messageId}
																				/>
																			)}
																		{(item.response?.inlineSuggestions || item.inlineSuggestions) && (
																			<InlineSuggestions
																				text={item.response?.inlineSuggestions || item.inlineSuggestions}
																			/>
																		)}
																		<ResponseControls
																			messageId={item.messageId}
																			content={item.response?.answer}
																			initialRating={item.userRating}
																			sessionId={sessionId}
																			readOnly={readOnly}
																			charts={(item.response?.charts || item.charts)?.map((c: any) => ({
																				id: c.id,
																				title: c.title
																			}))}
																		/>
																		{!readOnly &&
																			((item.response?.suggestions && item.response.suggestions.length > 0) ||
																				(item.suggestions && item.suggestions.length > 0)) && (
																				<SuggestedActions
																					suggestions={item.response?.suggestions || item.suggestions || []}
																					handleSuggestionClick={handleSuggestionClick}
																					isPending={isPending}
																					isStreaming={isStreaming}
																				/>
																			)}
																		{showDebug && (item.response?.metadata || item.metadata) && (
																			<QueryMetadata metadata={item.response?.metadata || item.metadata} />
																		)}
																	</div>
																</div>
															)
														}
														return null
													})}
												</div>
											)}
											{(isPending || isStreaming || promptResponse || error) && (
												<div className="flex min-h-[calc(100dvh-272px)] flex-col gap-2.5 lg:min-h-[calc(100dvh-215px)]">
													{prompt && <SentPrompt prompt={prompt} images={pendingImages} />}
													<PromptResponse
														response={
															promptResponse?.response ||
															(streamingSuggestions || streamingCharts || streamingCitations
																? {
																		answer: '',
																		suggestions: streamingSuggestions,
																		charts: streamingCharts,
																		chartData: streamingChartData,
																		citations: streamingCitations
																	}
																: undefined)
														}
														error={error?.message}
														streamingError={streamingError}
														isPending={isPending}
														streamingResponse={streamingResponse}
														isStreaming={isStreaming}
														progressMessage={progressMessage}
														onSuggestionClick={handleSuggestionClick}
														onRetry={handleRetry}
														canRetry={!!lastFailedRequest}
														isGeneratingCharts={isGeneratingCharts}
														isAnalyzingForCharts={isAnalyzingForCharts}
														hasChartError={hasChartError}
														isGeneratingSuggestions={isGeneratingSuggestions}
														expectedChartInfo={expectedChartInfo}
														resizeTrigger={resizeTrigger}
														showMetadata={showDebug}
														readOnly={readOnly}
														inlineChartConfig={{
															resizeTrigger,
															saveableChartIds:
																readOnly || !showDebug ? [] : promptResponse?.response?.metadata?.saveableChartIds,
															savedChartIds: promptResponse?.response?.metadata?.savedChartIds,
															messageId: currentMessageId ?? undefined
														}}
														streamingCsvExports={streamingCsvExports}
														researchState={researchState}
													/>
												</div>
											)}
										</div>
									) : (
										<div className="mt-[100px] flex flex-col items-center justify-center gap-2.5">
											<img
												src="/assets/llamaai/llama-ai.svg"
												alt="LlamaAI"
												className="object-contain"
												width={64}
												height={77}
											/>
											<h1 className="text-center text-2xl font-semibold">What can I help you with?</h1>
										</div>
									)}
								</div>
							</div>
							<div
								className={`pointer-events-none sticky ${readOnly ? 'bottom-10' : 'bottom-32'} z-10 mx-auto -mb-8 transition-opacity duration-200 ${showScrollToBottom ? 'opacity-100' : ''} ${!showScrollToBottom ? 'opacity-0' : ''}`}
							>
								<Tooltip
									content="Scroll to bottom"
									render={
										<button
											onClick={() => {
												if (scrollContainerRef.current) {
													setShowScrollToBottom(false)

													scrollContainerRef.current.scrollTo({
														top: scrollContainerRef.current.scrollHeight,
														behavior: 'smooth'
													})
												}
											}}
										/>
									}
									className="pointer-events-auto mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-(--app-bg) shadow-md hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324]"
								>
									<Icon name="arrow-down" height={16} width={16} />
									<span className="sr-only">Scroll to bottom</span>
								</Tooltip>
							</div>
							<div className="relative mx-auto w-full max-w-3xl pb-2.5">
								{!readOnly && (
									<div className="absolute -top-8 right-0 left-0 h-9 bg-gradient-to-b from-transparent to-[#fefefe] dark:to-[#131516]" />
								)}
								{!readOnly && (
									<PromptInput
										handleSubmit={handleSubmit}
										promptInputRef={promptInputRef}
										isPending={isPending}
										handleStopRequest={handleStopRequest}
										isStreaming={isStreaming}
										restoreRequest={restoreRequest}
										placeholder="Reply to LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
										isResearchMode={isResearchMode}
										setIsResearchMode={setIsResearchMode}
										researchUsage={researchUsage}
										droppedFiles={droppedFiles}
										clearDroppedFiles={clearDroppedFiles}
										externalDragging={isDraggingOnChat}
									/>
								)}
							</div>
						</>
					)}
				</div>
			</div>
			{showRateLimitModal && rateLimitDetails && (
				<ResearchLimitModal
					isOpen={showRateLimitModal}
					onClose={() => setShowRateLimitModal(false)}
					period={rateLimitDetails.period}
					limit={rateLimitDetails.limit}
					resetTime={rateLimitDetails.resetTime}
				/>
			)}
		</Layout>
	)
}

const SentPrompt = memo(function SentPrompt({
	prompt,
	images
}: {
	prompt: string
	images?: Array<{ url: string; mimeType: string; filename?: string }>
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)

	return (
		<div className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
			{images && images.length > 0 && (
				<div className="mb-2.5 flex flex-wrap gap-3">
					{images.map((img) => (
						<button
							key={`sent-prompt-image-${img.url}`}
							type="button"
							onClick={() => setPreviewImage(img.url)}
							className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg"
						>
							<img src={img.url} alt={img.filename || 'Uploaded image'} className="h-full w-full object-cover" />
						</button>
					))}
				</div>
			)}
			<p>{prompt}</p>
			<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
		</div>
	)
})

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
