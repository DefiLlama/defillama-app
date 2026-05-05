import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface PaginationState {
	hasMore: boolean
	isLoadingMore: boolean
	hasNewer?: boolean
	isLoadingNewer?: boolean
}

interface UseChatScrollParams {
	scrollContainerRef: RefObject<HTMLDivElement | null>
	isStreaming: boolean
	items: readonly unknown[]
	hasMessages: boolean
	paginationState: PaginationState
	onLoadMoreMessages: () => void
	onLoadNewerMessages?: () => void
	keyboardOpen?: boolean
	startDetached?: boolean
}

type ScrollMode = 'attached' | 'detached' | 'reattaching'

const ATTACHED_THRESHOLD_PX = 48
const TOP_PAGINATION_THRESHOLD_PX = 50
const BOTTOM_PAGINATION_THRESHOLD_PX = 50
const STREAM_FOLLOW_INTERVAL_MS = 200

// State machine for chat scroll behavior. Three modes control who owns scrollTop:
//
//   attached ──(user scrolls up)──► detached ──(user scrolls down to bottom)──► attached
//      │                               ▲
//      └──(button click)──► reattaching ┘ (user interrupts smooth scroll)
//                               │
//                               └──(scrollend / 800ms timeout)──► attached
//
// Only 'attached' mode auto-follows new content (streaming interval + items effect).
// 'reattaching' is a transient mode for the smooth scroll animation — nothing writes
// scrollTop during it so the browser animation isn't cancelled.
// 'detached' is fully passive — the user has full scroll control.
//
// External callers (session restore, new prompt) use attach() which force-sets
// 'attached' and cancels any pending reattach animation.
export function useChatScroll({
	scrollContainerRef,
	isStreaming,
	items,
	hasMessages,
	paginationState,
	onLoadMoreMessages,
	onLoadNewerMessages,
	keyboardOpen,
	startDetached = false
}: UseChatScrollParams) {
	const modeRef = useRef<ScrollMode>(startDetached ? 'detached' : 'attached')
	const paginationRef = useRef(paginationState)
	const paginationLoadInFlightRef = useRef(false)
	const newerPaginationLoadInFlightRef = useRef(false)
	const lastScrollTopRef = useRef(0)
	const [isAttached, setIsAttached] = useState(() => !startDetached)
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
			setIsAttached(mode === 'attached')
			syncScrollToBottomVisibility(container)
		},
		[scrollContainerRef, syncScrollToBottomVisibility]
	)

	const reattachCleanupRef = useRef<(() => void) | null>(null)

	const cancelPendingReattach = useCallback(() => {
		reattachCleanupRef.current?.()
		reattachCleanupRef.current = null
	}, [])

	const attach = useCallback(() => {
		cancelPendingReattach()
		setMode('attached')
	}, [cancelPendingReattach, setMode])

	const scrollToBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return

		cancelPendingReattach()

		setMode('reattaching', container)
		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'smooth'
		})

		let fallbackTimer: ReturnType<typeof setTimeout>
		const settle = () => {
			clearTimeout(fallbackTimer)
			container.removeEventListener('scrollend', settle)
			reattachCleanupRef.current = null
			if (modeRef.current === 'reattaching') {
				setMode('attached', container)
			}
		}

		container.addEventListener('scrollend', settle, { once: true })
		fallbackTimer = setTimeout(settle, 800)
		reattachCleanupRef.current = settle
	}, [cancelPendingReattach, scrollContainerRef, setMode])

	// Cancel any in-flight scrollend listener + timeout on unmount.
	useEffect(() => cancelPendingReattach, [cancelPendingReattach])

	useEffect(() => {
		paginationRef.current = paginationState
		if (!paginationState.isLoadingMore) {
			paginationLoadInFlightRef.current = false
		}
		if (!paginationState.isLoadingNewer) {
			newerPaginationLoadInFlightRef.current = false
		}
	}, [paginationState])

	// Streaming follow: while streaming, a 200ms interval pins the viewport to the
	// bottom, but ONLY in 'attached' mode — 'reattaching' and 'detached' are left
	// alone so smooth-scroll animations and user reading aren't interrupted.
	// When streaming ends, a one-shot check re-attaches if still near the bottom.
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

			if (modeRef.current === 'attached') {
				container.scrollTop = container.scrollHeight
			}
		}, STREAM_FOLLOW_INTERVAL_MS)
		return () => clearInterval(interval)
	}, [isStreaming, scrollContainerRef, setMode, syncScrollToBottomVisibility])

	// Items effect: when the message list changes (new message added, content updated),
	// snap to bottom in the next frame — but only if already attached. This handles
	// the gap between item renders and the next streaming interval tick.
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

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const resizeObserver = new ResizeObserver(() => {
			if (modeRef.current === 'attached') {
				container.scrollTop = container.scrollHeight
			}
			syncScrollToBottomVisibility(container)
			lastScrollTopRef.current = container.scrollTop
		})
		resizeObserver.observe(container)
		return () => resizeObserver.disconnect()
	}, [scrollContainerRef, syncScrollToBottomVisibility])

	// Keyboard open: when the soft keyboard appears and we're attached, snap to bottom
	// so the latest content stays visible above the input.
	useEffect(() => {
		if (keyboardOpen && modeRef.current === 'attached') {
			const container = scrollContainerRef.current
			if (container) {
				requestAnimationFrame(() => {
					if (scrollContainerRef.current && modeRef.current === 'attached') {
						scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
					}
				})
			}
		}
	}, [keyboardOpen, scrollContainerRef])

	// Scroll event handler: interprets user scroll intent and manages mode transitions.
	//
	// Immediate (pre-rAF) check: detects upward scroll while attached and detaches
	// instantly — no frame delay so the user never feels the viewport fight them.
	//
	// rAF-throttled checks handle all other transitions:
	//   reattaching + scrolling up + away from bottom → user interrupted, cancel & detach
	//   attached + moved away from bottom → detach
	//   detached + at bottom + scrolling down → re-attach
	//
	// Also triggers top-of-thread pagination when scrolled near the top. Uses a
	// synchronous in-flight ref to prevent duplicate loads before React state updates.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return
		lastScrollTopRef.current = container.scrollTop

		let ticking = false
		const onScroll = () => {
			const immediateScrollTop = container.scrollTop
			const immediatePreviousScrollTop = lastScrollTopRef.current
			const isImmediateScrollUp = immediateScrollTop < immediatePreviousScrollTop

			if (isImmediateScrollUp && modeRef.current === 'attached') {
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

				const currentPagination = paginationRef.current

				if (currentMode === 'reattaching' && isScrollingUp && !isAtBottom) {
					cancelPendingReattach()
					setMode('detached', container)
				} else if (currentMode === 'attached' && hasMoved && !isAtBottom) {
					setMode('detached', container)
				} else if (currentMode === 'detached' && isAtBottom && !isScrollingUp && !currentPagination.hasNewer) {
					setMode('attached', container)
				} else {
					setShowScrollToBottom(currentMode !== 'attached' && hasScrollableContent)
				}

				lastScrollTopRef.current = scrollTop

				if (
					currentMode === 'detached' &&
					isScrollingUp &&
					scrollTop <= TOP_PAGINATION_THRESHOLD_PX &&
					!isStreaming &&
					currentPagination.hasMore &&
					!currentPagination.isLoadingMore &&
					!paginationLoadInFlightRef.current
				) {
					paginationLoadInFlightRef.current = true
					onLoadMoreMessages()
				}

				const distanceFromBottom = scrollHeight - scrollTop - clientHeight
				if (
					currentMode === 'detached' &&
					!isScrollingUp &&
					distanceFromBottom <= BOTTOM_PAGINATION_THRESHOLD_PX &&
					!isStreaming &&
					currentPagination.hasNewer &&
					!currentPagination.isLoadingNewer &&
					!newerPaginationLoadInFlightRef.current &&
					onLoadNewerMessages
				) {
					newerPaginationLoadInFlightRef.current = true
					onLoadNewerMessages()
				}

				ticking = false
			})
		}

		container.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			container.removeEventListener('scroll', onScroll)
		}
	}, [
		cancelPendingReattach,
		hasMessages,
		isStreaming,
		onLoadMoreMessages,
		onLoadNewerMessages,
		scrollContainerRef,
		setMode
	])

	return {
		attach,
		scrollToBottom,
		isAttached,
		showScrollToBottom
	}
}
