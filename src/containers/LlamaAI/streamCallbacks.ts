import type { RefObject } from 'react'
import type { AgenticSSECallbacks, SpawnProgressData } from '~/containers/LlamaAI/fetchAgenticResponse'
import { isActiveRequest } from '~/containers/LlamaAI/requestLifecycle'
import {
	buildAssistantMessage,
	hasStreamBufferContent,
	type StreamBuffer,
	type StreamDispatch
} from '~/containers/LlamaAI/streamState'
import { getToolLabel } from '~/containers/LlamaAI/toolMetadata'
import type { DashboardArtifact, Message, TodoItem, UnifiedCitationReference } from '~/containers/LlamaAI/types'
import { stripBeforeReportStart } from '~/containers/LlamaAI/utils/reportMarkers'

// Consume the current streamed message id once the buffered assistant message is committed.
function takeCurrentMessageId(ref: RefObject<string | null>) {
	const messageId = ref.current || undefined
	ref.current = null
	return messageId
}

export function appendBufferedAssistantMessage(
	buffer: StreamBuffer,
	currentMessageIdRef: RefObject<string | null>,
	appendMessage: (message: Message) => void
) {
	if (!hasStreamBufferContent(buffer)) {
		currentMessageIdRef.current = null
		return
	}

	appendMessage(buildAssistantMessage(buffer, takeCurrentMessageId(currentMessageIdRef)))
}

export function createAgenticCallbacks({
	requestId,
	activeRequestIdRef,
	buffer,
	dispatch,
	currentMessageIdRef,
	toolCallIdRef,
	onSessionId,
	onTitle,
	onTokenLimit,
	onDashboardArtifact,
	appendMessage,
	replaceLocalUserMessageId,
	setMessageSiblingInfo,
	deferEmptyDone,
	onFactCheckStatus,
	onFactCheckCitations,
	notify
}: {
	requestId: number
	activeRequestIdRef: RefObject<number>
	buffer: StreamBuffer
	dispatch: StreamDispatch
	currentMessageIdRef: RefObject<string | null>
	toolCallIdRef: RefObject<number>
	onSessionId?: (sessionId: string) => void
	onTitle?: (title: string) => void
	onTokenLimit?: () => void
	onDashboardArtifact?: (dashboard: DashboardArtifact) => void
	appendMessage: (message: Message) => void
	replaceLocalUserMessageId?: (realId: string) => void
	setMessageSiblingInfo?: (messageId: string, siblingInfo: Message['siblingInfo']) => void
	deferEmptyDone?: boolean
	onFactCheckStatus?: (status: 'drafting' | 'verifying' | 'finalizing') => void
	onFactCheckCitations?: (refs: UnifiedCitationReference[], finalizedText?: string) => void
	notify: () => void
}): AgenticSSECallbacks {
	// One guard wraps every callback so late chunks from an aborted or superseded
	// request cannot mutate the current chat.
	const guard =
		<Args extends unknown[]>(fn: (...args: Args) => void) =>
		(...args: Args) => {
			if (!isActiveRequest(activeRequestIdRef, requestId)) return
			fn(...args)
		}

	return {
		onToken: guard((content) => {
			if (!buffer.hasStartedText) {
				buffer.hasStartedText = true
				dispatch({ type: 'CLEAR_ACTIVITY' })
			}
			// The accumulator stores committed content; the reducer receives the raw
			// chunk so live state can apply the same report-marker utility.
			buffer.text = stripBeforeReportStart(buffer.text + content)
			dispatch({ type: 'APPEND_TOKEN', value: content })
		}),
		onCharts: guard((charts, chartData) => {
			dispatch({ type: 'CLEAR_ACTIVITY' })
			const chartSet = { charts, chartData }
			buffer.charts.push(chartSet)
			dispatch({ type: 'APPEND_CHARTS', value: chartSet })
		}),
		onGeneratedImages: guard((images) => {
			if (!images?.length) return
			dispatch({ type: 'CLEAR_ACTIVITY' })
			buffer.generatedImages.push(...images)
			dispatch({ type: 'APPEND_GENERATED_IMAGES', value: images })
		}),
		onCsvExport: guard((exports) => {
			buffer.csvExports.push(...exports)
			dispatch({ type: 'APPEND_CSV_EXPORTS', value: exports })
		}),
		onMdExport: guard((exports) => {
			buffer.mdExports.push(...exports)
			dispatch({ type: 'APPEND_MD_EXPORTS', value: exports })
		}),
		onAlertProposed: guard((data) => {
			buffer.alerts.push(data)
			dispatch({ type: 'APPEND_ALERT', value: data })
		}),
		onDashboard: guard((dashboard) => {
			buffer.dashboards.push(dashboard)
			dispatch({ type: 'APPEND_DASHBOARD', value: dashboard })
			onDashboardArtifact?.(dashboard)
		}),
		onCitations: guard((citations) => {
			buffer.legacyUrlCitations = [...new Set([...buffer.legacyUrlCitations, ...citations])]
			dispatch({ type: 'MERGE_CITATIONS', value: citations })
		}),
		onProgress: guard((toolName, isPremium) => {
			const label = getToolLabel(toolName)
			const toolCall = { id: ++toolCallIdRef.current, name: toolName, label, ...(isPremium && { isPremium }) }
			dispatch({ type: 'APPEND_TOOL_CALL', value: toolCall })
		}),
		onToolExecution: guard((data) => {
			buffer.toolExecutions.push(data)
			dispatch({ type: 'APPEND_TOOL_EXECUTION', value: data })
			if (data.name === 'todo' && data.success) {
				const todos = (data.toolData as { todos?: TodoItem[] } | undefined)?.todos
				if (Array.isArray(todos)) {
					dispatch({ type: 'SET_TODOS', value: todos })
				}
			}
		}),
		onTodos: guard((todos) => {
			dispatch({ type: 'SET_TODOS', value: todos })
		}),
		onMessageMetadata: guard((data) => {
			buffer.messageMetadata = data
			dispatch({ type: 'SET_MESSAGE_METADATA', value: data })
		}),
		onThinking: guard((content) => {
			buffer.thinking += content
			dispatch({ type: 'APPEND_THINKING', value: content })
		}),
		onSpawnProgress: guard((data: SpawnProgressData) => {
			if (data.status === 'started' && !buffer.spawnStarted) {
				buffer.spawnStarted = true
				dispatch({ type: 'SET_SPAWN_START_TIME', value: data.startedAt ?? Date.now() })
				if (data.isResearchMode !== undefined) {
					dispatch({ type: 'SET_SPAWN_RESEARCH_MODE', value: data.isResearchMode })
				}
			}
			dispatch({
				type: 'UPSERT_SPAWN_PROGRESS',
				value: {
					id: data.agentId,
					status: data.status,
					tool: data.tool,
					toolCount: data.toolCount,
					chartCount: data.chartCount,
					findingsPreview: data.findingsPreview
				}
			})
		}),
		onCompaction: guard((data) => {
			dispatch({ type: 'SET_COMPACTING', value: data.status === 'started' })
		}),
		onSessionId: guard((sessionId, startedAt) => {
			onSessionId?.(sessionId)
			if (startedAt) dispatch({ type: 'SET_EXECUTION_STARTED_AT', value: startedAt })
		}),
		onMessageId: guard((messageId) => {
			currentMessageIdRef.current = messageId
		}),
		onUserMessageId: guard((messageId) => {
			replaceLocalUserMessageId?.(messageId)
		}),
		onSiblingInfo: guard((messageId, siblingInfo) => {
			setMessageSiblingInfo?.(messageId, siblingInfo)
		}),
		onTitle: guard((title) => {
			onTitle?.(title)
		}),
		onTokenLimit: guard(() => {
			onTokenLimit?.()
		}),
		onContextWarning: guard((warning) => {
			dispatch({ type: 'SET_CONTEXT_WARNING', value: warning })
		}),
		onFactCheckStatus: guard((status) => {
			dispatch({ type: 'SET_FACT_CHECK_PHASE', value: status })
			onFactCheckStatus?.(status)
		}),
		onFactCheckCitations: guard((refs, finalizedText) => {
			buffer.citations = refs
			const hasFinalizedText = typeof finalizedText === 'string' && finalizedText.length > 0
			if (hasFinalizedText) buffer.text = finalizedText
			dispatch({ type: 'SET_CITATIONS', citations: refs, ...(hasFinalizedText ? { text: finalizedText } : {}) })
			onFactCheckCitations?.(refs, finalizedText)
		}),
		onError: guard((content) => {
			buffer.error = content
			dispatch({ type: 'SET_ERROR', value: content })
		}),
		onDone: guard(() => {
			// Resume probes can legitimately end with only a `done` event after the
			// backend has already persisted the result; avoid committing an empty message.
			if (deferEmptyDone && !buffer.error && !hasStreamBufferContent(buffer)) return
			appendBufferedAssistantMessage(buffer, currentMessageIdRef, appendMessage)
			dispatch({ type: 'COMMIT_STREAM' })
			notify()
		})
	}
}
