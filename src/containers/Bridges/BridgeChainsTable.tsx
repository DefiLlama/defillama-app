import {
	type ColumnFiltersState,
	type ColumnOrderState,
	createColumnHelper,
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
import { prepareTableCsv, useSortColumnOrders, useTableSearch } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug } from '~/utils'

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

const columnHelper = createColumnHelper<BridgeChainsTableRow>()

const bridgeChainsColumn = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={value} kind="chain" data-lgonly alt={`Logo of ${value}`} />
					<BasicLink
						href={`/bridges/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[160px] min-[480px]:w-[180px]'
		}
	}),
	columnHelper.accessor('prevDayNetFlow', {
		header: '24h Net Flow',
		cell: (info) => {
			const value = info.getValue()
			if (value == null) return null
			if (value === 0) return <>$0</>
			return <span className={`${value > 0 ? 'text-(--success)' : 'text-(--error)'}`}>{formattedNum(value, true)}</span>
		},
		meta: {
			headerClassName: 'w-[120px] min-[480px]:w-[140px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('prevDayUsdDeposits', {
		header: '24h Deposits',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[130px] min-[480px]:w-[150px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('prevDayUsdWithdrawals', {
		header: '24h Withdrawals',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[130px] min-[480px]:w-[150px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('prevWeekNetFlow', {
		header: '7d Net Flow',
		cell: (info) => {
			const value = info.getValue()
			if (value == null) return null
			if (value === 0) return <>$0</>
			return <span className={`${value > 0 ? 'text-(--success)' : 'text-(--error)'}`}>{formattedNum(value, true)}</span>
		},
		meta: {
			headerClassName: 'w-[120px] min-[480px]:w-[140px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('prevWeekUsdDeposits', {
		header: '7d Deposits',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[130px] min-[480px]:w-[150px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('prevWeekUsdWithdrawals', {
		header: '7d Withdrawals',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[130px] min-[480px]:w-[150px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('topTokenWithdrawnSymbol', {
		header: '24h Top Deposit',
		cell: ({ getValue }) => {
			const value = getValue()
			if (value == null) return null
			if (value === '') return 'Not found'
			return value
		},
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end'
		}
	})
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
export function BridgeChainsTable({ data }: { data: BridgeChainsTableRow[] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'prevDayNetFlow', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const instance = useReactTable({
		data,
		columns: bridgeChainsColumn,
		state: {
			sorting,
			columnOrder,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	useSortColumnOrders({
		instance,
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
						onInput={(e) => setProjectName(e.currentTarget.value)}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'bridge-chains' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
