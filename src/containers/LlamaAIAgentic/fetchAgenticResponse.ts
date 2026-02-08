import { MCP_SERVER } from '~/constants'
import type { ChartConfiguration } from './types'

interface AgenticSSECallbacks {
	onToken: (content: string) => void
	onCharts: (charts: ChartConfiguration[], chartData: Record<string, any[]>) => void
	onProgress: (toolName: string) => void
	onSessionId: (sessionId: string) => void
	onError: (content: string) => void
	onDone: () => void
}

interface FetchAgenticResponseParams {
	message: string
	sessionId?: string | null
	callbacks: AgenticSSECallbacks
	abortSignal?: AbortSignal
}

export async function fetchAgenticResponse({ message, sessionId, callbacks, abortSignal }: FetchAgenticResponseParams) {
	const requestBody: any = {
		message,
		stream: true
	}

	if (sessionId) {
		requestBody.sessionId = sessionId
	}

	const response = await fetch(`${MCP_SERVER}/agentic`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
		signal: abortSignal
	})

	if (!response.ok) {
		throw new Error(`HTTP error status: ${response.status}`)
	}

	if (!response.body) {
		throw new Error('No response body')
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let lineBuffer = ''

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
						case 'error':
							callbacks.onError(data.content || 'Unknown error')
							break
						case 'done':
							callbacks.onDone()
							break
						// response_end is a no-op
					}
				} catch {
					// JSON parse error — skip malformed line
				}
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
