import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel, ColumnDef } from '@tanstack/react-table'
import VirtualTable from '~/components/VirtualTable/Table'
import { INftsCollectionRow } from '../types'

export default function NftsChainsAndMarketplacesTable({
	data,
	columns
}: {
	data: Array<INftsCollectionRow>
	columns: ColumnDef<INftsCollectionRow>[]
}) {
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
