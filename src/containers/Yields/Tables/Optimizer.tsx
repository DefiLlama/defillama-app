import * as React from 'react'
import { useRouter } from 'next/router'
import { ColumnDef } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { QuestionHelper } from '~/components/QuestionHelper'
import { formatColumnOrder, getColumnSizesKeys } from '~/components/Table/utils'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum, formattedPercent } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsOptimizerTableRow } from './types'

const columns: ColumnDef<IYieldsOptimizerTableRow, number>[] = [
	{
		id: 'rank',
		header: 'Rank',
		accessorKey: 'rank',
		size: 60,
		enableSorting: false,
		cell: ({ row }) => {
			const index = row.index
			return <span className="font-bold">{index + 1}</span>
		},
		meta: {
			align: 'center' as const
		}
	},
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: ({ row }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol}`

			return (
				<NameYieldPool
					withoutLink
					value={name}
					configID={row.original.configID}
					url={row.original.url}
					borrow={true}
				/>
			)
		},
		size: 400
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		accessorKey: 'project',
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield
				withoutLink
				project={row.original.projectName}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				borrow={true}
			/>
		),
		size: 140
	},
	{
		header: 'Chain',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => (
			<IconsRow disableLinks links={info.row.original.chains as Array<string>} url="/yields?chain" iconType="chain" />
		),
		meta: {
			align: 'end'
		},
		size: 60
	},
	{
		header: 'Available',
		accessorKey: 'borrowAvailableUsd',
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
	},
	{
		header: 'You Lend',
		accessorKey: 'lendUSDAmount',
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
	},
	{
		header: 'You Borrow',
		accessorKey: 'borrowUSDAmount',
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
	},

	{
		header: 'Base Borrow APY',
		accessorKey: 'borrowBase',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={info.getValue() > 0 ? 'positive' : 'borrow'}>
					{formattedPercent(info.getValue(), true, 400, true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Base APY',
		accessorKey: 'totalBase',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant={getValue() > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
					{formattedPercent(getValue(), true, 700, true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Base Supply APY',
		accessorKey: 'lendingBase',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <ColoredAPY data-variant="supply">{formattedPercent(getValue(), true, 400, true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Net APY',
		accessorKey: 'totalReward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<ColoredAPY data-variant={getValue() > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
								{formattedPercent(getValue(), true, 700, true)}
							</ColoredAPY>
						</span>
					) : (
						<ColoredAPY data-variant={getValue() > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
							{formattedPercent(getValue(), true, 700, true)}
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
	},
	{
		header: 'Net Supply APY',
		accessorKey: 'lendingReward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewardTokensNames ?? []

			return (
				<span className="flex w-full items-center justify-end gap-1">
					<IconsRow
						disableLinks
						links={rewards}
						url="/yields?project"
						iconType="token"
						yieldRewardsSymbols={row.original.rewardTokensSymbols}
					/>
					<ColoredAPY data-variant="supply">{formattedPercent(getValue(), true, 400, true)}</ColoredAPY>
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total reward APY for lending.'
		}
	},
	{
		header: 'Net Borrow APY',
		accessorKey: 'borrowReward',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={info.getValue() > 0 ? 'positive' : 'borrow'}>
					{formattedPercent(info.getValue(), true, 400, true)}
				</ColoredAPY>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Base + Reward).'
		}
	},
	{
		header: 'LTV',
		accessorKey: 'ltv',
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
	},
	{
		header: 'Supplied',
		accessorKey: 'totalSupplyUsd',
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
	},
	{
		header: 'Borrowed',
		accessorKey: 'totalBorrowUsd',
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
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'rank',
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
		'rank',
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
		'rank',
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
		'rank',
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

const columnSizes = {
	0: {
		rank: 60,
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
		rank: 60,
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
		rank: 60,
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
		rank: 60,
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
		rank: 60,
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
		rank: 60,
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

const yieldsColumnOrders = formatColumnOrder(columnOrders)

const columnSizesKeys = getColumnSizesKeys(columnSizes)

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
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
			sortingState={defaultSortingState}
			columnVisibility={columnVisibility}
		/>
	)
}
