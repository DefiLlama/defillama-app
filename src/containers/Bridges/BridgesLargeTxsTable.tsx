import {
	type ColumnOrderState,
	type ColumnSizingState,
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { getBlockExplorerForTx } from '~/containers/Bridges/utils'
import { formattedNum, getBlockExplorer, slug, toNiceDayAndHour } from '~/utils'

type LargeTxsData = {
	date: number
	txHash: string
	bridge: string
	isDeposit: boolean
	symbol: string
	usdValue: string | number
}

export type BridgesLargeTxsTableHandle = {
	prepareCsv: () => { filename: string; rows: Array<Array<string | number | boolean>> }
}

type BridgesLargeTxsTableProps = {
	data: LargeTxsData[]
	csvFileName?: string
}

const columnHelper = createColumnHelper<LargeTxsData>()

const largeTxsColumn = [
	columnHelper.accessor('date', {
		header: 'Timestamp',
		cell: (info) => <>{toNiceDayAndHour(info.getValue())}</>,
		size: 120
	}),
	columnHelper.accessor('bridge', {
		header: 'Bridge',
		cell: ({ getValue }) => {
			const value = getValue()
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
	}),
	columnHelper.accessor('isDeposit', {
		header: 'Deposit/Withdrawal',
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={`${value ? 'text-(--error)' : 'text-(--success)'}`}>{value ? 'Withdrawal' : 'Deposit'}</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('symbol', {
		header: 'Token',
		cell: ({ getValue }) => {
			const value = getValue()
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
			} else return 'Not found'
		},
		size: 100,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('usdValue', {
		header: 'Value',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('txHash', {
		header: 'Explorer Link',
		cell: ({ getValue }) => {
			const value = getValue()
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
			} else return 'Not found'
		},
		meta: {
			align: 'end'
		},
		size: 100
	})
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

export const BridgesLargeTxsTable = React.forwardRef<BridgesLargeTxsTableHandle, BridgesLargeTxsTableProps>(
	function BridgesLargeTxsTable({ data, csvFileName = 'bridge-transactions' }, ref) {
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
			enableSortingRemoval: false,
			onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
			onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
			onColumnSizingChange: (updater) => React.startTransition(() => setColumnSizing(updater)),
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel()
		})

		useSortColumnSizesAndOrders({
			instance,
			columnSizes: largeTxsColumnSizes,
			columnOrders: largeTxsColumnOrders
		})

		React.useImperativeHandle(
			ref,
			() => ({
				prepareCsv: () => prepareTableCsv({ instance, filename: csvFileName })
			}),
			[csvFileName, instance]
		)

		return <VirtualTable instance={instance} />
	}
)
