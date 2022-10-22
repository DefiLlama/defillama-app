import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent } from '~/utils'
import { AutoRow } from '~/components/Row'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'
import QuestionHelper from '~/components/QuestionHelper'
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
				/>
			)
		},
		size: 200
	},
	{
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		accessorKey: 'project',
		enableSorting: false,
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
		header: 'Supply Base',
		accessorKey: 'apyBase',
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
			headerHelperText: 'Base rate lenders earn which is generated from the borrow side.'
		}
	},
	{
		header: 'Supply Reward',
		accessorKey: 'apyReward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []

			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.project) ? (
						<QuestionHelper
							text={'Rewards are vested. You can immediately receive your rewards by taking an exit penalty!'}
						/>
					) : row.original.project === '0vix' ? (
						<QuestionHelper text={'Pre-mined rewards, no available token yet!'} />
					) : null}
					<IconsRow
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
			headerHelperText: 'Incentive reward APY for lending.'
		}
	},
	{
		header: 'Net Borrow',
		accessorKey: 'apyBorrow',
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
			headerHelperText: 'Total net APY for borrowing (Base + Reward).'
		}
	},
	{
		header: 'Borrow Base',
		accessorKey: 'apyBaseBorrow',
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
			headerHelperText: 'Interest borrowers pay to lenders.'
		}
	},
	{
		header: 'Borrow Reward',
		accessorKey: 'apyRewardBorrow',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []

			return row.original.apyRewardBorrow > 0 ? (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.project) ? (
						<QuestionHelper
							text={'Rewards are vested. You can immediately receive your rewards by taking an exit penalty!'}
						/>
					) : row.original.project === '0vix' ? (
						<QuestionHelper text={'Pre-mined rewards, no available token yet!'} />
					) : null}
					<IconsRow
						links={rewards}
						url="/yields?project"
						iconType="token"
						yieldRewardsSymbols={row.original.rewardTokensSymbols}
					/>
					<span
						style={{
							color: apyColors['borrow']
						}}
					>
						{formattedPercent(getValue(), true, 400)}
					</span>
				</AutoRow>
			) : null
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Incentive reward APY for borrowing.'
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
		'project',
		'chains',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	400: [
		'pool',
		'project',
		'chains',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	640: [
		'pool',
		'project',
		'chains',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	],
	1280: [
		'pool',
		'project',
		'chains',
		'apyBase',
		'apyReward',
		'apyBorrow',
		'apyBaseBorrow',
		'apyRewardBorrow',
		'ltv',
		'totalSupplyUsd',
		'totalBorrowUsd',
		'totalAvailableUsd'
	]
}

export const columnSizes = {
	0: {
		pool: 200,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 100,
		totalBorrowUsd: 100,
		totalAvailableUsd: 120
	},
	812: {
		pool: 200,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 100,
		totalBorrowUsd: 100,
		totalAvailableUsd: 120
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
