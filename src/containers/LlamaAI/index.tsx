import { RefObject, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { ChartRenderer } from './components/ChartRenderer'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { useChatHistory } from './hooks/useChatHistory'

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
		type: 'token' | 'progress' | 'session' | 'suggestions' | 'charts' | 'error' | 'title'
		content: string
		stage?: string
		sessionId?: string
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
		title?: string
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
			.then(async (res) => {
				if (!res.ok) {
					let errorMessage = `[HTTP] [error] [${res.status}]`

					// Try to get error message from statusText first
					if (res.statusText) {
						errorMessage += `: ${res.statusText}`
					}

					// Read response body only once
					const responseText = await res.text()

					if (responseText) {
						// Try to parse as JSON first
						try {
							const errorResponse = JSON.parse(responseText)
							if (errorResponse.error) {
								errorMessage = errorResponse.error
							} else if (errorResponse.message) {
								errorMessage = errorResponse.message
							} else {
								// If JSON parsing succeeded but no error/message field, use the text
								errorMessage = responseText
							}
						} catch (jsonError) {
							// If JSON parsing fails, use the text response
							errorMessage = responseText
						}
					}

					throw new Error(errorMessage)
				}
				return res
			})
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
		let suggestions = null
		let charts = null
		let chartData = null
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
				suggestions,
				charts,
				chartData
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
}

export function LlamaAI({ initialSessionId, sharedSession, readOnly = false }: LlamaAIProps = {}) {
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
			response: { answer: string; metadata?: any; suggestions?: any[]; charts?: any[]; chartData?: any[] }
			timestamp: number
			messageId?: string
		}>
	>([])
	const [paginationState, setPaginationState] = useState<{
		hasMore: boolean
		isLoadingMore: boolean
		cursor?: number
		totalMessages?: number
	}>({ hasMore: false, isLoadingMore: false })

	useEffect(() => {
		userRef.current = user
	}, [user])

	useEffect(() => {
		sessionIdRef.current = sessionId
	}, [sessionId])

	useEffect(() => {
		if (initialSessionId && !sessionId) {
			setSessionId(initialSessionId)
			setHasRestoredSession(null)
		}
	}, [initialSessionId, sessionId])

	useEffect(() => {
		if (sharedSession) {
			setConversationHistory(sharedSession.conversationHistory)
			setSessionId(sharedSession.session.sessionId)
		}
	}, [sharedSession])

	const [hasRestoredSession, setHasRestoredSession] = useState<string | null>(null)
	useEffect(() => {
		if (
			sessionId &&
			user &&
			!sharedSession &&
			!readOnly &&
			hasRestoredSession !== sessionId &&
			!newlyCreatedSessionsRef.current.has(sessionId)
		) {
			setHasRestoredSession(sessionId)
			restoreSession(sessionId)
				.then((result) => {
					setConversationHistory(result.conversationHistory)
					setPaginationState(result.pagination)
				})
				.catch((error) => {
					console.error('Failed to restore session:', error)
				})
		}
	}, [sessionId, user, sharedSession, readOnly, hasRestoredSession, restoreSession])

	const [streamingResponse, setStreamingResponse] = useState('')
	const [streamingError, setStreamingError] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [progressMessage, setProgressMessage] = useState('')
	const [progressStage, setProgressStage] = useState('')
	const [streamingSuggestions, setStreamingSuggestions] = useState<any[] | null>(null)
	const [streamingCharts, setStreamingCharts] = useState<any[] | null>(null)
	const [streamingChartData, setStreamingChartData] = useState<any[] | null>(null)
	const [isGeneratingCharts, setIsGeneratingCharts] = useState(false)
	const [isAnalyzingForCharts, setIsAnalyzingForCharts] = useState(false)
	const [hasChartError, setHasChartError] = useState(false)
	const [expectedChartInfo, setExpectedChartInfo] = useState<{ count?: number; types?: string[] } | null>(null)
	const [resizeTrigger, setResizeTrigger] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const abortControllerRef = useRef<AbortController | null>(null)
	const streamingContentRef = useRef<StreamingContent>(new StreamingContent())
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const shouldAutoScrollRef = useRef(true)

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

	const [prompt, setPrompt] = useState('')
	const promptInputRef = useRef<HTMLTextAreaElement>(null)

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
						suggestions: data?.response?.suggestions,
						charts: data?.response?.charts,
						chartData: data?.response?.chartData
					},
					timestamp: Date.now()
				}
			])

			setPrompt('')
			resetPrompt()
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		},
		onError: (error) => {
			setIsStreaming(false)
			abortControllerRef.current = null

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			if (error?.message !== 'Request aborted') {
				console.log('Request failed:', error)
			}

			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		}
	})

	const handleStopRequest = async () => {
		if (!sessionId || !isStreaming) return

		try {
			// Call the backend stop endpoint
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

		// Also abort the local controller as backup
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		resetPrompt()
		setTimeout(() => {
			promptInputRef.current?.focus()
		}, 100)
	}

	const handleSubmit = (prompt: string) => {
		const finalPrompt = prompt.trim()
		setPrompt(finalPrompt)

		shouldAutoScrollRef.current = true

		setTimeout(() => {
			if (scrollContainerRef.current) {
				scrollContainerRef.current.scrollTo({
					top: scrollContainerRef.current.scrollHeight,
					behavior: 'smooth'
				})
			}
		}, 0)

		if (sessionId) {
			moveSessionToTop(sessionId)
		}

		submitPrompt({ userQuestion: finalPrompt })
	}

	const handleSubmitWithSuggestion = (prompt: string, suggestion: any) => {
		const finalPrompt = prompt.trim()
		setPrompt(finalPrompt)

		shouldAutoScrollRef.current = true

		setTimeout(() => {
			if (scrollContainerRef.current) {
				scrollContainerRef.current.scrollTo({
					top: scrollContainerRef.current.scrollHeight,
					behavior: 'smooth'
				})
			}
		}, 0)

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
		setIsGeneratingCharts(false)
		setIsAnalyzingForCharts(false)
		setHasChartError(false)
		setExpectedChartInfo(null)
		streamingContentRef.current.reset()
		setResizeTrigger((prev) => prev + 1)

		setTimeout(() => {
			if (scrollContainerRef.current) {
				scrollContainerRef.current.scrollTo({
					top: scrollContainerRef.current.scrollHeight,
					behavior: 'smooth'
				})
			}
		}, 0)

		promptInputRef.current?.focus()
	}

	const handleLoadMoreMessages = async () => {
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
			console.error('Failed to load more messages:', error)
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
		}
	}

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
		const handleScroll = () => {
			if (!scrollContainerRef.current) return

			const container = scrollContainerRef.current
			const { scrollTop, scrollHeight, clientHeight } = container
			const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

			shouldAutoScrollRef.current = isNearBottom

			if (sessionId && paginationState.hasMore && !paginationState.isLoadingMore && scrollTop <= 50) {
				handleLoadMoreMessages()
			}
		}

		const container = scrollContainerRef.current
		if (container) {
			container.addEventListener('scroll', handleScroll)
			return () => container.removeEventListener('scroll', handleScroll)
		}
	}, [sessionId, paginationState.hasMore, paginationState.isLoadingMore])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && (streamingResponse || isStreaming)) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: 'smooth'
			})
		}
	}, [streamingResponse, isStreaming])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && conversationHistory.length > 0) {
			setTimeout(() => {
				if (scrollContainerRef.current && shouldAutoScrollRef.current) {
					scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
				}
			}, 0)
		}
	}, [conversationHistory])

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	// Reset animation flag after animation completes
	useEffect(() => {
		if (shouldAnimateSidebar) {
			const timer = setTimeout(() => {
				setShouldAnimateSidebar(false)
			}, 220) // Match the animation duration (0.22s = 220ms)
			return () => clearTimeout(timer)
		}
	}, [shouldAnimateSidebar])

	const isSubmitted = isPending || isStreaming || error || promptResponse ? true : false

	return (
		<Layout
			title="LlamaAI - DefiLlama"
			description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
		>
			<div className="relative isolate flex max-h-[calc(100vh-72px)] flex-1 flex-nowrap">
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
					className={`relative isolate flex flex-1 flex-col rounded-lg border border-[#e6e6e6] bg-(--cards-bg) dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.22s_ease-out]' : ''}`}
				>
					<div ref={scrollContainerRef} className="thin-scrollbar flex-1 overflow-y-auto p-2.5">
						<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
							{/* Show loading when restoring session */}
							{isRestoringSession && conversationHistory.length === 0 ? (
								<div className="flex items-center justify-center gap-2 py-4 text-[#666] dark:text-[#919296]">
									<LoadingDots />
									<span>Loading conversation...</span>
								</div>
							) : conversationHistory.length > 0 || isSubmitted ? (
								<div className="flex w-full flex-col gap-2 p-2">
									{paginationState.isLoadingMore && (
										<div className="flex items-center justify-center gap-2 py-4 text-[#666] dark:text-[#919296]">
											<LoadingDots />
											<span>Loading more messages...</span>
										</div>
									)}
									<div className="flex flex-col gap-2.5">
										{conversationHistory.map((item) => (
											<div
												key={`${item.question}-${item.timestamp}`}
												className={`flex flex-col gap-2.5 ${isPending || isStreaming || promptResponse || error ? '' : 'last:min-h-[calc(100vh-260px)]'}`}
											>
												<SentPrompt prompt={item.question} />
												<div className="flex flex-col gap-2.5">
													<Answer content={item.response.answer} messageId={item.messageId} />
													{item.response.charts && item.response.charts.length > 0 && (
														<ChartRenderer
															charts={item.response.charts}
															chartData={item.response.chartData || []}
															resizeTrigger={resizeTrigger}
														/>
													)}
													{item.response.suggestions && item.response.suggestions.length > 0 && (
														<SuggestedActions
															suggestions={item.response.suggestions}
															handleSuggestionClick={handleSuggestionClick}
															isPending={isPending}
															isStreaming={isStreaming}
														/>
													)}
													{item.response.metadata && <QueryMetadata metadata={item.response.metadata} />}
												</div>
											</div>
										))}
									</div>
									{(isPending || isStreaming || promptResponse || error) && (
										<div className="flex min-h-[calc(100vh-260px)] flex-col gap-2.5">
											{prompt && <SentPrompt prompt={prompt} />}
											<PromptResponse
												response={
													promptResponse?.response ||
													(streamingSuggestions || streamingCharts
														? {
																answer: '',
																suggestions: streamingSuggestions,
																charts: streamingCharts,
																chartData: streamingChartData
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
							{conversationHistory.length === 0 && !isSubmitted && !isRestoringSession ? (
								<div className="flex w-full flex-wrap items-center justify-center gap-4 pb-[100px]">
									{recommendedPrompts.map((prompt) => (
										<button
											key={prompt}
											onClick={() => {
												setPrompt(prompt)
												submitPrompt({ userQuestion: prompt })
											}}
											disabled={isPending}
											className="flex items-center justify-center gap-2 rounded-lg border border-[#e6e6e6] px-4 py-1 text-[#666] dark:border-[#222324] dark:text-[#919296]"
										>
											{prompt}
										</button>
									))}
								</div>
							) : null}
						</div>
					</div>
					{!readOnly && (
						<div className="border-t border-[#e6e6e6] bg-(--cards-bg) p-2.5 dark:border-[#222324]">
							<div className="mx-auto w-full max-w-3xl">
								<PromptInput
									handleSubmit={handleSubmit}
									promptInputRef={promptInputRef}
									isPending={isPending}
									handleStopRequest={handleStopRequest}
									isStreaming={isStreaming}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</Layout>
	)
}

const recommendedPrompts = ['Top 5 protocols by tvl', 'Recent hacks', 'Total amount raised by category']

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
					rows={5}
					placeholder="Ask LlamaAI..."
					value={value}
					onChange={onChange}
					onKeyDown={onKeyDown}
					name="prompt"
					className="w-full rounded-lg border border-[#e6e6e6] bg-(--app-bg) p-4 caret-black max-sm:text-base dark:border-[#222324] dark:caret-white"
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					disabled={isPending && !isStreaming}
					autoFocus
					ref={promptInputRef}
					maxLength={2000}
				/>
				{isStreaming ? (
					<button
						type="button"
						onClick={handleStopRequest}
						className="absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-red-500/10 text-(--error)"
					>
						<Icon name="x" height={14} width={14} />
						<span className="sr-only">Stop streaming</span>
					</button>
				) : (
					<button
						type="submit"
						className="absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/10 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white disabled:opacity-50"
						disabled={isPending || isStreaming || !value.trim()}
					>
						<Icon name="arrow-up" height={16} width={16} />
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
	resizeTrigger = 0
}: {
	response?: { answer: string; metadata?: any; suggestions?: any[]; charts?: any[]; chartData?: any[] }
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
					<Answer content={streamingResponse} />
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
			{response?.suggestions && response.suggestions.length > 0 && (
				<SuggestedActions
					suggestions={response.suggestions}
					handleSuggestionClick={onSuggestionClick}
					isPending={isPending}
					isStreaming={isStreaming}
				/>
			)}
			{response?.metadata && <QueryMetadata metadata={response.metadata} />}
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
			<h4 className="text-gray-700 dark:text-gray-300">Suggested actions:</h4>
			<div className="grid gap-2">
				{suggestions.map((suggestion) => (
					<button
						key={`${suggestion.title}-${suggestion.description}`}
						onClick={() => handleSuggestionClick(suggestion)}
						disabled={isPending || isStreaming}
						className={`group flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors dark:border-gray-700 ${
							isPending || isStreaming
								? 'cursor-not-allowed opacity-50'
								: 'hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20'
						}`}
					>
						<span className="flex flex-1 flex-col gap-1">
							<span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
								{suggestion.title}
							</span>
							{suggestion.description ? (
								<span className="text-xs text-gray-600 dark:text-gray-400">{suggestion.description}</span>
							) : null}
						</span>
						<Icon
							name="arrow-right"
							height={16}
							width={16}
							className="shrink-0 text-gray-400 group-hover:text-blue-500"
						/>
					</button>
				))}
			</div>
		</div>
	)
}

const QueryMetadata = ({ metadata }: { metadata: any }) => {
	return (
		<details className="group rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800">
			<summary className="flex flex-wrap items-center justify-between gap-2">
				<span>Query Metadata</span>
				<span className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
					<Icon name="chevron-down" height={14} width={14} className="transition-transform group-open:rotate-180" />
					<span className="group-open:hidden">Show</span>
					<span className="hidden group-open:block">Hide</span>
				</span>
			</summary>
			<pre className="mt-2 overflow-auto select-text">{JSON.stringify(metadata, null, 2)}</pre>
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

const MessageRating = ({ messageId, content }: { messageId?: string; content?: string }) => {
	const [rating, setRating] = useState<'good' | 'bad' | null>(null)
	const [isRating, setIsRating] = useState(false)
	const [copied, setCopied] = useState(false)
	const { authorizedFetch } = useAuthContext()

	const handleRate = async (newRating: 'good' | 'bad') => {
		if (!messageId || isRating) return
		setIsRating(true)
		try {
			await authorizedFetch(`${MCP_SERVER}/user/messages/${messageId}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating: newRating })
			})
			setRating(newRating)
		} catch (error) {
			console.error('Failed to rate message:', error)
		}
		setIsRating(false)
	}

	const handleCopy = async () => {
		if (!content) return
		try {
			await navigator.clipboard.writeText(content)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy content:', error)
		}
	}

	if (!messageId) return null

	return (
		<div className="mt-3 flex items-center gap-1 opacity-60 hover:opacity-100">
			<button
				onClick={() => handleRate('good')}
				disabled={isRating}
				className={`rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 ${rating === 'good' ? 'text-green-600' : 'text-gray-500'}`}
			>
				<Icon name="chevron-up" height={16} width={16} />
			</button>
			<button
				onClick={() => handleRate('bad')}
				disabled={isRating}
				className={`rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 ${rating === 'bad' ? 'text-red-600' : 'text-gray-500'}`}
			>
				<Icon name="chevron-down" height={16} width={16} />
			</button>
			{content && (
				<button onClick={handleCopy} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
					{copied ? <Icon name="check-circle" height={16} width={16} /> : <Icon name="copy" height={16} width={16} />}
				</button>
			)}
			it
		</div>
	)
}

const Answer = ({ content, messageId }: { content: string; messageId?: string }) => {
	return (
		<div>
			<div className="prose prose-sm dark:prose-invert prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:whitespace-nowrap prose-td:whitespace-nowrap prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2 max-w-none overflow-x-auto">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
			</div>
			<MessageRating messageId={messageId} content={content} />
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
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/10 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
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
