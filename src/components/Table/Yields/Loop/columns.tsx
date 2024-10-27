import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { formattedNum, formattedPercent, toK } from '~/utils'
import { NameYield, NameYieldPool } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldTableRow } from '../types'
import { QuestionHelper } from '~/components/QuestionHelper'
import { lockupsRewards, earlyExit } from '~/components/YieldsPage/utils'
import { ColoredAPY } from '../ColoredAPY'

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
						<div className="flex items-center justify-end gap-1 w-full">
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
			return <ColoredAPY data-variant="supply">{formattedPercent(info.getValue(), true, 400, true)}</ColoredAPY>
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
			return <ColoredAPY data-variant="borrow">{toK(info.getValue()) + 'x'}</ColoredAPY>
		},
		size: 140,
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
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() === null ? '' : '$' + formattedNum(info.getValue())}
				</span>
			)
		},
		size: 120,
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
					style={{
						display: 'flex',
						gap: '4px',
						justifyContent: 'flex-end',
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
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
		totalBorrowUsd: 100,
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
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1536: {
		pool: 240,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1600: {
		pool: 280,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1640: {
		pool: 320,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	},
	1720: {
		pool: 420,
		project: 160,
		chain: 60,
		loopApy: 100,
		netSupplyApy: 100,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
