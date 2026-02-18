import {
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import * as React from 'react'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const EMPTY_SORTING: SortingState = []

interface IYieldsTableWrapper {
	data: any
	columns: any
	columnSizes: ColumnSizesByBreakpoint
	columnOrders: ColumnOrdersByBreakpoint
	rowSize?: number
	columnVisibility?: Record<string, boolean>
	setColumnVisibility?: (value: React.SetStateAction<VisibilityState>) => void
	sortingState?: SortingState
}

export const YieldsTableWrapper = ({
	data,
	columns,
	columnSizes,
	columnOrders,
	rowSize,
	columnVisibility,
	setColumnVisibility,
	sortingState = EMPTY_SORTING
}: IYieldsTableWrapper) => {
	const [sorting, setSorting] = React.useState<SortingState>([...sortingState])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnVisibility
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: (updater) => {
			const newSorting = typeof updater === 'function' ? updater(sorting) : updater
			setSorting(newSorting)
			if (newSorting.length > 0) {
				trackYieldsEvent(YIELDS_EVENTS.TABLE_SORT, { column: newSorting[0].id })
			}
		},
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	useSortColumnSizesAndOrders({ instance, columnSizes, columnOrders })

	return (
		<span className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<VirtualTable instance={instance} rowSize={rowSize} />
		</span>
	)
}
