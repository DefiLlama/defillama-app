import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnOrderTableState,
	ColumnSizingState,
	ColumnSizingTableState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'
import { alphanumericFalsyLast } from './utils'

interface ITableWithSearchProps {
	data: any[]
	columns: ColumnDef<any>[]
	placeholder: string
	columnToSearch: string
	customFilters?: React.ReactNode
	header?: string
	renderSubComponent?: (row: any) => React.ReactNode
	columnSizes?: ColumnSizingTableState
	columnOrders?: ColumnOrderTableState
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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
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

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn(columnToSearch)

		const id = setTimeout(() => {
			columns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance, columnToSearch])

	const windowSize = useWindowSize()

	React.useEffect(() => {
		if (columnSizes && Array.isArray(columnSizes)) {
			const colSize = windowSize.width ? columnSizes.find((size) => windowSize.width > +size[0]) : columnSizes[0]
			instance.setColumnSizing(colSize[1])
		}

		if (columnOrders && Array.isArray(columnOrders)) {
			const colOrder = windowSize.width ? columnOrders.find((size) => windowSize.width > +size[0]) : columnOrders[0]
			instance.setColumnOrder(colOrder[1])
		}
	}, [instance, windowSize])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				{header ? <h1 className="mr-auto text-lg font-semibold">{header}</h1> : null}
				<label className="relative w-full sm:max-w-[280px]">
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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-0.5 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
				{customFilters}
			</div>
			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} rowSize={rowSize} compact={compact} />
		</div>
	)
}
