import { useRef } from 'react'
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
	const containerRef = useRef<HTMLDivElement>(null)

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
		<div
			ref={containerRef}
			className="relative isolate flex-1 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)"
		>
			<VirtualTable instance={table} skipVirtualization={true} />
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
