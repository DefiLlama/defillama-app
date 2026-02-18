import type { Table } from '@tanstack/react-table'
import type { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { TagGroup } from '~/components/TagGroup'

interface TablePaginationProps {
	table: Table<IProtocolRow> | null
}

const PAGINATION_VALUES = ['Previous', 'Next'] as const
const PAGE_SIZES = ['10', '30', '50'] as const

export function TablePagination({ table }: TablePaginationProps) {
	if (!table || (table.getRowCount() <= 10 && !table.getCanPreviousPage() && !table.getCanNextPage())) return null

	return (
		<div className="mt-2 flex w-full items-center justify-between">
			{table.getCanPreviousPage() || table.getCanNextPage() ? (
				<TagGroup
					selectedValue={null}
					setValue={(val) =>
						val === 'Next'
							? table.getCanNextPage() && table.nextPage()
							: table.getCanPreviousPage() && table.previousPage()
					}
					values={PAGINATION_VALUES}
					disabledValues={[!table.getCanNextPage() && 'Next', !table.getCanPreviousPage() && 'Previous']}
				/>
			) : null}
			{table.getRowCount() > 10 ? (
				<div className="flex items-center">
					<div className="mr-2 text-xs">Per page</div>
					<TagGroup
						selectedValue={String(table.getState().pagination.pageSize)}
						values={PAGE_SIZES}
						setValue={(val) => table.setPageSize(Number(val))}
					/>
				</div>
			) : null}
		</div>
	)
}
