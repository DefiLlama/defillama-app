import { createColumnHelper } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
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
							<Icon name="alert-triangle" height={14} width={14} className="shrink-0 text-red-500 dark:text-red-400" />
						</Tooltip>
					) : null}
				</span>
			)
		},
		meta: {
			headerClassName:
				'w-[160px] min-[812px]:w-[200px] 2xl:w-[240px] min-[1600px]:w-[280px] min-[1640px]:w-[320px] min-[1720px]:w-[420px]'
		}
	}),
	columnHelper.accessor('project', {
		id: 'project',
		header: () => <span className="pl-6">Project</span>,
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
		meta: {
			headerClassName: 'w-[180px] min-[812px]:w-[160px]'
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
							<ColoredAPY data-variant="positive" className="font-bold">
								{formatPercentChangeText(getValue(), true)}
							</ColoredAPY>
						</div>
					) : (
						<ColoredAPY data-variant="positive" className="font-bold">
							{formatPercentChangeText(getValue(), true)}
						</ColoredAPY>
					)}
				</>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
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
		meta: {
			headerClassName: 'w-[100px] min-[812px]:w-[120px]',
			align: 'end',
			headerHelperText: 'Total net APY for supplying (Base + Reward)'
		}
	}),
	columnHelper.accessor((row) => row.boost ?? undefined, {
		id: 'boost',
		header: 'Boost',
		enableSorting: true,
		cell: (info) => {
			const value = info.getValue()
			if (value == null || !Number.isFinite(Number(value))) return null
			return <ColoredAPY data-variant="borrow">{formattedNum(value) + 'x'}</ColoredAPY>
		},
		meta: {
			headerClassName: 'w-[80px]',
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
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null ? '' : formattedNum(Number(value) * 100) + '%'}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[60px]',
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
			headerClassName: 'w-[80px]',
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
			headerClassName: 'w-[100px]',
			align: 'end',
			headerHelperText: 'Amount of borrowed collateral'
		}
	}),
	columnHelper.accessor((row) => row.totalAvailableUsd ?? undefined, {
		id: 'totalAvailableUsd',
		header: 'Available',
		enableSorting: true,
		cell: (info) => {
			const totalSupplyUsd = info.row.original.totalSupplyUsd
			const totalBorrowUsd = info.row.original.totalBorrowUsd
			const available = totalSupplyUsd != null && totalBorrowUsd != null ? totalSupplyUsd - totalBorrowUsd : undefined
			return (
				<span
					data-strike={info.row.original.strikeTvl ?? 'false'}
					className="flex justify-end gap-1 data-[strike=true]:text-(--text-disabled)"
				>
					{['Morpho Compound', 'Morpho Aave'].includes(info.row.original.project) ? (
						<QuestionHelper
							text={`Morpho liquidity comes from the underlying lending protocol pool itself. Available P2P Liquidity: ${
								available == null ? 'Unknown' : available > 0 ? formattedNum(available, true) : '$0'
							}`}
						/>
					) : null}
					{info.getValue() == null ? null : formattedNum(info.getValue(), true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[80px]',
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
export const LOOP_TABLE_CONFIG: YieldsTableConfig<IYieldTableRow, LoopColumnId> = {
	kind: 'loop',
	columnIds: LOOP_COLUMN_IDS,
	columns,
	columnOrders
}

export function YieldsLoopTable({ data }: IYieldsTableProps) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(LOOP_TABLE_CONFIG, undefined)
	return <YieldsTableWrapper data={data} columns={resolvedConfig.columns} columnOrders={resolvedConfig.columnOrders} />
}
