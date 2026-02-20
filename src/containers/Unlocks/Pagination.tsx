import { useEffect, useReducer, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'

interface PaginationProps {
	items: React.ReactNode[]
	startIndex?: number
}

type PaginationState = {
	visibleItems: number
	pageOverride: { startIndex: number; page: number | null }
	touchStart: number | null
	touchEnd: number | null
	isSwiping: boolean
	swipeOffset: number
}

type PaginationAction =
	| { type: 'SET_VISIBLE_ITEMS'; payload: number }
	| { type: 'SET_PAGE_OVERRIDE'; payload: { startIndex: number; page: number | null } }
	| { type: 'TOUCH_START'; payload: number }
	| { type: 'TOUCH_MOVE'; payload: number }
	| { type: 'TOUCH_END' }
	| { type: 'RESET_SWIPE' }

const initialState: PaginationState = {
	visibleItems: 1,
	pageOverride: { startIndex: 0, page: null },
	touchStart: null,
	touchEnd: null,
	isSwiping: false,
	swipeOffset: 0
}

function paginationReducer(state: PaginationState, action: PaginationAction): PaginationState {
	switch (action.type) {
		case 'SET_VISIBLE_ITEMS':
			return { ...state, visibleItems: action.payload }
		case 'SET_PAGE_OVERRIDE':
			return { ...state, pageOverride: action.payload }
		case 'TOUCH_START':
			return { ...state, touchStart: action.payload, touchEnd: null, isSwiping: true }
		case 'TOUCH_MOVE':
			if (state.touchStart === null || !state.isSwiping) return state
			return {
				...state,
				touchEnd: action.payload,
				swipeOffset: action.payload - state.touchStart
			}
		case 'TOUCH_END':
			return { ...state, isSwiping: false }
		case 'RESET_SWIPE':
			return { ...state, swipeOffset: 0, touchStart: null, touchEnd: null }
		default:
			return state
	}
}

export const Pagination = ({ items, startIndex = 0 }: PaginationProps) => {
	const [state, dispatch] = useReducer(paginationReducer, {
		...initialState,
		pageOverride: { startIndex, page: null }
	})
	const paginationRef = useRef<HTMLDivElement>(null)

	// Reset page override when startIndex prop changes (derived state computed during render)
	const [prevStartIndex, setPrevStartIndex] = useState(startIndex)
	if (startIndex !== prevStartIndex) {
		setPrevStartIndex(startIndex)
		if (state.pageOverride.page != null && state.pageOverride.startIndex !== startIndex) {
			dispatch({ type: 'SET_PAGE_OVERRIDE', payload: { startIndex, page: null } })
		}
	}

	const { visibleItems, pageOverride, touchStart, touchEnd, isSwiping, swipeOffset } = state
	const minSwipeDistance = 50

	useEffect(() => {
		const calculateVisibleItems = () => {
			if (typeof document !== 'undefined' && paginationRef.current) {
				const paginationWidth = paginationRef.current.offsetWidth
				if (paginationWidth < 768) {
					dispatch({ type: 'SET_VISIBLE_ITEMS', payload: 1 })
				} else {
					const itemsPerPage = Math.max(1, Math.floor((paginationWidth - 100) / 390))
					dispatch({ type: 'SET_VISIBLE_ITEMS', payload: itemsPerPage })
				}
			}
		}

		calculateVisibleItems()
		let resizeObserver: ResizeObserver | null = null
		const handleResize = () => calculateVisibleItems()
		const hasWindow = typeof window !== 'undefined'
		let addedResizeListener = false

		if (hasWindow && 'ResizeObserver' in window && paginationRef.current) {
			resizeObserver = new ResizeObserver(() => {
				calculateVisibleItems()
			})
			resizeObserver.observe(paginationRef.current)
		} else if (hasWindow) {
			window.addEventListener('resize', handleResize)
			addedResizeListener = true
		}

		return () => {
			resizeObserver?.disconnect()
			if (addedResizeListener) {
				window.removeEventListener('resize', handleResize)
			}
		}
	}, [])

	const totalPages = Math.ceil(items.length / Math.max(1, visibleItems))
	const startPage = Math.floor(startIndex / Math.max(1, visibleItems))
	const maxPage = Math.max(0, totalPages - 1)
	const activeManualPage = pageOverride.startIndex === startIndex ? pageOverride.page : null
	const targetPage = activeManualPage == null ? startPage : activeManualPage
	const currentPage = Math.max(0, Math.min(targetPage, maxPage))

	const handlePageChange = (pageIndex: number) => {
		dispatch({ type: 'SET_PAGE_OVERRIDE', payload: { startIndex, page: pageIndex } })
		dispatch({ type: 'RESET_SWIPE' })
	}

	const handlePrevPage = () => {
		if (totalPages <= 1) {
			dispatch({ type: 'RESET_SWIPE' })
			return
		}
		const newPage = currentPage === 0 ? totalPages - 1 : currentPage - 1
		handlePageChange(newPage)
	}

	const handleNextPage = () => {
		if (totalPages <= 1) {
			dispatch({ type: 'RESET_SWIPE' })
			return
		}
		const newPage = currentPage === totalPages - 1 ? 0 : currentPage + 1
		handlePageChange(newPage)
	}

	const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		dispatch({ type: 'TOUCH_START', payload: e.targetTouches[0].clientX })
	}

	const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (touchStart === null || !isSwiping) return
		dispatch({ type: 'TOUCH_MOVE', payload: e.targetTouches[0].clientX })
	}

	const onTouchEnd = () => {
		if (touchStart === null || touchEnd === null || !isSwiping) return
		dispatch({ type: 'TOUCH_END' })

		const distance = touchStart - touchEnd
		const isLeftSwipe = distance > minSwipeDistance
		const isRightSwipe = distance < -minSwipeDistance

		requestAnimationFrame(() => {
			dispatch({ type: 'RESET_SWIPE' })
		})

		if (isLeftSwipe) {
			handleNextPage()
		} else if (isRightSwipe) {
			handlePrevPage()
		}
	}

	const startIndexSlice = currentPage * visibleItems
	const endIndexSlice = startIndexSlice + visibleItems
	const currentItems = items.slice(startIndexSlice, endIndexSlice)

	const contentStyle = {
		transform: isSwiping ? `translateX(${swipeOffset}px)` : `translateX(0)`,
		transition: isSwiping ? 'none' : 'transform 300ms ease-out',
		display: 'flex',
		width: '100%'
	}

	return (
		<>
			<div
				ref={paginationRef}
				className="relative flex w-full items-center justify-center"
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				{totalPages > 1 && (
					<button
						onClick={handlePrevPage}
						className="hidden shrink-0 rounded-md p-1.5 text-(--text-primary) hover:bg-(--bg-secondary) md:block"
						aria-label="Previous page"
					>
						<Icon name="arrow-left" height={16} width={16} />
					</button>
				)}
				<div className="flex flex-1 items-center justify-start overflow-hidden">
					<div style={contentStyle}>
						{currentItems.map((item: React.ReactNode, index: number) => (
							<div key={index} className="relative w-full p-2">
								{item}
							</div>
						))}
					</div>
				</div>
				{totalPages > 1 && (
					<button
						onClick={handleNextPage}
						className="hidden shrink-0 rounded-md p-1.5 text-(--text-primary) hover:bg-(--bg-secondary) md:block"
						aria-label="Next page"
					>
						<Icon name="arrow-right" height={16} width={16} />
					</button>
				)}
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={handlePrevPage}
						className="rounded-md p-1 text-(--text-label) transition-colors hover:text-(--text-primary) md:hidden"
						aria-label="Previous page"
					>
						<Icon name="arrow-left" height={14} width={14} />
					</button>

					<span className="text-xs font-medium text-(--text-label)">
						{currentPage + 1} / {totalPages}
					</span>

					<button
						onClick={handleNextPage}
						className="rounded-md p-1 text-(--text-label) transition-colors hover:text-(--text-primary) md:hidden"
						aria-label="Next page"
					>
						<Icon name="arrow-right" height={14} width={14} />
					</button>
				</div>
			)}
		</>
	)
}
