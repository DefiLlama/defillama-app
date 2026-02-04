import { Table } from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import type { NormalizedRow } from '../types'

interface UnifiedTablePaginationProps {
	table: Table<NormalizedRow>
}

const PAGE_SIZES = ['10', '30', '50'] as const
const PAGINATION_VALUES = ['Previous', 'Next'] as const

export function UnifiedTablePagination({ table }: UnifiedTablePaginationProps) {
	if (!table.getCanPreviousPage() && !table.getCanNextPage()) {
		return (
			<div className="mt-2 flex w-full items-center justify-end">
				<TagGroup
					selectedValue={String(table.getState().pagination.pageSize)}
					values={PAGE_SIZES}
					setValue={(val) => table.setPageSize(Number(val))}
				/>
			</div>
		)
	}

	return (
		<div className="mt-2 flex w-full items-center justify-between">
			<TagGroup
				selectedValue={null}
				setValue={(val) => (val === 'Next' ? table.nextPage() : table.previousPage())}
				values={PAGINATION_VALUES}
			/>
			<div className="flex items-center">
				<div className="mr-2 text-xs">Per page</div>
				<TagGroup
					selectedValue={String(table.getState().pagination.pageSize)}
					values={PAGE_SIZES}
					setValue={(val) => table.setPageSize(Number(val))}
				/>
			</div>
		</div>
	)
}
