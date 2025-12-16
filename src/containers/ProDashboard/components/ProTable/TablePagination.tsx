import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { TagGroup } from '~/components/TagGroup'

interface TablePaginationProps {
	table: Table<IProtocolRow> | null
}

export function TablePagination({ table }: TablePaginationProps) {
	if (!table) return null

	return (
		<div className="mt-2 flex w-full items-center justify-between">
			<TagGroup
				selectedValue={null}
				setValue={(val) =>
					val === 'Next'
						? table.getCanNextPage() && table.nextPage()
						: table.getCanPreviousPage() && table.previousPage()
				}
				values={['Previous', 'Next']}
				disabledValues={[!table.getCanNextPage() && 'Next', !table.getCanPreviousPage() && 'Previous']}
			/>
			<div className="flex items-center">
				<div className="mr-2 text-xs">Per page</div>
				<TagGroup
					selectedValue={String(table.getState().pagination.pageSize)}
					values={['10', '30', '50']}
					setValue={(val) => table.setPageSize(Number(val))}
				/>
			</div>
		</div>
	)
}
