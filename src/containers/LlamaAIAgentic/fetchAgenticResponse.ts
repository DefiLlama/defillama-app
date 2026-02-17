import { MCP_SERVER } from '~/constants'
import type { ChartConfiguration, AlertProposedData } from './types'

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

export type { AlertProposedData }

export interface AgenticSSECallbacks {
	onToken: (content: string) => void
	onCharts: (charts: ChartConfiguration[], chartData: Record<string, any[]>) => void
	onProgress: (toolName: string) => void
	onSpawnProgress: (data: SpawnProgressData) => void
	onSessionId: (sessionId: string) => void
	onCitations: (citations: string[]) => void
	onCsvExport?: (exports: CsvExport[]) => void
	onAlertProposed?: (data: AlertProposedData) => void
	onTitle?: (title: string) => void
	onMessageId?: (messageId: string) => void
	onError: (content: string) => void
	onDone: () => void
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
	fetchFn?: typeof fetch
}

function parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>, callbacks: AgenticSSECallbacks, abortSignal?: AbortSignal) {
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
						const data = JSON.parse(line.slice(6))

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
			if (!reader.closed) {
				try {
					reader.releaseLock()
				} catch {}
			}
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
	fetchFn
}: FetchAgenticResponseParams) {
	const doFetch = fetchFn || fetch

	const requestBody: any = {
		message,
		stream: true
	}

	if (sessionId) {
		requestBody.sessionId = sessionId
	}

	if (researchMode) {
		requestBody.researchMode = true
	}

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

	const response = await doFetch(`${MCP_SERVER}/agentic`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
		signal: abortSignal
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => null)
		if (response.status === 403 && errorData?.code === 'USAGE_LIMIT_EXCEEDED') {
			const err: any = new Error(errorData.content || 'Usage limit exceeded')
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

export async function checkActiveExecution(
	sessionId: string,
	fetchFn?: typeof fetch
): Promise<{ active: boolean; status?: string; eventCount?: number; messageId?: string }> {
	try {
		const res = await (fetchFn || fetch)(`${MCP_SERVER}/agentic/active/${sessionId}`)
		if (!res.ok) return { active: false }
		return res.json()
	} catch {
		return { active: false }
	}
}

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
	const res = await (fetchFn || fetch)(`${MCP_SERVER}/agentic/stream/${sessionId}`, {
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


