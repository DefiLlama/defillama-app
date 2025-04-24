import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	getFilteredRowModel,
	ExpandedState,
	getExpandedRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { Icon } from '~/components/Icon'

export function TableWithSearch({
	data,
	columns,
	placeholder,
	columnToSearch,
	customFilters = null,
	header = null,
	renderSubComponent = null
}) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			expanded
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: any) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
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

	return (
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="flex items-center justify-end gap-2 p-3">
				{header ? <h1 className="text-lg font-semibold mr-auto">{header}</h1> : null}
				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder={placeholder}
						className="border border-[var(--form-control-border)] w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				{customFilters}
			</div>
			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
		</div>
	)
}
