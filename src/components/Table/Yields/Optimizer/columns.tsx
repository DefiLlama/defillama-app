import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent } from '~/utils'
import { AutoRow } from '~/components/Row'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsOptimizerTableRow } from '../types'
import QuestionHelper from '~/components/QuestionHelper'
import { lockupsRewards, earlyExit } from '~/components/YieldsPage/utils'

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
					withoutLink
					value={name}
					configID={row.original.configID}
					url={row.original.url}
					index={index + 1}
					borrow={true}
					maxCharacters={15}
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
		header: 'Available',
		accessorKey: 'borrowAvailableUsd',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.borrow.totalAvailableUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{value === null ? null : '$' + formattedNum(value)}
				</span>
			)
		},
		size: 120,
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
				<span
					style={{
						color: apyColors[getValue() > 0 ? 'positive' : 'borrow']
					}}
				>
					{formattedPercent(getValue(), true, 700)}
				</span>
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
			return (
				<span
					style={{
						color: apyColors['supply']
					}}
				>
					{formattedPercent(getValue(), true, 400)}
				</span>
			)
		},
		size: 140,
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
				<span
					style={{
						color: apyColors[info.getValue() > 0 ? 'positive' : 'borrow']
					}}
				>
					{formattedPercent(info.getValue(), true, 400)}
				</span>
			)
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.projectName) ? <QuestionHelper text={earlyExit} /> : null}
					<span
						style={{
							color: apyColors[getValue() > 0 ? 'positive' : 'borrow']
						}}
					>
						{formattedPercent(getValue(), true, 700)}
					</span>
				</AutoRow>
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
		header: 'Net Borrow APY',
		accessorKey: 'borrowReward',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors[info.getValue() > 0 ? 'positive' : 'borrow']
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
		header: 'LTV',
		accessorKey: 'ltv',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
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
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'pool',
		'project',
		'chains',
		'borrowAvailableUsd',
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

export const columnSizes = {
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
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
