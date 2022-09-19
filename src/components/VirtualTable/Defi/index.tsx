import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/VirtualTable/Table'
import { categoriesColumn, forksColumn, oraclesColumn } from './columns'
import type { IOraclesRow, IForksRow, ICategoryRow } from './types'

export default function DefiProtocolsTable({ data, columns }) {
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

export const OraclesTable = ({ data }: { data: Array<IOraclesRow> }) => (
	<DefiProtocolsTable data={data} columns={oraclesColumn} />
)

export const ForksTable = ({ data }: { data: Array<IForksRow> }) => (
	<DefiProtocolsTable data={data} columns={forksColumn} />
)

export const ProtocolsCategoriesTable = ({ data }: { data: Array<ICategoryRow> }) => (
	<DefiProtocolsTable data={data} columns={categoriesColumn} />
)
