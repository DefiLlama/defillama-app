import { memo, RefObject, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingDots, LoadingSpinner } from '~/components/Loaders'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useMedia } from '~/hooks/useMedia'
import Layout from '~/layout'
import { handleSimpleFetchResponse } from '~/utils/async'
import { ChartRenderer } from './components/ChartRenderer'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { InlineSuggestions } from './components/InlineSuggestions'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { RecommendedPrompts } from './components/RecommendedPrompts'
import { useChatHistory } from './hooks/useChatHistory'
import { useGetEntities } from './hooks/useGetEntities'
import { convertLlamaLinksToDefillama } from './utils/entityLinks'
import { getAnchorRect, getSearchValue, getTrigger, getTriggerOffset, replaceValue } from './utils/entitySuggestions'
import { parseChartInfo } from './utils/parseChartInfo'
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
	preResolvedEntities,
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
			| 'reset'
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
	preResolvedEntities?: Array<{ term: string; slug: string }>
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

		if (preResolvedEntities) {
			requestBody.preResolvedEntities = preResolvedEntities
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
						} else if (data.type === 'reset') {
							if (onProgress && !abortSignal?.aborted) {
								onProgress({
									type: 'reset',
									content: data.content || 'Retrying...'
								})
							}
							fullResponse = ''
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
	messages: Array<{
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
	const newlyCreatedSessionsRef = useRef<Set<string>>(new Set())

	const [messages, setMessages] = useState<
		Array<{
			role?: string
			content?: string
			question?: string
			response?: {
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
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[]
			citations?: string[]
			inlineSuggestions?: string
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
	const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
	const [expectedChartInfo, setExpectedChartInfo] = useState<{ count?: number; types?: string[] } | null>(null)
	const [resizeTrigger, setResizeTrigger] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [prompt, setPrompt] = useState('')
	const [lastFailedRequest, setLastFailedRequest] = useState<{
		userQuestion: string
		suggestionContext?: any
		preResolvedEntities?: Array<{ term: string; slug: string }>
	} | null>(null)

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

	const renderInlineChart = useCallback(
		(chart: any, data: any) => (
			<ChartRenderer
				charts={[chart]}
				chartData={data}
				isLoading={false}
				isAnalyzing={false}
				resizeTrigger={resizeTrigger}
			/>
		),
		[resizeTrigger]
	)

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
				.then((result) => {
					setMessages(result.messages)
					setPaginationState(result.pagination)
				})
				.catch((error) => {
					console.log('Failed to restore session:', error)
				})
		}
	}, [sessionId, user, sharedSession, readOnly, hasRestoredSession, restoreSession, resetScrollState, isStreaming])

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
			preResolvedEntities
		}: {
			userQuestion: string
			suggestionContext?: any
			preResolvedEntities?: Array<{ term: string; slug: string }>
		}) => {
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
			setIsGeneratingSuggestions(false)
			setExpectedChartInfo(null)

			streamingContentRef.current.reset()

			return fetchPromptResponse({
				userQuestion,
				sessionId: currentSessionId,
				suggestionContext,
				preResolvedEntities,
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
						} else if (data.stage === 'suggestions_loading') {
							setIsGeneratingSuggestions(true)
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
					} else if (data.type === 'error') {
						setStreamingError(data.content)
					} else if (data.type === 'title') {
						updateSessionTitle({ sessionId: currentSessionId, title: data.title || data.content })
					} else if (data.type === 'reset') {
						setStreamingResponse('')
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
		}) => {
			setLastFailedRequest({ userQuestion, suggestionContext, preResolvedEntities })
		},
		onSuccess: (data, variables) => {
			setIsStreaming(false)
			abortControllerRef.current = null
			setLastFailedRequest(null)

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			setMessages((prev) => [
				...prev,
				{
					role: 'user',
					content: variables.userQuestion,
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

			if (wasUserStopped) {
				setLastFailedRequest(null)
			}

			if (wasUserStopped && finalContent.trim()) {
				setMessages((prev) => [
					...prev,
					{
						role: 'user',
						content: variables.userQuestion,
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

				setStreamingResponse('')
				setStreamingSuggestions(null)
				setStreamingCharts(null)
				setStreamingChartData(null)
				setStreamingCitations(null)
				setPrompt('')
			} else if (wasUserStopped && !finalContent.trim()) {
				setPrompt(variables.userQuestion)
			} else if (!wasUserStopped) {
				console.log('Request failed:', error)
			}

			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		}
	})

	const handleStopRequest = useCallback(async () => {
		if (!sessionId || !isStreaming) return

		const finalContent = streamingContentRef.current.getContent()
		setIsStreaming(false)

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
		} else {
			setPrompt(prompt)
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
		sessionId,
		isStreaming,
		streamingSuggestions,
		streamingCharts,
		streamingChartData,
		streamingCitations,
		currentMessageId,
		prompt,
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
			preResolved?: Array<{ term: string; slug: string; type: 'chain' | 'protocol' | 'subprotocol' }>
		) => {
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
				preResolvedEntities: preResolved
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
									<img src="/icons/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
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
											initialValue={prompt}
											placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
										/>
										<RecommendedPrompts setPrompt={setPrompt} submitPrompt={submitPrompt} isPending={isPending} />
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
										<div className="flex w-full flex-col gap-2 px-2 pb-5">
											{paginationState.isLoadingMore && (
												<p className="flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
													Loading more messages
													<LoadingDots />
												</p>
											)}
											<div className="flex flex-col gap-2.5">
												{messages.map((item, index) => {
													if (item.role === 'user') {
														return <SentPrompt key={`user-${item.timestamp}-${index}`} prompt={item.content} />
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
																	renderChart={hasInlineCharts ? renderInlineChart : undefined}
																/>
																{!hasInlineCharts && item.charts && item.charts.length > 0 && (
																	<ChartRenderer
																		charts={item.charts}
																		chartData={item.chartData || []}
																		resizeTrigger={resizeTrigger}
																	/>
																)}
																{item.inlineSuggestions && <InlineSuggestions text={item.inlineSuggestions} />}
																<ResponseControls
																	messageId={item.messageId}
																	content={item.content}
																	initialRating={item.userRating}
																	sessionId={sessionId}
																	readOnly={readOnly}
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
																<SentPrompt prompt={item.question} />
																<div className="flex flex-col gap-2.5">
																	<MarkdownRenderer
																		content={item.response?.answer || ''}
																		citations={item.response?.citations || item.citations}
																		charts={hasInlineCharts ? itemCharts : undefined}
																		chartData={hasInlineCharts ? itemChartData : undefined}
																		renderChart={hasInlineCharts ? renderInlineChart : undefined}
																	/>
																	{!hasInlineCharts &&
																		((item.response?.charts && item.response.charts.length > 0) ||
																			(item.charts && item.charts.length > 0)) && (
																		<ChartRenderer
																			charts={itemCharts}
																			chartData={itemChartData}
																			resizeTrigger={resizeTrigger}
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
											{(isPending || isStreaming || promptResponse || error) && (
												<div className="flex min-h-[calc(100dvh-218px)] flex-col gap-2.5 lg:min-h-[calc(100dvh-194px)]">
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
														renderChart={renderInlineChart}
													/>
												</div>
											)}
										</div>
									) : (
										<div className="mt-[100px] flex flex-col items-center justify-center gap-2.5">
											<img src="/icons/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
											<h1 className="text-center text-2xl font-semibold">What can I help you with?</h1>
										</div>
									)}
								</div>
							</div>
							<div
								className={`pointer-events-none sticky ${readOnly ? 'bottom-6.5' : 'bottom-26.5'} z-10 mx-auto -mb-8 transition-opacity duration-200 ${showScrollToBottom ? 'opacity-100' : ''} ${!showScrollToBottom ? 'opacity-0' : ''}`}
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
										initialValue={prompt}
										placeholder="Reply to LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
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

const PromptInput = memo(function PromptInput({
	handleSubmit,
	promptInputRef,
	isPending,
	handleStopRequest,
	isStreaming,
	initialValue,
	placeholder
}: {
	handleSubmit: (prompt: string, preResolvedEntities?: Array<{ term: string; slug: string }>) => void
	promptInputRef: RefObject<HTMLTextAreaElement>
	isPending: boolean
	handleStopRequest?: () => void
	isStreaming?: boolean
	initialValue?: string
	placeholder: string
}) {
	const [value, setValue] = useState(initialValue ?? '')
	const highlightRef = useRef<HTMLDivElement>(null)
	const entitiesRef = useRef<Set<string>>(new Set())
	const entitiesMapRef = useRef<Map<string, { id: string; name: string; type: string }>>(new Map())
	const isProgrammaticUpdateRef = useRef(false)

	// Use different placeholder for mobile devices
	const isMobile = useMedia('(max-width: 640px)')
	const mobilePlaceholder = placeholder.replace('Type @ to add a protocol, chain or stablecoin', '')
	const finalPlaceholder = isMobile ? mobilePlaceholder : placeholder

	const combobox = Ariakit.useComboboxStore({ defaultValue: initialValue })
	const searchValue = Ariakit.useStoreState(combobox, 'value')

	const { data: matches } = useGetEntities(searchValue)

	const hasMatches = matches && matches.length > 0

	// Re-calculates the position of the combobox popover in case the changes on
	// the textarea value have shifted the trigger character.
	useEffect(() => {
		combobox.render()
	}, [combobox])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			combobox.hide()
		}
	}, [combobox])

	const getFinalEntities = () => {
		const currentValue = promptInputRef.current?.value ?? ''
		return Array.from(entitiesRef.current)
			.map((name) => {
				const data = entitiesMapRef.current.get(name)
				if (!data) return null
				return {
					term: name,
					slug: data.id
				}
			})
			.filter((entity) => entity !== null && currentValue.includes(entity.term)) as Array<{
			term: string
			slug: string
		}>
	}

	const resetInput = () => {
		setValue('')
		combobox.setValue('')
		combobox.hide()
		const textarea = promptInputRef.current
		if (textarea) {
			textarea.value = ''
			textarea.style.height = ''
		}
		if (highlightRef.current) {
			highlightRef.current.innerHTML = ''
			highlightRef.current.textContent = ''
			highlightRef.current.style.height = ''
		}
		entitiesRef.current.clear()
		entitiesMapRef.current.clear()
	}

	const trackSubmit = () => {
		if (typeof window !== 'undefined' && (window as any).umami) {
			;(window as any).umami.track('llamaai-prompt-submit')
		}
	}

	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = promptInputRef.current
		if (!textarea) return

		if (event.key === 'Backspace' || event.key === 'Delete') {
			const { selectionStart, selectionEnd, value } = textarea

			if (selectionStart !== selectionEnd) return

			const isBackspace = event.key === 'Backspace'
			const checkPos = isBackspace ? selectionStart - 1 : selectionStart

			for (const entityName of entitiesRef.current) {
				const entityIndex = value.indexOf(entityName, Math.max(0, checkPos - entityName.length))
				if (entityIndex === -1 || entityIndex > checkPos) continue

				const entityEnd = entityIndex + entityName.length
				if (checkPos >= entityIndex && checkPos < entityEnd) {
					event.preventDefault()
					const newValue = value.slice(0, entityIndex) + value.slice(entityEnd)

					// Keep internal state and combobox in sync when we programmatically
					// remove an entity, otherwise stale value can be re-applied on next input.
					textarea.value = newValue
					setValue(newValue)
					setInputSize(promptInputRef, highlightRef)
					combobox.setValue('')
					combobox.hide()

					entitiesRef.current.delete(entityName)
					entitiesMapRef.current.delete(entityName)

					if (highlightRef.current) {
						highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
					}

					setTimeout(() => {
						textarea.setSelectionRange(entityIndex, entityIndex)
					}, 0)
					return
				}
			}
		}

		if (event.key === 'Tab' && combobox.getState().renderedItems.length > 0) {
			event.preventDefault()
			const activeValue = combobox.getState().activeValue
			if (activeValue && matches && matches.length > 0) {
				const activeItem = matches.find((item) => item.id === activeValue)
				if (activeItem) {
					const { id, name, type } = activeItem
					onItemClick({ id, name, type })()
				}
			}
		}

		if (event.key === 'Enter' && !event.shiftKey && combobox.getState().renderedItems.length === 0) {
			event.preventDefault()

			if (isStreaming) {
				return
			}

			trackSubmit()
			const finalEntities = getFinalEntities()
			const promptValue = promptInputRef.current?.value ?? ''
			resetInput()
			handleSubmit(promptValue, finalEntities)
		}
	}

	const handleScroll = () => {
		// Sync highlightRef scroll with textarea scroll
		syncHighlightScroll(promptInputRef, highlightRef)
		// Re-calculate the position of the combobox popover
		combobox.render()
	}

	const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (promptInputRef.current) {
			setInputSize(promptInputRef, highlightRef)
		}

		const currentValue = event.target.value
		setValue(currentValue)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(currentValue, Array.from(entitiesRef.current))
		}

		// Skip trigger logic if this is a programmatic update (e.g., after item selection)
		if (isProgrammaticUpdateRef.current) {
			isProgrammaticUpdateRef.current = false
			return
		}

		const trigger = getTrigger(event.target)
		const searchValue = getSearchValue(event.target)
		const triggerOffset = getTriggerOffset(event.target)
		// Get the actual trigger character from the textarea at the trigger offset
		// This is more reliable than getTrigger which only checks the previous character
		const actualTrigger = triggerOffset !== -1 ? event.target.value[triggerOffset] : null
		// Prepend $ to searchValue if trigger is $, so useGetEntities can detect it
		// Always prepend $ when trigger is $, even if searchValue already starts with $
		const searchValueWithTrigger = actualTrigger === '$' ? `$${searchValue}` : searchValue

		// Only show combobox if there's a valid trigger offset (@ is isolated) and search value
		// This prevents showing combobox in emails like "test@gmail.com"
		if (triggerOffset !== -1 && searchValue.length > 0) {
			combobox.show()
			// Sets the combobox value that will be used to search in the list.
			// Prepend $ if trigger is $ so useGetEntities knows to fetch coins
			combobox.setValue(searchValueWithTrigger)
		}
		// If user just typed @ or $ (trigger exists but no search value yet), don't show combobox
		else if (trigger && searchValue.length === 0) {
			// Still set the value with $ prefix if trigger is $, so it's ready when user starts typing
			if (actualTrigger === '$') {
				combobox.setValue('$')
			} else {
				combobox.setValue('')
			}
			combobox.hide()
		}
		// If no valid trigger offset, hide and clear
		else if (triggerOffset === -1) {
			combobox.setValue('')
			combobox.hide()
		}
	}

	const onItemClick = useCallback(
		({ id, name, type }: { id: string; name: string; type: string }) =>
			() => {
				const textarea = promptInputRef.current
				if (!textarea) return

				const offset = getTriggerOffset(textarea)

				entitiesRef.current.add(name)
				entitiesMapRef.current.set(name, { id, name, type })

				const getNewValue = replaceValue(offset, searchValue, name)
				const newValue = getNewValue(textarea.value)

				// Clear combobox search FIRST to make matches empty and prevent useLayoutEffect from reopening
				combobox.setValue('')
				combobox.hide()

				// Mark this as a programmatic update so onChange doesn't re-run trigger logic
				isProgrammaticUpdateRef.current = true
				textarea.value = newValue
				setInputSize(promptInputRef, highlightRef)
				setValue(newValue)

				if (highlightRef.current) {
					highlightRef.current.innerHTML = highlightWord(newValue, Array.from(entitiesRef.current))
				}

				// Ensure textarea remains focused after selection
				setTimeout(() => {
					textarea.focus()
				}, 0)
			},
		// promptInputRef, highlightRef, entitiesRef, entitiesMapRef, isProgrammaticUpdateRef are stable refs
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[combobox, searchValue]
	)

	return (
		<>
			<form
				className="relative w-full"
				onSubmit={(e) => {
					e.preventDefault()
					trackSubmit()
					const form = e.target as HTMLFormElement
					const finalEntities = getFinalEntities()
					const promptValue = form.prompt.value
					resetInput()
					handleSubmit(promptValue, finalEntities)
				}}
			>
				<div className="overflow-hidden">
					<div className="relative w-full rounded-lg border border-[#e6e6e6] bg-(--app-bg) focus-within:border-(--old-blue) dark:border-[#222324]">
						<Ariakit.Combobox
							store={combobox}
							autoSelect
							value={value}
							// We'll overwrite how the combobox popover is shown, so we disable
							// the default behaviors.
							showOnClick={false}
							showOnChange={false}
							showOnKeyPress={false}
							// To the combobox state, we'll only set the value after the trigger
							// character (the search value), so we disable the default behavior.
							setValueOnChange={false}
							render={
								<textarea
									ref={promptInputRef}
									rows={1}
									maxLength={2000}
									placeholder={finalPlaceholder}
									// We need to re-calculate the position of the combobox popover
									// when the textarea contents are scrolled, and sync highlightRef scroll.
									onScroll={handleScroll}
									// Hide the combobox popover whenever the selection changes.
									onPointerDown={combobox.hide}
									onChange={onChange}
									onKeyDown={onKeyDown}
									name="prompt"
									className="relative z-[1] block min-h-[48px] w-full resize-none bg-transparent p-4 leading-normal break-words whitespace-pre-wrap text-transparent caret-black outline-none placeholder:text-[#666] max-sm:pr-8 max-sm:text-base sm:min-h-[72px] dark:caret-white placeholder:dark:text-[#919296]"
									autoCorrect="off"
									autoComplete="off"
									spellCheck="false"
								/>
							}
							disabled={isPending && !isStreaming}
						/>
						<div
							className="highlighted-text pointer-events-none absolute top-0 right-0 bottom-0 left-0 z-0 overflow-hidden p-4 leading-normal break-words whitespace-pre-wrap max-sm:pr-8 max-sm:text-base"
							ref={highlightRef}
						/>
					</div>
				</div>
				{hasMatches && (
					<Ariakit.ComboboxPopover
						store={combobox}
						unmountOnHide
						fitViewport
						getAnchorRect={() => {
							const textarea = promptInputRef.current
							if (!textarea) return null
							return getAnchorRect(textarea)
						}}
						className="relative z-50 flex max-h-(--popover-available-height) max-w-[280px] min-w-[100px] flex-col overflow-auto overscroll-contain rounded-lg border border-[#e6e6e6] bg-(--app-bg) shadow-lg dark:border-[#222324]"
					>
						{matches.map(({ id, name, logo, type }) => (
							<Ariakit.ComboboxItem
								key={id}
								value={id}
								focusOnHover
								onClick={onItemClick({ id, name, type })}
								className="flex cursor-pointer items-center gap-1.5 border-t border-[#e6e6e6] px-3 py-2 first:border-t-0 hover:bg-[#e6e6e6] focus-visible:bg-[#e6e6e6] data-[active-item]:bg-[#e6e6e6] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324] dark:data-[active-item]:bg-[#222324]"
							>
								{logo && <TokenLogo logo={logo} size={20} />}
								<span className="flex items-center gap-1.5">
									<span className="text-sm font-medium">{name}</span>
									<span
										className={`rounded px-1.5 py-0.5 text-xs font-medium ${
											type === 'Chain'
												? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
												: type == 'protocol'
													? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
													: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
										}`}
									>
										{type}
									</span>
								</span>
							</Ariakit.ComboboxItem>
						))}
					</Ariakit.ComboboxPopover>
				)}
				{isStreaming ? (
					<Tooltip
						content="Stop"
						render={<button onClick={handleStopRequest} data-umami-event="llamaai-stop-generation" />}
						className="group absolute right-2 bottom-3 z-10 flex h-6 w-6 items-center justify-center rounded-sm bg-(--old-blue)/12 hover:bg-(--old-blue) max-sm:top-0 max-sm:bottom-0 max-sm:my-auto sm:h-7 sm:w-7"
					>
						<span className="block h-2 w-2 bg-(--old-blue) group-hover:bg-white group-focus-visible:bg-white sm:h-2.5 sm:w-2.5" />
						<span className="sr-only">Stop</span>
					</Tooltip>
				) : (
					<button
						type="submit"
						data-umami-event="llamaai-prompt-submit"
						className="absolute right-2 bottom-3 z-10 flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue)/80 focus-visible:bg-(--old-blue)/80 disabled:opacity-50 max-sm:top-0 max-sm:bottom-0 max-sm:my-auto sm:h-7 sm:w-7"
						disabled={isPending || isStreaming}
					>
						<Icon name="arrow-up" height={14} width={14} className="sm:h-4 sm:w-4" />
						<span className="sr-only">Submit prompt</span>
					</button>
				)}
			</form>
		</>
	)
})

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
	onRetry,
	canRetry,
	isGeneratingCharts = false,
	isAnalyzingForCharts = false,
	hasChartError = false,
	isGeneratingSuggestions = false,
	expectedChartInfo,
	resizeTrigger = 0,
	showMetadata = false,
	readOnly = false,
	renderChart
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
	onRetry?: () => void
	canRetry?: boolean
	isGeneratingCharts?: boolean
	isAnalyzingForCharts?: boolean
	hasChartError?: boolean
	isGeneratingSuggestions?: boolean
	expectedChartInfo?: { count?: number; types?: string[] } | null
	resizeTrigger?: number
	showMetadata?: boolean
	readOnly?: boolean
	renderChart?: (chart: any, data: any) => React.ReactNode
}) => {
	if (error && canRetry) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-(--error)">{error}</p>
				<button
					onClick={onRetry}
					data-umami-event="llamaai-retry-request"
					className="flex w-fit items-center justify-center gap-2 rounded-lg border border-(--old-blue) bg-(--old-blue)/12 px-4 py-2 text-(--old-blue) hover:bg-(--old-blue) hover:text-white"
				>
					<Icon name="repeat" height={16} width={16} />
					Retry
				</button>
			</div>
		)
	}

	if (error) {
		return <p className="text-(--error)">{error}</p>
	}
	if (isPending || isStreaming) {
		return (
			<>
				{streamingError ? (
					<div className="text-(--error)">{streamingError}</div>
				) : isStreaming && streamingResponse ? (
					<MarkdownRenderer
						content={streamingResponse}
						citations={response?.citations}
						isStreaming={isStreaming}
						charts={response?.charts}
						chartData={response?.chartData}
						renderChart={renderChart}
					/>
				) : isStreaming && progressMessage ? (
					<p
						className={`flex items-center justify-start gap-2 py-2 ${
							progressMessage.includes('encountered an issue') ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'
						}`}
					>
						{progressMessage.includes('encountered an issue') ? (
							<Icon name="alert-triangle" height={16} width={16} className="text-(--error)" />
						) : (
							<img src="/icons/llamaai_animation.webp" alt="Loading" className="h-24 w-24 shrink-0" />
						)}
						<span className="flex flex-wrap items-center gap-1">
							{progressMessage}
							{/* {progressStage && <span>({progressStage})</span>} */}
						</span>
					</p>
				) : (
					<p className="flex min-h-9 items-center gap-1 py-2 text-[#666] dark:text-[#919296]">
						Thinking
						<LoadingDots />
					</p>
				)}
				{(isAnalyzingForCharts || isGeneratingCharts || hasChartError) &&
					!streamingResponse?.includes('[CHART:') && (
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
				{!readOnly && isGeneratingSuggestions && (
					<div className="mt-4 grid gap-2">
						<h1 className="text-[#666] dark:text-[#919296]">Suggested actions:</h1>
						<p className="flex items-center gap-2 text-[#666] dark:text-[#919296]">
							<img src="/icons/llamaai_animation.webp" alt="Loading" className="h-24 w-24 shrink-0" />
							<span>Generating follow-up suggestions...</span>
						</p>
					</div>
				)}
			</>
		)
	}

	const remainingCharts = (() => {
		if (!response?.charts?.length) return null
		const inlineIds = new Set<string>()
		const pattern = /\[CHART:([^\]]+)\]/g
		let match: RegExpExecArray | null
		while ((match = pattern.exec(response.answer || '')) !== null) {
			inlineIds.add(match[1])
		}
		const filtered = response.charts.filter((c: any) => !inlineIds.has(c.id))
		if (!filtered.length) return null
		const data = Array.isArray(response.chartData)
			? response.chartData
			: filtered.flatMap((c: any) => response.chartData?.[c.id] || [])
		return { charts: filtered, data }
	})()

	return (
		<>
			{response?.answer && (
				<MarkdownRenderer
					content={response.answer}
					citations={response.citations}
					charts={response.charts}
					chartData={response.chartData}
					renderChart={renderChart}
				/>
			)}
			{remainingCharts && (
				<ChartRenderer
					charts={remainingCharts.charts}
					chartData={remainingCharts.data}
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

const SuggestedActions = memo(function SuggestedActions({
	suggestions,
	handleSuggestionClick,
	isPending,
	isStreaming
}: {
	suggestions: any[]
	handleSuggestionClick: (suggestion: any) => void
	isPending: boolean
	isStreaming: boolean
}) {
	return (
		<div className="mt-4 grid gap-2 text-[#666] dark:text-[#919296]">
			<h1>Suggested actions:</h1>
			<div className="grid gap-2">
				{suggestions.map((suggestion) => (
					<button
						key={`${suggestion.title}-${suggestion.description}`}
						onClick={() => handleSuggestionClick(suggestion)}
						disabled={isPending || isStreaming}
						data-umami-event="llamaai-suggestion-click"
						className={`group flex touch-pan-y items-center justify-between gap-3 rounded-lg border border-[#e6e6e6] p-2 text-left dark:border-[#222324] ${
							isPending || isStreaming
								? 'cursor-not-allowed opacity-60'
								: 'hover:border-(--old-blue) hover:bg-(--old-blue)/12 focus-visible:border-(--old-blue) focus-visible:bg-(--old-blue)/12 active:border-(--old-blue) active:bg-(--old-blue)/12'
						}`}
					>
						<span className="flex flex-1 flex-col items-start gap-1">
							<span className={suggestion.description ? 'font-semibold' : ''}>{suggestion.title}</span>
							{suggestion.description ? <span>{suggestion.description}</span> : null}
						</span>
						<Icon name="arrow-right" height={16} width={16} className="shrink-0" />
					</button>
				))}
			</div>
		</div>
	)
})

const QueryMetadata = memo(function QueryMetadata({ metadata }: { metadata: any }) {
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
})

const SentPrompt = memo(function SentPrompt({ prompt }: { prompt: string }) {
	return (
		<p className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
			{prompt}
		</p>
	)
})

const ResponseControls = memo(function ResponseControls({
	messageId,
	content,
	initialRating,
	sessionId,
	readOnly = false
}: {
	messageId?: string
	content?: string
	initialRating?: 'good' | 'bad' | null
	sessionId?: string | null
	readOnly?: boolean
}) {
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
				const shareLink = `${window.location.origin}/ai/chat/shared/${data.shareToken}`
				navigator.clipboard.writeText(shareLink)
				setShowShareModal(true)
			}
		},
		onError: (err) => {
			toast.error('Failed to fetch session id')
			console.log(err)
		}
	})

	const [selectedRating, setSelectedRating] = useState<'good' | 'bad' | null>(initialRating || null)
	const [submittedRating, setSubmittedRating] = useState<'good' | 'bad' | null>(initialRating || null)
	const isRatedAsGood = submittedRating === 'good'
	const isRatedAsBad = submittedRating === 'bad'

	const handleCopy = async () => {
		if (!content) return
		try {
			const convertedContent = convertLlamaLinksToDefillama(content)
			await navigator.clipboard.writeText(convertedContent)
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
				{!readOnly && (
					<>
						<Tooltip
							content={isRatedAsGood ? 'Rated as good' : 'Rate as good'}
							render={
								<button
									onClick={() => {
										setSelectedRating('good')
										setShowFeedback(true)
									}}
									disabled={showFeedback || isRatedAsGood || isRatedAsBad}
								/>
							}
							className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsGood ? 'text-(--success)' : 'text-[#666] dark:text-[#919296]'}`}
						>
							<Icon name="thumbs-up" height={14} width={14} />
							<span className="sr-only">Thumbs Up</span>
						</Tooltip>
						<Tooltip
							content={isRatedAsBad ? 'Rated as bad' : 'Rate as bad'}
							render={
								<button
									onClick={() => {
										setSelectedRating('bad')
										setShowFeedback(true)
									}}
									disabled={showFeedback || isRatedAsGood || isRatedAsBad}
								/>
							}
							className={`rounded p-1.5 hover:bg-[#f7f7f7] hover:text-black dark:hover:bg-[#222324] dark:hover:text-white ${isRatedAsBad ? 'text-(--error)' : 'text-[#666] dark:text-[#919296]'}`}
						>
							<Icon name="thumbs-down" height={14} width={14} />
							<span className="sr-only">Thumbs Down</span>
						</Tooltip>
					</>
				)}
				{sessionId && !readOnly && (
					<Tooltip
						content="Share"
						render={
							<button
								onClick={() => shareSession()}
								disabled={isSharing || showShareModal}
								data-umami-event="llamaai-share-conversation"
							/>
						}
						className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
					>
						{isSharing ? <LoadingSpinner size={14} /> : <Icon name="share" height={14} width={14} />}
						<span className="sr-only">Share</span>
					</Tooltip>
				)}
				{!readOnly && (
					<Tooltip
						content="Provide Feedback"
						render={
							<button
								onClick={() => {
									setSelectedRating(null)
									setShowFeedback(true)
								}}
								disabled={showFeedback || !!submittedRating}
							/>
						}
						className={`rounded p-1.5 text-[#666] hover:bg-[#f7f7f7] hover:text-black dark:text-[#919296] dark:hover:bg-[#222324] dark:hover:text-white`}
					>
						<Icon name="message-square-warning" height={14} width={14} />
						<span className="sr-only">Provide Feedback</span>
					</Tooltip>
				)}
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
					<FeedbackForm
						messageId={messageId}
						selectedRating={selectedRating}
						setSelectedRating={setSelectedRating}
						setShowFeedback={setShowFeedback}
						onRatingSubmitted={setSubmittedRating}
					/>
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
})

const FeedbackForm = ({
	messageId,
	selectedRating,
	setSelectedRating,
	setShowFeedback,
	onRatingSubmitted
}: {
	messageId?: string
	selectedRating: 'good' | 'bad' | null
	setSelectedRating: (rating: 'good' | 'bad' | null) => void
	setShowFeedback: (show: boolean) => void
	onRatingSubmitted: (rating: 'good' | 'bad' | null) => void
}) => {
	const { authorizedFetch } = useAuthContext()
	const { mutate: submitFeedback, isPending: isSubmittingFeedback } = useMutation({
		mutationFn: async ({ rating, feedback }: { rating: 'good' | 'bad' | null; feedback?: string }) => {
			const res = await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating, feedback })
			})
				.then(handleSimpleFetchResponse)
				.then((res) => res.json())

			return res
		},
		onSuccess: (_, variables) => {
			onRatingSubmitted(variables.rating)
			setShowFeedback(false)
			toast.success('Thank you for you feedback!')
		}
	})

	const [feedbackText, setFeedbackText] = useState('')
	const finalFeedbackText = useDeferredValue(feedbackText)

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				const form = e.target as HTMLFormElement
				submitFeedback({ rating: selectedRating, feedback: form.feedback?.value?.trim() })
			}}
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">Rate this response</span>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setSelectedRating('good')}
						disabled={isSubmittingFeedback}
						className={`flex flex-1 items-center justify-center gap-2 rounded border p-3 transition-colors ${
							selectedRating === 'good'
								? 'border-(--success) bg-(--success)/12 text-(--success)'
								: 'border-[#e6e6e6] text-[#666] hover:border-(--success) hover:bg-(--success)/5 dark:border-[#222324] dark:text-[#919296]'
						}`}
					>
						<Icon name="thumbs-up" height={16} width={16} />
						<span className="text-sm font-medium">Good</span>
					</button>
					<button
						type="button"
						onClick={() => setSelectedRating('bad')}
						disabled={isSubmittingFeedback}
						className={`flex flex-1 items-center justify-center gap-2 rounded border p-3 transition-colors ${
							selectedRating === 'bad'
								? 'border-(--error) bg-(--error)/12 text-(--error)'
								: 'border-[#e6e6e6] text-[#666] hover:border-(--error) hover:bg-(--error)/5 dark:border-[#222324] dark:text-[#919296]'
						}`}
					>
						<Icon name="thumbs-down" height={16} width={16} />
						<span className="text-sm font-medium">Bad</span>
					</button>
				</div>
			</div>
			<label className="flex flex-col gap-2">
				<span className="text-sm text-[#666] dark:text-[#919296]">Additional feedback (optional)</span>
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
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="submit"
						disabled={isSubmittingFeedback || !selectedRating}
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
	const shareLink = shareData?.shareToken ? `${window.location.origin}/ai/chat/shared/${shareData.shareToken}` : ''

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
						data-umami-event="llamaai-copy-share-link"
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
					data-umami-event="llamaai-share-to-x"
					className="rounded bg-(--old-blue) px-3 py-2 text-xs text-white hover:opacity-90"
				>
					Share to X
				</button>
			</div>
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

function highlightWord(text: string, words: string[]) {
	if (!text || typeof text !== 'string') return text
	if (!Array.isArray(words) || words.length === 0) return text

	// HTML escape the text first
	const escapeHtml = (str: string) =>
		str.replace(
			/[&<>"']/g,
			(char) =>
				({
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;'
				})[char] || char
		)

	const escapedText = escapeHtml(text)

	// Filter out empty strings and escape special regex characters
	const escapedWords = words
		.filter((word) => word && word.trim())
		.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

	if (escapedWords.length === 0) return escapedText

	const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi')
	return escapedText.replace(regex, '<span class="highlight">$1</span>')
}

function syncHighlightScroll(promptInputRef, highlightRef) {
	if (promptInputRef?.current && highlightRef?.current) {
		highlightRef.current.scrollTop = promptInputRef.current.scrollTop
	}
}

function setInputSize(promptInputRef, highlightRef) {
	try {
		const textarea = promptInputRef?.current
		if (!textarea) return

		// Use scrollHeight-based auto-resize with a soft max height (~5 lines)
		const style = window.getComputedStyle(textarea)
		const lineHeight = parseFloat(style.lineHeight || '') || parseFloat(style.fontSize || '16') * 1.5
		const paddingTop = parseFloat(style.paddingTop || '0')
		const paddingBottom = parseFloat(style.paddingBottom || '0')
		const maxRows = 5
		const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom

		textarea.style.height = 'auto'
		const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
		textarea.style.height = `${nextHeight}px`

		if (highlightRef?.current) {
			requestAnimationFrame(() => {
				if (!textarea || !highlightRef.current) return
				highlightRef.current.style.height = `${textarea.offsetHeight}px`
				syncHighlightScroll(promptInputRef, highlightRef)
			})
		}
	} catch (error) {
		console.log('Error calculating size:', error)
	}
}
