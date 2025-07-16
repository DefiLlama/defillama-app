import React, { useMemo } from 'react'
import { Icon } from '~/components/Icon'

interface PaginationProps {
	currentPage: number
	totalPages: number
	onPageChange: (page: number) => void
	pageSize: number
	onPageSizeChange: (size: number) => void
	totalItems: number
	showPageSizeSelector?: boolean
	pageSizeOptions?: number[]
}

const defaultPageSizeOptions = [25, 50, 100] //number of items per page

export const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalPages,
	onPageChange,
	pageSize,
	onPageSizeChange,
	totalItems,
	showPageSizeSelector = false,
	pageSizeOptions = defaultPageSizeOptions
}) => {
	const visiblePages = useMemo(() => {
		if (totalPages <= 1) return []

		const delta = 2
		const range = []
		const rangeWithDots = []

		for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
			range.push(i)
		}

		if (currentPage - delta > 2) {
			rangeWithDots.push(1, '...')
		} else {
			rangeWithDots.push(1)
		}

		rangeWithDots.push(...range)

		if (currentPage + delta < totalPages - 1) {
			rangeWithDots.push('...', totalPages)
		} else {
			rangeWithDots.push(totalPages)
		}

		return rangeWithDots
	}, [currentPage, totalPages])

	if (totalPages <= 1) return null
	const startItem = (currentPage - 1) * pageSize + 1
	const endItem = Math.min(currentPage * pageSize, totalItems)

	return (
		<div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-(--cards-bg) border-t border-(--divider)">
			<div className="text-sm text-(--text3)">
				Showing {startItem} to {endItem} of {totalItems} protocols
			</div>

			<div className="flex items-center gap-4">
				{showPageSizeSelector && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-(--text3)">Show:</span>
						<select
							value={pageSize}
							onChange={(e) => onPageSizeChange(Number(e.target.value))}
							className="px-2 py-1 text-sm border border-(--form-control-border) rounded-md bg-(--cards-bg) text-(--text1) focus:outline-none focus:ring-2 focus:ring-(--old-blue)"
						>
							{pageSizeOptions.map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="flex items-center gap-1">
					<button
						onClick={() => onPageChange(currentPage - 1)}
						disabled={currentPage === 1}
						className="flex items-center justify-center w-8 h-8 text-sm border border-(--form-control-border) rounded-md bg-(--cards-bg) text-(--text1) hover:bg-(--link-hover-bg) focus:outline-none focus:ring-2 focus:ring-(--old-blue) disabled:opacity-50 disabled:cursor-not-allowed"
						aria-label="Previous page"
					>
						<Icon name="chevron-left" height={16} width={16} />
					</button>

					{visiblePages.map((page, index) => (
						<React.Fragment key={index}>
							{page === '...' ? (
								<span className="flex items-center justify-center w-8 h-8 text-sm text-(--text3)">...</span>
							) : (
								<button
									onClick={() => onPageChange(page as number)}
									className={`flex items-center justify-center w-8 h-8 text-sm border border-(--form-control-border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--old-blue) ${
										currentPage === page
											? 'bg-(--old-blue) text-white border-(--old-blue)'
											: 'bg-(--cards-bg) text-(--text1) hover:bg-(--link-hover-bg)'
									}`}
								>
									{page}
								</button>
							)}
						</React.Fragment>
					))}

					<button
						onClick={() => onPageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
						className="flex items-center justify-center w-8 h-8 text-sm border border-(--form-control-border) rounded-md bg-(--cards-bg) text-(--text1) hover:bg-(--link-hover-bg) focus:outline-none focus:ring-2 focus:ring-(--old-blue) disabled:opacity-50 disabled:cursor-not-allowed"
						aria-label="Next page"
					>
						<Icon name="chevron-right" height={16} width={16} />
					</button>
				</div>
			</div>
		</div>
	)
}
