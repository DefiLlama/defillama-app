import { RefObject, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingDots, LoadingSpinner } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { handleSimpleFetchResponse } from '~/utils/async'
import { ChartRenderer } from './components/ChartRenderer'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { InlineSuggestions } from './components/InlineSuggestions'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { RecommendedPrompts } from './components/RecommendedPrompts'
import { useChatHistory } from './hooks/useChatHistory'
import { debounce, throttle } from './utils/scrollUtils'

class StreamingContent {
	private content: string = ''

	addChunk(chunk: string): string {
		this.content += chunk
		return this.content
	}

	getContent(): string {
		return this.content
	}

	reset(): void {
		this.content = ''
	}
}

async function fetchPromptResponse({
	prompt,
	userQuestion,
	onProgress,
	abortSignal,
	sessionId,
	suggestionContext,
	mode,
	authorizedFetch
}: {
	prompt?: string
	userQuestion: string
	onProgress?: (data: {
		type:
			| 'token'
			| 'progress'
			| 'session'
			| 'inline_suggestions'
			| 'suggestions'
			| 'charts'
			| 'citations'
			| 'error'
			| 'title'
			| 'message_id'
		content: string
		stage?: string
		sessionId?: string
		inlineSuggestions?: string
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
		citations?: string[]
		title?: string
		messageId?: string
	}) => void
	abortSignal?: AbortSignal
	sessionId?: string | null
	suggestionContext?: any
	mode: 'auto' | 'sql_only'
	authorizedFetch: any
}) {
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

	try {
		const requestBody: any = {
			message: userQuestion,
			stream: true,
			mode: mode
		}

		if (sessionId) {
			requestBody.sessionId = sessionId
		} else {
			requestBody.createNewSession = true
		}

		if (suggestionContext) {
			requestBody.suggestionContext = suggestionContext
		}

		const response = await authorizedFetch(`${MCP_SERVER}/chatbot-agent`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody),
			signal: abortSignal
		})
			.then(handleSimpleFetchResponse)
			.catch((err) => {
				throw new Error(err.message)
			})

		if (!response.ok) {
			throw new Error(`HTTP error status: ${response.status}`)
		}

		if (!response.body) {
			throw new Error('No response body')
		}

		reader = response.body.getReader()
		const decoder = new TextDecoder()
		let fullResponse = ''
		let metadata = null
		let inlineSuggestions = null
		let suggestions = null
		let charts = null
		let chartData = null
		let citations = null
		let lineBuffer = ''

		while (true) {
			if (abortSignal?.aborted) {
				throw new Error('Request aborted')
			}

			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })

			lineBuffer += chunk

			const lines = lineBuffer.split('\n')

			if (lines.length > 0 && !chunk.endsWith('\n')) {
				lineBuffer = lines.pop() || ''
			} else {
				lineBuffer = ''
			}

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const jsonStr = line.slice(6)
					try {
						const data = JSON.parse(jsonStr)

						if (data.type === 'token') {
							fullResponse += data.content
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'token', content: data.content })
							}
						} else if (data.type === 'message_id') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'message_id', content: data.content, messageId: data.messageId })
							}
						} else if (data.type === 'progress') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'progress', content: data.content, stage: data.stage })
							}
						} else if (data.type === 'session') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'session', content: '', sessionId: data.sessionId })
							}
						} else if (data.type === 'metadata') {
							metadata = data.metadata
						} else if (data.type === 'inline_suggestions') {
							inlineSuggestions = data.content
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'inline_suggestions', content: data.content, inlineSuggestions: data.content })
							}
						} else if (data.type === 'suggestions') {
							suggestions = data.suggestions
						} else if (data.type === 'charts') {
							charts = data.charts
							chartData = data.chartData
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'charts',
									content: `Generated ${data.charts?.length || 0} chart(s)`,
									charts: data.charts,
									chartData: data.chartData
								})
							}
						} else if (data.type === 'citations') {
							citations = data.citations
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'citations',
									content: '',
									citations: data.citations
								})
							}
						} else if (data.type === 'error') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'error', content: data.content })
							}
						} else if (data.type === 'title') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({ type: 'title', content: data.content, title: data.content })
							}
						}
					} catch (e) {
						console.log('SSE JSON parse error:', e)
					}
				}
			}
		}

		return {
			prompt: prompt ?? userQuestion,
			response: {
				answer: fullResponse,
				metadata,
				inlineSuggestions,
				suggestions,
				charts,
				chartData,
				citations
			}
		}
	} catch (error) {
		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch (releaseError) {}
		}
		throw new Error(error instanceof Error ? error.message : 'Failed to fetch prompt response')
	} finally {
		if (reader && !reader.closed) {
			try {
				reader.releaseLock()
			} catch (releaseError) {}
		}
	}
}

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	conversationHistory: Array<{
		question: string
		response: {
			answer: string
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[]
			citations?: string[]
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
		isRestoringSession
	} = useChatHistory()

	const [sessionId, setSessionId] = useState<string | null>(null)
	const sessionIdRef = useRef<string | null>(null)
	const userRef = useRef<any>(null)
	const newlyCreatedSessionsRef = useRef<Set<string>>(new Set())

	const [conversationHistory, setConversationHistory] = useState<
		Array<{
			question: string
			response: {
				answer: string
				metadata?: any
				suggestions?: any[]
				charts?: any[]
				chartData?: any[]
				citations?: string[]
				inlineSuggestions?: string
			}
			timestamp: number
			messageId?: string
			userRating?: 'good' | 'bad' | null
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
	const [progressStage, setProgressStage] = useState('')
	const [streamingSuggestions, setStreamingSuggestions] = useState<any[] | null>(null)
	const [streamingCharts, setStreamingCharts] = useState<any[] | null>(null)
	const [streamingChartData, setStreamingChartData] = useState<any[] | null>(null)
	const [streamingCitations, setStreamingCitations] = useState<string[] | null>(null)
	const [isGeneratingCharts, setIsGeneratingCharts] = useState(false)
	const [isAnalyzingForCharts, setIsAnalyzingForCharts] = useState(false)
	const [hasChartError, setHasChartError] = useState(false)
	const [expectedChartInfo, setExpectedChartInfo] = useState<{ count?: number; types?: string[] } | null>(null)
	const [resizeTrigger, setResizeTrigger] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [prompt, setPrompt] = useState('')

	const abortControllerRef = useRef<AbortController | null>(null)
	const streamingContentRef = useRef<StreamingContent>(new StreamingContent())
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
		userRef.current = user
	}, [user])

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
			setConversationHistory(sharedSession.conversationHistory)
			setSessionId(sharedSession.session.sessionId)
		}
	}, [sharedSession, resetScrollState])

	useEffect(() => {
		if (
			sessionId &&
			user &&
			!sharedSession &&
			!readOnly &&
			hasRestoredSession !== sessionId &&
			!newlyCreatedSessionsRef.current.has(sessionId)
		) {
			resetScrollState()
			setHasRestoredSession(sessionId)
			restoreSession(sessionId)
				.then((result) => {
					setConversationHistory(result.conversationHistory)
					setPaginationState(result.pagination)
				})
				.catch((error) => {
					console.log('Failed to restore session:', error)
				})
		}
	}, [sessionId, user, sharedSession, readOnly, hasRestoredSession, restoreSession, resetScrollState])

	const parseChartInfo = (message: string): { count?: number; types?: string[] } => {
		const info: { count?: number; types?: string[] } = {}

		const patterns = [
			/(?:generating|creating|building|analyzing)\s+([^.]+?)\s+charts?/i,
			/(?:will create|planning)\s+([^.]+?)\s+(?:chart|visualization)/i,
			/(?:identified|detected)\s+([^.]+?)\s+chart\s+(?:opportunity|type)/i
		]

		for (const pattern of patterns) {
			const typesMatch = message.match(pattern)
			if (typesMatch) {
				const typesStr = typesMatch[1]
				const extractedTypes = typesStr
					.split(/[,\s]+/)
					.filter((type) =>
						['line', 'bar', 'area', 'combo', 'pie', 'time-series', 'timeseries'].includes(type.toLowerCase())
					)
					.map((type) => type.toLowerCase().replace('time-series', 'line').replace('timeseries', 'line'))

				if (extractedTypes.length > 0) {
					info.types = extractedTypes
					break
				}
			}
		}

		const countMatch = message.match(
			/(?:generated?|creating?|building|will create)\s*(\d+)\s+(?:charts?|visualizations?)/i
		)
		if (countMatch) {
			info.count = parseInt(countMatch[1], 10)
		}

		return info
	}

	const {
		data: promptResponse,
		mutate: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: ({ userQuestion, suggestionContext }: { userQuestion: string; suggestionContext?: any }) => {
			let currentSessionId = sessionId

			if (!currentSessionId && user) {
				currentSessionId = createFakeSession()
				newlyCreatedSessionsRef.current.add(currentSessionId)
				setSessionId(currentSessionId)
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			abortControllerRef.current = new AbortController()

			setIsStreaming(true)
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
			setExpectedChartInfo(null)

			streamingContentRef.current.reset()

			return fetchPromptResponse({
				userQuestion,
				sessionId: currentSessionId,
				suggestionContext,
				mode: 'auto',
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
						}
					} else if (data.type === 'session' && data.sessionId) {
						newlyCreatedSessionsRef.current.add(data.sessionId)
						setSessionId(data.sessionId)
						sessionIdRef.current = data.sessionId
					} else if (data.type === 'suggestions') {
						setStreamingSuggestions(data.suggestions)
					} else if (data.type === 'charts') {
						setStreamingCharts(data.charts)
						setStreamingChartData(data.chartData)
						setIsGeneratingCharts(false)
						setIsAnalyzingForCharts(false)
					} else if (data.type === 'citations') {
						setStreamingCitations(data.citations)
					} else if (data.type === 'error') {
						setStreamingError(data.content)
					} else if (data.type === 'title') {
						updateSessionTitle({ sessionId: currentSessionId, title: data.title || data.content })
					}
				},
				abortSignal: abortControllerRef.current.signal
			})
		},
		onMutate: ({ userQuestion, suggestionContext }: { userQuestion: string; suggestionContext?: any }) => {},
		onSuccess: (data, variables) => {
			setIsStreaming(false)
			abortControllerRef.current = null

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			setConversationHistory((prev) => [
				...prev,
				{
					question: variables.userQuestion,
					response: {
						answer: data?.response?.answer || finalContent,
						metadata: data?.response?.metadata,
						inlineSuggestions: data?.response?.inlineSuggestions,
						suggestions: data?.response?.suggestions,
						charts: data?.response?.charts,
						chartData: data?.response?.chartData,
						citations: data?.response?.citations
					},
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])

			setPrompt('')
			resetPrompt()
			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		},
		onError: (error, variables) => {
			setIsStreaming(false)
			abortControllerRef.current = null

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			const wasUserStopped = error?.message === 'Request aborted'

			if (wasUserStopped && finalContent.trim()) {
				setConversationHistory((prev) => [
					...prev,
					{
						question: variables.userQuestion,
						response: {
							answer: finalContent,
							metadata: { stopped: true, partial: true },
							suggestions: streamingSuggestions,
							charts: streamingCharts,
							chartData: streamingChartData
						},
						messageId: currentMessageId,
						timestamp: Date.now()
					}
				])

				setStreamingResponse('')
				setStreamingSuggestions(null)
				setStreamingCharts(null)
				setStreamingChartData(null)
				setStreamingCitations(null)
			} else if (!wasUserStopped) {
				console.log('Request failed:', error)
			}

			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		}
	})

	const handleStopRequest = async () => {
		if (!sessionId || !isStreaming) return

		const finalContent = streamingContentRef.current.getContent()

		try {
			const response = await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionId: sessionId
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

		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		if (finalContent.trim()) {
			setConversationHistory((prev) => [
				...prev,
				{
					question: prompt,
					response: {
						answer: finalContent,
						metadata: { stopped: true, partial: true },
						suggestions: streamingSuggestions,
						charts: streamingCharts,
						chartData: streamingChartData,
						citations: streamingCitations
					},
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])
		}

		setIsStreaming(false)
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
	}

	const handleSubmit = (prompt: string) => {
		const finalPrompt = prompt.trim()
		setPrompt(finalPrompt)
		shouldAutoScrollRef.current = true

		if (sessionId) {
			moveSessionToTop(sessionId)
		}

		submitPrompt({ userQuestion: finalPrompt })
	}

	const handleSubmitWithSuggestion = (prompt: string, suggestion: any) => {
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
	}

	const router = useRouter()

	const handleNewChat = async () => {
		if (initialSessionId) {
			router.push('/ai', undefined, { shallow: true })
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
		setExpectedChartInfo(null)
		setConversationHistory([])
		streamingContentRef.current.reset()
		setResizeTrigger((prev) => prev + 1)
		promptInputRef.current?.focus()
	}

	const handleSessionSelect = async (
		selectedSessionId: string,
		data: { conversationHistory: any[]; pagination?: any }
	) => {
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
		setConversationHistory(data.conversationHistory)
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
			setConversationHistory((prev) => [...result.conversationHistory, ...prev])
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

	const handleSuggestionClick = (suggestion: any) => {
		let promptText = ''

		promptText = suggestion.title || suggestion.description

		handleSubmitWithSuggestion(promptText, suggestion)
	}

	const handleSidebarToggle = () => {
		toggleSidebar()
		setShouldAnimateSidebar(true)
		setResizeTrigger((prev) => prev + 1)
	}

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
		if (shouldAutoScrollRef.current && scrollContainerRef.current && conversationHistory.length > 0) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current && shouldAutoScrollRef.current) {
					scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
				}
			})
		}
	}, [conversationHistory.length])

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
			<div className="relative isolate flex max-h-[calc(100dvh-72px)] flex-1 flex-nowrap">
				{!readOnly &&
					(sidebarVisible ? (
						<ChatHistorySidebar
							handleSidebarToggle={handleSidebarToggle}
							currentSessionId={sessionId}
							onSessionSelect={handleSessionSelect}
							onNewChat={handleNewChat}
							shouldAnimate={shouldAnimateSidebar}
						/>
					) : (
						<ChatControls handleSidebarToggle={handleSidebarToggle} handleNewChat={handleNewChat} />
					))}
				<div
					className={`relative isolate flex flex-1 flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.22s_ease-out]' : ''}`}
				>
					{conversationHistory.length === 0 &&
					prompt.length === 0 &&
					!isRestoringSession &&
					!isPending &&
					!isStreaming ? (
						initialSessionId ? (
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
										Failed to restore session,{' '}
										<button onClick={handleNewChat} className="text-(--link-text) underline">
											Start a new chat
										</button>
									</p>
								</div>
							</div>
						) : (
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
								<div className="mt-[100px] flex flex-col items-center justify-center gap-2.5">
									<img src="/icons/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
									<h1 className="text-2xl font-semibold">What can I help you with ?</h1>
								</div>
								{!readOnly && (
									<>
										<PromptInput
											handleSubmit={handleSubmit}
											promptInputRef={promptInputRef}
											isPending={isPending}
											handleStopRequest={handleStopRequest}
											isStreaming={isStreaming}
										/>
										<RecommendedPrompts setPrompt={setPrompt} submitPrompt={submitPrompt} isPending={isPending} />
									</>
								)}
							</div>
						)
					) : (
						<>
							<div ref={scrollContainerRef} className="thin-scrollbar relative flex-1 overflow-y-auto p-2.5">
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									{isRestoringSession && conversationHistory.length === 0 ? (
										<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
											Loading conversation
											<LoadingDots />
										</p>
									) : conversationHistory.length > 0 || isSubmitted ? (
										<div className="flex w-full flex-col gap-2 px-2 pb-5">
											{paginationState.isLoadingMore && (
												<p className="flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
													Loading more messages
													<LoadingDots />
												</p>
											)}
											<div className="flex flex-col gap-2.5">
												{conversationHistory.map((item) => (
													<div
														key={`${item.question}-${item.timestamp}`}
														className={`flex flex-col gap-2.5 ${isPending || isStreaming || promptResponse || error ? '' : 'last:min-h-[calc(100dvh-260px)]'}`}
													>
														<SentPrompt prompt={item.question} />
														<div className="flex flex-col gap-2.5">
															<MarkdownRenderer content={item.response.answer} citations={item.response.citations} />
															{item.response.charts && item.response.charts.length > 0 && (
																<ChartRenderer
																	charts={item.response.charts}
																	chartData={item.response.chartData || []}
																	resizeTrigger={resizeTrigger}
																/>
															)}
															{item.response.inlineSuggestions && (
																<InlineSuggestions text={item.response.inlineSuggestions} />
															)}
															<ResponseControls
																messageId={item.messageId}
																content={item.response.answer}
																initialRating={item.userRating}
																sessionId={sessionId}
															/>
															{!readOnly && item.response.suggestions && item.response.suggestions.length > 0 && (
																<SuggestedActions
																	suggestions={item.response.suggestions}
																	handleSuggestionClick={handleSuggestionClick}
																	isPending={isPending}
																	isStreaming={isStreaming}
																/>
															)}
															{showDebug && item.response.metadata && (
																<QueryMetadata metadata={item.response.metadata} />
															)}
														</div>
													</div>
												))}
											</div>
											{(isPending || isStreaming || promptResponse || error) && (
												<div className="flex min-h-[calc(100dvh-260px)] flex-col gap-2.5">
													{prompt && <SentPrompt prompt={prompt} />}
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
														progressStage={progressStage}
														onSuggestionClick={handleSuggestionClick}
														isGeneratingCharts={isGeneratingCharts}
														isAnalyzingForCharts={isAnalyzingForCharts}
														hasChartError={hasChartError}
														expectedChartInfo={expectedChartInfo}
														resizeTrigger={resizeTrigger}
														showMetadata={showDebug}
														readOnly={readOnly}
													/>
												</div>
											)}
										</div>
									) : (
										<div className="mt-[100px] flex flex-col items-center justify-center gap-2.5">
											<img src="/icons/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
											<h1 className="text-2xl font-semibold">What can I help you with ?</h1>
										</div>
									)}
								</div>
							</div>
							<div
								className={`pointer-events-none sticky bottom-26.5 z-10 mx-auto -mb-8 transition-opacity duration-200 ${showScrollToBottom ? 'opacity-100' : ''} ${!showScrollToBottom ? 'opacity-0' : ''}`}
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
									/>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</Layout>
	)
}

const PromptInput = ({
	handleSubmit,
	promptInputRef,
	isPending,
	handleStopRequest,
	isStreaming
}: {
	handleSubmit: (prompt: string) => void
	promptInputRef: RefObject<HTMLTextAreaElement>
	isPending: boolean
	handleStopRequest?: () => void
	isStreaming?: boolean
}) => {
	const [value, setValue] = useState('')

	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey && !isStreaming) {
			event.preventDefault()
			handleSubmit(value)
			setValue('')
		}
	}

	const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setValue(event.target.value)
	}

	return (
		<>
			<form
				className="relative w-full"
				onSubmit={(e) => {
					e.preventDefault()
					handleSubmit(value)
					setValue('')
				}}
			>
				<textarea
					placeholder="Ask LlamaAI..."
					value={value}
					onChange={onChange}
					onKeyDown={onKeyDown}
					name="prompt"
					className="block min-h-[48px] w-full rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 caret-black max-sm:text-base sm:min-h-[72px] dark:border-[#222324] dark:caret-white"
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					disabled={isPending && !isStreaming}
					autoFocus
					ref={promptInputRef}
					maxLength={2000}
				/>
				{isStreaming ? (
					<Tooltip
						content="Stop"
						render={<button onClick={handleStopRequest} />}
						className="group absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center rounded-sm bg-(--old-blue)/12 hover:bg-(--old-blue) sm:h-7 sm:w-7"
					>
						<span className="block h-2 w-2 bg-(--old-blue) group-hover:bg-white group-focus-visible:bg-white sm:h-2.5 sm:w-2.5" />
						<span className="sr-only">Stop</span>
					</Tooltip>
				) : (
					<button
						type="submit"
						className="absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80 disabled:opacity-50 sm:h-7 sm:w-7"
						disabled={isPending || isStreaming || !value.trim()}
					>
						<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
						<span className="sr-only">Submit prompt</span>
					</button>
				)}
			</form>
		</>
	)
}

const PromptResponse = ({
	response,
	error,
	streamingError,
	isPending,
	streamingResponse,
	isStreaming,
	progressMessage,
	progressStage,
	onSuggestionClick,
	isGeneratingCharts = false,
	isAnalyzingForCharts = false,
	hasChartError = false,
	expectedChartInfo,
	resizeTrigger = 0,
	showMetadata = false,
	readOnly = false
}: {
	response?: {
		answer: string
		metadata?: any
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
		citations?: string[]
		inlineSuggestions?: string
	}
	error?: string
	streamingError?: string
	isPending: boolean
	streamingResponse?: string
	isStreaming?: boolean
	progressMessage?: string
	progressStage?: string
	onSuggestionClick?: (suggestion: any) => void
	isGeneratingCharts?: boolean
	isAnalyzingForCharts?: boolean
	hasChartError?: boolean
	expectedChartInfo?: { count?: number; types?: string[] } | null
	resizeTrigger?: number
	showMetadata?: boolean
	readOnly?: boolean
}) => {
	if (error) {
		return <p className="text-(--error)">{error}</p>
	}
	if (isPending || isStreaming) {
		return (
			<>
				{streamingError ? (
					<div className="text-(--error)">{streamingError}</div>
				) : isStreaming && streamingResponse ? (
					<MarkdownRenderer content={streamingResponse} citations={response?.citations} />
				) : isStreaming && progressMessage ? (
					<p
						className={`flex items-center justify-start gap-2 py-2 ${
							progressMessage.includes('encountered an issue') ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'
						}`}
					>
						{progressMessage.includes('encountered an issue') ? (
							<Icon name="alert-triangle" height={16} width={16} className="text-(--error)" />
						) : (
							<FadingLoader />
						)}
						<span className="flex flex-wrap items-center gap-1">
							{progressMessage}
							{progressStage && <span>({progressStage})</span>}
						</span>
					</p>
				) : (
					<p className="flex min-h-9 items-center gap-1 py-2 text-[#666] dark:text-[#919296]">
						Thinking
						<LoadingDots />
					</p>
				)}
				{(isAnalyzingForCharts || isGeneratingCharts || hasChartError) && (
					<ChartRenderer
						charts={[]}
						chartData={[]}
						isLoading={isAnalyzingForCharts || isGeneratingCharts}
						isAnalyzing={isAnalyzingForCharts}
						hasError={hasChartError}
						expectedChartCount={expectedChartInfo?.count}
						chartTypes={expectedChartInfo?.types}
						resizeTrigger={resizeTrigger}
					/>
				)}
			</>
		)
	}

	return (
		<>
			{response?.charts && response.charts.length > 0 && (
				<ChartRenderer
					charts={response.charts}
					chartData={response.chartData || []}
					isLoading={false}
					isAnalyzing={false}
					expectedChartCount={expectedChartInfo?.count}
					chartTypes={expectedChartInfo?.types}
					resizeTrigger={resizeTrigger}
				/>
			)}
			{response?.inlineSuggestions && <InlineSuggestions text={response.inlineSuggestions} />}
			{!readOnly && response?.suggestions && response.suggestions.length > 0 && (
				<SuggestedActions
					suggestions={response.suggestions}
					handleSuggestionClick={onSuggestionClick}
					isPending={isPending}
					isStreaming={isStreaming}
				/>
			)}
			{showMetadata && response?.metadata && <QueryMetadata metadata={response.metadata} />}
		</>
	)
}

const FadingLoader = () => {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
			<style jsx>{`
				@keyframes colorPulse {
					0%,
					100% {
						stroke: #1f67d2;
						opacity: 0.3;
					}
					50% {
						stroke: #1f67d2;
						opacity: 1;
					}
				}
				.loading-line {
					animation: colorPulse 1.5s ease-in-out infinite;
				}
				.loading-line:nth-child(1) {
					animation-delay: 0s;
				}
				.loading-line:nth-child(2) {
					animation-delay: 0.2s;
				}
				.loading-line:nth-child(3) {
					animation-delay: 0.4s;
				}
				.loading-line:nth-child(4) {
					animation-delay: 0.6s;
				}
				.loading-line:nth-child(5) {
					animation-delay: 0.8s;
				}
				.loading-line:nth-child(6) {
					animation-delay: 1s;
				}
				.loading-line:nth-child(7) {
					animation-delay: 1.2s;
				}
				.loading-line:nth-child(8) {
					animation-delay: 1.4s;
				}
			`}</style>
			<path
				d="M12 2V6"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M16.2 7.80002L19.1 4.90002"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M18 12H22"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M16.2 16.2L19.1 19.1"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M12 18V22"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M4.8999 19.1L7.7999 16.2"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M2 12H6"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
			<path
				d="M4.8999 4.90002L7.7999 7.80002"
				stroke="#1f67d2"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="loading-line"
			/>
		</svg>
	)
}

const SuggestedActions = ({
	suggestions,
	handleSuggestionClick,
	isPending,
	isStreaming
}: {
	suggestions: any[]
	handleSuggestionClick: (suggestion: any) => void
	isPending: boolean
	isStreaming: boolean
}) => {
	return (
		<div className="mt-4 grid gap-2">
			<h1 className="text-[#666] dark:text-[#919296]">Suggested actions:</h1>
			<div className="grid gap-2">
				{suggestions.map((suggestion) => (
					<button
						key={`${suggestion.title}-${suggestion.description}`}
						onClick={() => handleSuggestionClick(suggestion)}
						disabled={isPending || isStreaming}
						className={`group flex items-center justify-between gap-3 rounded-lg border border-[#e6e6e6] p-2 text-left dark:border-[#222324] ${
							isPending || isStreaming
								? 'cursor-not-allowed opacity-60'
								: 'hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12'
						}`}
					>
						<span className="flex flex-1 flex-col items-start gap-1">
							<span>{suggestion.title}</span>
							{suggestion.description ? (
								<span className="text-[#666] dark:text-[#919296]">{suggestion.description}</span>
							) : null}
						</span>
						<Icon name="arrow-right" height={16} width={16} className="shrink-0" />
					</button>
				))}
			</div>
		</div>
	)
}

const QueryMetadata = ({ metadata }: { metadata: any }) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		if (!metadata) return
		try {
			await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log('Failed to copy content:', error)
		}
	}

	return (
		<details className="group rounded-lg border border-[#e6e6e6] dark:border-[#222324]">
			<summary className="flex flex-wrap items-center justify-end gap-2 p-2 text-[#666] group-open:text-black group-hover:bg-[#f7f7f7] group-hover:text-black dark:text-[#919296] dark:group-open:text-white dark:group-hover:bg-[#222324] dark:group-hover:text-white">
				<span className="mr-auto">Query Metadata</span>
				<Tooltip content="Copy" render={<button onClick={handleCopy} />} className="hidden group-open:block">
					{copied ? (
						<Icon name="check-circle" height={14} width={14} />
					) : (
						<Icon name="clipboard" height={14} width={14} />
					)}
					<span className="sr-only">Copy</span>
				</Tooltip>
				<span className="flex items-center gap-1">
					<Icon name="chevron-down" height={14} width={14} className="transition-transform group-open:rotate-180" />
					<span className="group-open:hidden">Show</span>
					<span className="hidden group-open:block">Hide</span>
				</span>
			</summary>
			<pre className="overflow-auto border-t border-[#e6e6e6] p-2 text-xs select-text dark:border-[#222324]">
				{JSON.stringify(metadata, null, 2)}
			</pre>
		</details>
	)
}

const SentPrompt = ({ prompt }: { prompt: string }) => {
	return (
		<p className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
			{prompt}
		</p>
	)
}

const ResponseControls = ({
	messageId,
	content,
	initialRating,
	sessionId
}: {
	messageId?: string
	content?: string
	initialRating?: 'good' | 'bad' | null
	sessionId?: string | null
}) => {
	const [copied, setCopied] = useState(false)
	const [showFeedback, setShowFeedback] = useState(false)
	const [showShareModal, setShowShareModal] = useState(false)
	const { authorizedFetch } = useAuthContext()

	const {
		data: shareData,
		mutate: shareSession,
		isPending: isSharing
	} = useMutation({
		mutationFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/sessions/${sessionId}/share`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forcePublic: true })
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return res
		},
		onSuccess: (data) => {
			if (data.shareToken) {
				const shareLink = `${window.location.origin}/ai/shared/${data.shareToken}`
				navigator.clipboard.writeText(shareLink)
				setShowShareModal(true)
			}
		},
		onError: (err) => {
			toast.error('Failed to fetch session id')
			console.log(err)
		}
	})

	const {
		data: sessionRatingAsGood,
		mutate: rateAsGood,
		isPending: isRatingAsGood
	} = useMutation({
		mutationFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating: 'good' })
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return res
		},
		onSuccess: () => {
			setShowFeedback(true)
		},
		onError: (err) => {
			toast.error('Failed to rate as good')
			console.log(err)
		}
	})

	const {
		data: sessionRatingAsBad,
		mutate: rateAsBad,
		isPending: isRatingAsBad
	} = useMutation({
		mutationFn: async () => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating: 'bad' })
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return res
		},
		onSuccess: () => {
			setShowFeedback(true)
		},
		onError: (err) => {
			toast.error('Failed to rate as good')
			console.log(err)
		}
	})

	const isRatedAsGood = initialRating === 'good' || sessionRatingAsGood?.rating === 'good'
	const isRatedAsBad = initialRating === 'bad' || sessionRatingAsBad?.rating === 'bad'
	const lastRating = isRatedAsGood ? 'good' : isRatedAsBad ? 'bad' : null

	const handleCopy = async () => {
		if (!content) return
		try {
			await navigator.clipboard.writeText(content)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log('Failed to copy content:', error)
		}
	}

	if (!messageId) return null

	return (
		<>
			<div className="-my-0.5 flex items-center justify-end gap-1">
				{content && (
					<Tooltip
						content={copied ? 'Copied' : 'Copy'}
						render={<button onClick={handleCopy} />}
						className="rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white"
					>
						{copied ? (
							<Icon name="check-circle" height={14} width={14} />
						) : (
							<Icon name="clipboard" height={14} width={14} />
						)}
					</Tooltip>
				)}
				<Tooltip
					content={isRatedAsGood ? 'Rated as good' : 'Rate as good'}
					render={
						<button onClick={() => rateAsGood(undefined)} disabled={isRatingAsGood || showFeedback || !!lastRating} />
					}
					className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsGood ? 'text-(--success)' : 'text-[#666] dark:text-[#919296]'}`}
				>
					{isRatingAsGood ? <LoadingSpinner size={14} /> : <Icon name="thumbs-up" height={14} width={14} />}
					<span className="sr-only">Thumbs Up</span>
				</Tooltip>
				<Tooltip
					content={isRatedAsBad ? 'Rated as bad' : 'Rate as bad'}
					render={
						<button onClick={() => rateAsBad(undefined)} disabled={isRatingAsBad || showFeedback || !!lastRating} />
					}
					className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsBad ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'}`}
				>
					{isRatingAsBad ? <LoadingSpinner size={14} /> : <Icon name="thumbs-down" height={14} width={14} />}
					<span className="sr-only">Thumbs Down</span>
				</Tooltip>
				{sessionId && (
					<Tooltip
						content="Share"
						render={<button onClick={() => shareSession()} disabled={isSharing || showShareModal} />}
						className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
					>
						{isSharing ? <LoadingSpinner size={14} /> : <Icon name="share" height={14} width={14} />}
						<span className="sr-only">Share</span>
					</Tooltip>
				)}
				<Tooltip
					content="Provide Feedback"
					render={<button onClick={() => setShowFeedback(true)} disabled={showFeedback} />}
					className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
				>
					<Icon name="message-square-warning" height={14} width={14} />
					<span className="sr-only">Provide Feedback</span>
				</Tooltip>
			</div>
			<Ariakit.DialogProvider open={showFeedback} setOpen={setShowFeedback}>
				<Ariakit.Dialog
					className="max-sm:drawer dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl sm:max-w-md"
					unmountOnHide
					portal
					hideOnInteractOutside
				>
					<div className="mb-4 flex items-center justify-between">
						<Ariakit.DialogHeading className="text-lg font-semibold">Provide Feedback</Ariakit.DialogHeading>
						<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</div>
					<FeedbackForm messageId={messageId} initialRating={lastRating} setShowFeedback={setShowFeedback} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
			<Ariakit.DialogProvider open={showShareModal} setOpen={setShowShareModal}>
				<Ariakit.Dialog
					className="max-sm:drawer dialog w-full gap-0 border border-(--cards-border) bg-(--cards-bg) p-4 shadow-2xl sm:max-w-md"
					unmountOnHide
					portal
					hideOnInteractOutside
				>
					<div className="mb-4 flex items-center justify-between">
						<Ariakit.DialogHeading className="text-lg font-semibold">Share Conversation</Ariakit.DialogHeading>
						<Ariakit.DialogDismiss className="-m-2 rounded p-2 hover:bg-[#e6e6e6] dark:hover:bg-[#222324]">
							<Icon name="x" height={16} width={16} />
						</Ariakit.DialogDismiss>
					</div>
					<ShareModalContent shareData={shareData} />
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
		</>
	)
}

const FeedbackForm = ({
	messageId,
	initialRating,
	setShowFeedback
}: {
	messageId?: string
	initialRating?: 'good' | 'bad' | null
	setShowFeedback: (show: boolean) => void
}) => {
	const { authorizedFetch } = useAuthContext()
	const { mutate: submitFeedback, isPending: isSubmittingFeedback } = useMutation({
		mutationFn: async (feedback?: string) => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating: initialRating, feedback })
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return res
		},
		onSuccess: () => {
			setShowFeedback(false)
		}
	})

	const [feedbackText, setFeedbackText] = useState('')
	const finalFeedbackText = useDeferredValue(feedbackText)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				const form = e.target as HTMLFormElement
				submitFeedback(form.feedback?.value?.trim())
			}}
			className="flex flex-col gap-4"
		>
			<label className="flex flex-col gap-2">
				<span className="text-[#666] dark:text-[#919296]">Help us improve! Any additional feedback? (optional)</span>
				<textarea
					name="feedback"
					placeholder="Share your thoughts..."
					className="w-full rounded border border-[#e6e6e6] bg-(--app-bg) p-3 dark:border-[#222324]"
					rows={3}
					maxLength={500}
					disabled={isSubmittingFeedback}
					onChange={(e) => setFeedbackText(e.target.value)}
				/>
			</label>
			<div className="flex items-center justify-between">
				<span className="text-xs text-[#666] dark:text-[#919296]">{finalFeedbackText.length}/500</span>
				<div className="flex gap-3">
					<Ariakit.DialogDismiss
						disabled={isSubmittingFeedback}
						className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] disabled:opacity-50 dark:text-[#919296] dark:hover:bg-[#222324]"
					>
						Skip
					</Ariakit.DialogDismiss>
					<button
						type="submit"
						disabled={isSubmittingFeedback}
						className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
					>
						{isSubmittingFeedback ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</div>
		</form>
	)
}

const ShareModalContent = ({ shareData }: { shareData?: { isPublic: boolean; shareToken?: string } }) => {
	const [copied, setCopied] = useState(false)
	const shareLink = shareData?.shareToken ? `${window.location.origin}/ai/shared/${shareData.shareToken}` : ''

	const handleCopy = async () => {
		if (!shareLink) return
		try {
			await navigator.clipboard.writeText(shareLink)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log(error)
			toast.error('Failed to copy link')
		}
	}

	const handleShareToX = () => {
		const text = encodeURIComponent('Check out this conversation from LlamaAI')
		const url = encodeURIComponent(shareLink)
		window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank')
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="text-sm text-[#666] dark:text-[#919296]">
				Your conversation is now public. Anyone with the link can view it.
			</p>
			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#666] dark:text-[#919296]">Share Link</label>
				<div className="flex gap-2">
					<input
						type="text"
						value={shareLink}
						readOnly
						className="flex-1 rounded border border-[#e6e6e6] bg-(--app-bg) px-3 py-2 text-sm dark:border-[#222324]"
					/>
					<button
						onClick={handleCopy}
						className="rounded border border-[#e6e6e6] px-3 py-2 text-sm hover:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324]"
					>
						{copied ? <Icon name="check-circle" height={16} width={16} /> : <Icon name="copy" height={16} width={16} />}
					</button>
				</div>
			</div>
			<div className="flex items-center justify-end gap-3">
				<Ariakit.DialogDismiss className="rounded px-3 py-2 text-xs text-[#666] hover:bg-[#e6e6e6] dark:text-[#919296] dark:hover:bg-[#222324]">
					Close
				</Ariakit.DialogDismiss>
				<button
					onClick={handleShareToX}
					className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90"
				>
					Share to X
				</button>
			</div>
		</div>
	)
}

const ChatControls = ({
	handleSidebarToggle,
	handleNewChat
}: {
	handleSidebarToggle: () => void
	handleNewChat: () => void
}) => {
	return (
		<div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-2">
			<Tooltip
				content="Open Chat History"
				render={<button onClick={handleSidebarToggle} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
			>
				<Icon name="arrow-right-to-line" height={16} width={16} />
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
}
