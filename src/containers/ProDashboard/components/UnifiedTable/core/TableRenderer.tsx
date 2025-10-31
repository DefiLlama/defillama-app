import type { Table } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { LoadingSpinner } from '../../LoadingSpinner'
import type { UnifiedRowNode } from '../types'

interface TableRendererProps {
	table: Table<UnifiedRowNode>
	isLoading: boolean
}

export function TableRenderer({ table, isLoading }: TableRendererProps) {
	return (
		<div className="relative isolate flex-1 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{isLoading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-(--cards-bg)/60 backdrop-blur-sm">
					<LoadingSpinner />
				</div>
			)}
			<VirtualTable instance={table} skipVirtualization />
		</div>
	)
}
