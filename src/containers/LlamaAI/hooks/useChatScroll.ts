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

export function useChatScroll({
	scrollContainerRef,
	isStreaming,
	items,
	hasMessages,
	paginationState,
	onLoadMoreMessages
}: UseChatScrollParams) {
	const BOTTOM_THRESHOLD_PX = 150
	const SMOOTH_SCROLL_LOCK_MS = 400
	const shouldAutoScrollRef = useRef(true)
	const userDetachedFromBottomRef = useRef(false)
	const paginationRef = useRef(paginationState)
	const smoothScrollLockRef = useRef(false)
	const smoothScrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const lastScrollTopRef = useRef(0)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)

	const beginSmoothScrollLock = useCallback(() => {
		smoothScrollLockRef.current = true
		if (smoothScrollLockTimerRef.current) {
			clearTimeout(smoothScrollLockTimerRef.current)
		}
		smoothScrollLockTimerRef.current = setTimeout(() => {
			smoothScrollLockRef.current = false
			smoothScrollLockTimerRef.current = null
		}, SMOOTH_SCROLL_LOCK_MS)
	}, [])

	const enableAutoScroll = useCallback(() => {
		shouldAutoScrollRef.current = true
		userDetachedFromBottomRef.current = false
		setShowScrollToBottom(false)
	}, [])

	const scrollToBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return

		beginSmoothScrollLock()
		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'smooth'
		})
		enableAutoScroll()
	}, [beginSmoothScrollLock, enableAutoScroll, scrollContainerRef])

	useEffect(() => {
		paginationRef.current = paginationState
	}, [paginationState])

	// While streaming, keep the viewport pinned unless the user scrolls away.
	useEffect(() => {
		if (!isStreaming) {
			const timer = setTimeout(() => {
				requestAnimationFrame(() => {
					const container = scrollContainerRef.current
					if (!container) return

					const isAtBottom =
						Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight - BOTTOM_THRESHOLD_PX
					if (isAtBottom) {
						enableAutoScroll()
					} else if (container.scrollHeight > container.clientHeight) {
						setShowScrollToBottom(true)
					}
				})
			}, 100)
			return () => clearTimeout(timer)
		}

		const interval = setInterval(() => {
			const container = scrollContainerRef.current
			if (!container) return

			if (shouldAutoScrollRef.current) {
				container.scrollTop = container.scrollHeight
			}
		}, 200)
		return () => clearInterval(interval)
	}, [enableAutoScroll, isStreaming, scrollContainerRef])

	// New content should pin immediately unless the user has opted out by scrolling up.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (shouldAutoScrollRef.current && container) {
			requestAnimationFrame(() => {
				const currentContainer = scrollContainerRef.current
				if (currentContainer && shouldAutoScrollRef.current) {
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

			if (!smoothScrollLockRef.current && isImmediateScrollUp) {
				shouldAutoScrollRef.current = false
				userDetachedFromBottomRef.current = true
			}

			if (ticking) return
			ticking = true

			requestAnimationFrame(() => {
				const { scrollTop, scrollHeight, clientHeight } = container
				const previousScrollTop = lastScrollTopRef.current
				const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - BOTTOM_THRESHOLD_PX
				const isScrollingUp = scrollTop < previousScrollTop
				const hasMoved = scrollTop !== previousScrollTop
				const hasScrollableContent = scrollHeight > clientHeight

				if (!smoothScrollLockRef.current) {
					if (isAtBottom && (!userDetachedFromBottomRef.current || !isScrollingUp)) {
						enableAutoScroll()
					} else if (hasMoved && isScrollingUp) {
						shouldAutoScrollRef.current = false
						userDetachedFromBottomRef.current = true
					} else if (hasMoved && !isAtBottom && shouldAutoScrollRef.current) {
						shouldAutoScrollRef.current = false
						userDetachedFromBottomRef.current = true
					}
				} else if (isAtBottom) {
					enableAutoScroll()
				}

				setShowScrollToBottom(!shouldAutoScrollRef.current && hasScrollableContent)
				lastScrollTopRef.current = scrollTop

				const currentPagination = paginationRef.current
				if (scrollTop <= 50 && currentPagination.hasMore && !currentPagination.isLoadingMore) {
					onLoadMoreMessages()
				}

				ticking = false
			})
		}

		container.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			if (smoothScrollLockTimerRef.current) {
				clearTimeout(smoothScrollLockTimerRef.current)
				smoothScrollLockTimerRef.current = null
			}
			container.removeEventListener('scroll', onScroll)
		}
	}, [enableAutoScroll, hasMessages, onLoadMoreMessages, scrollContainerRef])

	// Edge cases:
	// 1. New prompt submitted into an older chat: if the user has not scrolled away,
	//    pin immediately to the bottom after render so the active exchange is visible.
	// 2. User scrolls up during a stream: disable follow mode immediately so the
	//    viewport is not pulled back down while they are reading older messages.
	// 3. User scrolls back near the bottom during a stream: resume follow mode
	//    even if the stream is still growing the document between scroll events.
	// 4. Only the explicit scroll-to-bottom button uses smooth scrolling; automatic
	//    follow uses direct scrollTop writes so programmatic movement is never
	//    mistaken for user intent and broken by its own scroll events.
	// 5. Near-bottom detection intentionally uses a 150px threshold rather than an
	//    exact bottom match, because streaming tokens change scrollHeight under the
	//    user and exact comparisons are too brittle on mobile momentum scroll.
	// 6. Top-of-thread pagination still relies on the passive scroll listener, so
	//    these follow-mode guards should not suppress normal upward scroll events.
	return {
		enableAutoScroll,
		scrollToBottom,
		showScrollToBottom
	}
}
