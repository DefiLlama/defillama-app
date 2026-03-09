import { MCP_SERVER } from '~/constants'
import { getErrorMessage } from '~/utils/error'
import type { ChartConfiguration, AlertProposedData, ToolExecution } from './types'

export interface CsvExport {
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

export interface SpawnProgressData {
	agentId: string
	status: 'started' | 'tool_call' | 'completed' | 'error'
	tool?: string
	toolCount?: number
	chartCount?: number
	findingsPreview?: string
}

export interface AgenticSSECallbacks {
	onToken: (content: string) => void
	onCharts: (charts: ChartConfiguration[], chartData: Record<string, unknown[]>) => void
	onProgress: (toolName: string) => void
	onSpawnProgress: (data: SpawnProgressData) => void
	onSessionId: (sessionId: string) => void
	onCitations: (citations: string[]) => void
	onCsvExport?: (exports: CsvExport[]) => void
	onAlertProposed?: (data: AlertProposedData) => void
	onToolExecution?: (data: ToolExecution) => void
	onThinking?: (content: string) => void
	onCompaction?: (data: { status: 'started' | 'completed'; messagesBefore: number; messagesAfter?: number }) => void
	onTitle?: (title: string) => void
	onMessageId?: (messageId: string) => void
	onError: (content: string) => void
	onDone: () => void
}

interface SessionEvent {
	type: 'session'
	sessionId: string
}

interface ToolCallEvent {
	type: 'tool_call'
	name: string
}

interface ResponseChunkEvent {
	type: 'response_chunk'
	content: string
}

interface ChartsEvent {
	type: 'charts'
	charts?: ChartConfiguration[]
	chartData?: Record<string, unknown[]>
}

interface CsvExportEvent {
	type: 'csv_export'
	exports?: CsvExport[]
}

interface AlertProposedEvent extends AlertProposedData {
	type: 'alert_proposed'
}

interface CompactionEvent {
	type: 'compaction'
	status: 'started' | 'completed'
	messagesBefore: number
	messagesAfter?: number
}

interface ThinkingEvent {
	type: 'thinking'
	content: string
}

interface CitationsEvent {
	type: 'citations'
	citations?: string[]
}

interface TitleEvent {
	type: 'title'
	content: string
}

interface MessageIdEvent {
	type: 'message_id'
	messageId: string
}

interface ErrorEvent {
	type: 'error'
	content?: string
}

interface DoneEvent {
	type: 'done'
}

type AgenticSSEEvent =
	| SessionEvent
	| ToolCallEvent
	| ResponseChunkEvent
	| ChartsEvent
	| CsvExportEvent
	| AlertProposedEvent
	| ({ type: 'spawn_progress' } & SpawnProgressData)
	| CompactionEvent
	| ({ type: 'tool_execution' } & ToolExecution)
	| ThinkingEvent
	| CitationsEvent
	| TitleEvent
	| MessageIdEvent
	| ErrorEvent
	| DoneEvent

interface RateLimitErrorDetails {
	period?: string
	limit?: number
	resetTime?: string | null
}

interface RateLimitError extends Error {
	code?: 'USAGE_LIMIT_EXCEEDED' | 'FREE_QUESTION_LIMIT'
	details?: RateLimitErrorDetails
	upgradeUrl?: string
}

interface AgenticErrorResponse {
	code?: string
	content?: string
	error?: string
	details?: RateLimitErrorDetails
}

interface FetchAgenticResponseParams {
	message: string
	sessionId?: string | null
	callbacks: AgenticSSECallbacks
	abortSignal?: AbortSignal
	researchMode?: boolean
	images?: Array<{ data: string; mimeType: string; filename?: string }>
	pageContext?: { entitySlug?: string; entityType?: string; route: string }
	customInstructions?: string
	isSuggestedQuestion?: boolean
	fetchFn?: typeof fetch
}

// Parse the backend SSE stream line-by-line and fan each event out to the UI callbacks.
function parseSSEStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	callbacks: AgenticSSECallbacks,
	abortSignal?: AbortSignal
) {
	const decoder = new TextDecoder()
	let lineBuffer = ''

	const process = async () => {
		try {
			while (true) {
				if (abortSignal?.aborted) break

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
					if (!line.startsWith('data: ')) continue

					try {
						const data = JSON.parse(line.slice(6)) as AgenticSSEEvent

						switch (data.type) {
							case 'session':
								callbacks.onSessionId(data.sessionId)
								break
							case 'tool_call':
								callbacks.onProgress(data.name)
								break
							case 'response_chunk':
								callbacks.onToken(data.content)
								break
							case 'charts':
								callbacks.onCharts(data.charts || [], data.chartData || {})
								break
							case 'csv_export':
								callbacks.onCsvExport?.(data.exports || [])
								break
							case 'alert_proposed':
								callbacks.onAlertProposed?.(data)
								break
							case 'spawn_progress':
								callbacks.onSpawnProgress(data)
								break
							case 'compaction':
								callbacks.onCompaction?.(data)
								break
							case 'tool_execution':
								callbacks.onToolExecution?.(data)
								break
							case 'thinking':
								callbacks.onThinking?.(data.content)
								break
							case 'citations':
								callbacks.onCitations(data.citations || [])
								break
							case 'title':
								callbacks.onTitle?.(data.content)
								break
							case 'message_id':
								callbacks.onMessageId?.(data.messageId)
								break
							case 'error':
								callbacks.onError(data.content || 'Unknown error')
								break
							case 'done':
								callbacks.onDone()
								break
						}
					} catch {}
				}
			}
		} finally {
			try {
				reader.releaseLock()
			} catch {}
		}
	}

	return process()
}

export async function fetchAgenticResponse({
	message,
	sessionId,
	callbacks,
	abortSignal,
	researchMode,
	images,
	pageContext,
	customInstructions,
	isSuggestedQuestion,
	fetchFn
}: FetchAgenticResponseParams) {
	const doFetch = fetchFn || fetch

	// Only include optional request fields when they are explicitly enabled for this prompt.
	const requestBody: {
		message: string
		stream: true
		sessionId?: string
		researchMode?: true
		timezone?: string
		images?: Array<{ data: string; mimeType: string; filename?: string }>
		pageContext?: { entitySlug?: string; entityType?: string; route: string }
		customInstructions?: string
		isSuggestedQuestion?: true
	} = {
		message,
		stream: true
	}

	if (sessionId) {
		requestBody.sessionId = sessionId
	}

	// Research mode is an opt-in backend feature, so only send the flag when enabled.
	if (researchMode) {
		requestBody.researchMode = true
	}

	// Timezone helps the backend answer scheduling/date questions in the user's local context.
	try {
		requestBody.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {}

	if (images && images.length > 0) {
		requestBody.images = images
	}

	if (pageContext) {
		requestBody.pageContext = pageContext
	}

	if (customInstructions) {
		requestBody.customInstructions = customInstructions
	}

	if (isSuggestedQuestion) {
		requestBody.isSuggestedQuestion = true
	}

	const response = await doFetch(`${MCP_SERVER}/agentic`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
		signal: abortSignal
	})

	// Map backend usage-limit and concurrency responses into UI-specific error shapes.
	if (!response.ok) {
		const errorData = (await response.json().catch(() => null)) as AgenticErrorResponse | null
		if (response.status === 403 && errorData?.code === 'FREE_QUESTION_LIMIT') {
			const err = new Error(errorData.content || 'Upgrade required') as RateLimitError
			err.code = 'FREE_QUESTION_LIMIT'
			err.upgradeUrl = (errorData as AgenticErrorResponse & { upgradeUrl?: string }).upgradeUrl
			throw err
		}
		if (response.status === 403 && errorData?.code === 'USAGE_LIMIT_EXCEEDED') {
			const err = new Error(errorData.content || 'Usage limit exceeded') as RateLimitError
			err.code = 'USAGE_LIMIT_EXCEEDED'
			err.details = errorData.details
			throw err
		}
		if (response.status === 429) {
			throw new Error(errorData?.error || 'Too many concurrent requests. Please wait.')
		}
		throw new Error(errorData?.error || `HTTP error status: ${response.status}`)
	}

	if (!response.body) {
		throw new Error('No response body')
	}

	return parseSSEStream(response.body.getReader(), callbacks, abortSignal)
}

// Probe whether a restored session still has a live execution that needs to be resumed client-side.
export async function checkActiveExecution(
	sessionId: string,
	fetchFn?: typeof fetch
): Promise<{ active: boolean; status?: string; eventCount?: number; messageId?: string }> {
	try {
		const res = await (fetchFn || fetch)(`${MCP_SERVER}/agentic/active/${encodeURIComponent(sessionId)}`)
		if (!res.ok) return { active: false }
		return (await res.json()) as { active: boolean; status?: string; eventCount?: number; messageId?: string }
	} catch (err) {
		console.error('[llama-ai] [checkActiveExecution] failed:', getErrorMessage(err))
		return { active: false }
	}
}

// Reattach the client to an existing server-side execution for a restored session.
export async function resumeAgenticStream({
	sessionId,
	callbacks,
	abortSignal,
	fetchFn
}: {
	sessionId: string
	callbacks: AgenticSSECallbacks
	abortSignal?: AbortSignal
	fetchFn?: typeof fetch
}) {
	const res = await (fetchFn || fetch)(`${MCP_SERVER}/agentic/stream/${encodeURIComponent(sessionId)}`, {
		signal: abortSignal
	})

	if (!res.ok) {
		throw new Error('No active execution')
	}

	if (!res.body) {
		throw new Error('No response body')
	}

	return parseSSEStream(res.body.getReader(), callbacks, abortSignal)
}
