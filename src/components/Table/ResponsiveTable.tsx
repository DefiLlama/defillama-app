import { useState } from 'react'
import { useMedia } from '~/hooks/useMedia'
import { MobileCard } from './MobileCard'
import { VirtualTable } from './Table'

interface ResponsiveTableProps {
	data: any[]
	columns: any[]
	onRowClick?: (data: any) => void
	getRowHref?: (data: any) => string
	className?: string
	emptyMessage?: string
	cardClassName?: string
	showPagination?: boolean
	pageSize?: number
}

export function ResponsiveTable({
	data,
	columns,
	onRowClick,
	getRowHref,
	className = '',
	emptyMessage = 'No data available',
	cardClassName = '',
	showPagination = true,
	pageSize = 20
}: ResponsiveTableProps) {
	const isMobile = useMedia('(max-width: 768px)')
	
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-(--text3) text-center">{emptyMessage}</p>
			</div>
		)
	}
	
	if (isMobile) {
		return (
			<MobileCardList 
				data={data}
				columns={columns}
				onRowClick={onRowClick}
				getRowHref={getRowHref}
				cardClassName={cardClassName}
				showPagination={showPagination}
				pageSize={pageSize}
			/>
		)
	}
	
	return (
		<VirtualTable
			data={data}
			columns={columns}
			className={className}
		/>
	)
}

function MobileCardList({
	data,
	columns,
	onRowClick,
	getRowHref,
	cardClassName,
	showPagination,
	pageSize
}: {
	data: any[]
	columns: any[]
	onRowClick?: (data: any) => void
	getRowHref?: (data: any) => string
	cardClassName?: string
	showPagination?: boolean
	pageSize?: number
}) {
	const [currentPage, setCurrentPage] = useState(1)
	const [isLoading, setIsLoading] = useState(false)
	
	const totalPages = Math.ceil(data.length / pageSize)
	const startIndex = (currentPage - 1) * pageSize
	const endIndex = startIndex + pageSize
	const currentData = data.slice(startIndex, endIndex)
	
	const handleLoadMore = async () => {
		if (currentPage < totalPages) {
			setIsLoading(true)
			// Simulate loading delay for better UX
			await new Promise(resolve => setTimeout(resolve, 300))
			setCurrentPage(prev => prev + 1)
			setIsLoading(false)
		}
	}
	
	return (
		<div className="space-y-3 mobile-spacing">
			{currentData.map((item, index) => (
				<MobileCard
					key={item.id || item.name || index}
					data={item}
					columns={columns}
					onRowClick={onRowClick}
					href={getRowHref ? getRowHref(item) : undefined}
					className={cardClassName}
				/>
			))}
			
			{showPagination && currentPage < totalPages && (
				<div className="flex justify-center pt-4">
					<button
						onClick={handleLoadMore}
						disabled={isLoading}
						className="px-6 py-3 bg-(--btn-bg) hover:bg-(--btn-hover-bg) text-(--text1) rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mobile-button-feedback mobile-touch-target"
					>
						{isLoading ? (
							<div className="flex items-center gap-2">
								<div className="mobile-loading-spinner" />
								Loading...
							</div>
						) : (
							`Load More (${data.length - endIndex} remaining)`
						)}
					</button>
				</div>
			)}
		</div>
	)
}