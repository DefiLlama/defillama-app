import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	type RowData,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from './utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from './utils'

const EMPTY_SORTING: SortingState = []

type CustomFiltersProp = React.ReactNode | (() => React.ReactNode)

interface ITableWithSearchBaseProps<T extends RowData> {
	data: T[]
	columns: ColumnDef<T>[]
	placeholder?: string
	columnToSearch?: string
	header?: string | null
	headingAs?: 'h1' | 'h2'
	columnSizes?: ColumnSizesByBreakpoint | null
	columnOrders?: ColumnOrdersByBreakpoint | null
	sortingState?: SortingState
	rowSize?: number | null
	compact?: boolean
	getSubRows?: (row: T) => T[] | undefined
}

type ITableWithSearchProps<T extends RowData = RowData> = ITableWithSearchBaseProps<T> &
	(
		| {
				csvFileName: string
				customFilters?: CustomFiltersProp | null
		  }
		| {
				csvFileName?: null
				customFilters: CustomFiltersProp
		  }
	)

export function TableWithSearch<T extends RowData>({
	data,
	columns,
	placeholder,
	columnToSearch,
	customFilters = null,
	header = null,
	headingAs: HeadingTag = 'h2',
	columnSizes = null,
	columnOrders = null,
	sortingState = EMPTY_SORTING,
	rowSize = null,
	compact = false,
	csvFileName = null,
	getSubRows: getSubRowsProp
}: ITableWithSearchProps<T>) {
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
		enableSortingRemoval: false,
		filterFromLeafRows: true,
		onExpandedChange: (updater) => React.startTransition(() => setExpanded(updater)),
		getSubRows:
			getSubRowsProp ??
			((row) => {
				const sub = (row as Record<string, unknown>).subRows
				return Array.isArray(sub) ? (sub as T[]) : undefined
			}),
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		onColumnSizingChange: (updater) => React.startTransition(() => setColumnSizing(updater)),
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch })

	useSortColumnSizesAndOrders({ instance, columnSizes, columnOrders })

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				{header ? <HeadingTag className="mr-auto text-lg font-semibold">{header}</HeadingTag> : null}
				{columnToSearch ? (
					<label className={`relative w-full sm:max-w-70 ${header ? '' : 'mr-auto'}`}>
						<span className="sr-only">{placeholder}</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							onInput={(e) => setProjectName(e.currentTarget.value)}
							placeholder={placeholder}
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
				) : null}
				{typeof customFilters === 'function' ? customFilters() : customFilters}
				{csvFileName ? (
					<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: csvFileName })} smol />
				) : null}
			</div>
			<VirtualTable instance={instance} rowSize={rowSize ?? undefined} compact={compact} />
		</div>
	)
}
