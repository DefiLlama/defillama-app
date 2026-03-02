'use no memo'

import type { Table } from '@tanstack/react-table'
import * as React from 'react'
import { TagGroup } from '~/components/TagGroup'
import type { NormalizedRow } from '../types'

interface UnifiedTablePaginationProps {
	table: Table<NormalizedRow>
}

const PAGE_SIZES = ['10', '30', '50'] as const
const PAGINATION_VALUES = ['Previous', 'Next'] as const

export function UnifiedTablePagination({ table }: UnifiedTablePaginationProps) {
	const canPreviousPage = table.getCanPreviousPage()
	const canNextPage = table.getCanNextPage()
	const pageSize = String(table.getState().pagination.pageSize)

	const disabledValues = React.useMemo(() => {
		const values: string[] = []
		if (!canPreviousPage) values.push('Previous')
		if (!canNextPage) values.push('Next')
		return values
	}, [canNextPage, canPreviousPage])

	const handlePageSizeChange = React.useCallback(
		(val: string) => {
			table.setPageSize(Number(val))
		},
		[table]
	)

	const handlePaginationChange = React.useCallback(
		(val: string) => {
			if (val === 'Next') {
				if (canNextPage) table.nextPage()
				return
			}
			if (canPreviousPage) {
				table.previousPage()
			}
		},
		[canNextPage, canPreviousPage, table]
	)

	if (!canPreviousPage && !canNextPage) {
		return (
			<div className="mt-2 flex w-full items-center justify-end">
				<TagGroup selectedValue={pageSize} values={PAGE_SIZES} setValue={handlePageSizeChange} />
			</div>
		)
	}

	return (
		<div className="mt-2 flex w-full items-center justify-between">
			<TagGroup
				selectedValue={null}
				setValue={handlePaginationChange}
				values={PAGINATION_VALUES}
				disabledValues={disabledValues}
			/>
			<div className="flex items-center">
				<div className="mr-2 text-xs">Per page</div>
				<TagGroup selectedValue={pageSize} values={PAGE_SIZES} setValue={handlePageSizeChange} />
			</div>
		</div>
	)
}
