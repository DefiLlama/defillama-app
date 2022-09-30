import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getExpandedRowModel
} from '@tanstack/react-table'
import VirtualTable from '../Table'
import { liquidatablePositionsColumns, liquidatableProtocolsColumns } from './columns'

export function LiquidatableProtocolsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'liquidableAmount' }])

	const instance = useReactTable({
		data,
		columns: liquidatableProtocolsColumns,
		state: {
			sorting
		},

		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return <VirtualTable instance={instance} />
}

export function LiquidatablePositionsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'value' }])

	const instance = useReactTable({
		data,
		columns: liquidatablePositionsColumns,
		state: {
			sorting
		},

		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return <VirtualTable instance={instance} />
}
