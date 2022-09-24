import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/VirtualTable/Table'
import { columns } from './columns'
import type { INftsCollectionRow } from '../types'

export default function NftsCollectionTable({ data }: { data: Array<INftsCollectionRow> }) {
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
