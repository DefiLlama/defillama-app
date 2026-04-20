import {
	createColumnHelper,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, useMemo, useState } from 'react'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems } from '~/components/IconsRow/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { PaginatedTable, usePaginatedTableDisplayRowNumber } from '~/components/Table/PaginatedTable'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { preparePaginatedYieldsColumns, resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsOptimizerTableRow } from './types'

const columnHelper = createColumnHelper<IYieldsOptimizerTableRow>()
const OPTIMIZER_COLUMN_IDS = [
	'pool',
	'project',
	'chains',
	'borrowAvailableUsd',
	'lendUSDAmount',
	'borrowUSDAmount',
	'borrowBase',
	'totalBase',
	'lendingBase',
	'totalReward',
	'lendingReward',
	'borrowReward',
	'ltv',
	'totalSupplyUsd',
	'totalBorrowUsd'
] as const
type OptimizerColumnId = (typeof OPTIMIZER_COLUMN_IDS)[number]

//  TODO fix types

function OptimizerPoolCell({ row }: { row: { id: string; original: IYieldsOptimizerTableRow } }) {
	const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol}`
	const rowIndex = usePaginatedTableDisplayRowNumber(row.id)

	return (
		<NameYieldPool
			withoutLink
			value={name}
			configID={row.original.configID}
			url={row.original.url}
			rowIndex={rowIndex}
			borrow={true}
		/>
	)
}

const columns = [
	columnHelper.accessor('pool', {
		id: 'pool',
		header: 'Pool',
		enableSorting: false,
		cell: ({ row }) => <OptimizerPoolCell row={row} />,
		size: 400
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '24px' }}>Project</span>,
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield
				withoutLink
				project={row.original.projectName}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				raiseValuation={row.original.raiseValuation}
				borrow={true}
			/>
		),
		size: 140
	}),
	columnHelper.accessor('chains', {
		id: 'chains',
		header: 'Chain',
		enableSorting: false,
		cell: (info) => <IconsRow items={toChainIconItems(info.getValue())} />,
		meta: {
			align: 'end'
		},
		size: 60
	}),
	columnHelper.accessor((row) => row.borrowAvailableUsd ?? undefined, {
		id: 'borrowAvailableUsd',
		header: 'Available',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.borrow.totalAvailableUsd
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
	columnHelper.accessor((row) => row.lendUSDAmount ?? undefined, {
		id: 'lendUSDAmount',
		header: 'You Lend',
		enableSorting: true,
		cell: (info) => {
			return (
				<span>
					${info.getValue() == null ? '0' : formattedNum(info.getValue())}
					<br />
					<span className="text-text-(--text-form)">
						{formattedNum(info.row.original.lendAmount)} {info.row.original.symbol}
					</span>
				</span>
			)
		},
		size: 180,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.borrowUSDAmount ?? undefined, {
		id: 'borrowUSDAmount',
		header: 'You Borrow',
		enableSorting: true,
		cell: (info) => {
			return (
				<span>
					${info.getValue() == null ? '0' : formattedNum(info.getValue())}
					<br />
					<span className="text-text-(--text-form)">
						{formattedNum(info.row.original.borrowAmount)} {info.row.original.borrow.symbol}
					</span>
				</span>
			)
		},
		size: 180,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.borrowBase ?? undefined, {
		id: 'borrowBase',
		header: 'Base Borrow APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={(info.getValue() ?? 0) > 0 ? 'positive' : 'borrow'}>
					{formatPercentChangeText(info.getValue(), true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.totalBase ?? undefined, {
		id: 'totalBase',
		header: 'Base APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
					{formatPercentChangeText(getValue(), true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.lendingBase ?? undefined, {
		id: 'lendingBase',
		header: 'Base Supply APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <ColoredAPY data-variant="supply">{formatPercentChangeText(getValue(), true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.totalReward ?? undefined, {
		id: 'totalReward',
		header: 'Net APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
								{formatPercentChangeText(getValue(), true)}
							</ColoredAPY>
						</span>
					) : (
						<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
							{formatPercentChangeText(getValue(), true)}
						</ColoredAPY>
					)}
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Lending Reward - Borrowing Cost * LTV'
		}
	}),
	columnHelper.accessor((row) => row.lendingReward ?? undefined, {
		id: 'lendingReward',
		header: 'Net Supply APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewardTokensNames ?? []

			return (
				<span className="flex w-full items-center justify-end gap-1">
					<IconsRow
						items={toTokenIconItems(rewards, {
							titles: row.original.rewardTokensSymbols
						})}
					/>
					<ColoredAPY data-variant="supply">{formatPercentChangeText(getValue(), true)}</ColoredAPY>
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total reward APY for lending.'
		}
	}),
	columnHelper.accessor((row) => row.borrowReward ?? undefined, {
		id: 'borrowReward',
		header: 'Net Borrow APY',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={(info.getValue() ?? 0) > 0 ? 'positive' : 'borrow'}>
					{formatPercentChangeText(info.getValue(), true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Base + Reward).'
		}
	}),
	columnHelper.accessor((row) => row.ltv ?? undefined, {
		id: 'ltv',
		header: 'LTV',
		enableSorting: true,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null ? '' : formattedNum(Number(value) * 100) + '%'}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Max loan to value (collateral factor)'
		}
	}),
	columnHelper.accessor((row) => row.totalSupplyUsd ?? undefined, {
		id: 'totalSupplyUsd',
		header: 'Supplied',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.totalBorrowUsd ?? undefined, {
		id: 'totalBorrowUsd',
		header: 'Borrowed',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	})
]

// key: min width of window/screen
// values: table columns order
const columnOrders: Record<number, readonly OptimizerColumnId[]> = {
	0: [
		'pool',
		'project',
		'chains',
		'borrowAvailableUsd',
		'lendUSDAmount',
		'borrowUSDAmount',
		'totalBase',
		'lendingBase',
		'borrowBase',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd'
	],
	400: [
		'pool',
		'project',
		'chains',
		'borrowAvailableUsd',
		'lendUSDAmount',
		'borrowUSDAmount',
		'totalBase',
		'lendingBase',
		'borrowBase',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd'
	],
	640: [
		'pool',
		'project',
		'chains',
		'borrowAvailableUsd',
		'lendUSDAmount',
		'borrowUSDAmount',
		'totalBase',
		'lendingBase',
		'borrowBase',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd'
	],
	1280: [
		'pool',
		'project',
		'chains',
		'borrowAvailableUsd',
		'lendUSDAmount',
		'borrowUSDAmount',
		'totalBase',
		'lendingBase',
		'borrowBase',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd'
	]
}

const columnSizes: Record<number, Partial<Record<OptimizerColumnId, number>>> = {
	0: {
		pool: 160,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 100
	},
	812: {
		pool: 210,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 120
	},
	1536: {
		pool: 240,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 120
	},
	1600: {
		pool: 280,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 120
	},
	1640: {
		pool: 320,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 120
	},
	1720: {
		pool: 420,
		project: 180,
		chains: 60,
		borrowAvailableUsd: 100,
		totalBase: 100,
		lendingBase: 150,
		borrowBase: 150,
		totalReward: 100,
		lendingReward: 150,
		borrowReward: 150,
		ltv: 80,
		totalSupplyUsd: 100,
		totalBorrowUsd: 120
	}
}

interface OptimizerTableConfigContext {
	excludeRewardApy: boolean
	withAmount: boolean
}

export const OPTIMIZER_TABLE_CONFIG: YieldsTableConfig<
	IYieldsOptimizerTableRow,
	OptimizerColumnId,
	OptimizerTableConfigContext
> = {
	kind: 'optimizer',
	columnIds: OPTIMIZER_COLUMN_IDS,
	columns,
	columnOrders,
	columnSizes,
	defaultSorting: [{ id: 'borrowAvailableUsd', desc: true }],
	columnVisibility: ({ excludeRewardApy, withAmount }) =>
		excludeRewardApy
			? {
					totalBase: true,
					lendingBase: true,
					borrowBase: true,
					totalReward: false,
					lendingReward: false,
					borrowReward: false,
					borrowUSDAmount: withAmount,
					lendUSDAmount: withAmount
				}
			: {
					totalBase: false,
					lendingBase: false,
					borrowBase: false,
					totalReward: true,
					lendingReward: true,
					borrowReward: true,
					borrowUSDAmount: withAmount,
					lendUSDAmount: withAmount
				}
}

const defaultSortingState = [{ id: 'borrowAvailableUsd', desc: true }]

export function YieldsOptimizerTable({ data }) {
	const router = useRouter()

	const { excludeRewardApy } = router.query
	const lendAmountQuery = Array.isArray(router.query.lendAmount) ? router.query.lendAmount[0] : router.query.lendAmount
	const borrowAmountQuery = Array.isArray(router.query.borrowAmount)
		? router.query.borrowAmount[0]
		: router.query.borrowAmount
	const lendAmount = Number.isFinite(Number(lendAmountQuery)) ? Number(lendAmountQuery) : 0
	const borrowAmount = Number.isFinite(Number(borrowAmountQuery)) ? Number(borrowAmountQuery) : 0
	const withAmount = lendAmount > 0 || borrowAmount > 0

	const resolvedConfig = resolveVirtualYieldsTableConfig(OPTIMIZER_TABLE_CONFIG, {
		excludeRewardApy: excludeRewardApy === 'true',
		withAmount
	})

	return (
		<YieldsTableWrapper
			data={data}
			columns={resolvedConfig.columns}
			columnSizes={resolvedConfig.columnSizes}
			columnOrders={resolvedConfig.columnOrders}
			sortingState={resolvedConfig.defaultSorting ?? defaultSortingState}
			columnVisibility={resolvedConfig.columnVisibility}
		/>
	)
}

export function PaginatedYieldsOptimizerTable({
	data,
	initialPageSize = 10,
	excludeRewardApy = false,
	withAmount = false
}: {
	data: IYieldsOptimizerTableRow[]
	initialPageSize?: number
	excludeRewardApy?: boolean
	withAmount?: boolean
}) {
	const width = useBreakpointWidth()
	const context = useMemo(
		() => ({
			excludeRewardApy,
			withAmount
		}),
		[excludeRewardApy, withAmount]
	)
	const [sorting, setSorting] = useState<SortingState>(defaultSortingState)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize
	})

	const paginatedColumns = useMemo(
		() => preparePaginatedYieldsColumns(OPTIMIZER_TABLE_CONFIG, context, width),
		[context, width]
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
