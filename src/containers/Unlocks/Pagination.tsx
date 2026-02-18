import { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'

interface PaginationProps {
	items: React.ReactNode[]
	startIndex?: number
}

export const Pagination = ({ items, startIndex = 0 }: PaginationProps) => {
	const [visibleItems, setVisibleItems] = useState(1)
	const [currentPage, setCurrentPage] = useState(0)
	const paginationRef = useRef<HTMLDivElement>(null)
	const [touchStart, setTouchStart] = useState<number | null>(null)
	const [touchEnd, setTouchEnd] = useState<number | null>(null)
	const [isSwiping, setIsSwiping] = useState(false)
	const [swipeOffset, setSwipeOffset] = useState(0)

	const minSwipeDistance = 50

	useEffect(() => {
		const calculateVisibleItems = () => {
			if (typeof document !== 'undefined' && paginationRef.current) {
				const paginationWidth = paginationRef.current.offsetWidth
				if (paginationWidth < 768) {
					setVisibleItems(1)
				} else {
					const itemsPerPage = Math.max(1, Math.floor((paginationWidth - 100) / 390))
					setVisibleItems(itemsPerPage)
				}
			}
		}

		calculateVisibleItems()

		const handleResize = () => {
			calculateVisibleItems()
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])

	useEffect(() => {
		if (visibleItems && startIndex) {
			setCurrentPage(() => Math.floor(startIndex / visibleItems))
		}
	}, [visibleItems, startIndex])

	const totalPages = Math.ceil(items.length / Math.max(1, visibleItems))

	const handlePageChange = (pageIndex: number) => {
		setCurrentPage(pageIndex)
		setSwipeOffset(0)
	}

	const handlePrevPage = () => {
		const newPage = currentPage === 0 ? totalPages - 1 : currentPage - 1
		handlePageChange(newPage)
	}

	const handleNextPage = () => {
		const newPage = currentPage === totalPages - 1 ? 0 : currentPage + 1
		handlePageChange(newPage)
	}

	const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		setTouchEnd(null)
		setTouchStart(e.targetTouches[0].clientX)
		setIsSwiping(true)
	}

	const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (!touchStart || !isSwiping) return

		const currentTouch = e.targetTouches[0].clientX
		setTouchEnd(currentTouch)

		const offset = currentTouch - touchStart
		setSwipeOffset(offset)
	}

	const onTouchEnd = () => {
		if (!touchStart || !touchEnd || !isSwiping) return
		setIsSwiping(false)

		const distance = touchStart - touchEnd
		const isLeftSwipe = distance > minSwipeDistance
		const isRightSwipe = distance < -minSwipeDistance

		setTimeout(() => {
			setSwipeOffset(0)
		}, 10)

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
