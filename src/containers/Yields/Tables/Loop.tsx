import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { QuestionHelper } from '~/components/QuestionHelper'
import { formatColumnOrder, getColumnSizesKeys } from '~/components/Table/utils'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum, formattedPercent } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsTableProps, IYieldTableRow } from './types'

const columns: ColumnDef<IYieldTableRow>[] = [
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
		cell: ({ getValue, row }) => {
			return (
				<NameYieldPool
					value={getValue() as string}
					configID={row.original.configID}
					url={row.original.url}
					borrow={true}
				/>
			)
		},
		size: 160
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		accessorKey: 'project',
		enableSorting: true,
		cell: ({ row }) => (
			<NameYield
				project={row.original.project}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				borrow={true}
			/>
		),
		size: 160
	},
	{
		header: 'Chain',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields?chain" iconType="chain" />,
		meta: {
			align: 'end'
		},
		size: 60
	},
	{
		header: 'Loop APY',
		accessorKey: 'loopApy',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.project) ? (
						<div className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
								{formattedPercent(getValue(), true, 700, true)}
							</ColoredAPY>
						</div>
					) : (
						<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
							{formattedPercent(getValue(), true, 700, true)}
						</ColoredAPY>
					)}
				</>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: 'Leveraged APY consisting of deposit -> borrow (same asset, max LTV) -> deposit (same asset)'
		}
	},
	{
		header: 'Supply APY',
		accessorKey: 'netSupplyApy',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="supply">{formattedPercent(info.getValue(), true, 400, true)}</ColoredAPY>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for supplying (Base + Reward)'
		}
	},
	{
		header: 'Boost',
		accessorKey: 'boost',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formattedNum(info.getValue()) + 'x'}</ColoredAPY>
		},
		size: 80,
		meta: {
			align: 'end',
			headerHelperText: 'Loop APY / Supply APY'
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
		size: 60,
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 80,
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	},
	{
		header: 'Available',
		accessorKey: 'totalAvailableUsd',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					data-strike={info.row.original.strikeTvl ?? 'false'}
					className="flex justify-end gap-1 data-[strike=true]:text-(--text-disabled)"
				>
					{['Morpho Compound', 'Morpho Aave'].includes(info.row.original.project) ? (
						<QuestionHelper
							text={`Morpho liquidity comes from the underlying lending protocol pool itself. Available P2P Liquidity: ${
								info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd > 0
									? formattedNum(info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd, true)
									: '$0'
							}`}
						/>
					) : null}
					{info.getValue() === null ? null : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 80,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'rank',
		'pool',
		'apy',
		'project',
		'chains',
		'loopApy',
		'netSupplyApy',
		'boost',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	400: [
		'rank',
		'pool',
		'apy',
		'project',
		'chains',
		'loopApy',
		'netSupplyApy',
		'boost',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	640: [
		'rank',
		'pool',
		'apy',
		'project',
		'chains',
		'loopApy',
		'netSupplyApy',
		'boost',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	1280: [
		'rank',
		'pool',
		'apy',
		'project',
		'chains',
		'loopApy',
		'netSupplyApy',
		'boost',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	]
}

const columnSizes = {
	0: {
		rank: 60,
		pool: 160,
		project: 180,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	812: {
		rank: 60,
		pool: 200,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1536: {
		rank: 60,
		pool: 240,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1600: {
		rank: 60,
		pool: 280,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1640: {
		rank: 60,
		pool: 320,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1720: {
		rank: 60,
		pool: 420,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	}
}

const yieldsColumnOrders = formatColumnOrder(columnOrders)

const columnSizesKeys = getColumnSizesKeys(columnSizes)

export function YieldsLoopTable({ data }: IYieldsTableProps) {
	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnSizesKeys={columnSizesKeys}
			columnOrders={yieldsColumnOrders}
		/>
	)
}
