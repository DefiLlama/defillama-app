import * as React from 'react'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel, ColumnDef } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { chainsColumns, marketplacesColumns } from './columns'
import type { INftsCollectionRow } from '../types'

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

export const NftChainsTable = ({ data }) => <NftsChainsAndMarketplacesTable data={data} columns={chainsColumns} />
export const NftMarketplacesTable = ({ data }) => (
	<NftsChainsAndMarketplacesTable data={data} columns={marketplacesColumns} />
)
