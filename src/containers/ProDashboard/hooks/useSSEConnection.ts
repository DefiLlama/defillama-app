import { useCallback, useEffect, useRef, useState } from 'react'

interface StreamEvent {
	type: string
	content?: string
	error?: string
	conversation_id?: string
	timestamp?: string
	tool_data?: unknown
}

interface SSEConnectionOptions {
	onStreamEvent: (event: StreamEvent) => void
}

export const useSSEConnection = ({ onStreamEvent }: SSEConnectionOptions) => {
	const [isConnected, setIsConnected] = useState(false)
	const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	const sendMessage = useCallback(
		async (message: string, dashboardContext: Record<string, unknown>, conversationId: string | null) => {
			disconnect()

			try {
				abortControllerRef.current = new AbortController()

				const payload: Record<string, unknown> = {
					message,
					dashboard_json: dashboardContext,
					stream: true
				}

				if (conversationId) {
					payload.conversation_id = conversationId
				}

				const response = await fetch(`http://localhost:3001/api/chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'text/event-stream'
					},
					body: JSON.stringify(payload),
					signal: abortControllerRef.current.signal
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
				}

				setIsConnected(true)

				if (response.body) {
					const reader = response.body.getReader()
					readerRef.current = reader
					await handleStreamResponse(reader)
				}
			} catch (error: any) {
				if (error.name !== 'AbortError') {
					onStreamEvent({
						type: 'error',
						error: error.message,
						conversation_id: conversationId,
						timestamp: new Date().toISOString()
					})
				}
				setIsConnected(false)
			}
		},
		[onStreamEvent]
	)

	const handleStreamResponse = useCallback(
		async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
			const decoder = new TextDecoder()
			let buffer = ''

			try {
				while (true) {
					const { done, value } = await reader.read()

					if (done) {
						break
					}

					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')
					buffer = lines.pop() || ''

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const jsonStr = line.slice(6).trim()
							if (jsonStr) {
								try {
									const event = JSON.parse(jsonStr)
									onStreamEvent(event)
								} catch (parseError) {}
							}
						}
					}
				}
			} catch (error: any) {
				if (error.name !== 'AbortError') {
					onStreamEvent({
						type: 'error',
						error: error.message,
						conversation_id: null,
						timestamp: new Date().toISOString()
					})
				}
			} finally {
				setIsConnected(false)
				readerRef.current = null
			}
		},
		[onStreamEvent]
	)

	const disconnect = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}

		if (readerRef.current) {
			readerRef.current.cancel()
			readerRef.current = null
		}

		setIsConnected(false)
	}, [])

	useEffect(() => {
		return () => {
			disconnect()
		}
	}, [disconnect])

	return {
		isConnected,
		sendMessage,
		disconnect
	}
}
