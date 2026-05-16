import type { Dispatch } from 'react'
import type { ContextWarningPayload, CsvExport, MdExport } from '~/containers/LlamaAI/fetchAgenticResponse'
import type {
	AlertProposedData,
	ChartSet,
	DashboardArtifact,
	GeneratedImage,
	Message,
	MessageMetadata,
	SpawnAgentStatus,
	TodoItem,
	ToolCall,
	ToolExecution
} from '~/containers/LlamaAI/types'

export interface ChatPageContext {
	entitySlug?: string
	entityType?: 'protocol' | 'chain' | 'page'
	route: string
}

export interface FailedRequest {
	prompt: string
	entities?: Array<{ term: string; slug: string; type?: string }>
	images?: Array<{ data: string; mimeType: string; filename?: string }>
	pageContext?: ChatPageContext
}

export interface RateLimitDetails {
	period: string
	limit: number
	resetTime: string | null
}

export interface RecoveryState {
	status: 'idle' | 'reconnecting'
	startedAt: number | null
	attemptCount: number
	lastErrorMessage: string | null
}

export interface StreamState {
	isStreaming: boolean
	isCompacting: boolean
	text: string
	charts: ChartSet[]
	csvExports: CsvExport[]
	mdExports: MdExport[]
	alerts: AlertProposedData[]
	dashboards: DashboardArtifact[]
	generatedImages: GeneratedImage[]
	citations: string[]
	toolExecutions: ToolExecution[]
	thinking: string
	activeToolCalls: ToolCall[]
	spawnProgress: Map<string, SpawnAgentStatus>
	spawnStartTime: number
	spawnIsResearchMode: boolean
	todos: TodoItem[]
	todosStartTime: number
	executionStartedAt: number
	recovery: RecoveryState
	messageMetadata?: MessageMetadata
	error: string | null
	lastFailedRequest: FailedRequest | null
	rateLimitDetails: RateLimitDetails | null
	contextWarning: ContextWarningPayload | null
}

export interface StreamBuffer {
	text: string
	charts: ChartSet[]
	csvExports: CsvExport[]
	mdExports: MdExport[]
	alerts: AlertProposedData[]
	dashboards: DashboardArtifact[]
	generatedImages: GeneratedImage[]
	citations: string[]
	toolExecutions: ToolExecution[]
	thinking: string
	error: string | null
	hasStartedText: boolean
	spawnStarted: boolean
	receivedEventCount: number
	messageMetadata?: MessageMetadata
}

export type StreamAction =
	| { type: 'START_STREAM' }
	| { type: 'RESET_STREAM' }
	| { type: 'SET_COMPACTING'; value: boolean }
	| { type: 'SET_ERROR'; value: string | null }
	| { type: 'SET_LAST_FAILED_REQUEST'; value: FailedRequest | null }
	| { type: 'SET_RATE_LIMIT_DETAILS'; value: RateLimitDetails | null }
	| { type: 'APPEND_TOKEN'; value: string }
	| { type: 'APPEND_CHARTS'; value: ChartSet }
	| { type: 'APPEND_CSV_EXPORTS'; value: CsvExport[] }
	| { type: 'APPEND_MD_EXPORTS'; value: MdExport[] }
	| { type: 'APPEND_ALERT'; value: AlertProposedData }
	| { type: 'APPEND_DASHBOARD'; value: DashboardArtifact }
	| { type: 'APPEND_GENERATED_IMAGES'; value: GeneratedImage[] }
	| { type: 'MERGE_CITATIONS'; value: string[] }
	| { type: 'APPEND_TOOL_EXECUTION'; value: ToolExecution }
	| { type: 'SET_MESSAGE_METADATA'; value: MessageMetadata }
	| { type: 'APPEND_THINKING'; value: string }
	| { type: 'APPEND_TOOL_CALL'; value: ToolCall }
	| { type: 'CLEAR_ACTIVITY' }
	| { type: 'SET_SPAWN_START_TIME'; value: number }
	| { type: 'SET_SPAWN_RESEARCH_MODE'; value: boolean }
	| { type: 'SET_EXECUTION_STARTED_AT'; value: number }
	| { type: 'UPSERT_SPAWN_PROGRESS'; value: SpawnAgentStatus }
	| { type: 'SET_TODOS'; value: TodoItem[] }
	| { type: 'START_RECOVERY'; startedAt: number; lastErrorMessage: string | null }
	| { type: 'UPDATE_RECOVERY'; attemptCount: number; lastErrorMessage: string | null }
	| { type: 'RESET_RECOVERY' }
	| { type: 'SET_CONTEXT_WARNING'; value: ContextWarningPayload | null }

// Reset only the in-flight runtime fields; persistent errors are layered on top separately.
const createEmptyRuntimeState = () => ({
	isStreaming: false,
	isCompacting: false,
	text: '',
	charts: [] as ChartSet[],
	csvExports: [] as CsvExport[],
	mdExports: [] as MdExport[],
	alerts: [] as AlertProposedData[],
	dashboards: [] as DashboardArtifact[],
	generatedImages: [] as GeneratedImage[],
	citations: [] as string[],
	toolExecutions: [] as ToolExecution[],
	thinking: '',
	activeToolCalls: [] as ToolCall[],
	spawnProgress: new Map<string, SpawnAgentStatus>(),
	spawnStartTime: 0,
	spawnIsResearchMode: false,
	todos: [] as TodoItem[],
	todosStartTime: 0,
	executionStartedAt: 0,
	recovery: {
		status: 'idle',
		startedAt: null,
		attemptCount: 0,
		lastErrorMessage: null
	} as RecoveryState
})

// Full stream state starts from the empty runtime snapshot plus error/retry metadata.
export const createInitialStreamState = (): StreamState => ({
	...createEmptyRuntimeState(),
	error: null,
	lastFailedRequest: null,
	rateLimitDetails: null,
	contextWarning: null
})

// Keep a mutable buffer while SSE events arrive, then commit it as one assistant message at the end.
export const createStreamBuffer = (): StreamBuffer => ({
	text: '',
	charts: [],
	csvExports: [],
	mdExports: [],
	alerts: [],
	dashboards: [],
	generatedImages: [],
	citations: [],
	toolExecutions: [],
	thinking: '',
	error: null,
	hasStartedText: false,
	spawnStarted: false,
	receivedEventCount: 0
})

export function hasStreamBufferContent(buffer: StreamBuffer) {
	return Boolean(
		buffer.text ||
		buffer.charts.length > 0 ||
		buffer.csvExports.length > 0 ||
		buffer.mdExports.length > 0 ||
		buffer.alerts.length > 0 ||
		buffer.dashboards.length > 0 ||
		buffer.generatedImages.length > 0 ||
		buffer.citations.length > 0 ||
		buffer.toolExecutions.length > 0 ||
		buffer.thinking
	)
}

// Drive the live streaming UI without mutating message history until the request is complete.
export function streamReducer(state: StreamState, action: StreamAction): StreamState {
	switch (action.type) {
		case 'START_STREAM':
			return {
				...state,
				...createEmptyRuntimeState(),
				isStreaming: true,
				error: null,
				lastFailedRequest: null,
				rateLimitDetails: null
			}
		case 'RESET_STREAM':
			return { ...state, ...createEmptyRuntimeState() }
		case 'SET_COMPACTING':
			return { ...state, isCompacting: action.value }
		case 'SET_ERROR':
			return { ...state, error: action.value }
		case 'SET_LAST_FAILED_REQUEST':
			return { ...state, lastFailedRequest: action.value }
		case 'SET_RATE_LIMIT_DETAILS':
			return { ...state, rateLimitDetails: action.value }
		case 'APPEND_TOKEN': {
			let newText = state.text + action.value
			const reportIdx = newText.indexOf('[REPORT_START]')
			if (reportIdx !== -1) {
				newText = newText.slice(reportIdx + '[REPORT_START]'.length).trimStart()
			}
			return { ...state, text: newText }
		}
		case 'APPEND_CHARTS':
			return { ...state, charts: [...state.charts, action.value] }
		case 'APPEND_CSV_EXPORTS':
			return { ...state, csvExports: [...state.csvExports, ...action.value] }
		case 'APPEND_MD_EXPORTS':
			return { ...state, mdExports: [...state.mdExports, ...action.value] }
		case 'APPEND_ALERT':
			return { ...state, alerts: [...state.alerts, action.value] }
		case 'APPEND_DASHBOARD':
			return { ...state, dashboards: [...state.dashboards, action.value] }
		case 'APPEND_GENERATED_IMAGES':
			return { ...state, generatedImages: [...state.generatedImages, ...action.value] }
		case 'MERGE_CITATIONS':
			return { ...state, citations: [...new Set([...state.citations, ...action.value])] }
		case 'APPEND_TOOL_EXECUTION':
			return { ...state, toolExecutions: [...state.toolExecutions, action.value] }
		case 'SET_MESSAGE_METADATA':
			return { ...state, messageMetadata: action.value }
		case 'APPEND_THINKING':
			return { ...state, thinking: state.thinking + action.value }
		case 'APPEND_TOOL_CALL':
			return { ...state, activeToolCalls: [...state.activeToolCalls, action.value] }
		case 'CLEAR_ACTIVITY':
			return {
				...state,
				activeToolCalls: [],
				spawnProgress: new Map<string, SpawnAgentStatus>(),
				spawnStartTime: 0,
				todos: [],
				todosStartTime: 0
			}
		case 'SET_SPAWN_START_TIME':
			return { ...state, spawnStartTime: action.value }
		case 'SET_SPAWN_RESEARCH_MODE':
			return { ...state, spawnIsResearchMode: action.value }
		case 'SET_EXECUTION_STARTED_AT':
			return { ...state, executionStartedAt: action.value }
		case 'UPSERT_SPAWN_PROGRESS': {
			const next = new Map(state.spawnProgress)
			const existing = next.get(action.value.id)
			next.set(action.value.id, {
				...existing,
				...action.value
			})
			return { ...state, spawnProgress: next }
		}
		case 'SET_TODOS': {
			const todosStartTime = state.todosStartTime || Date.now()
			return { ...state, todos: action.value, todosStartTime }
		}
		case 'START_RECOVERY':
			return {
				...state,
				recovery: {
					status: 'reconnecting',
					startedAt: action.startedAt,
					attemptCount: 0,
					lastErrorMessage: action.lastErrorMessage
				}
			}
		case 'UPDATE_RECOVERY':
			return {
				...state,
				recovery: {
					...state.recovery,
					status: 'reconnecting',
					attemptCount: action.attemptCount,
					lastErrorMessage: action.lastErrorMessage
				}
			}
		case 'RESET_RECOVERY':
			return {
				...state,
				recovery: {
					status: 'idle',
					startedAt: null,
					attemptCount: 0,
					lastErrorMessage: null
				}
			}
		case 'SET_CONTEXT_WARNING':
			return { ...state, contextWarning: action.value }
		default:
			return state
	}
}

// Convert the buffered stream payload into the same message shape used for restored history.
export function buildAssistantMessage(buffer: StreamBuffer, messageId?: string): Message {
	const nonEmpty = <T>(value: T[] | undefined) => (value && value.length > 0 ? value : undefined)

	return {
		role: 'assistant',
		content: buffer.text || undefined,
		charts: nonEmpty(buffer.charts),
		csvExports: nonEmpty(buffer.csvExports),
		mdExports: nonEmpty(buffer.mdExports),
		alerts: nonEmpty(buffer.alerts),
		dashboards: nonEmpty(buffer.dashboards),
		generatedImages: nonEmpty(buffer.generatedImages),
		citations: nonEmpty(buffer.citations),
		toolExecutions: nonEmpty(buffer.toolExecutions),
		thinking: buffer.thinking || undefined,
		messageMetadata: buffer.messageMetadata,
		id: messageId
	}
}

export type StreamDispatch = Dispatch<StreamAction>
