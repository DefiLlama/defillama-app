import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems } from '~/components/IconsRow/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsOptimizerTableRow } from './types'

const columnHelper = createColumnHelper<IYieldsOptimizerTableRow>()

//  TODO fix types

const columns = [
	columnHelper.accessor('pool', {
		id: 'pool',
		header: 'Pool',
		enableSorting: false,
		cell: ({ row }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol}`

			return (
				<NameYieldPool withoutLink value={name} configID={row.original.configID} url={row.original.url} borrow={true} />
			)
		},
		size: 400
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
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
	columnHelper.accessor((row) => (row as any).borrowAvailableUsd as number | null, {
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
					{value === null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('lendUSDAmount', {
		id: 'lendUSDAmount',
		header: 'You Lend',
		enableSorting: true,
		cell: (info) => {
			return (
				<span>
					${formattedNum(info.getValue())}
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
	columnHelper.accessor('borrowUSDAmount', {
		id: 'borrowUSDAmount',
		header: 'You Borrow',
		enableSorting: true,
		cell: (info) => {
			return (
				<span>
					${formattedNum(info.getValue())}
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
	columnHelper.accessor((row) => (row as any).borrowBase as number | null, {
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
	columnHelper.accessor((row) => (row as any).totalBase as number | null, {
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
	columnHelper.accessor((row) => (row as any).lendingBase as number | null, {
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
	columnHelper.accessor((row) => (row as any).totalReward as number | null, {
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
	columnHelper.accessor((row) => (row as any).lendingReward as number | null, {
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
	columnHelper.accessor((row) => (row as any).borrowReward as number | null, {
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
	columnHelper.accessor((row) => (row as any).ltv as number | null, {
		id: 'ltv',
		header: 'LTV',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{formattedNum(Number(info.getValue()) * 100) + '%'}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Max loan to value (collateral factor)'
		}
	}),
	columnHelper.accessor('totalSupplyUsd', {
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
					{formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('totalBorrowUsd', {
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
					{formattedNum(info.getValue(), true)}
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
const columnOrders: ColumnOrdersByBreakpoint = {
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

const columnSizes: ColumnSizesByBreakpoint = {
	0: {
		pool: 160,
		project: 180,
		chain: 60,
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
		chain: 60,
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
		chain: 60,
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
		chain: 60,
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
		chain: 60,
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
		chain: 60,
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

const defaultSortingState = [{ id: 'borrowAvailableUsd', desc: true }]

export function YieldsOptimizerTable({ data }) {
	const router = useRouter()

	const { excludeRewardApy } = router.query
	const lendAmount = router.query.lendAmount ? parseInt(router.query.lendAmount as string) : 0
	const borrowAmount = router.query.borrowAmount ? parseInt(router.query.borrowAmount as string) : 0
	const withAmount = lendAmount > 0 || borrowAmount > 0

	const columnVisibility =
		excludeRewardApy === 'true'
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

	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnOrders={columnOrders}
			sortingState={defaultSortingState}
			columnVisibility={columnVisibility}
		/>
	)
}
