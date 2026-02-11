import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
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
	placeholder?: string | undefined
	columnToSearch?: string | undefined
	customFilters?:
		| React.ReactNode
		| ((ctx: { instance: ReturnType<typeof useReactTable> }) => React.ReactNode)
		| undefined
	header?: string | undefined
	renderSubComponent?: ((row: any) => React.ReactNode) | undefined
	columnSizes?: ColumnSizesByBreakpoint | null | undefined
	columnOrders?: ColumnOrdersByBreakpoint | null | undefined
	sortingState?: SortingState | undefined
	rowSize?: number | undefined
	compact?: boolean | undefined
}

export function TableWithSearch({
	data,
	columns,
	placeholder,
	columnToSearch,
	customFilters = undefined,
	header = '',
	renderSubComponent = undefined,
	columnSizes = undefined,
	columnOrders = undefined,
	sortingState = [],
	rowSize = undefined,
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

	const resolvedColumnToSearch = columnToSearch ?? 'name'
	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: resolvedColumnToSearch })

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
			<VirtualTable
				instance={instance}
				compact={compact}
				{...(renderSubComponent ? { renderSubComponent } : {})}
				{...(rowSize !== undefined ? { rowSize } : {})}
			/>
		</div>
	)
}
