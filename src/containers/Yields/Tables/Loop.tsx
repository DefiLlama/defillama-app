import { createColumnHelper } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, yieldsChainHref } from '~/components/IconsRow/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsTableProps, IYieldTableRow } from './types'

const columnHelper = createColumnHelper<IYieldTableRow>()

const columns = [
	columnHelper.accessor('pool', {
		id: 'pool',
		header: 'Pool',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return <NameYieldPool value={getValue()} configID={row.original.configID} url={row.original.url} borrow={true} />
		},
		size: 160
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		enableSorting: true,
		cell: ({ row }) => (
			<NameYield
				project={row.original.project}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				raiseValuation={row.original.raiseValuation}
				borrow={true}
			/>
		),
		size: 160
	}),
	columnHelper.accessor('chains', {
		id: 'chains',
		header: 'Chain',
		enableSorting: false,
		cell: (info) => <IconsRow items={toChainIconItems(info.getValue(), (chain) => yieldsChainHref(chain))} />,
		meta: {
			align: 'end'
		},
		size: 60
	}),
	columnHelper.accessor('loopApy', {
		id: 'loopApy',
		header: 'Loop APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.project) ? (
						<div className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
								{formatPercentChangeText(getValue(), true)}
							</ColoredAPY>
						</div>
					) : (
						<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
							{formatPercentChangeText(getValue(), true)}
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
	}),
	columnHelper.accessor((row) => (row as any).netSupplyApy as number | null, {
		id: 'netSupplyApy',
		header: 'Supply APY',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="supply">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total net APY for supplying (Base + Reward)'
		}
	}),
	columnHelper.accessor('boost', {
		id: 'boost',
		header: 'Boost',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formattedNum(info.getValue()) + 'x'}</ColoredAPY>
		},
		size: 80,
		meta: {
			align: 'end',
			headerHelperText: 'Loop APY / Supply APY'
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
		size: 60,
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 80,
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	}),
	columnHelper.accessor((row) => (row as any).totalAvailableUsd as number | null, {
		id: 'totalAvailableUsd',
		header: 'Available',
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
	})
]

const columnOrders: ColumnOrdersByBreakpoint = {
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

const columnSizes: ColumnSizesByBreakpoint = {
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
		netSupplyApy: 120,
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
		netSupplyApy: 120,
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
		netSupplyApy: 120,
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
		netSupplyApy: 120,
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
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	}
}

export function YieldsLoopTable({ data }: IYieldsTableProps) {
	return <YieldsTableWrapper data={data} columns={columns} columnSizes={columnSizes} columnOrders={columnOrders} />
}
