import { createColumnHelper } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, toTokenIconItems, yieldsChainHref, yieldsProjectHref } from '~/components/IconsRow/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, isExploitedPool, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { NameYield, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsTableProps, IYieldTableRow } from './types'

const columnHelper = createColumnHelper<IYieldTableRow>()
const BORROW_COLUMN_IDS = [
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
] as const
type BorrowColumnId = (typeof BORROW_COLUMN_IDS)[number]

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
							<Icon name="alert-triangle" height={14} width={14} className="shrink-0 text-red-500 dark:text-red-400" />
						</Tooltip>
					) : null}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[200px] 2xl:w-[240px] min-[1600px]:w-[280px] min-[1640px]:w-[320px] min-[1720px]:w-[420px]'
		}
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span className="pl-6">Project</span>,
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
		meta: {
			headerClassName: 'w-[200px]'
		}
	}),
	columnHelper.accessor('chains', {
		id: 'chains',
		header: 'Chain',
		enableSorting: false,
		cell: (info) => <IconsRow items={toChainIconItems(info.getValue(), (chain) => yieldsChainHref(chain))} />,
		meta: {
			headerClassName: 'w-[60px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.apyBase ?? undefined, {
		id: 'apyBase',
		header: 'Supply Base',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="supply">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Base rate lenders earn which is generated from the borrow side.'
		}
	}),
	columnHelper.accessor((row) => row.apyReward ?? undefined, {
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
		meta: {
			headerClassName: 'w-[160px]',
			align: 'end',
			headerHelperText: 'Incentive reward APY for lending.'
		}
	}),
	columnHelper.accessor((row) => row.apyBorrow ?? undefined, {
		id: 'apyBorrow',
		header: 'Net Borrow',
		enableSorting: true,
		cell: (info) => {
			return (
				<ColoredAPY data-variant={info.getValue() > 0 ? 'positive' : 'borrow'} className="font-bold">
					{formatPercentChangeText(info.getValue(), true)}
				</ColoredAPY>
			)
		},
		meta: {
			headerClassName: 'w-[130px]',
			align: 'end',
			headerHelperText: 'Total net APY for borrowing (Base + Reward).'
		}
	}),
	columnHelper.accessor((row) => row.apyBaseBorrow ?? undefined, {
		id: 'apyBaseBorrow',
		header: 'Borrow Base',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Interest borrowers pay to lenders.'
		}
	}),
	columnHelper.accessor((row) => row.apyRewardBorrow ?? undefined, {
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
		meta: {
			headerClassName: 'w-[160px]',
			align: 'end',
			headerHelperText: 'Incentive reward APY for borrowing.'
		}
	}),
	columnHelper.accessor((row) => row.ltv ?? undefined, {
		id: 'ltv',
		header: 'LTV',
		enableSorting: true,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null ? '' : formattedNum(Number(value) * 100) + '%'}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[90px]',
			align: 'end',
			headerHelperText: 'Max loan to value (collateral factor)'
		}
	}),
	columnHelper.accessor((row) => row.totalSupplyUsd ?? undefined, {
		id: 'totalSupplyUsd',
		header: 'Supplied',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.totalBorrowUsd ?? undefined, {
		id: 'totalBorrowUsd',
		header: 'Borrowed',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	}),
	columnHelper.accessor((row) => row.totalAvailableUsd ?? undefined, {
		id: 'totalAvailableUsd',
		header: 'Available',
		enableSorting: true,
		cell: (info) => {
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
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
					{info.getValue() == null ? null : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	})
]

const columnOrders: Record<number, readonly BorrowColumnId[]> = {
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
export const BORROW_TABLE_CONFIG: YieldsTableConfig<IYieldTableRow, BorrowColumnId> = {
	kind: 'borrow',
	columnIds: BORROW_COLUMN_IDS,
	columns,
	columnOrders
}

export function YieldsBorrowTable({ data }: IYieldsTableProps) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(BORROW_TABLE_CONFIG, undefined)
	return <YieldsTableWrapper data={data} columns={resolvedConfig.columns} columnOrders={resolvedConfig.columnOrders} />
}
