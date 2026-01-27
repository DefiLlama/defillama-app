import { useState, useCallback, useRef, useMemo } from 'react'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { ClippyChartContext } from './ClippyContext'
import { fetchClippyStream } from './fetchClippyResponse'
import type { ClippyMessage, ClippyPageContext } from './types'

function generateSessionId(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

interface UseClippyOptions {
	pageContext: ClippyPageContext
	onHighlight?: (target: string) => void
	onNavigate?: (target: string) => void
	onToggle?: (target: string, params?: { enabled?: boolean }) => void
	getChartContext?: () => ClippyChartContext | null
}

export function useClippy({ pageContext, onHighlight, onNavigate, onToggle, getChartContext }: UseClippyOptions) {
	const { authorizedFetch } = useAuthContext()
	const [messages, setMessages] = useState<ClippyMessage[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const currentMessageIdRef = useRef<string | null>(null)
	const contentRef = useRef<string>('')
	const messageCountRef = useRef(0)
	const hadToggleRef = useRef(false)

	const sessionId = useMemo(() => generateSessionId(), [])

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading) return

			const userMessage: ClippyMessage = {
				id: `user-${Date.now()}`,
				role: 'user',
				content: content.trim(),
				timestamp: new Date()
			}

			const assistantMessageId = `assistant-${Date.now()}`
			currentMessageIdRef.current = assistantMessageId
			contentRef.current = ''

			const assistantMessage: ClippyMessage = {
				id: assistantMessageId,
				role: 'assistant',
				content: '',
				timestamp: new Date()
			}

			setMessages((prev) => [...prev, userMessage, assistantMessage])
			setIsLoading(true)
			setError(null)

			abortControllerRef.current = new AbortController()

			try {
				const chartCtx = getChartContext?.()
				const chartImage = chartCtx?.getImage?.()
				const screenshot = chartImage
					? {
							data: chartImage.replace(/^data:image\/\w+;base64,/, ''),
							mimeType: 'image/png'
						}
					: undefined

				const screenshotMode: 'include' | 'available' =
					messageCountRef.current === 0 || hadToggleRef.current ? 'include' : 'available'
				messageCountRef.current++
				hadToggleRef.current = false

				const enrichedContext: ClippyPageContext = chartCtx
					? {
							...pageContext,
							chartMetrics: {
								available: chartCtx.availableMetrics,
								active: chartCtx.activeMetrics
							}
						}
					: pageContext

				await fetchClippyStream({
					message: content.trim(),
					pageContext: enrichedContext,
					screenshot,
					screenshotMode: screenshot ? screenshotMode : undefined,
					sessionId,
					authorizedFetch,
					abortSignal: abortControllerRef.current.signal,
					onToken: (token) => {
						contentRef.current += token
						const newContent = contentRef.current
						setMessages((prev) =>
							prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: newContent } : msg))
						)
					},
					onSessionId: () => {},
					onMetadata: () => {},
					onRouteToLlamaAI: (routeData) => {
						setMessages((prev) =>
							prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, routeToLlamaAI: routeData } : msg))
						)
					},
					onAction: (action) => {
						if (action.type === 'highlight' && onHighlight) {
							onHighlight(action.target)
						} else if (action.type === 'navigate' && onNavigate) {
							onNavigate(action.target)
						} else if (action.type === 'toggle' && onToggle) {
							onToggle(action.target, action.params as { enabled?: boolean })
							hadToggleRef.current = true
						}
					},
					onError: (errorMsg) => {
						setError(errorMsg)
					},
					onDone: () => {
						setIsLoading(false)
					}
				})
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					return
				}
				const errorMessage = err instanceof Error ? err.message : 'Failed to get response'
				setError(errorMessage)
				setIsLoading(false)
			} finally {
				abortControllerRef.current = null
				currentMessageIdRef.current = null
			}
		},
		[pageContext, sessionId, authorizedFetch, isLoading, onHighlight, onNavigate, onToggle, getChartContext]
	)

	const cancel = useCallback(() => {
		abortControllerRef.current?.abort()
		setIsLoading(false)
	}, [])

	const clearMessages = useCallback(() => {
		setMessages([])
		setError(null)
	}, [])

	return {
		messages,
		isLoading,
		error,
		sessionId,
		sendMessage,
		cancel,
		clearMessages
	}
}
