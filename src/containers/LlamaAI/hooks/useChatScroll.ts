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
	const shouldAutoScrollRef = useRef(true)
	const paginationRef = useRef(paginationState)
	const userScrollCooldownRef = useRef(false)
	const lastScrollTopRef = useRef(0)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)

	const enableAutoScroll = useCallback(() => {
		shouldAutoScrollRef.current = true
		userScrollCooldownRef.current = false
		setShowScrollToBottom(false)
	}, [])

	const scrollToBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return

		container.scrollTo({
			top: container.scrollHeight,
			behavior: 'smooth'
		})
		enableAutoScroll()
	}, [enableAutoScroll, scrollContainerRef])

	useEffect(() => {
		paginationRef.current = paginationState
	}, [paginationState])

	// While streaming, keep the viewport pinned unless the user explicitly scrolls away from the bottom.
	useEffect(() => {
		if (!isStreaming) {
			const timer = setTimeout(() => {
				requestAnimationFrame(() => {
					const container = scrollContainerRef.current
					if (!container) return

					const isAtBottom = Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight - 150
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
			if (shouldAutoScrollRef.current && !userScrollCooldownRef.current && container) {
				container.scrollTop = container.scrollHeight
			}
		}, 200)
		return () => clearInterval(interval)
	}, [enableAutoScroll, isStreaming, scrollContainerRef])

	// Snap to the latest message when new content is appended and auto-scroll is still enabled.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (shouldAutoScrollRef.current && container) {
			container.scrollTop = container.scrollHeight
		}
	}, [items, scrollContainerRef])

	// Track user intent, the scroll-to-bottom affordance, and top-of-thread pagination.
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return
		lastScrollTopRef.current = container.scrollTop

		let cooldownTimer: ReturnType<typeof setTimeout>
		const beginUserScrollCooldown = () => {
			userScrollCooldownRef.current = true
			clearTimeout(cooldownTimer)
			cooldownTimer = setTimeout(() => {
				userScrollCooldownRef.current = false
			}, 500)
		}

		let ticking = false
		const onScroll = () => {
			if (ticking) return
			ticking = true

			requestAnimationFrame(() => {
				const { scrollTop, scrollHeight, clientHeight } = container
				const previousScrollTop = lastScrollTopRef.current
				const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 150
				const isScrollingUp = scrollTop < previousScrollTop
				const hasMoved = scrollTop !== previousScrollTop

				if (hasMoved && !isAtBottom) {
					beginUserScrollCooldown()
				}

				if (isScrollingUp || (hasMoved && !isAtBottom)) {
					shouldAutoScrollRef.current = false
				}

				if (isAtBottom) {
					enableAutoScroll()
				}

				setShowScrollToBottom(!shouldAutoScrollRef.current && scrollHeight > clientHeight)
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
			clearTimeout(cooldownTimer)
			container.removeEventListener('scroll', onScroll)
		}
	}, [enableAutoScroll, hasMessages, onLoadMoreMessages, scrollContainerRef])

	return {
		enableAutoScroll,
		scrollToBottom,
		showScrollToBottom
	}
}
