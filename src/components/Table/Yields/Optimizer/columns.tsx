import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent } from '~/utils'
import { AutoRow } from '~/components/Row'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsOptimizerTableRow } from '../types'

const apyColors = {
	supply: '#4f8fea',
	borrow: '#E59421',
	positive: '#30c338'
}

export const columns: ColumnDef<IYieldsOptimizerTableRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: ({ row, table }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol}`

			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<NameYieldPool
					value={name}
					configID={row.original.configID}
					url={row.original.url}
					index={index + 1}
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
				project={row.original.projectName}
				projectslug={row.original.projectslug}
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
			<IconsRow
				disableLinks
				links={info.row.original.chains as Array<string>}
				url="/yields/borrow?chain"
				iconType="chain"
			/>
		),
		meta: {
			align: 'end'
		},
		size: 60
	},

	{
		header: 'Net Supply APR',
		accessorKey: 'lendingReward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewardTokensNames ?? []

			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					<IconsRow
						disableLinks
						links={rewards}
						url="/yields?project"
						iconType="token"
						yieldRewardsSymbols={row.original.rewardTokensSymbols}
					/>
					<span
						style={{
							color: apyColors['supply']
						}}
					>
						{formattedPercent(getValue(), true, 400)}
					</span>
				</AutoRow>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total reward APY for lending.'
		}
	},
	{
		header: 'Net Borrow APR',
		accessorKey: 'borrowReward',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors['borrow']
					}}
				>
					{formattedPercent(info.getValue(), true, 400)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Base + Reward).'
		}
	},
	{
		header: 'Net APR',
		accessorKey: 'totalReward',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors[info.getValue() > 0 ? 'positive' : 'borrow']
					}}
				>
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Lending Reward - Borrowing Cost'
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{'$' + formattedNum(info.getValue())}
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{'$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Available',
		accessorKey: 'totalAvailableUsd',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{info.getValue() === null ? null : '$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'pool',
		'apy',
		'project',
		'chains',
		'totalAvailableUsd',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'totalReward',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	400: [
		'pool',
		'apy',
		'project',
		'chains',
		'totalAvailableUsd',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'totalSupplyUsd',
		'totalBorrowUsd'
	],
	640: [
		'pool',
		'apy',
		'project',
		'chains',
		'totalAvailableUsd',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'totalSupplyUsd',
		'totalBorrowUsd'
	],
	1280: [
		'pool',
		'apy',
		'project',
		'chains',
		'totalAvailableUsd',
		'totalReward',
		'lendingReward',
		'borrowReward',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'totalSupplyUsd',
		'totalBorrowUsd'
	]
}

export const columnSizes = {
	0: {
		pool: 120,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyBaseBorrow: 140,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120
	},
	812: {
		pool: 200,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyBaseBorrow: 140,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
