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
		meta: {
			headerClassName:
				'w-[160px] min-[812px]:w-[210px] 2xl:w-[240px] min-[1600px]:w-[280px] min-[1640px]:w-[320px] min-[1720px]:w-[420px]'
		}
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: 'Project',
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
		meta: {
			headerClassName: 'pl-9 w-[180px]'
		}
	}),
	columnHelper.accessor('chains', {
		id: 'chains',
		header: 'Chain',
		enableSorting: false,
		cell: (info) => <IconsRow items={toChainIconItems(info.getValue())} />,
		meta: {
			headerClassName: 'w-[60px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.borrowAvailableUsd ?? undefined, {
		id: 'borrowAvailableUsd',
		header: 'Available',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.borrow.totalAvailableUsd
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null ? null : formattedNum(value, true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
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
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
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
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
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
		meta: {
			headerClassName: 'w-[150px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.totalBase ?? undefined, {
		id: 'totalBase',
		header: 'Base APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} className="font-bold">
					{formatPercentChangeText(getValue(), true)}
				</ColoredAPY>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
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
		meta: {
			headerClassName: 'w-[150px]',
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
							<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} className="font-bold">
								{formatPercentChangeText(getValue(), true)}
							</ColoredAPY>
						</span>
					) : (
						<ColoredAPY data-variant={(getValue() ?? 0) > 0 ? 'positive' : 'borrow'} className="font-bold">
							{formatPercentChangeText(getValue(), true)}
						</ColoredAPY>
					)}
				</>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
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
		meta: {
			headerClassName: 'w-[150px]',
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
		meta: {
			headerClassName: 'w-[150px]',
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
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null ? '' : formattedNum(Number(value) * 100) + '%'}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[80px]',
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
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
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
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[100px] min-[812px]:w-[120px]',
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
			columnOrders={resolvedConfig.columnOrders}
			sortingState={resolvedConfig.defaultSorting ?? defaultSortingState}
			columnVisibility={resolvedConfig.columnVisibility}
		/>
	)
}

export function PaginatedYieldsOptimizerTable({
	data,
	initialPageSize = 10,
	initialPageIndex = 0,
	excludeRewardApy = false,
	withAmount = false,
	sortingState = defaultSortingState,
	onSortingChange,
	interactionDisabled = false
}: {
	data: IYieldsOptimizerTableRow[]
	initialPageSize?: number
	initialPageIndex?: number
	excludeRewardApy?: boolean
	withAmount?: boolean
	sortingState?: SortingState
	onSortingChange?: (sortingState: SortingState) => void
	interactionDisabled?: boolean
}) {
	const context = useMemo(
		() => ({
			excludeRewardApy,
			withAmount
		}),
		[excludeRewardApy, withAmount]
	)
	const [sorting, setSorting] = useState<SortingState>([...sortingState])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: initialPageIndex,
		pageSize: initialPageSize
	})

	const paginatedColumns = useMemo(() => preparePaginatedYieldsColumns(OPTIMIZER_TABLE_CONFIG, context), [context])

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
			startTransition(() => {
				const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
				setSorting(nextSorting)
				onSortingChange?.(nextSorting)
			}),
		onPaginationChange: (updater) =>
			startTransition(() => setPagination((prev) => (typeof updater === 'function' ? updater(prev) : updater))),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	return (
		<PaginatedTable
			table={table}
			pageSizeOptions={[10, 20, 30, 50] as const}
			interactionDisabled={interactionDisabled}
		/>
	)
}
