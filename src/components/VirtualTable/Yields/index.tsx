import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '../Table'
import { columns } from './Columns'
import { IYieldTableRow } from './types'

export function YieldsTable({ data }: { data: IYieldTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data: data.slice(0, 50),
		columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		debugTable: true
	})

	return <VirtualTable instance={instance} />
}
