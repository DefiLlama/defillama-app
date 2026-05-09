import {
	type ColumnOrderState,
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useBlockExplorers } from '~/api/client'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { formattedNum, slug, toNiceDayAndHour } from '~/utils'
import { getBlockExplorerNew } from '~/utils/blockExplorers'

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

const largeTxsColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['date', 'symbol', 'usdValue', 'isDeposit', 'bridge', 'txHash'],
	1024: ['date', 'bridge', 'isDeposit', 'symbol', 'usdValue', 'txHash']
}
export const BridgesLargeTxsTable = React.forwardRef<BridgesLargeTxsTableHandle, BridgesLargeTxsTableProps>(
	function BridgesLargeTxsTable({ data, csvFileName = 'bridge-transactions' }, ref) {
		const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }])
		const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
		const { data: blockExplorersData } = useBlockExplorers()

		const columns = React.useMemo(
			() => [
				columnHelper.accessor('date', {
					header: 'Timestamp',
					cell: (info) => <>{toNiceDayAndHour(info.getValue())}</>,
					meta: {
						headerClassName: 'w-[120px] lg:w-[140px]'
					}
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
					meta: {
						headerClassName: 'w-[140px] lg:w-[160px]'
					}
				}),
				columnHelper.accessor('isDeposit', {
					header: 'Deposit/Withdrawal',
					cell: ({ getValue }) => {
						const value = getValue()
						return (
							<span className={`${value ? 'text-(--error)' : 'text-(--success)'}`}>
								{value ? 'Withdrawal' : 'Deposit'}
							</span>
						)
					},
					meta: {
						headerClassName: 'w-[140px]',
						align: 'end'
					}
				}),
				columnHelper.accessor('symbol', {
					header: 'Token',
					cell: ({ getValue }) => {
						const value = getValue()
						if (!value) return 'Not found'

						const [symbol, token] = value.split('#')
						const explorer = token
							? getBlockExplorerNew({
									apiResponse: blockExplorersData ?? [],
									address: token,
									urlType: 'token'
								})
							: null

						if (!explorer) {
							return <span>{symbol}</span>
						}

						return (
							<a
								href={explorer.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-end"
							>
								<span>{symbol}</span>
								<Icon name="external-link" height={10} width={10} />
							</a>
						)
					},
					meta: {
						headerClassName: 'w-[100px] min-[480px]:w-[120px]',
						align: 'end'
					}
				}),
				columnHelper.accessor('usdValue', {
					header: 'Value',
					cell: (info) => formattedNum(info.getValue(), true),
					meta: {
						headerClassName: 'w-[120px]',
						align: 'end'
					}
				}),
				columnHelper.accessor('txHash', {
					header: 'Explorer Link',
					cell: ({ getValue }) => {
						const value = getValue()
						if (!value) return 'Not found'

						const explorer = getBlockExplorerNew({
							apiResponse: blockExplorersData ?? [],
							address: value,
							urlType: 'tx'
						})

						if (!explorer) {
							return null
						}

						return (
							<a
								href={explorer.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-end gap-2"
							>
								<span>View Transaction</span>
								<Icon name="external-link" height={10} width={10} />
							</a>
						)
					},
					meta: {
						headerClassName: 'w-[160px]',
						align: 'end'
					}
				})
			],
			[blockExplorersData]
		)

		const instance = useReactTable({
			data,
			columns,
			state: {
				sorting,
				columnOrder
			},
			defaultColumn: {
				sortUndefined: 'last'
			},
			enableSortingRemoval: false,
			onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
			onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel()
		})

		useSortColumnOrders({
			instance,
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
