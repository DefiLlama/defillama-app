import { Table } from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import type { UnifiedRowNode } from '../types'

interface UnifiedTablePaginationProps {
	table: Table<UnifiedRowNode>
}

const PAGE_SIZES = ['10', '30', '50']

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
				values={['Previous', 'Next']}
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
