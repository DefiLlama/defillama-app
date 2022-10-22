import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent, toK } from '~/utils'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { lockupsRewards } from '~/components/YieldsPage/utils'

const apyColors = {
	supply: '#4f8fea',
	borrow: '#E59421',
	positive: '#30c338'
}

export const columns: ColumnDef<IYieldTableRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'pool',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<NameYieldPool
					value={getValue() as string}
					configID={row.original.configID}
					url={row.original.url}
					index={index + 1}
					borrow={true}
					maxCharacters={30}
				/>
			)
		},
		size: 200
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		accessorKey: 'project',
		enableSorting: true,
		cell: ({ row }) => (
			<NameYield
				project={row.original.project}
				projectslug={row.original.projectslug}
				airdrop={row.original.airdrop}
				borrow={true}
			/>
		),
		size: 200
	},
	{
		header: 'Chain',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields/borrow?chain" iconType="chain" />,
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.project) ? (
						<QuestionHelper
							text={'Rewards are vested. You can immediately receive your rewards by taking an exit penalty!'}
						/>
					) : row.original.project === '0vix' ? (
						<QuestionHelper text={'Pre-mined rewards, no available token yet!'} />
					) : null}
					<span
						style={{
							color: apyColors['positive']
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
			headerHelperText: 'Leveraged APY consisting of deposit -> borrow (same asset, max LTV) -> deposit (same asset)'
		}
	},
	{
		header: 'Supply APY',
		accessorKey: 'netSupplyApy',
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
		header: 'Boost',
		accessorKey: 'boost',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					style={{
						color: apyColors['borrow']
					}}
				>
					{toK(info.getValue()) + 'x'}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Loop APY Multiple over Supply APY'
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
					{info.getValue() === null ? '' : '$' + formattedNum(info.getValue())}
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
					{info.getValue() === null ? '' : '$' + formattedNum(info.getValue())}
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
						display: 'flex',
						gap: '4px',
						justifyContent: 'flex-end',
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{info.row.original.project.includes('Morpho') ? (
						<QuestionHelper
							text={`Morpho liquidity comes from the underlying lending protocol pool itself. Available P2P Liquidity: ${
								info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd > 0
									? '$' + formattedNum(info.row.original.totalSupplyUsd - info.row.original.totalBorrowUsd)
									: '$0'
							}`}
						/>
					) : null}
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
		'loopApy',
		'netSupplyApy',
		'boost',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	400: [
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

export const columnSizes = {
	0: {
		pool: 160,
		project: 180,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 80,
		totalAvailableUsd: 80
	},
	812: {
		pool: 200,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 80,
		totalAvailableUsd: 80
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
