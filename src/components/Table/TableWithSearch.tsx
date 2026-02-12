import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders, useTableSearch } from './utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from './utils'

interface ITableWithSearchProps {
	data: any[]
	columns: ColumnDef<any>[]
	placeholder?: string
	columnToSearch?: string
	customFilters?: React.ReactNode | ((ctx: { instance: ReturnType<typeof useReactTable> }) => React.ReactNode)
	header?: string
	renderSubComponent?: (row: any) => React.ReactNode
	columnSizes?: ColumnSizesByBreakpoint | null
	columnOrders?: ColumnOrdersByBreakpoint | null
	sortingState: SortingState
	rowSize?: number
	compact?: boolean
}

export function TableWithSearch({
	data,
	columns,
	placeholder,
	columnToSearch,
	customFilters = null,
	header = null,
	renderSubComponent = null,
	columnSizes = null,
	columnOrders = null,
	sortingState = null,
	rowSize = null,
	compact = false
}: ITableWithSearchProps) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>(sortingState)
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			expanded,
			columnSizing,
			columnOrder
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: any) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch })

	useSortColumnSizesAndOrders({ instance, columnSizes, columnOrders })

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				{header ? <h1 className="mr-auto text-lg font-semibold">{header}</h1> : null}
				{columnToSearch ? (
					<label className="relative w-full sm:max-w-70">
						<span className="sr-only">{placeholder}</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder={placeholder}
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
				) : null}
				{typeof customFilters === 'function' ? customFilters({ instance }) : customFilters}
			</div>
			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} rowSize={rowSize} compact={compact} />
		</div>
	)
}
