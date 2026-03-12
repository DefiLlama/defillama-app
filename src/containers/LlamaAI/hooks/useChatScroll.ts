import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface PaginationState {
	hasMore: boolean
	isLoadingMore: boolean
}

interface UseChatScrollParams {
	scrollContainerRef: RefObject<HTMLDivElement | null>
	isStreaming: boolean
	items: readonly unknown[]
	hasMessages: boolean
	paginationState: PaginationState
	onLoadMoreMessages: () => void
}

type ScrollMode = 'attached' | 'detached' | 'reattaching'

const ATTACHED_THRESHOLD_PX = 48
const TOP_PAGINATION_THRESHOLD_PX = 50
const STREAM_FOLLOW_INTERVAL_MS = 200

export function useChatScroll({
	scrollContainerRef,
	isStreaming,
	items,
	hasMessages,
	paginationState,
	onLoadMoreMessages
}: UseChatScrollParams) {
	const modeRef = useRef<ScrollMode>('attached')
	const paginationRef = useRef(paginationState)
	const paginationLoadInFlightRef = useRef(false)
	const lastScrollTopRef = useRef(0)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)

	const syncScrollToBottomVisibility = useCallback((container: HTMLDivElement | null) => {
		if (!container) {
			setShowScrollToBottom(false)
			return
		}

		const hasScrollableContent = container.scrollHeight > container.clientHeight
		setShowScrollToBottom(modeRef.current !== 'attached' && hasScrollableContent)
	}, [])

	const setMode = useCallback(
		(mode: ScrollMode, container: HTMLDivElement | null = scrollContainerRef.current) => {
			modeRef.current = mode
			syncScrollToBottomVisibility(container)
		},
		[scrollContainerRef, syncScrollToBottomVisibility]
	)

	const attach = useCallback(() => {
		setMode('attached')
	}, [setMode])

	const scrollToBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const isAtBottom =
			Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight - ATTACHED_THRESHOLD_PX
		if (isAtBottom) {
			setMode('attached', container)
			return
		}

		setMode('reattaching', container)
		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'smooth'
		})
	}, [scrollContainerRef, setMode])

	useEffect(() => {
		paginationRef.current = paginationState
		if (!paginationState.isLoadingMore) {
			paginationLoadInFlightRef.current = false
		}
	}, [paginationState])

	// While streaming, keep the viewport pinned only when the mode is attached.
	useEffect(() => {
		if (!isStreaming) {
			const timer = setTimeout(() => {
				requestAnimationFrame(() => {
					const container = scrollContainerRef.current
					if (!container) return

					const isAtBottom =
						Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight - ATTACHED_THRESHOLD_PX
					if (isAtBottom && modeRef.current !== 'reattaching') {
						setMode('attached', container)
					} else {
						syncScrollToBottomVisibility(container)
					}
				})
			}, 100)
			return () => clearTimeout(timer)
		}

		const interval = setInterval(() => {
			const container = scrollContainerRef.current
			if (!container) return

			if (modeRef.current === 'attached' || modeRef.current === 'reattaching') {
				container.scrollTop = container.scrollHeight
			}
		}, STREAM_FOLLOW_INTERVAL_MS)
		return () => clearInterval(interval)
	}, [isStreaming, scrollContainerRef, setMode, syncScrollToBottomVisibility])

	// New content should pin immediately only while attached.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (modeRef.current === 'attached' && container) {
			requestAnimationFrame(() => {
				const currentContainer = scrollContainerRef.current
				if (currentContainer && modeRef.current === 'attached') {
					currentContainer.scrollTop = currentContainer.scrollHeight
				}
			})
		}
	}, [items, scrollContainerRef])

	// Track user intent, the scroll-to-bottom affordance, and top-of-thread pagination.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return
		lastScrollTopRef.current = container.scrollTop

		let ticking = false
		const onScroll = () => {
			const immediateScrollTop = container.scrollTop
			const immediatePreviousScrollTop = lastScrollTopRef.current
			const isImmediateScrollUp = immediateScrollTop < immediatePreviousScrollTop

			if (isImmediateScrollUp && modeRef.current !== 'detached') {
				setMode('detached', container)
			}

			if (ticking) return
			ticking = true

			requestAnimationFrame(() => {
				const { scrollTop, scrollHeight, clientHeight } = container
				const previousScrollTop = lastScrollTopRef.current
				const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - ATTACHED_THRESHOLD_PX
				const isScrollingUp = scrollTop < previousScrollTop
				const hasMoved = scrollTop !== previousScrollTop
				const hasScrollableContent = scrollHeight > clientHeight
				const currentMode = modeRef.current

				if (currentMode === 'reattaching' && isScrollingUp) {
					setMode('detached', container)
				} else if (currentMode === 'attached' && hasMoved && !isAtBottom) {
					setMode('detached', container)
				} else if (currentMode !== 'attached' && isAtBottom) {
					setMode('attached', container)
				} else {
					setShowScrollToBottom(currentMode !== 'attached' && hasScrollableContent)
				}

				lastScrollTopRef.current = scrollTop

				const currentPagination = paginationRef.current
				if (
					scrollTop <= TOP_PAGINATION_THRESHOLD_PX &&
					!isStreaming &&
					currentPagination.hasMore &&
					!currentPagination.isLoadingMore &&
					!paginationLoadInFlightRef.current
				) {
					paginationLoadInFlightRef.current = true
					onLoadMoreMessages()
				}

				ticking = false
			})
		}

		container.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			container.removeEventListener('scroll', onScroll)
		}
	}, [hasMessages, isStreaming, onLoadMoreMessages, scrollContainerRef, setMode])

	// Edge cases:
	// 1. New prompt submitted into an older chat: if the user has not scrolled away,
	//    pin immediately to the bottom after render so the active exchange is visible.
	// 2. User scrolls up during a stream: disable follow mode immediately so the
	//    viewport is not pulled back down while they are reading older messages.
	// 3. User scrolls back to the bottom during a stream: resume follow mode only
	//    once the viewport is actually back within the strict bottom threshold.
	// 4. Only the explicit scroll-to-bottom button uses smooth scrolling; automatic
	//    follow uses direct scrollTop writes and never changes mode on its own.
	// 5. Top-of-thread pagination still relies on the passive scroll listener, so
	//    these follow-mode guards should not suppress normal upward scroll events.
	// 6. Pagination uses a synchronous in-flight ref so repeated scroll events at
	//    the top cannot enqueue duplicate load-more requests for the same cursor
	//    before React applies the loading state update.
	return {
		attach,
		scrollToBottom,
		showScrollToBottom
	}
}
