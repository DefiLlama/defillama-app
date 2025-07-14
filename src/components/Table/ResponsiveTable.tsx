import { useState } from 'react'
import { useMedia } from '~/hooks/useMedia'
import { MobileCard } from './MobileCard'
import { VirtualTable } from './Table'
import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type SortingState
} from '@tanstack/react-table'

interface ResponsiveTableProps {
	data?: any[]
	columns?: any[]
	instance?: any
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
	instance,
	onRowClick,
	getRowHref,
	className = '',
	emptyMessage = 'No data available',
	cardClassName = '',
	showPagination = true,
	pageSize = 20
}: ResponsiveTableProps) {
	const isMobile = useMedia('(max-width: 768px)')
	const [sorting, setSorting] = useState<SortingState>([])
	
	// Use instance data if provided (for existing table compatibility)
	const tableData = data || (instance ? instance.getRowModel().rows.map(row => row.original) : [])
	const tableColumns = columns || (instance ? instance.getAllLeafColumns().map(col => ({
		id: col.id,
		accessorKey: col.columnDef.accessorKey,
		accessorFn: col.columnDef.accessorFn,
		header: typeof col.columnDef.header === 'function' ? col.id : col.columnDef.header,
		cell: col.columnDef.cell
	})) : [])
	
	// Create table instance for desktop if not provided
	let tableInstance = instance
	if (!instance && data && columns) {
		const reactTableColumns = columns.map(col => ({
			id: col.accessorKey,
			accessorKey: col.accessorKey,
			header: col.header,
			cell: col.cell || (({ getValue }) => getValue()),
			enableSorting: col.enableSorting !== false
		}))
		
		tableInstance = useReactTable({
			data: data,
			columns: reactTableColumns,
			state: { sorting },
			onSortingChange: setSorting,
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
		})
	}
	
	if (!tableData || tableData.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-(--text3) text-center">{emptyMessage}</p>
			</div>
		)
	}
	
	if (isMobile) {
		return (
			<MobileCardList 
				data={tableData}
				columns={tableColumns}
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
			instance={tableInstance}
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