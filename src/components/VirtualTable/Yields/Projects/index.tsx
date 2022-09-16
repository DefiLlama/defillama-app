import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '../../Table'
import { columns } from './Columns'
import type { IYieldsProjectsTableRow } from '../types'

export default function YieldsProjectsTable({ data }: { data: Array<IYieldsProjectsTableRow> }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
