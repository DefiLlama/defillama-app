import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import { ChartRenderer } from './ChartRenderer'
import { fetchAgenticResponse } from './fetchAgenticResponse'
import type { ChartConfiguration, Message } from './types'

const REMARK_PLUGINS = [remarkGfm]

const TOOL_LABELS: Record<string, string> = {
	execute_sql: 'Querying database',
	resolve_entity: 'Resolving entity',
	load_skill: 'Loading knowledge',
	generate_chart: 'Generating visualization'
}

interface ToolCall {
	id: number
	name: string
	label: string
}

export function AgenticChat() {
	const [messages, setMessages] = useState<Message[]>([])
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingText, setStreamingText] = useState('')
	const [streamingCharts, setStreamingCharts] = useState<
		Array<{ charts: ChartConfiguration[]; chartData: Record<string, any[]> }>
	>([])
	const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isResearchMode, setIsResearchMode] = useState(false)

	const abortControllerRef = useRef<AbortController | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const promptInputRef = useRef<HTMLTextAreaElement>(null)
	const toolCallIdRef = useRef(0)

	const scrollToBottom = useCallback(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: 'smooth'
			})
		}
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [messages, streamingText, streamingCharts, activeToolCalls, scrollToBottom])

	const handleSubmit = useCallback(
		(prompt: string) => {
			const trimmed = prompt.trim()
			if (!trimmed || isStreaming) return

			setError(null)
			setIsStreaming(true)
			setStreamingText('')
			setStreamingCharts([])
			setActiveToolCalls([])

			// Add user message
			setMessages((prev) => [...prev, { role: 'user', content: trimmed }])

			let accumulatedText = ''
			let accumulatedCharts: Array<{ charts: ChartConfiguration[]; chartData: Record<string, any[]> }> = []
			let hasStartedText = false

			const controller = new AbortController()
			abortControllerRef.current = controller

			fetchAgenticResponse({
				message: trimmed,
				sessionId,
				abortSignal: controller.signal,
				callbacks: {
					onToken: (content) => {
						if (!hasStartedText) {
							hasStartedText = true
							setActiveToolCalls([])
						}
						accumulatedText += content
						setStreamingText(accumulatedText)
					},
					onCharts: (charts, chartData) => {
						setActiveToolCalls([])
						accumulatedCharts = [...accumulatedCharts, { charts, chartData }]
						setStreamingCharts(accumulatedCharts)
					},
					onProgress: (toolName) => {
						const label = TOOL_LABELS[toolName] || toolName
						const id = ++toolCallIdRef.current
						setActiveToolCalls((prev) => [...prev, { id, name: toolName, label }])
					},
					onSessionId: (id) => {
						setSessionId(id)
					},
					onError: (content) => {
						setError(content)
					},
					onDone: () => {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: accumulatedText || undefined,
								charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined
							}
						])
						setStreamingText('')
						setStreamingCharts([])
						setActiveToolCalls([])
						setIsStreaming(false)
					}
				}
			}).catch((err: any) => {
				if (err?.name !== 'AbortError') {
					setError(err?.message || 'Failed to get response')
				}
				if (accumulatedText || accumulatedCharts.length > 0) {
					setMessages((prev) => [
						...prev,
						{
							role: 'assistant',
							content: accumulatedText || undefined,
							charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined
						}
					])
				}
				setStreamingText('')
				setStreamingCharts([])
				setActiveToolCalls([])
				setIsStreaming(false)
			}).finally(() => {
				abortControllerRef.current = null
			})
		},
		[isStreaming, sessionId]
	)

	const handleStopRequest = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const hasMessages = messages.length > 0 || isStreaming

	return (
		<div className="isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324]">
			{!hasMessages ? (
				/* ── Empty state ── */
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
					/>
				</div>
			) : (
				/* ── Chat with messages ── */
				<>
					<div
						ref={scrollContainerRef}
						className="thin-scrollbar relative flex-1 overflow-y-auto p-2.5 max-lg:px-0"
					>
						<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
							<div className="flex w-full flex-col gap-2 px-2 pb-2.5">
								<div className="flex flex-col gap-2.5">
									{messages.map((msg, i) => (
										<MessageBubble key={i} message={msg} />
									))}

									{/* Typing indicator — shows immediately on submit before anything arrives */}
									{isStreaming && activeToolCalls.length === 0 && !streamingText && streamingCharts.length === 0 && (
										<TypingIndicator />
									)}

									{/* Tool call indicators */}
									{activeToolCalls.map((tc) => (
										<ToolIndicator key={tc.id} label={tc.label} name={tc.name} />
									))}

									{/* Streaming assistant content */}
									{isStreaming && (streamingText || streamingCharts.length > 0) && (
										<div className="flex flex-col gap-2.5">
											{streamingText && (
												<div className="prose prose-sm dark:prose-invert max-w-none">
													<ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{streamingText}</ReactMarkdown>
													<span className="inline-block h-4 w-0.5 animate-pulse bg-(--old-blue)" />
												</div>
											)}
											{streamingCharts.map((chartSet, i) => (
												<ChartRenderer
													key={`streaming-chart-${i}`}
													charts={chartSet.charts}
													chartData={chartSet.chartData}
												/>
											))}
										</div>
									)}

									{/* Error display */}
									{error && (
										<div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
											<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
										</div>
									)}
								</div>
							</div>
							<div ref={messagesEndRef} />
						</div>
					</div>

					{/* Input area with gradient overlay */}
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
						/>
					</div>
				</>
			)}
		</div>
	)
}

function TypingIndicator() {
	return (
		<div className="flex items-center gap-1.5 py-2">
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] dark:bg-[#919296] [animation-delay:0ms]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] dark:bg-[#919296] [animation-delay:150ms]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#666] dark:bg-[#919296] [animation-delay:300ms]" />
		</div>
	)
}

function ToolIndicator({ label, name }: { label: string; name: string }) {
	return (
		<div className="flex items-center gap-2 py-1.5">
			<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--old-blue)" />
			<span className="text-xs text-[#666] dark:text-[#919296]">
				{label} <span className="font-mono text-[10px] opacity-60">{name}</span>
			</span>
		</div>
	)
}

function MessageBubble({ message }: { message: Message }) {
	if (message.role === 'user') {
		return (
			<div className="ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
				<p>{message.content}</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-2.5">
			{message.content && (
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{message.content}</ReactMarkdown>
				</div>
			)}
			{message.charts?.map((chartSet, i) => (
				<ChartRenderer key={`chart-${i}`} charts={chartSet.charts} chartData={chartSet.chartData} />
			))}
		</div>
	)
}
