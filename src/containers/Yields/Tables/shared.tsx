import {
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState
} from '@tanstack/react-table'
import * as React from 'react'
import { VirtualTable } from '~/components/Table/Table'
import { sortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'

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
	sortingState = []
}: IYieldsTableWrapper) => {
	const [sorting, setSorting] = React.useState<SortingState>([...sortingState])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})

	const width = useBreakpointWidth()

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnVisibility
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		sortColumnSizesAndOrders({
			instance,
			columnSizes,
			columnOrders,
			width
		})
	}, [instance, width, columnSizes, columnOrders])

	return (
		<span className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<VirtualTable instance={instance} rowSize={rowSize} />
		</span>
	)
}
