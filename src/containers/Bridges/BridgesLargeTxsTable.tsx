import {
	ColumnDef,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { getBlockExplorerForTx } from '~/containers/Bridges/utils'
import { formattedNum, getBlockExplorer, slug, toNiceDayAndHour } from '~/utils'

export type LargeTxsData = {
	date: number
	txHash: string
	bridge: string
	isDeposit: boolean
	symbol: string
	usdValue: string | number
}

const largeTxsColumn: ColumnDef<LargeTxsData>[] = [
	{
		header: 'Timestamp',
		accessorKey: 'date',
		cell: (info) => <>{toNiceDayAndHour(info.getValue())}</>,
		size: 120
	},
	{
		header: 'Bridge',
		accessorKey: 'bridge',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const linkValue = slug(value)
			return (
				<BasicLink
					href={`/bridge/${linkValue}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
				>
					{value}
				</BasicLink>
			)
		},
		size: 180
	},
	{
		header: 'Deposit/Withdrawal',
		accessorKey: 'isDeposit',
		cell: ({ getValue }) => {
			const value = getValue() as boolean
			return (
				<span className={`${value ? 'text-(--error)' : 'text-(--success)'}`}>{value ? 'Withdrawal' : 'Deposit'}</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
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
					<a
						href={blockExplorerLink}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-end"
					>
						<span>{symbol}</span>
						<Icon name="external-link" height={10} width={10} />
					</a>
				)
			} else return <>Not found</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Value',
		accessorKey: 'usdValue',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Explorer Link',
		accessorKey: 'txHash',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const { blockExplorerLink } = getBlockExplorerForTx(value)
			if (value) {
				return (
					<a
						href={blockExplorerLink}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-end gap-2"
					>
						<span>View Transaction</span>
						<Icon name="external-link" height={10} width={10} />
					</a>
				)
			} else return <>Not found</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	}
]

const largeTxsColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['date', 'symbol', 'usdValue', 'isDeposit', 'bridge', 'txHash'],
	1024: ['date', 'bridge', 'isDeposit', 'symbol', 'usdValue', 'txHash']
}

const largeTxsColumnSizes: ColumnSizesByBreakpoint = {
	0: {
		date: 120,
		bridge: 140,
		usdValue: 120,
		isDeposit: 140,
		symbol: 100,
		txHash: 160
	},
	480: {
		date: 120,
		bridge: 140,
		usdValue: 120,
		isDeposit: 140,
		symbol: 120,
		txHash: 160
	},
	1024: {
		date: 140,
		bridge: 160,
		usdValue: 120,
		isDeposit: 140,
		symbol: 120,
		txHash: 160
	}
}

export function BridgesLargeTxsTable({ data }: { data: LargeTxsData[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})

	const instance = useReactTable({
		data,
		columns: largeTxsColumn,
		state: {
			sorting,
			columnOrder,
			columnSizing
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	useSortColumnSizesAndOrders({
		instance,
		columnSizes: largeTxsColumnSizes,
		columnOrders: largeTxsColumnOrders
	})

	return <VirtualTable instance={instance} />
}
