import {
	type ColumnDef,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum, getBlockExplorer } from '~/utils'

type BridgeTokensTableRow = {
	symbol: string
	deposited?: number
	withdrawn?: number
	volume?: number
}

const bridgeTokensColumn: ColumnDef<BridgeTokensTableRow>[] = [
	{
		header: 'Token',
		accessorKey: 'symbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const splitValue = value.split('#')
			const [symbol, token] = splitValue
			const { blockExplorerLink } = getBlockExplorer(token)

			if (value) {
				return (
					<a href={blockExplorerLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
						<span className="overflow-hidden text-ellipsis whitespace-nowrap">{symbol}</span>
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
			const value = row.original.symbol
			const splitValue = value.split('#')
			const [, token] = splitValue
			const { chainName } = getBlockExplorer(token)
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
		header: 'Total Volume',
		accessorKey: 'volume',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export function BridgeTokensTable({ data }: { data: BridgeTokensTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'volume', desc: true }])

	const instance = useReactTable({
		data,
		columns: bridgeTokensColumn,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
