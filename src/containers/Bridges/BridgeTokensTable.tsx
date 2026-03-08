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
import { formattedNum, getBlockExplorer } from '~/utils'

type BridgeTokensTableRow = {
	symbol: string
	deposited?: number
	withdrawn?: number
	volume?: number
}

const columnHelper = createColumnHelper<BridgeTokensTableRow>()

const bridgeTokensColumn = [
	columnHelper.accessor('symbol', {
		header: 'Token',
		cell: ({ getValue }) => {
			const value = getValue()
			const splitValue = value.split('#')
			const [symbol, token] = splitValue
			const { blockExplorerLink } = getBlockExplorer(token)
			if (!value) return 'Not found'
			return (
				<a href={blockExplorerLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
					<span className="overflow-hidden text-ellipsis whitespace-nowrap">{symbol}</span>
					<Icon name="external-link" height={10} width={10} />
				</a>
			)
		},
		size: 120
	}),
	columnHelper.display({
		id: 'chainName',
		header: 'Chain',
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
	}),
	columnHelper.accessor('deposited', {
		header: 'Deposited',
		cell: (info) => formattedNum(info.getValue() ?? 0, true),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('withdrawn', {
		header: 'Withdrawn',
		cell: (info) => formattedNum(info.getValue() ?? 0, true),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('volume', {
		header: 'Total Volume',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	})
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
