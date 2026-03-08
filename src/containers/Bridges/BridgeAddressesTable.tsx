import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { getBlockExplorerForAddress } from '~/containers/Bridges/utils'
import { formattedNum } from '~/utils'

type BridgeAddressesTableRow = {
	address: string
	deposited?: number
	withdrawn?: number
	txs?: number
}
const columnHelper = createColumnHelper<BridgeAddressesTableRow>()

const bridgeAddressesColumn = [
	columnHelper.accessor('address', {
		header: 'Address',
		cell: ({ getValue }) => {
			const value = getValue()
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
			} else return 'Not found'
		},
		size: 120
	}),
	columnHelper.display({
		id: 'chainName',
		header: 'Chain',
		cell: ({ row }) => {
			const value = row.original.address
			const { chainName } = getBlockExplorerForAddress(value)
			return chainName
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('deposited', {
		header: 'Deposited',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('withdrawn', {
		header: 'Withdrawn',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('txs', {
		header: 'Total Transactions',
		size: 120,
		meta: {
			align: 'end'
		}
	})
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
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
