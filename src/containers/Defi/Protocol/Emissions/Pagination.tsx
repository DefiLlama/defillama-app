import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Icon } from '~/components/Icon'

const PaginationContainer = styled.div`
	display: flex;
	width: 100%;
	justify-content: center;
	align-items: center;
	background-color: ${({ theme }) => theme.bg6};
	border-radius: 12px;
`

const PaginationSlide = styled.div`
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
	overflow: hidden;
`

const PaginationItem = styled.div<{ isStartItem: boolean }>`
	flex: 1 0 auto;
	padding: 1rem;
	text-align: center;
	color: ${({ theme }) => theme.text1};
	cursor: pointer;
	transition: background-color 0.3s ease;
	position: relative;
`

const PaginationArrow = styled.button`
	background-color: ${({ theme }) => theme.bg2};
	color: ${({ theme }) => theme.text1};
	border: none;
	padding: 0.5rem;
	margin: 0 1rem;
	cursor: pointer;
	transition: background-color 0.3s ease;
	border-radius: 12px;
`

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
		<PaginationContainer ref={paginationRef}>
			<PaginationArrow onClick={handlePrevPage}>
				<Icon name="arrow-left" height={24} width={24} />
			</PaginationArrow>
			<PaginationSlide>
				{currentItems.map((item, index) => (
					<PaginationItem
						key={startI + index}
						onClick={() => handlePageChange(startI + index)}
						isStartItem={startI + index === startIndex}
					>
						{item}
					</PaginationItem>
				))}
			</PaginationSlide>
			<PaginationArrow onClick={handleNextPage}>
				<Icon name="arrow-right" height={24} width={24} />
			</PaginationArrow>
		</PaginationContainer>
	)
}

export default Pagination
