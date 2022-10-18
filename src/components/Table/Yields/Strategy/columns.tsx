import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { toK, formattedNum, formattedPercent } from '~/utils'
import { AutoRow } from '~/components/Row'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsStrategyTableRow } from '../types'

const apyColors = {
	supply: '#4f8fea',
	borrow: '#E59421',
	positive: '#30c338'
}

export const columns: ColumnDef<IYieldsStrategyTableRow>[] = [
	{
		header: 'Strategy',
		accessorKey: 'strategy',
		enableSorting: false,
		cell: ({ row, table }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol} ➞ ${row.original.farmSymbol}`

			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<NameYieldPool
					withoutLink
					value={name}
					configID={row.original.configID}
					url={row.original.url}
					index={index + 1}
					borrow={true}
					maxCharacters={50}
					bookmark={false}
				/>
			)
		},
		size: 400
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Lending Project</span>,
		accessorKey: 'projectLend',
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
		accessorKey: 'chainsLend',
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
	// {
	// 	header: 'Farming Chain',
	// 	accessorKey: 'chainsFarm',
	// 	enableSorting: false,
	// 	cell: (info) => (
	// 		<IconsRow
	// 			disableLinks
	// 			links={info.row.original.farmChain as Array<string>}
	// 			url="/yields?chain"
	// 			iconType="chain"
	// 		/>
	// 	),
	// 	meta: {
	// 		align: 'end'
	// 	},
	// 	size: 60
	// },
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Farm Project</span>,
		accessorKey: 'projectFarm',
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield
				withoutLink
				project={row.original.farmProjectName}
				projectslug={row.original.projectslug}
				airdrop={row.original.airdrop}
				borrow={false}
			/>
		),
		size: 140
	},
	{
		header: 'Strategy APY',
		accessorKey: 'totalApy',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors['positive']
					}}
				>
					{formattedPercent(info.getValue(), true, 700)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total Strategy APY defined as: Supply APY + Borrow APY * LTV + Farm APY * LTV'
		}
	},
	{
		header: 'Supply APY',
		accessorKey: 'apy',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors['supply']
					}}
				>
					{formattedPercent(info.getValue(), true, 400)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for supplying (Base + Reward)'
		}
	},
	{
		header: 'APY Delta',
		accessorKey: 'delta',
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
			headerHelperText:
				'APY Increase by following this strategy (Strategy APY) compared to a simple deposit strategy (Supply APY)'
		}
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
			align: 'end',
			headerHelperText: 'Available Borrow Liquidity for the debt token'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'farmTvlUsd',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.farmTvlUsd
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
			align: 'end',
			headerHelperText: 'Total Value Locked for the farm token in the last part of the strategy'
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
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: [
		'strategy',
		'projectLend',
		'projectFarm',
		'chainsLend',
		// 'chainsFarm',
		'totalApy',
		'apy',
		'delta',
		'ltv',
		'borrowAvailableUsd',
		'farmTvlUsd'
	],
	400: [
		'strategy',
		'projectLend',
		'projectFarm',
		'chainsLend',
		// 'chainsFarm',
		'totalApy',
		'apy',
		'delta',
		'ltv',
		'borrowAvailableUsd',
		'farmTvlUsd'
	],
	640: [
		'strategy',
		'projectLend',
		'projectFarm',
		'chainsLend',
		// 'chainsFarm',
		'totalApy',
		'apy',
		'delta',
		'ltv',
		'borrowAvailableUsd',
		'farmTvlUsd'
	],
	1280: [
		'strategy',
		'projectLend',
		'projectFarm',
		'chainsLend',
		// 'chainsFarm',
		'totalApy',
		'apy',
		'delta',
		'ltv',
		'borrowAvailableUsd',
		'farmTvlUsd'
	]
}

export const columnSizes = {
	0: {
		strategy: 300,
		projectLend: 200,
		projectFarm: 200,
		chainsLend: 60,
		// chainsFarm: 60,
		totalApy: 80,
		apy: 80,
		delta: 80,
		ltv: 60,
		borrowAvailableUsd: 80,
		farmTvlUsd: 60
	},
	812: {
		strategy: 300,
		projectLend: 200,
		projectFarm: 200,
		chainsLend: 60,
		// chainsFarm: 60,
		totalApy: 80,
		apy: 80,
		delta: 80,
		ltv: 60,
		borrowAvailableUsd: 80,
		farmTvlUsd: 60
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
