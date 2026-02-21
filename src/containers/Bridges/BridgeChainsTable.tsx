import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum } from '~/utils'

type BridgeChainsTableRow = {
	name: string
	prevDayNetFlow?: number
	prevDayUsdDeposits?: number
	prevDayUsdWithdrawals?: number
	prevWeekNetFlow?: number
	prevWeekUsdDeposits?: number
	prevWeekUsdWithdrawals?: number
	topTokenWithdrawnSymbol?: string
}

const bridgeChainsColumn: ColumnDef<BridgeChainsTableRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as string
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={chainIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/bridges/${value}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 240
	},
	{
		header: '24h Net Flow',
		accessorKey: 'prevDayNetFlow',
		cell: (info) => {
			const value = info.getValue() as any
			if (value) {
				return (
					<span className={`${value > 0 ? 'text-(--success)' : 'text-(--error)'}`}>{formattedNum(value, true)}</span>
				)
			}
			return <>$0</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Deposits',
		accessorKey: 'prevDayUsdDeposits',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Withdrawals',
		accessorKey: 'prevDayUsdWithdrawals',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Net Flow',
		accessorKey: 'prevWeekNetFlow',
		cell: (info) => {
			const value = info.getValue() as any
			if (value) {
				return (
					<span className={`${value > 0 ? 'text-(--success)' : 'text-(--error)'}`}>{formattedNum(value, true)}</span>
				)
			}
			return <>$0</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Deposits',
		accessorKey: 'prevWeekUsdDeposits',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Withdrawals',
		accessorKey: 'prevWeekUsdWithdrawals',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Top Deposit',
		accessorKey: 'topTokenWithdrawnSymbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			if (value) {
				return <>{value}</>
			} else return <>Not found</>
		},
		meta: {
			align: 'end'
		},
		size: 145
	}
]

const bridgeChainsColumnOrders: ColumnOrdersByBreakpoint = {
	0: [
		'name',
		'prevDayUsdWithdrawals',
		'prevDayUsdDeposits',
		'prevDayNetFlow',
		'prevWeekUsdWithdrawals',
		'prevWeekUsdDeposits',
		'prevWeekNetFlow',
		'topTokenWithdrawnSymbol'
	],
	1024: [
		'name',
		'topTokenWithdrawnSymbol',
		'prevDayUsdWithdrawals',
		'prevDayUsdDeposits',
		'prevDayNetFlow',
		'prevWeekUsdWithdrawals',
		'prevWeekUsdDeposits',
		'prevWeekNetFlow'
	]
}

const bridgeChainsColumnSizes: ColumnSizesByBreakpoint = {
	0: {
		name: 160,
		prevDayNetFlow: 120,
		prevDayUsdWithdrawals: 130,
		prevDayUsdDeposits: 130,
		prevWeekNetFlow: 120,
		prevWeekUsdWithdrawals: 130,
		prevWeekUsdDeposits: 130,
		topTokenWithdrawnSymbol: 145
	},
	480: {
		name: 180,
		prevDayNetFlow: 140,
		prevDayUsdWithdrawals: 150,
		prevDayUsdDeposits: 150,
		prevWeekNetFlow: 140,
		prevWeekUsdWithdrawals: 150,
		prevWeekUsdDeposits: 150,
		topTokenWithdrawnSymbol: 145
	},
	1024: {
		name: 180,
		prevDayNetFlow: 140,
		prevDayUsdWithdrawals: 150,
		prevDayUsdDeposits: 150,
		prevWeekNetFlow: 140,
		prevWeekUsdWithdrawals: 150,
		prevWeekUsdDeposits: 150,
		topTokenWithdrawnSymbol: 145
	}
}

export function BridgeChainsTable({ data }: { data: BridgeChainsTableRow[] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'prevDayNetFlow', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})

	const instance = useReactTable({
		data,
		columns: bridgeChainsColumn,
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	useSortColumnSizesAndOrders({
		instance,
		columnSizes: bridgeChainsColumnSizes,
		columnOrders: bridgeChainsColumnOrders
	})

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between gap-2 p-3">
				<h1 className="mr-auto text-lg font-semibold">Chains</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'bridge-chains.csv' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
