import { AI_SERVER } from '~/constants'
import {
	normalizeChartConfigs,
	normalizeChartDataByKey,
	normalizeDashboardChartData,
	normalizeDashboardItems
} from '~/containers/LlamaAI/chartPayloads'
import type {
	AgenticAnswerMode,
	AlertProposedData,
	ChartConfiguration,
	ChartDataByKey,
	DashboardArtifact,
	GeneratedImage,
	MessageMetadata,
	TodoItem,
	ToolExecution,
	UnifiedCitationReference
} from '~/containers/LlamaAI/types'
import { normalizeAlertProposedData } from '~/containers/LlamaAI/utils/restoredAlerts'
import { getErrorMessage } from '~/utils/error'

export interface CsvExport {
	id: string
	title: string
	url: string
	rowCount: number
	filename: string
}

export interface MdExport {
	id: string
	title: string
	url: string
	filename: string
}

export interface SpawnProgressData {
	agentId: string
	status: 'started' | 'thinking' | 'tool_call' | 'completed' | 'error'
	tool?: string
	toolCount?: number
	chartCount?: number
	findingsPreview?: string
	startedAt?: number
	isResearchMode?: boolean
}

export interface AgenticSSECallbacks {
	onToken: (content: string) => void
	onCharts: (charts: ChartConfiguration[], chartData: ChartDataByKey) => void
	onGeneratedImages?: (images: GeneratedImage[]) => void
	onProgress: (toolName: string, isPremium?: boolean) => void
	onSpawnProgress: (data: SpawnProgressData) => void
	onSessionId: (sessionId: string, startedAt?: number) => void
	onCitations: (citations: string[]) => void
	onFactCheckStatus?: (status: 'drafting' | 'verifying' | 'finalizing') => void
	onFactCheckCitations?: (refs: UnifiedCitationReference[], finalizedText?: string) => void
	onCsvExport?: (exports: CsvExport[]) => void
	onMdExport?: (exports: MdExport[]) => void
	onAlertProposed?: (data: AlertProposedData) => void
	onDashboard?: (dashboard: DashboardArtifact) => void
	onToolExecution?: (data: ToolExecution) => void
	onTodos?: (todos: TodoItem[]) => void
	onMessageMetadata?: (data: MessageMetadata) => void
	onThinking?: (content: string) => void
	onCompaction?: (data: { status: 'started' | 'completed'; messagesBefore: number; messagesAfter?: number }) => void
	onTitle?: (title: string) => void
	onMessageId?: (messageId: string) => void
	onUserMessageId?: (messageId: string) => void
	onSiblingInfo?: (messageId: string, siblingInfo: SiblingInfoEvent['siblingInfo']) => void
	onTokenLimit?: () => void
	onContextWarning?: (warning: ContextWarningPayload) => void
	onError: (content: string) => void
	onDone: () => void
}

interface SessionEvent {
	type: 'session'
	sessionId: string
	startedAt?: number
}

interface ToolCallEvent {
	type: 'tool_call'
	name: string
	isPremium?: boolean
}

interface ResponseChunkEvent {
	type: 'response_chunk'
	content?: unknown
}

interface ChartsEvent {
	type: 'charts'
	charts?: unknown
	chartData?: unknown
}

interface GeneratedImagesEvent {
	type: 'generated_images'
	images?: unknown
}

interface CsvExportEvent {
	type: 'csv_export'
	exports?: unknown
}

interface MdExportEvent {
	type: 'md_export'
	exports?: unknown
}

interface AlertProposedEvent extends AlertProposedData {
	type: 'alert_proposed'
}

interface DashboardEvent {
	type: 'dashboard'
	dashboard_id?: string
	dashboardConfig?: {
		dashboardName?: unknown
		items?: unknown
		timePeriod?: unknown
		sourceDashboardId?: unknown
	}
	chartData?: unknown
	content?: {
		dashboard_id?: string
		dashboardConfig?: {
			dashboardName?: unknown
			items?: unknown
			timePeriod?: unknown
			sourceDashboardId?: unknown
		}
		chartData?: unknown
	}
}

interface CompactionEvent {
	type: 'compaction'
	status: 'started' | 'completed'
	messagesBefore: number
	messagesAfter?: number
}

interface ThinkingEvent {
	type: 'thinking'
	content?: unknown
}

interface CitationsEvent {
	type: 'citations'
	citations?: unknown
}

interface FactCheckStatusEvent {
	type: 'fact_check_status'
	status: 'drafting' | 'verifying' | 'finalizing'
}

interface FactCheckCitationsEvent {
	type: 'fact_check_citations'
	citations?: UnifiedCitationReference[]
	sources?: UnifiedCitationReference[]
	response?: string
	sessionId: string
}

interface TitleEvent {
	type: 'title'
	content: string
}

interface MessageIdEvent {
	type: 'message_id'
	messageId: string
}

interface UserMessageIdEvent {
	type: 'user_message_id'
	messageId: string
}

interface SiblingInfoEvent {
	type: 'sibling_info'
	messageId: string
	siblingInfo: {
		currentVersion: number
		totalVersions: number
		siblings: Array<{ messageId: string; leafMessageId: string }>
	}
}

interface TokenLimitEvent {
	type: 'token_limit'
	upgradeUrl?: string
}

export interface ContextWarningPayload {
	kind: 'long_thread'
	reason: 'tokens' | 'messages'
	message: string
	thresholds?: { input_tokens?: number; messages?: number }
	observed?: { input_tokens?: number; messages?: number }
}

interface ContextWarningEvent {
	type: 'context_warning'
	content: ContextWarningPayload
}

interface TodoSnapshotEvent {
	type: 'todo_snapshot'
	todos?: unknown
	summary?: Record<string, number>
}

interface ErrorEvent {
	type: 'error'
	content?: string
}

interface DoneEvent {
	type: 'done'
}

interface MessageMetadataEvent {
	type: 'message_metadata'
	content: {
		inputTokens?: number
		outputTokens?: number
		executionTimeMs?: number
		x402CostUsd?: string
		completionReason?: string
	}
}

type AgenticSSEEvent =
	| SessionEvent
	| ToolCallEvent
	| ResponseChunkEvent
	| ChartsEvent
	| GeneratedImagesEvent
	| CsvExportEvent
	| MdExportEvent
	| AlertProposedEvent
	| DashboardEvent
	| ({ type: 'spawn_progress' } & SpawnProgressData)
	| CompactionEvent
	| ({ type: 'tool_execution' } & ToolExecution)
	| TodoSnapshotEvent
	| ThinkingEvent
	| CitationsEvent
	| FactCheckStatusEvent
	| FactCheckCitationsEvent
	| TitleEvent
	| MessageIdEvent
	| UserMessageIdEvent
	| SiblingInfoEvent
	| MessageMetadataEvent
	| TokenLimitEvent
	| ContextWarningEvent
	| ErrorEvent
	| DoneEvent

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : []
}

function dashboardItemsHash(items: DashboardArtifact['items']): string {
	const normalized = items.map((item) => {
		const record = item as unknown as Record<string, unknown>
		return [
			typeof record.kind === 'string' ? record.kind : '',
			typeof record.chartRef === 'string'
				? record.chartRef
				: typeof record.savedChartId === 'string'
					? record.savedChartId
					: typeof record.id === 'string'
						? record.id
						: ''
		]
	})
	const serialized = JSON.stringify(normalized)
	let hash = 0xcbf29ce484222325n
	for (let i = 0; i < serialized.length; i++) {
		hash ^= BigInt(serialized.charCodeAt(i))
		hash = BigInt.asUintN(64, hash * 0x100000001b3n)
	}
	return hash.toString(16).padStart(16, '0')
}

interface RateLimitErrorDetails {
	period?: string
	limit?: number
	resetTime?: string | null
}

interface RateLimitError extends Error {
	code?:
		| 'USAGE_LIMIT_EXCEEDED'
		| 'FREE_QUESTION_LIMIT'
		| 'FREE_FORM_LIMIT'
		| 'FREE_DAILY_LIMIT'
		| 'FACT_CHECKED_REQUIRES_SUBSCRIPTION'
	details?: RateLimitErrorDetails
	upgradeUrl?: string
}

interface AgenticErrorResponse {
	code?: string
	content?: string
	error?: string
	message?: string
	details?: RateLimitErrorDetails
	upgradeUrl?: string
}

interface FetchAgenticResponseParams {
	message: string
	sessionId?: string | null
	callbacks: AgenticSSECallbacks
	abortSignal?: AbortSignal
	mode?: AgenticAnswerMode
	enablePremiumTools: boolean
	entities?: Array<{ term: string; slug: string; type?: string }>
	images?: Array<{ data: string; mimeType: string; filename?: string; isPasted?: boolean }>
	pageContext?: { entitySlug?: string; entityType?: string; route: string }
	customInstructions?: string
	quotedText?: string
	isSuggestedQuestion?: boolean
	blockedSkills?: string[]
	model?: string
	effort?: string
	shareToken?: string
	editMessageId?: string
	projectId?: string | null
	fetchFn?: typeof fetch
	eventCounter?: { count: number }
}

async function getResponseErrorMessage(response: Response, fallback: string) {
	const contentType = response.headers.get('content-type') || ''
	const text = await response.text().catch(() => '')
	if (contentType.includes('application/json') && text) {
		try {
			const errorData = JSON.parse(text) as AgenticErrorResponse
			const detailedMessage = errorData.error || errorData.message || errorData.content
			if (detailedMessage) return `${fallback}: ${detailedMessage}`
		} catch {}
	}
	if (text) return `${fallback}: ${text}`

	return fallback
}

/** @internal Exported for testing only. */
export function parseSSEStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	callbacks: AgenticSSECallbacks,
	abortSignal?: AbortSignal,
	eventCounter?: { count: number }
): Promise<{ sawDone: boolean }> {
	const decoder = new TextDecoder()
	let lineBuffer = ''
	let sawDone = false

	const handleLine = (line: string) => {
		if (!line.startsWith('data:')) return

		try {
			const data = JSON.parse(line.slice(5).trimStart()) as AgenticSSEEvent
			// Backend replay PRs #32/#33 use event offsets, not UI mutations, so count
			// every parsed server event, including `done`.
			if (eventCounter) eventCounter.count++
			if (data.type === 'done') sawDone = true

			switch (data.type) {
				case 'session':
					callbacks.onSessionId(data.sessionId, data.startedAt)
					break
				case 'tool_call':
					callbacks.onProgress(data.name, data.isPremium)
					break
				case 'response_chunk': {
					const chunk = typeof data.content === 'string' ? data.content.replace(/<bill\s*\/>/g, '') : ''
					if (chunk) callbacks.onToken(chunk)
					break
				}
				case 'charts': {
					const charts = normalizeChartConfigs(data.charts)
					callbacks.onCharts(charts, normalizeChartDataByKey(data.chartData, charts))
					break
				}
				case 'generated_images':
					callbacks.onGeneratedImages?.(normalizeArray<GeneratedImage>(data.images))
					break
				case 'csv_export':
					callbacks.onCsvExport?.(normalizeArray<CsvExport>(data.exports))
					break
				case 'md_export':
					callbacks.onMdExport?.(normalizeArray<MdExport>(data.exports))
					break
				case 'alert_proposed':
					callbacks.onAlertProposed?.(normalizeAlertProposedData(data))
					break
				case 'dashboard': {
					const config = data.dashboardConfig || data.content?.dashboardConfig
					const chartData = data.chartData || data.content?.chartData
					if (isRecord(config) && callbacks.onDashboard) {
						// Dashboard events can arrive in both top-level and nested `content`
						// forms around PR #2790; normalize both shapes here.
						const items = normalizeDashboardItems(config.items)
						const dashboardName =
							typeof config.dashboardName === 'string' && config.dashboardName.trim()
								? config.dashboardName
								: 'Dashboard'
						const sourceDashboardId =
							typeof config.sourceDashboardId === 'string' ? config.sourceDashboardId : undefined
						const dashboardChartData = normalizeDashboardChartData(chartData)
						const stableId =
							data.dashboard_id ||
							data.content?.dashboard_id ||
							`dashboard_${dashboardName}_${sourceDashboardId ?? ''}_${dashboardItemsHash(items)}`
						callbacks.onDashboard({
							id: stableId,
							dashboardName,
							items,
							...(typeof config.timePeriod === 'string' && { timePeriod: config.timePeriod }),
							...(sourceDashboardId && { sourceDashboardId }),
							...(dashboardChartData && { chartData: dashboardChartData })
						})
					}
					break
				}
				case 'spawn_progress':
					callbacks.onSpawnProgress(data)
					break
				case 'compaction':
					callbacks.onCompaction?.(data)
					break
				case 'tool_execution':
					callbacks.onToolExecution?.(data)
					break
				case 'todo_snapshot':
					callbacks.onTodos?.(normalizeArray<TodoItem>(data.todos))
					break
				case 'message_metadata':
					callbacks.onMessageMetadata?.(data.content)
					break
				case 'thinking':
					if (typeof data.content === 'string') callbacks.onThinking?.(data.content)
					break
				case 'citations':
					callbacks.onCitations(normalizeArray<string>(data.citations))
					break
				case 'fact_check_status':
					callbacks.onFactCheckStatus?.(data.status)
					break
				case 'fact_check_citations':
					callbacks.onFactCheckCitations?.(
						data.sources || data.citations || [],
						typeof data.response === 'string' ? data.response : undefined
					)
					break
				case 'title':
					if (typeof data.content === 'string') callbacks.onTitle?.(data.content)
					break
				case 'message_id':
					callbacks.onMessageId?.(data.messageId)
					break
				case 'user_message_id':
					callbacks.onUserMessageId?.(data.messageId)
					break
				case 'sibling_info':
					callbacks.onSiblingInfo?.(data.messageId, data.siblingInfo)
					break
				case 'token_limit':
					callbacks.onTokenLimit?.()
					break
				case 'context_warning':
					if (data.content) callbacks.onContextWarning?.(data.content)
					break
				case 'error':
					callbacks.onError(data.content || 'Unknown error')
					break
				case 'done':
					callbacks.onDone()
					break
			}
		} catch (error) {
			console.debug('[llama-ai] [sse] failed to parse event:', line, error)
		}
	}

	// A stalled reader should enter the same recovery path as a dropped stream.
	const HEARTBEAT_TIMEOUT_MS = 15_000

	const process = async () => {
		try {
			while (true) {
				if (abortSignal?.aborted) break

				let timeoutId: ReturnType<typeof setTimeout> | undefined
				const { done, value } = await Promise.race([
					reader.read(),
					new Promise<never>((_, reject) => {
						timeoutId = setTimeout(() => {
							void reader
								.cancel('Stream heartbeat timeout')
								.catch(() => undefined)
								.finally(() => reject(new Error('Stream heartbeat timeout')))
						}, HEARTBEAT_TIMEOUT_MS)
					})
				]).finally(() => clearTimeout(timeoutId))
				if (done) {
					// Some backends terminate the stream without a trailing newline, so flush the final buffered event on EOF.
					if (lineBuffer.trim()) {
						handleLine(lineBuffer.trim())
					}
					break
				}

				const chunk = decoder.decode(value, { stream: true })
				lineBuffer += chunk

				const lines = lineBuffer.split('\n')

				if (lines.length > 0 && !chunk.endsWith('\n')) {
					lineBuffer = lines.pop() || ''
				} else {
					lineBuffer = ''
				}

				for (const line of lines) {
					handleLine(line)
				}
			}
			return { sawDone }
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
	mode,
	enablePremiumTools,
	entities,
	images,
	pageContext,
	customInstructions,
	quotedText,
	isSuggestedQuestion,
	blockedSkills,
	model,
	effort,
	shareToken,
	editMessageId,
	projectId,
	fetchFn,
	eventCounter
}: FetchAgenticResponseParams) {
	const doFetch = fetchFn || fetch

	// Only include optional request fields when they are explicitly enabled for this prompt.
	const requestBody: {
		message: string
		stream: true
		sessionId?: string
		mode?: AgenticAnswerMode
		enablePremiumTools: boolean
		timezone?: string
		entities?: Array<{ term: string; slug: string; type?: string }>
		images?: Array<{ data: string; mimeType: string; filename?: string; isPasted?: boolean }>
		pageContext?: { entitySlug?: string; entityType?: string; route: string }
		customInstructions?: string
		quotedText?: string
		isSuggestedQuestion?: true
		blockedSkills?: string[]
		model?: string
		effort?: string
		shareToken?: string
		editMessageId?: string
		projectId?: string
	} = {
		message,
		stream: true,
		enablePremiumTools
	}

	if (sessionId) {
		requestBody.sessionId = sessionId
	}

	if (mode && mode !== 'quick') {
		requestBody.mode = mode
	}

	// Timezone helps the backend answer scheduling/date questions in the user's local context.
	try {
		requestBody.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
	} catch {}

	if (entities && entities.length > 0) {
		requestBody.entities = entities
	}

	if (images && images.length > 0) {
		requestBody.images = images
	}

	if (pageContext) {
		requestBody.pageContext = pageContext
	}

	if (customInstructions) {
		requestBody.customInstructions = customInstructions
	}

	if (quotedText) {
		requestBody.quotedText = quotedText
	}

	if (isSuggestedQuestion) {
		requestBody.isSuggestedQuestion = true
	}

	if (blockedSkills && blockedSkills.length > 0) {
		requestBody.blockedSkills = blockedSkills
	}

	if (model) {
		requestBody.model = model
	}

	if (effort) {
		requestBody.effort = effort
	}

	if (shareToken) {
		requestBody.shareToken = shareToken
	}

	if (projectId) {
		requestBody.projectId = projectId
	}

	if (editMessageId) {
		requestBody.editMessageId = editMessageId
	}

	const response = await doFetch(`${AI_SERVER}/agentic`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
		signal: abortSignal
	})

	// Map backend usage-limit and concurrency responses into UI-specific error shapes.
	if (!response.ok) {
		const errorData = (await response.json().catch(() => null)) as AgenticErrorResponse | null
		if (
			response.status === 403 &&
			(errorData?.code === 'FREE_QUESTION_LIMIT' ||
				errorData?.code === 'FREE_FORM_LIMIT' ||
				errorData?.code === 'FREE_DAILY_LIMIT')
		) {
			const err = new Error(errorData.content || 'Upgrade required') as RateLimitError
			err.code = errorData.code as RateLimitError['code']
			err.upgradeUrl = errorData.upgradeUrl
			err.details = errorData.details
			throw err
		}
		if (response.status === 403 && errorData?.code === 'FACT_CHECKED_REQUIRES_SUBSCRIPTION') {
			const err = new Error(
				errorData.content || 'Fact-checked answers require an active subscription.'
			) as RateLimitError
			err.code = 'FACT_CHECKED_REQUIRES_SUBSCRIPTION'
			err.upgradeUrl = errorData.upgradeUrl
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

	const { sawDone } = await parseSSEStream(response.body.getReader(), callbacks, abortSignal, eventCounter)
	if (!sawDone && !abortSignal?.aborted) {
		// Server stream closed cleanly but never sent a `done` event — likely a
		// dropped final chunk or upstream restart. Surface it as a connectivity
		// error so the recovery cycle can probe /agentic/active and replay.
		throw new Error('Stream ended without done event')
	}
}

export async function stopAgenticExecution(sessionId: string, fetchFn?: typeof fetch): Promise<void> {
	try {
		await (fetchFn || fetch)(`${AI_SERVER}/agentic/stop/${encodeURIComponent(sessionId)}`, { method: 'POST' })
	} catch {}
}

// Probe whether a restored session still has a live execution that needs to be resumed client-side.
export async function checkActiveExecution(
	sessionId: string,
	fetchFn?: typeof fetch
): Promise<{ active: boolean; status?: string; eventCount?: number; messageId?: string; hasResult?: boolean }> {
	try {
		const res = await (fetchFn || fetch)(`${AI_SERVER}/agentic/active/${encodeURIComponent(sessionId)}`)
		if (!res) {
			throw new Error('Failed to check active execution: no response received')
		}
		if (res.status === 404) {
			const payload = (await res.json().catch(() => null)) as {
				active?: boolean
				status?: string
				eventCount?: number
				messageId?: string
				hasResult?: boolean
			} | null
			return payload?.active === false ? { active: false, ...payload } : { active: false }
		}
		if (!res.ok) {
			const statusLabel = `${res.status} ${res.statusText}`.trim()
			throw new Error(await getResponseErrorMessage(res, `Failed to check active execution (${statusLabel})`))
		}
		return (await res.json()) as {
			active: boolean
			status?: string
			eventCount?: number
			messageId?: string
			hasResult?: boolean
		}
	} catch (err) {
		console.error('[llama-ai] [checkActiveExecution] failed:', getErrorMessage(err))
		const status =
			typeof err === 'object' && err !== null
				? 'status' in err && typeof err.status === 'number'
					? err.status
					: 'response' in err &&
						  typeof err.response === 'object' &&
						  err.response !== null &&
						  'status' in err.response &&
						  typeof err.response.status === 'number'
						? err.response.status
						: null
				: null
		if (status === 404) return { active: false }
		throw err
	}
}

// Reattach the client to an existing server-side execution for a restored session.
export async function resumeAgenticStream({
	sessionId,
	callbacks,
	abortSignal,
	fetchFn,
	from,
	eventCounter
}: {
	sessionId: string
	callbacks: AgenticSSECallbacks
	abortSignal?: AbortSignal
	fetchFn?: typeof fetch
	from?: number
	eventCounter?: { count: number }
}) {
	const url =
		from != null
			? `${AI_SERVER}/agentic/stream/${encodeURIComponent(sessionId)}?from=${from}`
			: `${AI_SERVER}/agentic/stream/${encodeURIComponent(sessionId)}`
	const res = await (fetchFn || fetch)(url, {
		signal: abortSignal
	})

	if (!res.ok) {
		const statusLabel = `${res.status} ${res.statusText}`.trim()
		throw new Error(await getResponseErrorMessage(res, `Failed to resume active execution (${statusLabel})`))
	}

	if (!res.body) {
		throw new Error('No response body')
	}

	const { sawDone } = await parseSSEStream(res.body.getReader(), callbacks, abortSignal, eventCounter)
	if (!sawDone && !abortSignal?.aborted) {
		throw new Error('Stream ended without done event')
	}
}
