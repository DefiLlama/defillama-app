import { createColumnHelper } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, isExploitedPool, lockupsRewards } from '~/containers/Yields/utils'
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
			const value = getValue<string>()
			const exploited = isExploitedPool(row.original.projectslug, value)
			return (
				<span className="flex items-center gap-1">
					<NameYieldPool value={value} configID={row.original.configID} url={row.original.url} borrow={true} />
					{exploited ? (
						<Tooltip content="This pool involves a protocol or token affected by an exploit. Proceed with extreme caution.">
							<span className="shrink-0 rounded bg-red-500/15 px-1 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-red-600 dark:text-red-400">
								exploit
							</span>
						</Tooltip>
					) : null}
				</span>
			)
		},
		size: 200
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span style={{ paddingLeft: '32px' }}>Project</span>,
		enableSorting: false,
		cell: ({ row }) => (
			<NameYield
				project={row.original.project}
				projectslug={row.original.project}
				airdrop={row.original.airdrop}
				raiseValuation={row.original.raiseValuation}
				borrow={true}
			/>
		),
		size: 200
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
	columnHelper.accessor('apyBase', {
		id: 'apyBase',
		header: 'Supply Base',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="supply">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Base rate lenders earn which is generated from the borrow side.'
		}
	}),
	columnHelper.accessor('apyReward', {
		id: 'apyReward',
		header: 'Supply Reward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []

			return (
				<div className="flex w-full items-center justify-end gap-1">
					{lockupsRewards.includes(row.original.project) ? <QuestionHelper text={earlyExit} /> : null}
					<IconsRow
						items={toTokenIconItems(rewards, {
							titles: row.original.rewardTokensSymbols,
							getHref: (reward) => yieldsProjectHref(reward)
						})}
					/>
					<ColoredAPY data-variant="supply">{formatPercentChangeText(getValue(), true)}</ColoredAPY>
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Incentive reward APY for lending.'
		}
	}),
	columnHelper.accessor('apyBorrow', {
		id: 'apyBorrow',
		header: 'Net Borrow',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={info.getValue() > 0 ? 'positive' : 'borrow'} style={{ '--weight': 700 }}>
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
	columnHelper.accessor((row) => (row as any).apyBaseBorrow as number | null, {
		id: 'apyBaseBorrow',
		header: 'Borrow Base',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Interest borrowers pay to lenders.'
		}
	}),
	columnHelper.accessor('apyRewardBorrow', {
		id: 'apyRewardBorrow',
		header: 'Borrow Reward',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const rewards = row.original.rewards ?? []

			return row.original.apyRewardBorrow > 0 ? (
				<div className="flex w-full items-center justify-end gap-1">
					{lockupsRewards.includes(row.original.project) ? (
						<QuestionHelper text={earlyExit} />
					) : row.original.project === '0vix' ? (
						<QuestionHelper text={'Pre-mined rewards, no available token yet!'} />
					) : null}
					<IconsRow
						items={toTokenIconItems(rewards, {
							titles: row.original.rewardTokensSymbols,
							getHref: (reward) => yieldsProjectHref(reward)
						})}
					/>
					<ColoredAPY data-variant="borrow">{formatPercentChangeText(getValue(), true)}</ColoredAPY>
				</div>
			) : null
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Incentive reward APY for borrowing.'
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
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
					{info.getValue() === null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 120,
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
		size: 120,
		meta: {
			align: 'end'
		}
	})
]

const columnOrders: ColumnOrdersByBreakpoint = {
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
const columnSizes: ColumnSizesByBreakpoint = {
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
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
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
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	},
	1536: {
		pool: 240,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	},
	1600: {
		pool: 280,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	},
	1640: {
		pool: 320,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	},
	1720: {
		pool: 420,
		project: 200,
		chain: 60,
		apyBase: 140,
		apyReward: 160,
		apyBorrow: 130,
		apyBaseBorrow: 140,
		apyRewardBorrow: 160,
		ltv: 90,
		totalSupplyUsd: 120,
		totalBorrowUsd: 120,
		totalAvailableUsd: 120
	}
}

export function YieldsBorrowTable({ data }: IYieldsTableProps) {
	return <YieldsTableWrapper data={data} columns={columns} columnSizes={columnSizes} columnOrders={columnOrders} />
}
