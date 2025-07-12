import { useMutation } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import Layout from '~/layout'
import * as Ariakit from '@ariakit/react'
import { getAnchorRect, getSearchValue, getTrigger, getTriggerOffset, replaceValue } from './utils'
import { matchSorter } from 'match-sorter'
import { getList, getValue } from './list'
import { ISearchData } from './types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ChartRenderer from '~/components/ChartRenderer'
import ChartNavigation from '~/components/ChartRenderer/ChartNavigation'

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
	matchedEntities,
	onProgress,
	abortSignal,
	sessionId
}: {
	prompt?: string
	userQuestion: string
	matchedEntities?: Record<string, string[]>
	onProgress?: (data: {
		type: 'token' | 'progress' | 'session' | 'suggestions'
		content: string
		stage?: string
		sessionId?: string
		suggestions?: any[]
	}) => void
	abortSignal?: AbortSignal
	sessionId?: string | null
}) {
	let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

	try {
		const requestBody: any = {
			message: userQuestion,
			stream: true
		}

		if (sessionId) {
			requestBody.sessionId = sessionId
		}

		const response = await fetch('http://localhost:6969/chatbot-agent', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody),
			signal: abortSignal
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		if (!response.body) {
			throw new Error('No response body')
		}

		reader = response.body.getReader()
		const decoder = new TextDecoder()
		let fullResponse = ''
		let chartData = null
		let metadata = null
		let suggestions = null

		while (true) {
			if (abortSignal?.aborted) {
				throw new Error('Request aborted')
			}

			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })
			const lines = chunk.split('\n')

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					try {
						const data = JSON.parse(line.slice(6))

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
						} else if (data.type === 'chart_data') {
							chartData = data.chartData
						} else if (data.type === 'metadata') {
							metadata = data.metadata
						} else if (data.type === 'suggestions') {
							suggestions = data.suggestions
						} else if (data.type === 'error') {
							throw new Error(data.content)
						}
					} catch (e) {}
				}
			}
		}

		return {
			prompt: prompt ?? userQuestion,
			response: {
				answer: fullResponse,
				chartData,
				metadata,
				suggestions
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

export function LlamaAI({ searchData }: { searchData: ISearchData }) {
	const [streamingResponse, setStreamingResponse] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [progressMessage, setProgressMessage] = useState('')
	const [progressStage, setProgressStage] = useState('')
	const [streamingSuggestions, setStreamingSuggestions] = useState<any[] | null>(null)
	const [sessionId, setSessionId] = useState<string | null>(() => {
		const stored = typeof window !== 'undefined' ? localStorage.getItem(sessionStorageKey) : null
		return stored
	})
	const [conversationHistory, setConversationHistory] = useState<
		Array<{
			question: string
			response: { answer: string; chartData?: any; metadata?: any; suggestions?: any[] }
			timestamp: number
		}>
	>([])
	const abortControllerRef = useRef<AbortController | null>(null)
	const streamingContentRef = useRef<StreamingContent>(new StreamingContent())

	const [prompt, setPrompt] = useState('')
	const entitiesRef = useRef<{ entities: Set<string>; matchedEntities: Record<string, Set<string>> }>({
		entities: new Set(),
		matchedEntities: {
			chain: new Set(),
			protocol: new Set(),
			protocol_parent: new Set()
		}
	})

	const {
		data: promptResponse,
		mutate: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: ({
			userQuestion,
			matchedEntities
		}: {
			userQuestion: string
			matchedEntities: Record<string, string[]>
		}) => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			abortControllerRef.current = new AbortController()

			setIsStreaming(true)
			setStreamingResponse('')
			setProgressMessage('')
			setProgressStage('')
			setStreamingSuggestions(null)

			streamingContentRef.current.reset()

			return fetchPromptResponse({
				userQuestion,
				matchedEntities,
				sessionId,
				onProgress: (data) => {
					if (data.type === 'token') {
						const processedContent = streamingContentRef.current.addChunk(data.content)
						setStreamingResponse(processedContent)
					} else if (data.type === 'progress') {
						setProgressMessage(data.content)
						setProgressStage(data.stage || '')
					} else if (data.type === 'session' && data.sessionId) {
						setSessionId(data.sessionId)

						if (typeof window !== 'undefined') {
							localStorage.setItem(sessionStorageKey, data.sessionId)
						}
					} else if (data.type === 'suggestions') {
						setStreamingSuggestions(data.suggestions)
					}
				},
				abortSignal: abortControllerRef.current.signal
			})
		},
		onMutate: ({
			userQuestion,
			matchedEntities
		}: {
			userQuestion: string
			matchedEntities: Record<string, string[]>
		}) => {},
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
						chartData: data?.response?.chartData,
						metadata: data?.response?.metadata,
						suggestions: data?.response?.suggestions
					},
					timestamp: Date.now()
				}
			])

			setPrompt('')

			entitiesRef.current = {
				entities: new Set(),
				matchedEntities: {
					chain: new Set(),
					protocol: new Set(),
					protocol_parent: new Set()
				}
			}
		},
		onError: (error) => {
			setIsStreaming(false)
			abortControllerRef.current = null

			const finalContent = streamingContentRef.current.getContent()
			if (finalContent !== streamingResponse) {
				setStreamingResponse(finalContent)
			}

			if (error?.message !== 'Request aborted') {
				console.error('Request failed:', error)
			}
		}
	})

	const handleSubmit = (prompt: string) => {
		let finalPrompt = prompt.trim()
		Array.from(entitiesRef.current.entities).forEach((entity) => {
			finalPrompt = finalPrompt.replaceAll(entity, entity.replace(/@/g, ''))
		})

		setPrompt(finalPrompt)

		submitPrompt({
			userQuestion: finalPrompt,
			matchedEntities: {
				chain: Array.from(entitiesRef.current.matchedEntities.chain),
				protocol: Array.from(entitiesRef.current.matchedEntities.protocol),
				protocol_parent: Array.from(entitiesRef.current.matchedEntities.protocol_parent)
			}
		})
	}

	const handleNewChat = () => {
		setSessionId(null)

		if (typeof window !== 'undefined') {
			localStorage.removeItem(sessionStorageKey)
		}
		setPrompt('')
		resetPrompt()
		setStreamingResponse('')
		setProgressMessage('')
		setProgressStage('')
		setStreamingSuggestions(null)
		setConversationHistory([])

		streamingContentRef.current.reset()
		entitiesRef.current = {
			entities: new Set(),
			matchedEntities: {
				chain: new Set(),
				protocol: new Set(),
				protocol_parent: new Set()
			}
		}
	}

	const handleSuggestionClick = (suggestion: any) => {
		let promptText = ''

		if (suggestion.toolName === 'find_protocols') {
			const { filters, sort_by, limit } = suggestion.arguments
			if (filters?.chain) {
				promptText = `Show me the top ${limit || 10} protocols by ${
					sort_by?.replace(' desc', '')?.replace('_', ' ') || 'TVL'
				} on ${filters.chain}`
			} else {
				promptText = `Show me the top ${limit || 10} protocols by ${
					sort_by?.replace(' desc', '')?.replace('_', ' ') || 'TVL'
				}`
			}
		} else if (suggestion.toolName === 'get_historical_metrics') {
			const { entity_slugs, metric, days } = suggestion.arguments
			promptText = `Show me the historical ${metric?.toUpperCase() || 'TVL'} data for ${entity_slugs} over the last ${
				days || 30
			} days`
		} else if (suggestion.toolName === 'market_intelligence') {
			const { analysis_type, scope } = suggestion.arguments
			if (scope?.chain) {
				promptText = `Give me a ${analysis_type?.replace('_', ' ') || 'market overview'} for ${scope.chain}`
			} else {
				promptText = `Give me a ${analysis_type?.replace('_', ' ') || 'market overview'}`
			}
		} else {
			promptText = suggestion.title || suggestion.description
		}

		handleSubmit(promptText)
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
		<Layout title="LlamaAI" defaultSEO>
			<ProtocolsChainsSearch hideFilters />
			<div className="flex gap-2 h-full flex-1">
				<div className="flex-1 flex flex-col gap-3 bg-[var(--cards-bg)] border border-[#e6e6e6] dark:border-[#222324] rounded-md p-3 relative overflow-auto">
					{conversationHistory.length > 0 || isSubmitted ? (
						<div className="flex flex-col gap-3 mb-auto w-full">
							<div className="flex items-center justify-between gap-3 w-full">
								<h1 className="text-lg font-semibold">Chat History</h1>
								<button
									onClick={handleNewChat}
									className="flex items-center justify-center rounded-md gap-2 px-3 py-2 bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)] hover:bg-[rgba(31,103,210,0.2)] transition-colors"
									disabled={isPending || isStreaming}
								>
									<Icon name="message-square-plus" height={16} width={16} />
									<span>New Chat</span>
								</button>
							</div>

							{}
							<div className="flex flex-col gap-4 mb-4">
								{conversationHistory.map((item, index) => (
									<div key={index} className="flex flex-col gap-2">
										<div className="bg-[var(--app-bg)] rounded-lg p-4">
											<div>{item.question}</div>
										</div>
										<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
											<div className="prose prose-sm max-w-none dark:prose-invert prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2">
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{item.response.answer}</ReactMarkdown>
											</div>

											{item.response.suggestions && item.response.suggestions.length > 0 && (
												<div className="space-y-3 mt-4">
													<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested actions:</h4>
													<div className="grid gap-2">
														{item.response.suggestions.map((suggestion, suggestionIndex) => (
															<button
																key={suggestionIndex}
																onClick={() => handleSuggestionClick(suggestion)}
																className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
															>
																<div className="flex items-start justify-between gap-3">
																	<div className="flex-1 min-w-0">
																		<div className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
																			{suggestion.title}
																		</div>
																		<div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
																			{suggestion.description}
																		</div>
																	</div>
																	<Icon
																		name="arrow-right"
																		height={16}
																		width={16}
																		className="text-gray-400 group-hover:text-blue-500 shrink-0"
																	/>
																</div>
															</button>
														))}
													</div>
												</div>
											)}

											{item.response.metadata && (
												<details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4">
													<summary className="text-sm font-medium cursor-pointer">Query Metadata</summary>
													<pre className="text-xs mt-2 overflow-auto">
														{JSON.stringify(item.response.metadata, null, 2)}
													</pre>
												</details>
											)}
										</div>
									</div>
								))}
							</div>

							{}
							{(isPending || isStreaming || promptResponse || error) && (
								<div className="flex flex-col gap-2">
									{prompt && (
										<div className="bg-[var(--app-bg)] rounded-lg p-4">
											<div>{prompt}</div>
										</div>
									)}
									<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
										<PromptResponse
											response={
												promptResponse?.response ||
												(streamingSuggestions ? { answer: '', suggestions: streamingSuggestions } : undefined)
											}
											error={error?.message}
											isPending={isPending}
											streamingResponse={streamingResponse}
											isStreaming={isStreaming}
											progressMessage={progressMessage}
											progressStage={progressStage}
											onSuggestionClick={handleSuggestionClick}
										/>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center flex-1">
							<img src="/icons/llama-ai.svg" alt="LlamaAI" className="object-contain" width={64} height={77} />
							<h1 className="text-2xl font-semibold">What can I help you with ?</h1>
						</div>
					)}
					<PromptInput
						handleSubmit={handleSubmit}
						isPending={isPending}
						searchData={searchData}
						entitiesRef={entitiesRef}
					/>
					{conversationHistory.length === 0 && !isSubmitted ? (
						<div className="flex items-center gap-4 justify-center flex-wrap w-full pb-[100px]">
							{recommendedPrompts.map((prompt) => (
								<button
									key={prompt}
									onClick={() => {
										setPrompt(prompt)
										submitPrompt({ userQuestion: prompt, matchedEntities: {} })
									}}
									disabled={isPending}
									className="flex items-center justify-center rounded-lg gap-2 px-4 py-1 text-[#666] dark:text-[#919296] border border-[#e6e6e6] dark:border-[#222324]"
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
	isPending,
	searchData,
	entitiesRef
}: {
	handleSubmit: (prompt: string) => void
	isPending: boolean
	searchData: ISearchData
	entitiesRef: React.MutableRefObject<{ entities: Set<string>; matchedEntities: Record<string, Set<string>> }>
}) => {
	const ref = useRef<HTMLTextAreaElement>(null)
	const highlightRef = useRef<HTMLDivElement>(null)
	const [value, setValue] = useState('')
	const [trigger, setTrigger] = useState<string | null>(null)
	const [caretOffset, setCaretOffset] = useState<number | null>(null)

	const combobox = Ariakit.useComboboxStore()

	const searchValue = Ariakit.useStoreState(combobox, 'value')
	const deferredSearchValue = useDeferredValue(searchValue)

	const matches = useMemo(() => {
		return matchSorter(getList(trigger, searchData), deferredSearchValue, {
			keys: ['listValue'],
			sorter: (rankedItems) => rankedItems.sort((a, b) => b.item.tvl - a.item.tvl),
			threshold: matchSorter.rankings.CONTAINS
		}).slice(0, 10)
	}, [trigger, deferredSearchValue])

	const hasMatches = !!matches.length

	useLayoutEffect(() => {
		combobox.setOpen(hasMatches)
	}, [combobox, hasMatches])

	useLayoutEffect(() => {
		if (caretOffset != null) {
			ref.current?.setSelectionRange(caretOffset, caretOffset)
		}
	}, [caretOffset])

	useEffect(combobox.render, [combobox, value])

	const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			combobox.hide()
		}

		if (event.key === 'Enter' && !event.shiftKey && combobox.getState().renderedItems.length === 0) {
			event.preventDefault()
			handleSubmit(value)
			setValue('')
			if (highlightRef.current) {
				highlightRef.current.innerHTML = ''
			}
		}
	}

	const highlightTimerId = useRef<NodeJS.Timeout | null>(null)

	const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (highlightRef.current) {
			highlightRef.current.innerHTML = event.target.value
		}

		if (highlightTimerId.current) {
			clearTimeout(highlightTimerId.current)
		}
		highlightTimerId.current = setTimeout(() => {
			if (highlightRef.current) {
				highlightRef.current.innerHTML = highlightWord(event.target.value, Array.from(entitiesRef.current.entities))
			}
		}, 300)

		const trigger = getTrigger(event.target)
		const searchValue = getSearchValue(event.target)

		if (trigger) {
			setTrigger(trigger)
			combobox.show()
		} else if (!searchValue) {
			setTrigger(null)
			combobox.hide()
		}

		setValue(event.target.value)

		combobox.setValue(searchValue)
	}

	const onItemClick = (listValue: string) => () => {
		const textarea = ref.current
		if (!textarea) return

		const offset = getTriggerOffset(textarea)

		const itemValue: { listValue: string; slug: string; value: string } = getValue(listValue, trigger, searchData)
		if (!itemValue) return

		entitiesRef.current.entities.add(itemValue.listValue)
		const [mekey, mevalue] = itemValue.slug.split('=')
		entitiesRef.current.matchedEntities[mekey].add(mevalue)

		setTrigger(null)
		const getNewValue = replaceValue(offset, searchValue, itemValue.listValue)
		setValue(getNewValue)
		const nextCaretOffset = offset + itemValue.listValue.length + 1
		setCaretOffset(nextCaretOffset)

		if (highlightRef.current) {
			highlightRef.current.innerHTML = highlightWord(getNewValue(value), Array.from(entitiesRef.current.entities))
		}
	}

	return (
		<>
			<form
				className="w-full relative"
				onSubmit={(e) => {
					e.preventDefault()
					const form = e.target as HTMLFormElement
					handleSubmit(form.prompt.value)
					setValue('')
					if (highlightRef.current) {
						highlightRef.current.innerHTML = ''
					}
				}}
			>
				<div className="w-full relative">
					<Ariakit.Combobox
						store={combobox}
						autoSelect
						value={value}
						showOnClick={false}
						showOnChange={false}
						showOnKeyPress={false}
						setValueOnChange={false}
						render={
							<textarea
								ref={ref}
								rows={5}
								placeholder="Ask LlamaAI... Type @ to insert a protocol, chain"
								onScroll={combobox.render}
								onPointerDown={combobox.hide}
								onChange={onChange}
								onKeyDown={onKeyDown}
								name="prompt"
								className="min-h-[100px] bg-[var(--app-bg)] border border-[#e6e6e6] dark:border-[#222324] text-[var(--app-bg)] caret-black dark:caret-white rounded-md p-4 w-full"
								autoCorrect="off"
								autoComplete="off"
								spellCheck="false"
							/>
						}
						disabled={isPending}
					/>
					<div
						className="absolute top-0 left-0 bottom-0 right-0 whitespace-pre-wrap pointer-events-none z-[1] highlighted-text p-4"
						ref={highlightRef}
					/>
				</div>
				<Ariakit.ComboboxPopover
					store={combobox}
					hidden={!hasMatches}
					unmountOnHide
					fitViewport
					getAnchorRect={() => {
						const textarea = ref.current
						if (!textarea) return null
						return getAnchorRect(textarea)
					}}
					className="relative z-50 flex flex-col overflow-auto overscroll-contain min-w-[100px] max-w-[280px] rounded-md border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)]"
				>
					{matches.map(({ listValue }) => (
						<Ariakit.ComboboxItem
							key={listValue}
							value={listValue}
							focusOnHover
							onClick={onItemClick(listValue)}
							className="flex items-center justify-between gap-3 py-2 px-3 bg-[var(--bg1)] hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer"
						>
							<span>{listValue}</span>
						</Ariakit.ComboboxItem>
					))}
				</Ariakit.ComboboxPopover>
				<button
					className="flex items-center justify-center rounded-md gap-2 h-6 w-6 bg-[rgba(31,103,210,0.12)] border border-[var(--old-blue)] text-[var(--old-blue)] absolute bottom-3 right-2"
					disabled={isPending}
				>
					<Icon name="arrow-up" height={16} width={16} />
					<span className="sr-only">Submit prompt</span>
				</button>
			</form>
		</>
	)
}

const Thinking = () => {
	const [dots, setDots] = useState('')

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => {
				if (prev.length >= 3) return ''
				return prev + '.'
			})
		}, 350)
		return () => clearInterval(interval)
	}, [])

	return <p>Thinking{dots}</p>
}

const PromptResponse = ({
	response,
	error,
	isPending,
	streamingResponse,
	isStreaming,
	progressMessage,
	progressStage,
	onSuggestionClick
}: {
	response?: { answer: string; chartData?: any; metadata?: any; suggestions?: any[] }
	error?: string
	isPending: boolean
	streamingResponse?: string
	isStreaming?: boolean
	progressMessage?: string
	progressStage?: string
	onSuggestionClick?: (suggestion: any) => void
}) => {
	if (error) {
		return <p className="text-red-500">{error}</p>
	}

	if (isPending || isStreaming) {
		return (
			<div className="space-y-4">
				{isStreaming && streamingResponse ? (
					<div className="prose prose-sm max-w-none dark:prose-invert prose-table:table-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingResponse}</ReactMarkdown>
					</div>
				) : isStreaming && progressMessage ? (
					<div className="flex items-center gap-2">
						<div className="flex space-x-1">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: '150ms' }}
							></div>
							<div
								className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
								style={{ animationDelay: '300ms' }}
							></div>
						</div>
						<div>
							{progressMessage}
							{progressStage && <span className="text-gray-500 ml-2">({progressStage})</span>}
						</div>
					</div>
				) : (
					<Thinking />
				)}
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{response?.chartData?.charts &&
				response.chartData.charts.length > 0 &&
				(response.chartData.charts.length > 1 ? (
					<ChartNavigation charts={response.chartData.charts} />
				) : (
					<ChartRenderer chart={response.chartData.charts[0]} />
				))}

			{response?.chartData && (
				<details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
					<summary className="text-sm font-medium cursor-pointer">Raw Chart Data</summary>
					<pre className="text-xs mt-2 overflow-auto">{JSON.stringify(response.chartData, null, 2)}</pre>
				</details>
			)}

			{response?.suggestions && response.suggestions.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested actions:</h4>
					<div className="grid gap-2">
						{response.suggestions.map((suggestion, index) => (
							<button
								key={index}
								onClick={() => onSuggestionClick?.(suggestion)}
								className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
											{suggestion.title}
										</div>
										<div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</div>
									</div>
									<Icon
										name="arrow-right"
										height={16}
										width={16}
										className="text-gray-400 group-hover:text-blue-500 shrink-0"
									/>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{response?.metadata && (
				<details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
					<summary className="text-sm font-medium cursor-pointer">Query Metadata</summary>
					<pre className="text-xs mt-2 overflow-auto">{JSON.stringify(response.metadata, null, 2)}</pre>
				</details>
			)}
		</div>
	)
}

function highlightWord(text: string, words: string[]) {
	if (!Array.isArray(words) || words.length === 0) return text
	const escapedWords = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
	const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi')
	return text.replace(regex, '<span class="highlight">$1</span>')
}
