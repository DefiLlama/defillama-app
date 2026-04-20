import { createColumnHelper } from '@tanstack/react-table'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems, yieldsChainHref } from '~/components/IconsRow/utils'
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
const LOOP_COLUMN_IDS = [
	'pool',
	'project',
	'chains',
	'loopApy',
	'netSupplyApy',
	'boost',
	'ltv',
	'totalSupplyUsd',
	'totalBorrowUsd',
	'totalAvailableUsd'
] as const
type LoopColumnId = (typeof LOOP_COLUMN_IDS)[number]

const columns = [
	columnHelper.accessor('pool', {
		id: 'pool',
		header: 'Pool',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const exploited = isExploitedPool(row.original.projectslug, value)
			return (
				<span className="flex items-center gap-1">
					<NameYieldPool value={value} configID={row.original.configID} url={row.original.url} borrow={true} />
					{exploited ? (
						<Tooltip content="This pool involves a protocol or token affected by an exploit. Proceed with extreme caution.">
							<span className="shrink-0 rounded bg-red-500/15 px-1 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-red-600 uppercase dark:text-red-400">
								exploit
							</span>
						</Tooltip>
					) : null}
				</span>
			)
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
	columnHelper.accessor((row) => row.loopApy ?? undefined, {
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
	columnHelper.accessor((row) => row.netSupplyApy ?? undefined, {
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
	columnHelper.accessor((row) => row.boost ?? undefined, {
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
	columnHelper.accessor((row) => row.ltv ?? undefined, {
		id: 'ltv',
		header: 'LTV',
		enableSorting: true,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null ? '' : formattedNum(Number(value) * 100) + '%'}
				</span>
			)
		},
		size: 60,
		meta: {
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
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 80,
		meta: {
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
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{info.getValue() == null ? '' : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 100,
		meta: {
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
					{info.getValue() == null ? null : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		size: 80,
		meta: {
			align: 'end'
		}
	})
]

const columnOrders: Record<number, readonly LoopColumnId[]> = {
	0: [
		'pool',
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

const columnSizes: Record<number, Partial<Record<LoopColumnId, number>>> = {
	0: {
		pool: 160,
		project: 180,
		chains: 60,
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
		chains: 60,
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
		chains: 60,
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
		chains: 60,
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
		chains: 60,
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
		chains: 60,
		loopApy: 100,
		netSupplyApy: 120,
		boost: 80,
		ltv: 60,
		totalSupplyUsd: 80,
		totalBorrowUsd: 100,
		totalAvailableUsd: 80
	}
}

export const LOOP_TABLE_CONFIG: YieldsTableConfig<IYieldTableRow, LoopColumnId> = {
	kind: 'loop',
	columnIds: LOOP_COLUMN_IDS,
	columns,
	columnOrders,
	columnSizes
}

export function YieldsLoopTable({ data }: IYieldsTableProps) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(LOOP_TABLE_CONFIG, undefined)
	return (
		<YieldsTableWrapper
			data={data}
			columns={resolvedConfig.columns}
			columnSizes={resolvedConfig.columnSizes}
			columnOrders={resolvedConfig.columnOrders}
		/>
	)
}
