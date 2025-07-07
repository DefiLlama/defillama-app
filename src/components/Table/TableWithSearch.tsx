import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	getFilteredRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState,
	ColumnSizingState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { Icon } from '~/components/Icon'
import useWindowSize from '~/hooks/useWindowSize'

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
	defaultSorting = null
}) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>(defaultSorting ?? [])
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
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				if (typeof a === 'number' && a <= 0) a = null
				if (typeof b === 'number' && b <= 0) b = null

				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				return a - b
			}
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
		<div className="bg-(--cards-bg) border border-[#e6e6e6] dark:border-[#222324] rounded-md">
			<div className="flex items-center justify-end gap-2 p-3">
				{header ? <h1 className="text-lg font-semibold mr-auto">{header}</h1> : null}
				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder={placeholder}
						className="border border-(--form-control-border) w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				{customFilters}
			</div>
			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
		</div>
	)
}
