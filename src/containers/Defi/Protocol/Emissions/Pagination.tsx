import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'

const Pagination = ({ items, startIndex = 0 }) => {
	const [visibleItems, setVisibleItems] = useState(1)
	const [currentPage, setCurrentPage] = useState(0)
	const paginationRef = useRef(null)

	useEffect(() => {
		const calculateVisibleItems = () => {
			if (typeof window !== 'undefined' && paginationRef.current) {
				const paginationWidth = paginationRef.current.offsetWidth - 200
				const itemsPerPage = Math.floor(paginationWidth / 390)
				setVisibleItems(itemsPerPage)
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

	const totalPages = Math.ceil(items.length / visibleItems)

	const handlePageChange = (pageIndex) => {
		setCurrentPage(pageIndex)
	}

	const handlePrevPage = () => {
		const newPage = currentPage === 0 ? totalPages - 1 : currentPage - 1
		if (newPage < 0) return handlePageChange(totalPages - 1)
		handlePageChange(newPage)
	}

	const handleNextPage = () => {
		const newPage = currentPage === totalPages - 1 ? 0 : currentPage + 1

		if (newPage >= totalPages) return handlePageChange(0)
		handlePageChange(newPage)
	}

	const startI = currentPage * visibleItems
	const endIndex = startI + visibleItems
	const currentItems = items.slice(startI, endIndex)
	return (
		<div ref={paginationRef} className="flex items-center justify-center rounded-xl bg-[var(--bg6)] w-full">
			<button
				onClick={handlePrevPage}
				className="bg-[var(--bg2)] text-[var(--text1)] p-2 rounded-xl disabled:opacity-0"
				disabled={currentPage === 0}
			>
				<Icon name="arrow-left" height={24} width={24} />
			</button>
			<div className="flex items-start justify-start overflow-hidden">
				{currentItems.map((item, index) => (
					<div
						key={startI + index}
						onClick={() => handlePageChange(startI + index)}
						className="flex-[1_0_auto] p-4 text-center relative"
					>
						{item}
					</div>
				))}
			</div>
			<button
				onClick={handleNextPage}
				className="bg-[var(--bg2)] text-[var(--text1)] p-2 rounded-xl disabled:opacity-0"
				disabled={currentPage === totalPages - 1}
			>
				<Icon name="arrow-right" height={24} width={24} />
			</button>
		</div>
	)
}

export default Pagination
