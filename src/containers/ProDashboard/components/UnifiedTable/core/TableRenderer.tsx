import type { Table } from '@tanstack/react-table'
import { LoadingSpinner } from '../../LoadingSpinner'
import type { NormalizedRow } from '../types'
import { UnifiedVirtualTable } from './UnifiedVirtualTable'

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
	if (isLoading) {
		return (
			<div className="relative isolate h-[450px] overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex h-full items-center justify-center">
					<LoadingSpinner />
				</div>
			</div>
		)
	}

	return (
		<div className="relative isolate flex h-[450px] flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<UnifiedVirtualTable table={table} />
			{isEmpty && (
				<div className="pointer-events-none absolute inset-0 z-5 flex items-center justify-center bg-gradient-to-b from-transparent via-(--cards-bg)/90 to-(--cards-bg)">
					<div className="pointer-events-auto rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3 text-sm text-(--text-secondary)">
						{emptyMessage}
					</div>
				</div>
			)}
		</div>
	)
}
