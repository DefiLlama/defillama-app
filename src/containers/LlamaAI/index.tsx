import { RefObject, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { ChartRenderer } from './components/ChartRenderer'

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
		type: 'token' | 'progress' | 'session' | 'suggestions' | 'charts' | 'error'
		content: string
		stage?: string
		sessionId?: string
		suggestions?: any[]
		charts?: any[]
		chartData?: any[]
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

const sessionStorageKey = 'llama-ai-session'

export function LlamaAI() {
	const { authorizedFetch } = useAuthContext()

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
	const [mode, setMode] = useState<'auto' | 'sql_only'>(() => {
		const stored = typeof window !== 'undefined' ? localStorage.getItem('llama-ai-mode') : null
		return (stored as 'auto' | 'sql_only') || 'auto'
	})
	const [sessionId, setSessionId] = useState<string | null>(() => {
		const stored = typeof window !== 'undefined' ? localStorage.getItem(sessionStorageKey) : null
		return stored
	})
	const [conversationHistory, setConversationHistory] = useState<
		Array<{
			question: string
			response: { answer: string; metadata?: any; suggestions?: any[]; charts?: any[]; chartData?: any[] }
			timestamp: number
		}>
	>([])
	const abortControllerRef = useRef<AbortController | null>(null)
	const streamingContentRef = useRef<StreamingContent>(new StreamingContent())

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
	}

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
				sessionId,
				suggestionContext,
				mode,
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
						setSessionId(data.sessionId)

						if (typeof window !== 'undefined') {
							localStorage.setItem(sessionStorageKey, data.sessionId)
						}
					} else if (data.type === 'suggestions') {
						setStreamingSuggestions(data.suggestions)
					} else if (data.type === 'charts') {
						setStreamingCharts(data.charts)
						setStreamingChartData(data.chartData)
						setIsGeneratingCharts(false)
						setIsAnalyzingForCharts(false)
					} else if (data.type === 'error') {
						setStreamingError(data.content)
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
		}
	})

	const handleSubmit = (prompt: string) => {
		const finalPrompt = prompt.trim()
		setPrompt(finalPrompt)
		submitPrompt({ userQuestion: finalPrompt })
	}

	const handleSubmitWithSuggestion = (prompt: string, suggestion: any) => {
		const finalPrompt = prompt.trim()
		setPrompt(finalPrompt)
		submitPrompt({
			userQuestion: finalPrompt,
			suggestionContext: suggestion
		})
	}

	const handleNewChat = async () => {
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

		if (typeof window !== 'undefined') {
			localStorage.removeItem(sessionStorageKey)
		}
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
		promptInputRef.current?.focus()
	}

	const handleSuggestionClick = (suggestion: any) => {
		let promptText = ''

		promptText = suggestion.title || suggestion.description

		handleSubmitWithSuggestion(promptText, suggestion)
	}

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	const isSubmitted = isPending || isStreaming || error || promptResponse ? true : false

	return (
		<Layout
			title="LlamaAI - DefiLlama"
			description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
		>
			<div className="relative isolate flex flex-1 flex-col rounded-md border border-[#e6e6e6] bg-(--cards-bg) p-2.5 dark:border-[#222324]">
				<div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2.5">
					{conversationHistory.length > 0 || isSubmitted ? (
						<div className="flex max-h-full w-full flex-1 flex-col gap-2 p-2">
							<div className="flex w-full items-center justify-between gap-3">
								<button
									onClick={handleNewChat}
									className="bg-[rgba(31,103,210,0.12) hover:bg-[rgba(31,103,210,0.2) flex items-center justify-center gap-2 rounded-md border border-(--old-blue) px-3 py-2 text-(--old-blue) transition-colors"
									disabled={isPending || isStreaming}
								>
									<Icon name="message-square-plus" height={16} width={16} />
									<span>New Chat</span>
								</button>
							</div>
							<div className="flex flex-col gap-2.5">
								{conversationHistory.map((item, index) => (
									<div key={index} className="flex flex-col gap-2.5">
										<p className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
											{item.question}
										</p>

										<div className="flex flex-col gap-2.5">
											<div className="prose prose-sm dark:prose-invert prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2 prose-td:whitespace-nowrap prose-th:whitespace-nowrap max-w-none overflow-x-auto">
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{item.response.answer}</ReactMarkdown>
											</div>

											{item.response.charts && item.response.charts.length > 0 && (
												<ChartRenderer charts={item.response.charts} chartData={item.response.chartData || []} />
											)}

											{item.response.suggestions && item.response.suggestions.length > 0 && (
												<div className="mt-4 space-y-3">
													<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested actions:</h4>
													<div className="grid gap-2">
														{item.response.suggestions.map((suggestion, suggestionIndex) => (
															<button
																key={suggestionIndex}
																onClick={() => handleSuggestionClick(suggestion)}
																disabled={isPending || isStreaming}
																className={`group rounded-lg border border-gray-200 p-3 text-left transition-colors dark:border-gray-700 ${
																	isPending || isStreaming
																		? 'cursor-not-allowed opacity-50'
																		: 'hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20'
																}`}
															>
																<div className="flex items-start justify-between gap-3">
																	<div className="min-w-0 flex-1">
																		<div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
																			{suggestion.title}
																		</div>
																		<div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
																			{suggestion.description}
																		</div>
																	</div>
																	<Icon
																		name="arrow-right"
																		height={16}
																		width={16}
																		className="shrink-0 text-gray-400 group-hover:text-blue-500"
																	/>
																</div>
															</button>
														))}
													</div>
												</div>
											)}
											{item.response.metadata && (
												<details className="group mt-4 rounded-md bg-gray-50 p-2 text-xs dark:bg-gray-800">
													<summary className="flex flex-wrap items-center justify-between gap-2 font-medium">
														<span>Query Metadata</span>
														<span className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
															<Icon
																name="chevron-down"
																height={14}
																width={14}
																className="transition-transform group-open:rotate-180"
															/>
															<span className="group-open:hidden">Show</span>
															<span className="hidden group-open:block">Hide</span>
														</span>
													</summary>
													<pre className="mt-2 overflow-auto">{JSON.stringify(item.response.metadata, null, 2)}</pre>
												</details>
											)}
										</div>
									</div>
								))}
							</div>
							{(isPending || isStreaming || promptResponse || error) && (
								<div className="flex flex-col gap-2.5">
									{prompt && (
										<p className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
											{prompt}
										</p>
									)}
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
					<PromptInput
						handleSubmit={handleSubmit}
						promptInputRef={promptInputRef}
						isPending={isPending}
						handleStopRequest={handleStopRequest}
						isStreaming={isStreaming}
					/>
					{conversationHistory.length === 0 && !isSubmitted ? (
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
		if (event.key === 'Enter' && !event.shiftKey) {
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
					className="w-full rounded-md border border-[#e6e6e6] bg-(--app-bg) p-4 caret-black max-sm:text-base dark:border-[#222324] dark:caret-white"
					autoCorrect="off"
					autoComplete="off"
					spellCheck="false"
					disabled={isPending}
					autoFocus
					ref={promptInputRef}
				/>
				{isStreaming ? (
					<button
						type="button"
						onClick={handleStopRequest}
						className="absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center gap-2 rounded-md border border-red-500 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
					>
						<Icon name="x" height={14} width={14} />
						<span className="sr-only">Stop streaming</span>
					</button>
				) : (
					<button
						type="submit"
						className="bg-[rgba(31,103,210,0.12) absolute right-2 bottom-3 flex h-6 w-6 items-center justify-center gap-2 rounded-md border border-(--old-blue) text-(--old-blue) disabled:opacity-50"
						disabled={isPending || !value.trim()}
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
	expectedChartInfo
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
}) => {
	if (error) {
		return <p className="text-red-500">{error}</p>
	}

	if (isPending || isStreaming) {
		return (
			<>
				{streamingError ? (
					<div className="text-red-500">{streamingError}</div>
				) : isStreaming && streamingResponse ? (
					<div className="prose prose-sm dark:prose-invert prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:whitespace-nowrap prose-td:whitespace-nowrap prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2 max-w-none overflow-x-auto">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingResponse}</ReactMarkdown>
					</div>
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
				/>
			)}
			{response?.suggestions && response.suggestions.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested actions:</h4>
					<div className="grid gap-2">
						{response.suggestions.map((suggestion, index) => (
							<button
								key={index}
								onClick={() => onSuggestionClick?.(suggestion)}
								disabled={isPending || isStreaming}
								className={`group rounded-lg border border-gray-200 p-3 text-left transition-colors dark:border-gray-700 ${
									isPending || isStreaming
										? 'cursor-not-allowed opacity-50'
										: 'hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20'
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
											{suggestion.title}
										</div>
										<div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{suggestion.description}</div>
									</div>
									<Icon
										name="arrow-right"
										height={16}
										width={16}
										className="shrink-0 text-gray-400 group-hover:text-blue-500"
									/>
								</div>
							</button>
						))}
					</div>
				</div>
			)}
			{response?.metadata && (
				<details className="group rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
					<summary className="flex flex-wrap items-center justify-between gap-2 font-medium">
						<span>Query Metadata</span>
						<span className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
							<Icon name="chevron-down" height={14} width={14} className="transition-transform group-open:rotate-180" />
							<span className="group-open:hidden">Show</span>
							<span className="hidden group-open:block">Hide</span>
						</span>
					</summary>
					<pre className="mt-2 overflow-auto">{JSON.stringify(response.metadata, null, 2)}</pre>
				</details>
			)}
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
