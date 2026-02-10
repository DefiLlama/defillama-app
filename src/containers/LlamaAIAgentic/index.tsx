import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { PromptInput } from '~/containers/LlamaAI/components/PromptInput'
import { parseArtifactPlaceholders, processCitationMarkers } from '~/containers/LlamaAI/utils/markdownHelpers'
import { ChartRenderer } from './ChartRenderer'
import { fetchAgenticResponse } from './fetchAgenticResponse'
import type { SpawnProgressData } from './fetchAgenticResponse'
import type { ChartConfiguration, Message } from './types'

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeRaw]

const TOOL_LABELS: Record<string, string> = {
	execute_sql: 'Querying database',
	resolve_entity: 'Resolving entity',
	load_skill: 'Loading knowledge',
	generate_chart: 'Generating visualization',
	web_search: 'Searching the web',
	x_search: 'Searching X/Twitter',
	spawn_agent: 'Spawning research agents'
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

export function AgenticChat() {
	const [messages, setMessages] = useState<Message[]>([])
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingText, setStreamingText] = useState('')
	const [streamingCharts, setStreamingCharts] = useState<ChartSet[]>([])
	const [streamingCitations, setStreamingCitations] = useState<string[]>([])
	const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [spawnProgress, setSpawnProgress] = useState<Map<string, SpawnAgentStatus>>(new Map())
	const [spawnStartTime, setSpawnStartTime] = useState(0)

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
	}, [messages, streamingText, streamingCharts, streamingCitations, activeToolCalls, spawnProgress, scrollToBottom])

	const handleSubmit = useCallback(
		(prompt: string) => {
			const trimmed = prompt.trim()
			if (!trimmed || isStreaming) return

			setError(null)
			setIsStreaming(true)
			setStreamingText('')
			setStreamingCharts([])
			setStreamingCitations([])
			setActiveToolCalls([])
			setSpawnProgress(new Map())
			setSpawnStartTime(0)

			setMessages((prev) => [...prev, { role: 'user', content: trimmed }])

			let accumulatedText = ''
			let accumulatedCharts: ChartSet[] = []
			let accumulatedCitations: string[] = []
			let hasStartedText = false
			let spawnStarted = false

			const controller = new AbortController()
			abortControllerRef.current = controller

			fetchAgenticResponse({
				message: trimmed,
				sessionId,
				researchMode: isResearchMode,
				abortSignal: controller.signal,
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
					onError: (content) => {
						setError(content)
					},
					onDone: () => {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: accumulatedText || undefined,
								charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
								citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined
							}
						])
						setStreamingText('')
						setStreamingCharts([])
						setStreamingCitations([])
						setActiveToolCalls([])
						setSpawnProgress(new Map())
						setSpawnStartTime(0)
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
							charts: accumulatedCharts.length > 0 ? accumulatedCharts : undefined,
							citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined
						}
					])
				}
				setStreamingText('')
				setStreamingCharts([])
				setStreamingCitations([])
				setActiveToolCalls([])
				setSpawnProgress(new Map())
				setSpawnStartTime(0)
				setIsStreaming(false)
			}).finally(() => {
				abortControllerRef.current = null
			})
		},
		[isStreaming, sessionId, isResearchMode]
	)

	const handleStopRequest = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const hasMessages = messages.length > 0 || isStreaming

	return (
		<div className="isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324]">
			{!hasMessages ? (
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

									{isStreaming && activeToolCalls.length === 0 && spawnProgress.size === 0 && !streamingText && streamingCharts.length === 0 && (
										<TypingIndicator />
									)}

									{spawnProgress.size > 0 ? (
										<SpawnProgressCard agents={spawnProgress} startTime={spawnStartTime} />
									) : (
										activeToolCalls.map((tc) => (
											<ToolIndicator key={tc.id} label={tc.label} name={tc.name} />
										))
									)}

									{isStreaming && (streamingText || streamingCharts.length > 0 || streamingCitations.length > 0) && (
										<InlineContent
											text={streamingText}
											chartSets={streamingCharts}
											citations={streamingCitations}
											isStreaming
										/>
									)}

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
					{isExpanded ? (
						<polyline points="18 15 12 9 6 15" />
					) : (
						<polyline points="6 9 12 15 18 9" />
					)}
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
										{' '}— Complete ({a.toolCount} tools{a.chartCount ? `, ${a.chartCount} charts` : ''})
									</span>
								)}
								{a.status === 'started' && (
									<span className="opacity-60"> — Starting...</span>
								)}
								{a.status === 'error' && (
									<span className="opacity-60"> — Error</span>
								)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
})

function InlineContent({
	text,
	chartSets,
	citations,
	isStreaming = false
}: {
	text: string
	chartSets: ChartSet[]
	citations: string[]
	isStreaming?: boolean
}) {
	const chartIndex = useMemo(() => buildChartIndex(chartSets), [chartSets])

	const { parts, referencedIds } = useMemo(() => {
		const parsed = parseArtifactPlaceholders(text)
		return { parts: parsed.parts, referencedIds: parsed.chartIds }
	}, [text])

	const unreferencedCharts = useMemo(() => {
		const all: { chart: ChartConfiguration; chartData: Record<string, any[]> }[] = []
		for (const [id, entry] of chartIndex) {
			if (!referencedIds.has(id)) all.push(entry)
		}
		return all
	}, [chartIndex, referencedIds])

	const processedCitations = citations.length > 0 ? citations : undefined

	return (
		<div className="flex flex-col gap-2.5">
			{referencedIds.size > 0 ? (
				parts.map((part, i) => {
					if (part.type === 'chart' && part.chartId) {
						const entry = chartIndex.get(part.chartId)
						if (entry) {
							return (
								<div key={`inline-chart-${part.chartId}-${i}`} className="my-2">
									<ChartRenderer charts={[entry.chart]} chartData={entry.chartData} />
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
					if (!part.content) return null
					return (
						<div key={`text-${i}`} className="prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
								{processCitationMarkers(part.content, processedCitations)}
							</ReactMarkdown>
						</div>
					)
				})
			) : (
				text && (
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
							{processCitationMarkers(text, processedCitations)}
						</ReactMarkdown>
					</div>
				)
			)}
			{isStreaming && text && <span className="inline-block h-4 w-0.5 animate-pulse bg-(--old-blue)" />}
			{unreferencedCharts.map((entry, i) => (
				<ChartRenderer key={`chart-${entry.chart.id || i}`} charts={[entry.chart]} chartData={entry.chartData} />
			))}
			{citations.length > 0 && <CitationSources citations={citations} />}
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

function CitationSources({ citations }: { citations: string[] }) {
	return (
		<details className="flex flex-col text-sm">
			<summary className="mr-auto flex cursor-pointer items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-2 py-1 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
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
				>
					<path d="M9 17H7A5 5 0 0 1 7 7h2" />
					<path d="M15 7h2a5 5 0 1 1 0 10h-2" />
					<line x1="8" x2="16" y1="12" y2="12" />
				</svg>
				<span>Sources</span>
			</summary>
			<div className="flex flex-col gap-2.5 pt-2.5">
				{citations.map((url, i) => (
					<a
						key={`citation-${i}-${url}`}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex items-start gap-2.5 rounded-lg border border-[#e6e6e6] p-2 hover:border-(--old-blue) hover:bg-(--old-blue)/12 dark:border-[#222324]"
					>
						<span className="rounded bg-[rgba(0,0,0,0.04)] px-1.5 text-(--old-blue) dark:bg-[rgba(145,146,150,0.12)]">
							{i + 1}
						</span>
						<span className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</span>
					</a>
				))}
			</div>
		</details>
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
		<InlineContent
			text={message.content || ''}
			chartSets={message.charts || []}
			citations={message.citations || []}
		/>
	)
}
