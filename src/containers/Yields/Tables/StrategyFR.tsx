import {
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
	createColumnHelper
} from '@tanstack/react-table'
import { startTransition, useEffect, useMemo, useState } from 'react'
import { PercentChange, formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { PaginatedTable, usePaginatedTableDisplayRowNumber } from '~/components/Table/PaginatedTable'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { preparePaginatedYieldsColumns, resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { FRStrategyRoute, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsStrategyTableRow } from './types'

const FundingRateTooltipContent = ({ afr, afr7d, afr30d }: { afr: number; afr7d: number; afr30d: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`8h: ${afr?.toFixed(2)}%`}</span>
			<span>{`7d: ${afr7d?.toFixed(2)}%`}</span>
			<span>{`30d: ${afr30d?.toFixed(2)}%`}</span>
		</span>
	)
}

const columnHelper = createColumnHelper<IYieldsStrategyTableRow>()
const STRATEGY_FR_COLUMN_IDS = [
	'strategy',
	'strategyAPY',
	'apy',
	'afr',
	'fr8hCurrent',
	'fundingRate7dAverage',
	'tvlUsd',
	'openInterest'
] as const
type StrategyFrColumnId = (typeof STRATEGY_FR_COLUMN_IDS)[number]

function StrategyFrNameCell({ row }: { row: { id: string; index: number; original: IYieldsStrategyTableRow } }) {
	const name = `Long ${row.original.symbol} | Short ${row.original.symbolPerp}`
	const rowIndex = usePaginatedTableDisplayRowNumber(row.id)

	return (
		<span className="grid grid-cols-[auto_1fr] gap-2 text-xs">
			<span className="shrink-0 tabular-nums lg:pt-1.25" aria-hidden="true">
				{rowIndex ?? row.index + 1}
			</span>
			<span className="flex min-w-0 flex-col gap-2">
				<NameYieldPool
					value={name}
					configID={row.original.pool}
					withoutLink={true}
					url={row.original.url}
					strategy={true}
					maxCharacters={50}
					bookmark={false}
				/>
				<FRStrategyRoute
					project1={row.original.projectName}
					airdropProject1={row.original.airdrop}
					raiseValuationProject1={row.original.raiseValuation}
					project2={row.original.marketplace}
					airdropProject2={false}
					chain={row.original.chains[0]}
				/>
			</span>
		</span>
	)
}

const columns = [
	columnHelper.accessor((row) => row.strategy ?? '', {
		id: 'strategy',
		header: 'Strategy',
		enableSorting: false,
		cell: ({ row }) => <StrategyFrNameCell row={row} />,
		size: 400
	}),
	columnHelper.accessor((row) => row.strategyAPY ?? undefined, {
		id: 'strategyAPY',
		header: 'Strategy APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant="positive" style={{ '--weight': 700, marginLeft: 'auto' }}>
					{formatPercentChangeText(getValue(), true)}
				</ColoredAPY>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Farm APY + Funding APY'
		}
	}),
	columnHelper.accessor((row) => row.apy ?? undefined, {
		id: 'apy',
		header: 'Farm APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<>
								<PercentChange percent={getValue()} noSign fontWeight={400} />
							</>
						</span>
					) : (
						<>
							<PercentChange percent={getValue()} noSign fontWeight={400} />
						</>
					)}
				</>
			)
		},
		size: 125,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised Farm Yield'
		}
	}),
	columnHelper.accessor((row) => row.afr ?? undefined, {
		id: 'afr',
		header: 'Funding APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip
								className="ml-auto"
								content={
									<FundingRateTooltipContent
										afr={row.original?.afr}
										afr7d={row.original?.afr7d}
										afr30d={row.original?.afr30d}
									/>
								}
							>
								<PercentChange percent={getValue()} noSign fontWeight={700} />
							</Tooltip>
						</span>
					) : (
						<span className="flex w-full items-center justify-end">
							<Tooltip
								content={
									<FundingRateTooltipContent
										afr={row.original?.afr}
										afr7d={row.original?.afr7d}
										afr30d={row.original?.afr30d}
									/>
								}
							>
								<PercentChange percent={getValue()} noSign fontWeight={700} />
							</Tooltip>
						</span>
					)}
				</>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText:
				'Annualised Funding Yield based on previous settled Funding Rate. Hover for detailed breakdown of different APY windows using 7day or 30day paid Funding Rate sums'
		}
	}),
	columnHelper.accessor((row) => row.fr8hCurrent ?? undefined, {
		id: 'fr8hCurrent',
		header: 'Funding Rate',
		enableSorting: true,
		cell: (info) => (info.getValue() == null ? null : `${info.getValue()}%`),
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Current (predicted) Funding Rate'
		}
	}),
	columnHelper.accessor((row) => row.fundingRate7dAverage ?? undefined, {
		id: 'fundingRate7dAverage',
		header: 'Avg Funding Rate',
		enableSorting: true,
		cell: (info) => (info.getValue() == null ? null : `${info.getValue()}%`),
		size: 175,
		meta: {
			align: 'end',
			headerHelperText: 'Average of previously settled funding rates from the last 7 days'
		}
	}),
	columnHelper.accessor((row) => row.tvlUsd ?? undefined, {
		id: 'tvlUsd',
		header: 'Farm TVL',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.tvlUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: 'Open Interest',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.openInterest
			const indexPrice = info.row.original.indexPrice
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null || indexPrice == null ? null : formattedNum(value * indexPrice, true)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	})
]

const columnOrders: Record<number, readonly StrategyFrColumnId[]> = {
	0: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	400: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	640: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	1280: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest']
}

const columnSizes: Record<number, Partial<Record<StrategyFrColumnId, number>>> = {
	0: {
		strategy: 250,
		strategyAPY: 145,
		apy: 125,
		afr: 145,
		fr8hCurrent: 145,
		fundingRate7dAverage: 175,
		tvlUsd: 100,
		openInterest: 140
	},
	812: {
		strategy: 300,
		strategyAPY: 145,
		apy: 125,
		afr: 145,
		fr8hCurrent: 145,
		fundingRate7dAverage: 175,
		tvlUsd: 100,
		openInterest: 140
	}
}

export const STRATEGY_FR_TABLE_CONFIG: YieldsTableConfig<IYieldsStrategyTableRow, StrategyFrColumnId> = {
	kind: 'strategyFr',
	columnIds: STRATEGY_FR_COLUMN_IDS,
	columns,
	columnOrders,
	columnSizes,
	rowSize: 80
}

export function YieldsStrategyTableFR({ data }) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(STRATEGY_FR_TABLE_CONFIG, undefined)
	return (
		<YieldsTableWrapper
			data={data}
			columns={resolvedConfig.columns}
			columnSizes={resolvedConfig.columnSizes}
			columnOrders={resolvedConfig.columnOrders}
			rowSize={resolvedConfig.rowSize}
		/>
	)
}

export function PaginatedYieldsStrategyTableFR({
	data,
	initialPageSize = 10
}: {
	data: IYieldsStrategyTableRow[]
	initialPageSize?: number
}) {
	const width = useBreakpointWidth()
	const [sorting, setSorting] = useState<SortingState>([])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize
	})

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }))
	}, [data.length])

	const paginatedColumns = useMemo(
		() => preparePaginatedYieldsColumns(STRATEGY_FR_TABLE_CONFIG, undefined, width),
		[width]
	)

	const table = useReactTable({
		data,
		columns: paginatedColumns,
		state: {
			sorting,
			pagination
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) =>
			startTransition(() => setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater))),
		onPaginationChange: (updater) =>
			startTransition(() => setPagination((prev) => (typeof updater === 'function' ? updater(prev) : updater))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	return <PaginatedTable table={table} pageSizeOptions={[10, 20, 30, 50] as const} />
}
