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
import VirtualTable from '~/components/Table/Table'
import { SearchIcon, TableFiltersWithInput } from './shared'

export function TableWithSearch({ data, columns, placeholder, columnToSearch, customFilters = null }) {
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
		<>
			<TableFiltersWithInput>
				<SearchIcon size={16} />

				<input
					style={{ marginRight: '8px' }}
					value={projectName}
					onChange={(e) => {
						setProjectName(e.target.value)
					}}
					placeholder={placeholder}
				/>
				{customFilters}
			</TableFiltersWithInput>
			<VirtualTable instance={instance} />
		</>
	)
}
