'use no memo'

import type { Table } from '@tanstack/react-table'
import * as React from 'react'
import { TagGroup } from '~/components/TagGroup'
import type { IProtocolRow } from './proTable.types'

interface TablePaginationProps {
	table: Table<IProtocolRow> | null
}

const PAGINATION_VALUES = ['Previous', 'Next'] as const
const PAGE_SIZES = ['10', '30', '50'] as const

export function TablePagination({ table }: TablePaginationProps) {
	const rowCount = table?.getRowCount() ?? 0
	const canNextPage = table?.getCanNextPage() ?? false
	const canPreviousPage = table?.getCanPreviousPage() ?? false
	const pageSize = table?.getState().pagination.pageSize ?? 10
	const shouldShowPagination = canPreviousPage || canNextPage
	const shouldShowPageSizes = rowCount > 10

	const disabledValues = React.useMemo(() => {
		const values: string[] = []
		if (!canNextPage) values.push('Next')
		if (!canPreviousPage) values.push('Previous')
		return values
	}, [canNextPage, canPreviousPage])

	const handlePaginationAction = React.useCallback(
		(val: string) => {
			if (!table) return
			if (val === 'Next' && canNextPage) {
				table.nextPage()
				return
			}
			if (val === 'Previous' && canPreviousPage) {
				table.previousPage()
			}
		},
		[canNextPage, canPreviousPage, table]
	)

	const handlePageSizeChange = React.useCallback(
		(val: string) => {
			if (!table) return
			table.setPageSize(Number(val))
		},
		[table]
	)

	if (!table || (rowCount <= 10 && !shouldShowPagination)) return null

	return (
		<div className="mt-2 flex w-full items-center justify-between">
			{shouldShowPagination ? (
				<TagGroup
					selectedValue=""
					setValue={handlePaginationAction}
					values={PAGINATION_VALUES}
					disabledValues={disabledValues}
				/>
			) : null}
			{shouldShowPageSizes ? (
				<div className="flex items-center">
					<div className="mr-2 text-xs">Per page</div>
					<TagGroup selectedValue={String(pageSize)} values={PAGE_SIZES} setValue={handlePageSizeChange} />
				</div>
			) : null}
		</div>
	)
}
