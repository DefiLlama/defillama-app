import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { getBlockExplorerForAddress } from '~/containers/Bridges/utils'
import { formattedNum } from '~/utils'

export type BridgeAddressesTableRow = {
	address: string
	deposited?: number
	withdrawn?: number
	txs?: number
}

const bridgeAddressesColumn: ColumnDef<BridgeAddressesTableRow>[] = [
	{
		header: 'Address',
		accessorKey: 'address',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const formattedValue = value.split(':')[1]
			const { blockExplorerLink } = getBlockExplorerForAddress(value)
			if (value) {
				return (
					<a href={blockExplorerLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
						<span className="overflow-hidden text-ellipsis whitespace-nowrap">
							{formattedValue.slice(0, 5) + '...' + formattedValue.slice(-4)}
						</span>
						<Icon name="external-link" height={10} width={10} />
					</a>
				)
			} else return <>Not found</>
		},
		size: 120
	},
	{
		header: 'Chain',
		id: 'chainName',
		cell: ({ row }) => {
			const value = row.original.address
			const { chainName } = getBlockExplorerForAddress(value)
			return chainName
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Deposited',
		accessorKey: 'deposited',
		cell: (info) => formattedNum(info.getValue() ?? 0, true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Withdrawn',
		accessorKey: 'withdrawn',
		cell: (info) => formattedNum(info.getValue() ?? 0, true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Transactions',
		accessorKey: 'txs',
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export function BridgeAddressesTable({ data }: { data: BridgeAddressesTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'withdrawn', desc: true }])

	const instance = useReactTable({
		data,
		columns: bridgeAddressesColumn,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
