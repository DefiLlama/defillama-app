import { useMutation } from '@tanstack/react-query'
import Router from 'next/router'
import { memo, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { MCP_SERVER } from '~/constants'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import Layout from '~/layout'
import { AlertsModal } from './components/AlertsModal'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { PromptInput } from './components/PromptInput'
import { PromptResponse, QueryMetadata, SuggestedActions } from './components/PromptResponse'
import { RecommendedPrompts } from './components/RecommendedPrompts'
import { ResearchLimitModal } from './components/ResearchLimitModal'
import { ResponseControls } from './components/ResponseControls'
import { useChatHistory } from './hooks/useChatHistory'
import { useStreamNotification } from './hooks/useStreamNotification'
import type { StreamItem, ChartItem, SuggestionsItem, MetadataItem } from './types'
import { fetchPromptResponse } from './utils/fetchPromptResponse'
import { responseToItems } from './utils/messageToItems'
import { debounce, throttle } from './utils/scrollUtils'

interface SharedSession {
	session: {
		sessionId: string
		title: string
		createdAt: string
		isPublic: boolean
	}
	// Shared sessions now use role-based format (same as regular sessions)
	messages: Array<{
		role: 'user' | 'assistant'
		content: string
		messageId?: string
		timestamp: number
		sequenceNumber?: number
		images?: Array<{ url: string; mimeType: string; filename?: string }>
		// Assistant-specific fields
		metadata?: any
		suggestions?: any[]
		charts?: any[]
		chartData?: any[] | Record<string, any[]>
		citations?: string[]
		csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
	}>
	isPublicView: true
}

interface LlamaAIProps {
	initialSessionId?: string
	sharedSession?: SharedSession
	isPublicView?: boolean
	readOnly?: boolean
	showDebug?: boolean
}

export function LlamaAI({ initialSessionId, sharedSession, readOnly = false, showDebug = false }: LlamaAIProps = {}) {
	const { authorizedFetch, user } = useAuthContext()
	const {
		sidebarVisible,
		toggleSidebar,
		createFakeSession,
		loadMoreMessages,
		moveSessionToTop,
		updateSessionTitle,
		restoreSession,
		isRestoringSession,
		researchUsage,
		decrementResearchUsage
	} = useChatHistory()
	const { notify, requestPermission } = useStreamNotification()

	const [sessionId, setSessionId] = useState<string | null>(null)
	const sessionIdRef = useRef<string | null>(null)
	const newlyCreatedSessionsRef = useRef<Set<string>>(new Set())

	const [messages, setMessages] = useState<
		Array<{
			role?: string
			content?: string
			question?: string
			images?: Array<{ url: string; mimeType: string; filename?: string }>
			// New: Items-based message content
			items?: StreamItem[]
			response?: {
				answer: string
				metadata?: any
				suggestions?: any[]
				charts?: any[]
				chartData?: any[]
				citations?: string[]
				inlineSuggestions?: string
				csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
			}
			timestamp: number
			messageId?: string
			userRating?: 'good' | 'bad' | null
			metadata?: any
			suggestions?: any[]
			charts?: any[]
			chartData?: any[] | Record<string, any[]>
			citations?: string[]
			inlineSuggestions?: string
			csvExports?: Array<{ id: string; title: string; url: string; rowCount: number; filename: string }>
			savedAlertIds?: string[]
		}>
	>([])
	const [paginationState, setPaginationState] = useState<{
		hasMore: boolean
		isLoadingMore: boolean
		cursor?: number
		totalMessages?: number
	}>({ hasMore: false, isLoadingMore: false })

	const [hasRestoredSession, setHasRestoredSession] = useState<string | null>(null)
	// New: Items-based streaming state (replaces 15+ streaming-related states)
	const [streamingItems, setStreamingItems] = useState<StreamItem[]>([])
	const [streamingError, setStreamingError] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [progressMessage, setProgressMessage] = useState('')
	const [pendingImages, setPendingImages] = useState<Array<{ url: string; mimeType: string; filename?: string }>>([])
	const [resizeTrigger, setResizeTrigger] = useState(0)
	const [shouldAnimateSidebar, setShouldAnimateSidebar] = useState(false)
	const [currentMessageId, setCurrentMessageId] = useState<string | null>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [prompt, setPrompt] = useState('')
	const [isResearchMode, setIsResearchMode] = useState(false)
	const [showRateLimitModal, setShowRateLimitModal] = useState(false)
	const [showAlertsModal, setShowAlertsModal] = useState(false)
	const [rateLimitDetails, setRateLimitDetails] = useState<{
		period: string
		limit: number
		resetTime: string | null
	} | null>(null)
	const [lastFailedRequest, setLastFailedRequest] = useState<{
		userQuestion: string
		suggestionContext?: any
		preResolvedEntities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const lastInputRef = useRef<{
		text: string
		entities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const [restoreRequest, setRestoreRequest] = useState<{
		key: number
		text: string
		entities?: Array<{ term: string; slug: string }>
	} | null>(null)
	const [isDraggingOnChat, setIsDraggingOnChat] = useState(false)
	const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null)
	const chatDragCounterRef = useRef(0)

	const abortControllerRef = useRef<AbortController | null>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const shouldAutoScrollRef = useRef(true)
	const rafIdRef = useRef<number | null>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const isAutoScrollingRef = useRef(false) // Flag during session restoration auto-scroll
	const promptInputRef = useRef<HTMLTextAreaElement>(null)

	const resetScrollState = useCallback(() => {
		setShowScrollToBottom(false)
		shouldAutoScrollRef.current = true
		isAutoScrollingRef.current = true
	}, [])

	useEffect(() => {
		sessionIdRef.current = sessionId
	}, [sessionId])

	useEffect(() => {
		if (initialSessionId && !sessionId) {
			resetScrollState()
			setSessionId(initialSessionId)
			setHasRestoredSession(null)
		}
	}, [initialSessionId, sessionId, resetScrollState])

	useEffect(() => {
		if (sharedSession) {
			resetScrollState()
			// Shared sessions now use role-based format - use messages as-is
			setMessages(sharedSession.messages)
			setSessionId(sharedSession.session.sessionId)
		}
	}, [sharedSession, resetScrollState])

	const reconnectToStream = useCallback(
		(sid: string, initialContent: string) => {
			// Create a new AbortController for this reconnection
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			setIsStreaming(true)
			// Note: initialContent is passed to fetchPromptResponse which initializes ItemStreamBuffer
			// The buffer will emit the initial content immediately when onItems callback is set,
			// ensuring continuity between previous stream content and new tokens

			fetchPromptResponse({
				abortSignal: abortController.signal,
				userQuestion: '',
				sessionId: sid,
				mode: 'auto',
				resume: true,
				authorizedFetch,
				// Pass initial content to ensure buffer starts with existing content
				initialContent: initialContent || undefined,
				// New: Use onItems callback for items-based streaming
				onItems: (items) => {
					setStreamingItems(items)
				},
				onTitle: (title) => {
					updateSessionTitle({ sessionId: sid, title })
				},
				// Keep onProgress for progress messages only
				onProgress: (data) => {
					if (data.type === 'progress') {
						setProgressMessage(data.content || '')
					} else if (data.type === 'error') {
						setIsStreaming(false)
						setStreamingError(data.content || 'Generation failed')
					}
				}
			})
				.then((result) => {
					setIsStreaming(false)
					setLastFailedRequest(null)
					if (result?.items && result.items.length > 0) {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								items: result.items,
								timestamp: Date.now()
							}
						])
					}
					setStreamingItems([])
				})
				.catch((err) => {
					console.log('Reconnect stream error:', err)
					setIsStreaming(false)
					setStreamingItems([])
				})
		},
		[authorizedFetch, updateSessionTitle]
	)

	useEffect(() => {
		if (
			sessionId &&
			user &&
			!sharedSession &&
			!readOnly &&
			hasRestoredSession !== sessionId &&
			!newlyCreatedSessionsRef.current.has(sessionId) &&
			!isStreaming
		) {
			resetScrollState()
			setHasRestoredSession(sessionId)
			restoreSession(sessionId)
				.then((result: any) => {
					setMessages(result.messages)
					setPaginationState(result.pagination)

					if (result.streaming?.status === 'streaming') {
						reconnectToStream(sessionId, result.streaming.content || '')
					} else if (result.streaming?.status === 'completed' && result.streaming.result) {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: result.streaming.result.response,
								charts: result.streaming.result.charts,
								chartData: result.streaming.result.chartData,
								suggestions: result.streaming.result.suggestions,
								citations: result.streaming.result.citations,
								timestamp: Date.now()
							}
						])
					}
				})
				.catch((error) => {
					console.log('Failed to restore session:', error)
				})
		}
	}, [
		sessionId,
		user,
		sharedSession,
		readOnly,
		hasRestoredSession,
		restoreSession,
		resetScrollState,
		isStreaming,
		reconnectToStream
	])

	const {
		data: promptResponse,
		mutate: submitPrompt,
		isPending,
		error,
		reset: resetPrompt
	} = useMutation({
		mutationFn: ({
			userQuestion,
			suggestionContext,
			preResolvedEntities,
			images
		}: {
			userQuestion: string
			suggestionContext?: any
			preResolvedEntities?: Array<{ term: string; slug: string }>
			images?: Array<{ data: string; mimeType: string; filename?: string }>
		}) => {
			let currentSessionId = sessionId

			if (!currentSessionId && user) {
				currentSessionId = createFakeSession()
				newlyCreatedSessionsRef.current.add(currentSessionId)
				setSessionId(currentSessionId)
				sessionIdRef.current = currentSessionId
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			abortControllerRef.current = new AbortController()

			requestPermission()
			setIsStreaming(true)
			setStreamingItems([]) // Reset items-based streaming state
			setStreamingError('')
			setProgressMessage('')

			// Set pendingImages immediately so they display during streaming
			if (images && images.length > 0) {
				setPendingImages(
					images.map((img) => ({
						url: img.data,
						mimeType: img.mimeType,
						filename: img.filename
					}))
				)
			} else {
				setPendingImages([])
			}

			return fetchPromptResponse({
				userQuestion,
				sessionId: currentSessionId,
				suggestionContext,
				preResolvedEntities,
				images,
				mode: 'auto',
				forceIntent: isResearchMode ? 'comprehensive_report' : undefined,
				authorizedFetch,
				// New: Use onItems for items-based streaming
				onItems: (items) => {
					setStreamingItems(items)
				},
				onSessionId: (newSessionId) => {
					newlyCreatedSessionsRef.current.add(newSessionId)
					setSessionId(newSessionId)
					sessionIdRef.current = newSessionId
					// Mark as restored to prevent restoration after streaming completes
					setHasRestoredSession(newSessionId)
				},
				onTitle: (title) => {
					updateSessionTitle({ sessionId: currentSessionId, title })
				},
				onMessageId: (messageId) => {
					setCurrentMessageId(messageId)
				},
				// Keep onProgress for progress messages and errors only
				// Note: SSE 'images' events are response images, handled by items system (itemBuffer.addImages)
				// pendingImages is only for USER uploaded images shown in SentPrompt
				onProgress: (data) => {
					if (data.type === 'progress') {
						setProgressMessage(data.content)
					} else if (data.type === 'error') {
						setStreamingError(data.content)
					} else if (data.type === 'reset') {
						setProgressMessage(data.content || 'Retrying due to output error...')
					}
				},
				abortSignal: abortControllerRef.current.signal
			})
		},
		onMutate: ({
			userQuestion,
			suggestionContext,
			preResolvedEntities
		}: {
			userQuestion: string
			suggestionContext?: any
			preResolvedEntities?: Array<{ term: string; slug: string }>
			image?: any
		}) => {
			setLastFailedRequest({ userQuestion, suggestionContext, preResolvedEntities })
		},
		onSuccess: (data, variables) => {
			setIsStreaming(false)
			abortControllerRef.current = null
			setLastFailedRequest(null)
			lastInputRef.current = null

			if (isResearchMode) {
				decrementResearchUsage()
			}

			notify()

			const currentImages = pendingImages.length > 0 ? [...pendingImages] : undefined
			// New: Use items from the response, or convert legacy response to items
			const finalItems = data?.items && data.items.length > 0 ? data.items : streamingItems

			setMessages((prev) => [
				...prev,
				{
					role: 'user',
					content: variables.userQuestion,
					images: currentImages,
					timestamp: Date.now()
				},
				{
					role: 'assistant',
					items: finalItems,
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])

			setPendingImages([])
			setStreamingItems([])
			setPrompt('')
			resetPrompt()
			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		},
		onError: (error: any, variables) => {
			setIsStreaming(false)
			abortControllerRef.current = null

			if (error?.code === 'USAGE_LIMIT_EXCEEDED') {
				setRateLimitDetails({
					period: error.details?.period || 'lifetime',
					limit: error.details?.limit || 0,
					resetTime: error.details?.resetTime || null
				})
				setShowRateLimitModal(true)
				setLastFailedRequest(null)
				return
			}

			const wasUserStopped = error?.message === 'Request aborted'

			// Check if we have any meaningful content in streaming items
			const hasContent = streamingItems.some((item) => item.type === 'markdown' && (item as any).text?.trim())

			if (wasUserStopped && hasContent) {
				setLastFailedRequest(null)
				lastInputRef.current = null
				const stoppedImages = pendingImages.length > 0 ? [...pendingImages] : undefined
				setMessages((prev) => [
					...prev,
					{
						role: 'user',
						content: variables.userQuestion,
						images: stoppedImages,
						timestamp: Date.now()
					},
					{
						role: 'assistant',
						items: streamingItems,
						metadata: { stopped: true, partial: true },
						messageId: currentMessageId,
						timestamp: Date.now()
					}
				])

				setPendingImages([])
				setStreamingItems([])
				setPrompt('')
			} else if (wasUserStopped && !hasContent) {
				setPendingImages([])
				setStreamingItems([])
				setPrompt(variables.userQuestion)
				setLastFailedRequest(null)
			} else if (!wasUserStopped) {
				console.log('Request failed:', error)
				setPendingImages([])
				setStreamingItems([])
				setLastFailedRequest({
					userQuestion: variables.userQuestion,
					suggestionContext: variables.suggestionContext,
					preResolvedEntities: variables.preResolvedEntities
				})
			}

			setCurrentMessageId(null)
			setTimeout(() => {
				promptInputRef.current?.focus()
			}, 100)
		}
	})

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState !== 'visible') return
			const currentSessionId = sessionIdRef.current
			const isUserAbort = error?.message === 'Request aborted'
			if (error && !isUserAbort && currentSessionId && !isStreaming && !isPending) {
				resetPrompt()
				// Get existing markdown content from streaming items for reconnection
				const existingContent = streamingItems
					.filter((item) => item.type === 'markdown')
					.map((item) => (item as any).text)
					.join('')
				reconnectToStream(currentSessionId, existingContent)
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange)
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
	}, [error, isStreaming, isPending, reconnectToStream, streamingItems, resetPrompt])

	const handleStopRequest = useCallback(async () => {
		if (!isStreaming) return

		const currentSessionId = sessionIdRef.current
		setIsStreaming(false)

		if (currentSessionId) {
			try {
				const response = await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						sessionId: currentSessionId
					})
				})

				if (response.ok) {
					console.log('Successfully stopped streaming session')
				} else {
					const errorData = await response.json()
					console.log('Failed to stop streaming session:', errorData)
				}
			} catch (error) {
				console.log('Error stopping streaming session:', error)
			}
		}

		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		// Check if we have any meaningful content in streaming items
		const hasContent = streamingItems.some((item) => item.type === 'markdown' && (item as any).text?.trim())

		if (hasContent) {
			setMessages((prev) => [
				...prev,
				{
					role: 'user',
					content: prompt,
					timestamp: Date.now()
				},
				{
					role: 'assistant',
					items: streamingItems,
					metadata: { stopped: true, partial: true },
					messageId: currentMessageId,
					timestamp: Date.now()
				}
			])
			setPrompt('')
			lastInputRef.current = null
		} else {
			// No content streamed yet – restore the last submitted input to the text field
			const lastInput = lastInputRef.current
			if (lastInput) {
				setPrompt(lastInput.text)
				setRestoreRequest((prev) => ({
					key: (prev?.key ?? 0) + 1,
					text: lastInput.text,
					entities: lastInput.entities
				}))
			}
		}

		setStreamingItems([])
		setCurrentMessageId(null)
		setIsResearchMode(false) // Reset research mode on stop to prevent state leak
		resetPrompt()
		setTimeout(() => {
			promptInputRef.current?.focus()
		}, 100)
	}, [
		isStreaming,
		streamingItems,
		currentMessageId,
		prompt,
		lastInputRef,
		setRestoreRequest,
		setMessages,
		setStreamingItems,
		setCurrentMessageId,
		setIsResearchMode,
		resetPrompt,
		promptInputRef,
		authorizedFetch
	])

	const handleRetry = useCallback(() => {
		if (lastFailedRequest) {
			submitPrompt(lastFailedRequest)
		}
	}, [lastFailedRequest, submitPrompt])

	const handleSubmit = useCallback(
		(
			prompt: string,
			preResolved?: Array<{ term: string; slug: string; type: 'chain' | 'protocol' | 'subprotocol' }>,
			images?: Array<{ data: string; mimeType: string; filename?: string }>
		) => {
			if (isStreaming) {
				return
			}

			const finalPrompt = prompt.trim()
			setPrompt(finalPrompt)
			lastInputRef.current = { text: finalPrompt, entities: preResolved }
			shouldAutoScrollRef.current = true

			if (sessionId) {
				moveSessionToTop(sessionId)
			}

			submitPrompt({
				userQuestion: finalPrompt,
				preResolvedEntities: preResolved,
				images
			})
		},
		[sessionId, moveSessionToTop, submitPrompt, isStreaming]
	)

	const handleSubmitWithSuggestion = useCallback(
		(prompt: string, suggestion: any) => {
			if (isStreaming) {
				return
			}

			const finalPrompt = prompt.trim()
			setPrompt(finalPrompt)
			shouldAutoScrollRef.current = true

			if (sessionId) {
				moveSessionToTop(sessionId)
			}

			submitPrompt({
				userQuestion: finalPrompt,
				suggestionContext: suggestion
			})
		},
		[sessionId, moveSessionToTop, submitPrompt, isStreaming]
	)

	const handleNewChat = useCallback(async () => {
		if (initialSessionId) {
			Router.push('/ai/chat', undefined, { shallow: true })
			return
		}

		if (sessionId && isStreaming) {
			try {
				await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						sessionId: sessionId
					})
				})
			} catch (error) {
				console.log('Error stopping streaming session:', error)
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}

		if (sessionId) {
			try {
				await authorizedFetch(`${MCP_SERVER}/chatbot-agent/session/${sessionId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				console.log('Failed to reset backend session:', error)
			}
		}

		setSessionId(null)
		setHasRestoredSession(null)
		newlyCreatedSessionsRef.current.clear()
		setPrompt('')
		resetPrompt()
		setStreamingItems([])
		setStreamingError('')
		setProgressMessage('')
		setMessages([])
		setResizeTrigger((prev) => prev + 1)
		promptInputRef.current?.focus()
	}, [initialSessionId, sessionId, isStreaming, authorizedFetch, abortControllerRef, resetPrompt])

	const handleSessionSelect = useCallback(
		async (selectedSessionId: string, data: { messages: any[]; pagination?: any }) => {
			resetScrollState()

			if (sessionId && isStreaming) {
				try {
					await authorizedFetch(`${MCP_SERVER}/chatbot-agent/stop`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							sessionId: sessionId
						})
					})
				} catch (error) {
					console.log('Error stopping streaming session:', error)
				}

				if (abortControllerRef.current) {
					abortControllerRef.current.abort()
				}
			}

			setSessionId(selectedSessionId)
			setHasRestoredSession(selectedSessionId)
			setMessages(data.messages)
			setPaginationState(data.pagination || { hasMore: false, isLoadingMore: false })
			setPrompt('')
			resetPrompt()
			setStreamingItems([])
			setCurrentMessageId(null) // Clear message ID when switching sessions
			setIsResearchMode(false) // Reset research mode when switching sessions
			setIsStreaming(false) // Ensure streaming state is cleared
			setStreamingError('')
			setProgressMessage('')
			setResizeTrigger((prev) => prev + 1)

			promptInputRef.current?.focus()
		},
		[sessionId, isStreaming, authorizedFetch, resetScrollState, resetPrompt]
	)

	const handleLoadMoreMessages = useCallback(async () => {
		if (!sessionId || !paginationState.hasMore || paginationState.isLoadingMore || !paginationState.cursor) return

		const scrollContainer = scrollContainerRef.current
		if (!scrollContainer) return

		const previousScrollHeight = scrollContainer.scrollHeight
		setPaginationState((prev) => ({ ...prev, isLoadingMore: true }))

		try {
			const result = await loadMoreMessages(sessionId, paginationState.cursor)
			setMessages((prev) => [...result.messages, ...prev])
			setPaginationState(result.pagination)

			// Use RAF to batch layout reads/writes with browser paint cycle
			requestAnimationFrame(() => {
				if (scrollContainer) {
					// Batch read: get both values in single layout calculation
					const newScrollHeight = scrollContainer.scrollHeight
					const currentScrollTop = scrollContainer.scrollTop
					// Single write after reads
					scrollContainer.scrollTop = currentScrollTop + (newScrollHeight - previousScrollHeight)
				}
			})
		} catch (error) {
			console.log('Failed to load more messages:', error)
			setPaginationState((prev) => ({ ...prev, isLoadingMore: false }))
		}
	}, [sessionId, paginationState.hasMore, paginationState.isLoadingMore, paginationState.cursor, loadMoreMessages])

	const handleSuggestionClick = useCallback(
		(suggestion: any) => {
			const promptText = suggestion.title || suggestion.description || ''
			handleSubmitWithSuggestion(promptText, suggestion)
		},
		[handleSubmitWithSuggestion]
	)

	const handleSidebarToggle = useCallback(() => {
		toggleSidebar()
		setShouldAnimateSidebar(true)
		setResizeTrigger((prev) => prev + 1)
	}, [toggleSidebar])

	const handleChatDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current++
		if (e.dataTransfer.types.includes('Files')) {
			setIsDraggingOnChat(true)
		}
	}, [])

	const handleChatDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current--
		if (chatDragCounterRef.current === 0) {
			setIsDraggingOnChat(false)
		}
	}, [])

	const handleChatDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
	}, [])

	const handleChatDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		chatDragCounterRef.current = 0
		setIsDraggingOnChat(false)
		const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
		if (files.length > 0) {
			setDroppedFiles(files)
		}
	}, [])

	const clearDroppedFiles = useCallback(() => {
		setDroppedFiles(null)
	}, [])

	const onCheckScrollState = useEffectEvent(() => {
		const container = scrollContainerRef.current
		if (!container) return

		if (rafIdRef.current) {
			cancelAnimationFrame(rafIdRef.current)
		}

		rafIdRef.current = requestAnimationFrame(() => {
			const activeContainer = scrollContainerRef.current
			if (!activeContainer) return
			const { scrollTop, scrollHeight, clientHeight } = activeContainer

			const scrollBottom = Math.ceil(scrollTop + clientHeight)
			const threshold = scrollHeight - 150
			const isAtBottom = scrollBottom >= threshold
			const hasScrollableContent = scrollHeight > clientHeight

			if (isAutoScrollingRef.current && hasScrollableContent) {
				activeContainer.scrollTop = scrollHeight
				setTimeout(() => {
					isAutoScrollingRef.current = false
				}, 300)
				return
			}

			shouldAutoScrollRef.current = isAtBottom

			const shouldShowButton = hasScrollableContent && !isAtBottom && !isStreaming && !isAutoScrollingRef.current
			setShowScrollToBottom(shouldShowButton)

			if (sessionId && paginationState.hasMore && !paginationState.isLoadingMore && scrollTop <= 50) {
				handleLoadMoreMessages()
			}
		})
	})

	const hasScrollableView = messages.length > 0 || isRestoringSession || isPending || isStreaming

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const throttledScroll = throttle(onCheckScrollState, 150)
		const debouncedResize = debounce(onCheckScrollState, 100)

		if ('ResizeObserver' in window) {
			resizeObserverRef.current = new ResizeObserver(debouncedResize)
			resizeObserverRef.current.observe(container)
		}

		container.addEventListener('scroll', throttledScroll, { passive: true })
		container.addEventListener('scrollend', onCheckScrollState, { passive: true })
		onCheckScrollState()

		return () => {
			container.removeEventListener('scroll', throttledScroll)
			container.removeEventListener('scrollend', onCheckScrollState)
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
			}
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current)
			}
		}
	}, [hasScrollableView])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && (streamingItems.length > 0 || isStreaming)) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current) {
					scrollContainerRef.current.scrollTo({
						top: scrollContainerRef.current.scrollHeight,
						behavior: 'smooth'
					})
				}
			})
		}
	}, [streamingItems, isStreaming])

	useEffect(() => {
		if (shouldAutoScrollRef.current && scrollContainerRef.current && messages.length > 0) {
			requestAnimationFrame(() => {
				if (scrollContainerRef.current && shouldAutoScrollRef.current) {
					scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
				}
			})
		}
	}, [messages.length])

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	useEffect(() => {
		if (shouldAnimateSidebar) {
			const timer = setTimeout(() => {
				setShouldAnimateSidebar(false)
			}, 220)
			return () => clearTimeout(timer)
		}
	}, [shouldAnimateSidebar])

	const isSubmitted = !!(isPending || isStreaming || error || promptResponse)

	return (
		<Layout
			title="LlamaAI - DefiLlama"
			description="Get AI-powered answers about chains, protocols, metrics like TVL, fees, revenue, and compare them based on your prompts"
		>
			<div className="relative isolate flex h-[calc(100dvh-68px)] flex-nowrap overflow-hidden max-lg:flex-col lg:h-[calc(100dvh-72px)]">
				{!readOnly && (
					<>
						{sidebarVisible ? (
							<>
								<ChatHistorySidebar
									handleSidebarToggle={handleSidebarToggle}
									currentSessionId={sessionId}
									onSessionSelect={handleSessionSelect}
									onNewChat={handleNewChat}
									onOpenAlerts={() => setShowAlertsModal(true)}
									shouldAnimate={shouldAnimateSidebar}
								/>
								<div className="flex min-h-11 lg:hidden" />
							</>
						) : (
							<ChatControls handleSidebarToggle={handleSidebarToggle} handleNewChat={handleNewChat} onOpenAlerts={() => setShowAlertsModal(true)} />
						)}
					</>
				)}
				<div
					className={`relative isolate flex flex-1 flex-col overflow-hidden rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-2.5 dark:border-[#222324] ${sidebarVisible && shouldAnimateSidebar ? 'lg:animate-[shrinkToRight_0.1s_ease-out]' : ''}`}
					onDragEnter={handleChatDragEnter}
					onDragLeave={handleChatDragLeave}
					onDragOver={handleChatDragOver}
					onDrop={handleChatDrop}
				>
					{messages.length === 0 && prompt.length === 0 && !isRestoringSession && !isPending && !isStreaming ? (
						initialSessionId ? (
							<div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
										Failed to restore session,{' '}
										<button
											onClick={handleNewChat}
											data-umami-event="llamaai-new-chat"
											className="text-(--link-text) underline"
										>
											Start a new chat
										</button>
									</p>
								</div>
							</div>
						) : (
							<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2.5">
								<div className="mt-[100px] flex shrink-0 flex-col items-center justify-center gap-2.5 max-lg:mt-[50px]">
									<img
										src="/assets/llamaai/llama-ai.svg"
										alt="LlamaAI"
										className="object-contain"
										width={64}
										height={77}
									/>
									<h1 className="text-center text-2xl font-semibold">What can I help you with?</h1>
								</div>
								{!readOnly && (
									<>
										<PromptInput
											handleSubmit={handleSubmit}
											promptInputRef={promptInputRef}
											isPending={isPending}
											handleStopRequest={handleStopRequest}
											isStreaming={isStreaming}
											restoreRequest={restoreRequest}
											placeholder="Ask LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
											isResearchMode={isResearchMode}
											setIsResearchMode={setIsResearchMode}
											researchUsage={researchUsage}
											droppedFiles={droppedFiles}
											clearDroppedFiles={clearDroppedFiles}
											externalDragging={isDraggingOnChat}
										/>
										<RecommendedPrompts
											setPrompt={setPrompt}
											submitPrompt={submitPrompt}
											isPending={isPending}
											isResearchMode={isResearchMode}
										/>
									</>
								)}
							</div>
						)
					) : (
						<>
							<div
								ref={scrollContainerRef}
								className="relative thin-scrollbar flex-1 overflow-y-auto p-2.5 max-lg:px-0"
							>
								<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2.5">
									{isRestoringSession && messages.length === 0 ? (
										<p className="mt-[100px] flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
											Loading conversation
											<LoadingDots />
										</p>
									) : messages.length > 0 || isSubmitted ? (
										<div className="flex w-full flex-col gap-2 px-2 pb-2.5">
											{paginationState.isLoadingMore && (
												<p className="flex items-center justify-center gap-2 text-[#666] dark:text-[#919296]">
													Loading more messages
													<LoadingDots />
												</p>
											)}
											{messages.length > 0 && (
												<div className="flex flex-col gap-2.5">
													{messages.map((item, index) => {
														if (item.role === 'user') {
															return (
																<SentPrompt
																	key={`user-${item.timestamp}-${index}`}
																	prompt={item.content}
																	images={item.images}
																/>
															)
														}
														if (item.role === 'assistant') {
															// Use items if available, otherwise convert response fields to items
															const messageItems =
																item.items && item.items.length > 0
																	? item.items
																	: item.content
																		? responseToItems(
																				{
																					content: item.content,
																					charts: item.charts,
																					chartData: item.chartData,
																					citations: item.citations,
																					csvExports: item.csvExports,
																					suggestions: item.suggestions,
																					metadata: item.metadata,
																					inlineSuggestions: item.inlineSuggestions
																				},
																				item.messageId
																			)
																		: []

															// Extract content for ResponseControls
															const textContent = messageItems
																.filter((i): i is StreamItem & { type: 'markdown' } => i.type === 'markdown')
																.map((i) => i.text)
																.join('')

															// Extract charts for ResponseControls
															const msgCharts = messageItems
																.filter((i): i is ChartItem => i.type === 'chart')
																.map((c) => ({ id: c.chart.id, title: c.chart.title }))

															// Extract suggestions for rendering after ResponseControls
															const msgSuggestions = messageItems.find(
																(i): i is SuggestionsItem => i.type === 'suggestions'
															)

															// Extract metadata for rendering
															const msgMetadata = messageItems.find((i): i is MetadataItem => i.type === 'metadata')

															return (
																<div
																	key={`assistant-${item.messageId || item.timestamp}-${index}`}
																	className="flex flex-col gap-2.5"
																>
																	<PromptResponse
																		items={messageItems}
																		isPending={false}
																		isStreaming={false}
																		resizeTrigger={resizeTrigger}
																		showMetadata={showDebug}
																		readOnly={readOnly}
																		inlineChartConfig={{
																			resizeTrigger,
																			messageId: item.messageId,
																			alertIntent: item.metadata?.alertIntent,
																			savedAlertIds: item.savedAlertIds || item.metadata?.savedAlertIds
																		}}
																	/>
																	<ResponseControls
																		messageId={item.messageId}
																		content={textContent}
																		initialRating={item.userRating}
																		sessionId={sessionId}
																		readOnly={readOnly}
																		charts={msgCharts}
																	/>
																	{msgSuggestions?.suggestions?.length && !readOnly ? (
																		<SuggestedActions
																			suggestions={msgSuggestions.suggestions.map((s) => ({
																				title: s.label,
																				toolName: s.action,
																				arguments: s.params
																			}))}
																			handleSuggestionClick={handleSuggestionClick}
																			isPending={isPending}
																			isStreaming={false}
																		/>
																	) : null}
																	{showDebug && msgMetadata?.metadata ? (
																		<QueryMetadata metadata={msgMetadata.metadata} />
																	) : null}
																</div>
															)
														}
														return null
													})}
												</div>
											)}
											{(isPending || isStreaming || error) &&
												(() => {
													// Extract suggestions from streaming items for rendering after content
													const streamingSuggestions = streamingItems.find(
														(i): i is SuggestionsItem => i.type === 'suggestions'
													)

													return (
														<div className="flex min-h-[calc(100dvh-272px)] flex-col gap-2.5 lg:min-h-[calc(100dvh-215px)]">
															{prompt && <SentPrompt prompt={prompt} images={pendingImages} />}
															<PromptResponse
																// New: Use items-based rendering
																items={streamingItems}
																error={error?.message}
																streamingError={streamingError}
																isPending={isPending}
																isStreaming={isStreaming}
																progressMessage={progressMessage}
																onRetry={handleRetry}
																canRetry={!!lastFailedRequest}
																resizeTrigger={resizeTrigger}
																showMetadata={showDebug}
																readOnly={readOnly}
																inlineChartConfig={{
																	resizeTrigger,
																	messageId: currentMessageId ?? undefined
																}}
															/>
															{streamingSuggestions?.suggestions?.length && !isStreaming ? (
																<SuggestedActions
																	suggestions={streamingSuggestions.suggestions.map((s) => ({
																		title: s.label,
																		toolName: s.action,
																		arguments: s.params
																	}))}
																	handleSuggestionClick={handleSuggestionClick}
																	isPending={isPending}
																	isStreaming={isStreaming}
																/>
															) : null}
														</div>
													)
												})()}
										</div>
									) : (
										<div className="mt-[100px] flex flex-col items-center justify-center gap-2.5">
											<img
												src="/assets/llamaai/llama-ai.svg"
												alt="LlamaAI"
												className="object-contain"
												width={64}
												height={77}
											/>
											<h1 className="text-center text-2xl font-semibold">What can I help you with?</h1>
										</div>
									)}
								</div>
							</div>
							<div
								className={`pointer-events-none sticky ${readOnly ? 'bottom-10' : 'bottom-32'} z-10 mx-auto -mb-8 transition-opacity duration-200 ${showScrollToBottom ? 'opacity-100' : ''} ${!showScrollToBottom ? 'opacity-0' : ''}`}
							>
								<Tooltip
									content="Scroll to bottom"
									render={
										<button
											onClick={() => {
												if (scrollContainerRef.current) {
													setShowScrollToBottom(false)

													scrollContainerRef.current.scrollTo({
														top: scrollContainerRef.current.scrollHeight,
														behavior: 'smooth'
													})
												}
											}}
										/>
									}
									className="pointer-events-auto mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e6e6] bg-(--app-bg) shadow-md hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] dark:border-[#222324] dark:hover:bg-[#222324] dark:focus-visible:bg-[#222324]"
								>
									<Icon name="arrow-down" height={16} width={16} />
									<span className="sr-only">Scroll to bottom</span>
								</Tooltip>
							</div>
							<div className="relative mx-auto w-full max-w-3xl pb-2.5">
								{!readOnly && (
									<div className="absolute -top-8 right-0 left-0 h-9 bg-gradient-to-b from-transparent to-[#fefefe] dark:to-[#131516]" />
								)}
								{!readOnly && (
									<PromptInput
										handleSubmit={handleSubmit}
										promptInputRef={promptInputRef}
										isPending={isPending}
										handleStopRequest={handleStopRequest}
										isStreaming={isStreaming}
										restoreRequest={restoreRequest}
										placeholder="Reply to LlamaAI... Type @ to add a protocol, chain or stablecoin, or $ to add a coin"
										isResearchMode={isResearchMode}
										setIsResearchMode={setIsResearchMode}
										researchUsage={researchUsage}
										droppedFiles={droppedFiles}
										clearDroppedFiles={clearDroppedFiles}
										externalDragging={isDraggingOnChat}
									/>
								)}
							</div>
						</>
					)}
				</div>
			</div>
			{showRateLimitModal && rateLimitDetails && (
				<ResearchLimitModal
					isOpen={showRateLimitModal}
					onClose={() => setShowRateLimitModal(false)}
					period={rateLimitDetails.period}
					limit={rateLimitDetails.limit}
					resetTime={rateLimitDetails.resetTime}
				/>
			)}
			<AlertsModal isOpen={showAlertsModal} onClose={() => setShowAlertsModal(false)} />
		</Layout>
	)
}

const SentPrompt = memo(function SentPrompt({
	prompt,
	images
}: {
	prompt: string
	images?: Array<{ url: string; mimeType: string; filename?: string }>
}) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)

	return (
		<div className="message-sent relative ml-auto max-w-[80%] rounded-lg rounded-tr-none bg-[#ececec] p-3 dark:bg-[#222425]">
			{images && images.length > 0 && (
				<div className="mb-2.5 flex flex-wrap gap-3">
					{images.map((img) => (
						<button
							key={`sent-prompt-image-${img.url}`}
							type="button"
							onClick={() => setPreviewImage(img.url)}
							className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg"
						>
							<img src={img.url} alt={img.filename || 'Uploaded image'} className="h-full w-full object-cover" />
						</button>
					))}
				</div>
			)}
			<p>{prompt}</p>
			<ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
		</div>
	)
})

const ChatControls = memo(function ChatControls({
	handleSidebarToggle,
	handleNewChat,
	onOpenAlerts
}: {
	handleSidebarToggle: () => void
	handleNewChat: () => void
	onOpenAlerts: () => void
}) {
	return (
		<div className="flex gap-2 max-lg:flex-wrap max-lg:items-center max-lg:justify-between max-lg:p-2.5 lg:absolute lg:top-2.5 lg:left-2.5 lg:z-10 lg:flex-col">
			<Tooltip
				content="Open Chat History"
				render={<button onClick={handleSidebarToggle} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue)/12 text-(--old-blue) hover:bg-(--old-blue) hover:text-white focus-visible:bg-(--old-blue) focus-visible:text-white"
			>
				<Icon name="panel-left-open" height={16} width={16} />
				<span className="sr-only">Open Chat History</span>
			</Tooltip>
			<Tooltip
				content="New Chat"
				render={<button onClick={handleNewChat} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-(--old-blue) text-white hover:bg-(--old-blue) focus-visible:bg-(--old-blue)"
			>
				<Icon name="message-square-plus" height={16} width={16} />
				<span className="sr-only">New Chat</span>
			</Tooltip>
			<Tooltip
				content="Manage Alerts"
				render={<button onClick={onOpenAlerts} />}
				className="flex h-6 w-6 items-center justify-center gap-2 rounded-sm bg-amber-500/12 text-amber-500 hover:bg-amber-500 hover:text-white focus-visible:bg-amber-500 focus-visible:text-white"
			>
				<Icon name="calendar-plus" height={16} width={16} />
				<span className="sr-only">Manage Alerts</span>
			</Tooltip>
		</div>
	)
})
