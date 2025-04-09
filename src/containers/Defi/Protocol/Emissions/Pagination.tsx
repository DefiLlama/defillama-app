import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'

const Pagination = ({ items, startIndex = 0 }) => {
	const [visibleItems, setVisibleItems] = useState(1)
	const [currentPage, setCurrentPage] = useState(0)
	const paginationRef = useRef(null)
	const [touchStart, setTouchStart] = useState(null)
	const [touchEnd, setTouchEnd] = useState(null)
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
			setCurrentPage(Math.floor(startIndex / visibleItems))
		}
	}, [visibleItems, startIndex])

	const totalPages = Math.ceil(items.length / Math.max(1, visibleItems))

	const handlePageChange = (pageIndex) => {
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

	const onTouchStart = (e) => {
		setTouchEnd(null)
		setTouchStart(e.targetTouches[0].clientX)
		setIsSwiping(true)
	}

	const onTouchMove = (e) => {
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

	const startI = currentPage * visibleItems
	const endIndex = startI + visibleItems
	const currentItems = items.slice(startI, endIndex)

	const contentStyle = {
		transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
		transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
	}

	return (
		<>
			<div
				ref={paginationRef}
				className="flex items-center justify-center rounded-xl bg-[var(--bg6)] w-full relative"
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				<button onClick={handlePrevPage} className="bg-[var(--bg2)] text-[var(--text1)] p-2 rounded-xl hidden md:block">
					<Icon name="arrow-left" height={24} width={24} />
				</button>
				<div className="flex items-start justify-start overflow-hidden flex-1">
					<div style={contentStyle} className="flex w-full">
						{currentItems.map((item, index) => (
							<div key={startI + index} className="flex-1 p-4 text-center relative w-full">
								{item}
							</div>
						))}
					</div>
				</div>
				<button onClick={handleNextPage} className="bg-[var(--bg2)] text-[var(--text1)] p-2 rounded-xl hidden md:block">
					<Icon name="arrow-right" height={24} width={24} />
				</button>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-center flex-nowrap gap-2 mt-3">
					{Array.from({ length: totalPages }).map((_, index) => (
						<button
							key={index}
							className="h-3 w-3 bg-[var(--bg4)] data-[active=true]:bg-[#5c5cf9] rounded-full flex-shrink-0"
							data-active={currentPage === index}
							onClick={() => handlePageChange(index)}
							aria-label={`Go to page ${index + 1}`}
						/>
					))}
				</div>
			)}
		</>
	)
}

export default Pagination
