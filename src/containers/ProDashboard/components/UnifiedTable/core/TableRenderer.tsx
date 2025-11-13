import type { Table } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { LoadingSpinner } from '../../LoadingSpinner'
import type { NormalizedRow } from '../types'

interface TableRendererProps {
	table: Table<NormalizedRow>
	isLoading: boolean
	isEmpty?: boolean
	emptyMessage?: string
}

export function TableRenderer({
	table,
	isLoading,
	isEmpty = false,
	emptyMessage = 'No rows match the current filters.'
}: TableRendererProps) {
	const flatRowCount = table.getRowModel().flatRows.length
	const shouldVirtualize = flatRowCount > 200
	const skipVirtualization = !shouldVirtualize

	return (
		<div className="relative isolate flex-1 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{isLoading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-(--cards-bg)/60 backdrop-blur-sm">
					<LoadingSpinner />
				</div>
			)}
			<VirtualTable instance={table} skipVirtualization={skipVirtualization} />
			{!isLoading && isEmpty && (
				<div className="pointer-events-none absolute inset-0 z-5 flex items-center justify-center bg-gradient-to-b from-transparent via-(--cards-bg)/90 to-(--cards-bg)">
					<div className="pointer-events-auto rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3 text-sm text-(--text-secondary)">
						{emptyMessage}
					</div>
				</div>
			)}
		</div>
	)
}
