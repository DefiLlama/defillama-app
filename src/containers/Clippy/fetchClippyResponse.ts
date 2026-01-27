import { MCP_SERVER } from '~/constants'
import type { ClippyPageContext } from './types'

interface FetchClippyStreamParams {
	message: string
	pageContext: ClippyPageContext
	screenshot?: { data: string; mimeType: string }
	screenshotMode?: 'include' | 'available'
	sessionId?: string
	authorizedFetch: typeof fetch
	abortSignal?: AbortSignal
	onToken: (token: string) => void
	onSessionId: (sessionId: string) => void
	onMetadata: (metadata: any) => void
	onRouteToLlamaAI: (data: { reason: string; prefilledQuery: string }) => void
	onAction: (action: { type: string; target: string; params?: Record<string, unknown> }) => void
	onError: (error: string) => void
	onDone: () => void
}

export async function fetchClippyStream({
	message,
	pageContext,
	screenshot,
	screenshotMode,
	sessionId,
	authorizedFetch,
	abortSignal,
	onToken,
	onSessionId,
	onMetadata,
	onRouteToLlamaAI,
	onAction,
	onError,
	onDone
}: FetchClippyStreamParams): Promise<void> {
	const response = await authorizedFetch(`${MCP_SERVER}/clippy`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			message,
			pageContext,
			screenshot,
			screenshotMode,
			sessionId,
			stream: true
		}),
		signal: abortSignal
	})

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}))
		throw new Error(errorData.error || `Request failed: ${response.status}`)
	}

	const reader = response.body?.getReader()
	if (!reader) {
		throw new Error('No response body')
	}

	const decoder = new TextDecoder()
	let buffer = ''

	const processLine = (line: string) => {
		if (line.startsWith('data: ')) {
			const data = line.slice(6)
			if (data.trim()) {
				try {
					const parsed = JSON.parse(data)
					switch (parsed.type) {
						case 'session':
							if (parsed.sessionId) {
								onSessionId(parsed.sessionId)
							}
							break
						case 'token':
							if (parsed.content) {
								onToken(parsed.content)
							}
							break
						case 'metadata':
							if (parsed.metadata) {
								onMetadata(parsed.metadata)
							}
							break
						case 'route_to_llamaai':
							if (parsed.routeToLlamaAI) {
								onRouteToLlamaAI(parsed.routeToLlamaAI)
							}
							break
						case 'action':
							if (parsed.action) {
								onAction(parsed.action)
							}
							break
						case 'error':
							onError(parsed.content || 'Unknown error')
							break
						case 'done':
							onDone()
							break
					}
				} catch {}
			}
		}
	}

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split('\n')
			buffer = lines.pop() || ''

			for (const line of lines) {
				processLine(line)
			}
		}

		buffer += decoder.decode()

		if (buffer.trim()) {
			processLine(buffer)
		}
	} finally {
		reader.releaseLock()
	}
}
