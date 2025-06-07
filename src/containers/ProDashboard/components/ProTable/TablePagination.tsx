import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'

interface TablePaginationProps {
	table: Table<IProtocolRow> | null
}

export function TablePagination({ table }: TablePaginationProps) {
	if (!table) return null

	return (
		<div className="flex items-center justify-between w-full mt-2">
			<TagGroup
				selectedValue={null}
				setValue={(val) => (val === 'Next' ? table.nextPage() : table.previousPage())}
				values={['Previous', 'Next']}
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