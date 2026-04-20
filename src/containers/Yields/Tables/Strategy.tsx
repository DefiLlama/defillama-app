import { createColumnHelper } from '@tanstack/react-table'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { NameYieldPool, PoolStrategyRoute } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsStrategyTableRow } from './types'

const columnHelper = createColumnHelper<IYieldsStrategyTableRow>()
const STRATEGY_COLUMN_IDS = ['strategy', 'totalApy', 'delta', 'borrowAvailableUsd', 'farmTvlUsd', 'ltv'] as const
type StrategyColumnId = (typeof STRATEGY_COLUMN_IDS)[number]

const columns = [
	columnHelper.accessor((row) => row.strategy ?? '', {
		id: 'strategy',
		header: 'Strategy',
		enableSorting: false,
		cell: ({ row }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol} ➞ ${row.original.farmSymbol}`

			return (
				<span className="grid grid-cols-[auto_1fr] gap-2 text-xs">
					<span className="vf-row-index shrink-0 lg:pt-1.25" aria-hidden="true" />
					<span className="flex min-w-0 flex-col gap-2">
						<NameYieldPool
							value={name}
							// in case of cdp row.original.pool === row.original.borrow.pool
							configID={`${row.original.pool}_${row.original.borrow.pool}_${row.original.farmPool}`}
							url={row.original.url}
							strategy={true}
							maxCharacters={50}
							bookmark={false}
						/>
						<PoolStrategyRoute
							project1={row.original.projectName}
							airdropProject1={row.original.airdrop}
							raiseValuationProject1={row.original.raiseValuation}
							project2={row.original.farmProjectName}
							airdropProject2={false}
							raiseValuationProject2={null}
							chain={row.original.chains[0]}
						/>
					</span>
				</span>
			)
		},
		size: 400
	}),
	columnHelper.accessor((row) => row.totalApy ?? undefined, {
		id: 'totalApy',
		header: 'Strategy APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const formatApyDetail = (value: number | null | undefined) => (value != null ? `${value.toFixed(2)}%` : 'N/A')

			const TooltipContent = () => {
				return (
					<span className="flex flex-col gap-1">
						<span>{`Supply APY: ${formatApyDetail(row.original.apy)}`}</span>
						<span>{`Borrow APY: ${formatApyDetail(row.original.borrow?.apyBorrow)}`}</span>
						<span>{`Farm APY: ${formatApyDetail(row.original.farmApy)}`}</span>
					</span>
				)
			}

			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip content={<TooltipContent />}>
								<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
									{formatPercentChangeText(getValue(), true)}
								</ColoredAPY>
							</Tooltip>
						</span>
					) : (
						<span className="flex w-full items-center justify-end">
							<Tooltip content={<TooltipContent />}>
								<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
									{formatPercentChangeText(getValue(), true)}
								</ColoredAPY>
							</Tooltip>
						</span>
					)}
				</>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Total Strategy APY defined as: Supply APY + Borrow APY * LTV + Farm APY * LTV'
		}
	}),
	columnHelper.accessor((row) => row.delta ?? undefined, {
		id: 'delta',
		header: 'Delta',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formatPercentChangeText(info.getValue(), true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'APY Increase by following this strategy compared to just supplying the collateral token'
		}
	}),
	columnHelper.accessor((row) => row.borrowAvailableUsd ?? undefined, {
		id: 'borrowAvailableUsd',
		header: 'Available',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.borrow.totalAvailableUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Available Borrow Liquidity for the debt token'
		}
	}),
	columnHelper.accessor((row) => row.farmTvlUsd ?? undefined, {
		id: 'farmTvlUsd',
		header: 'Farm TVL',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.farmTvlUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value == null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Locked for the farm token in the last part of the strategy'
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
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Max loan to value (collateral factor)'
		}
	})
]

const columnOrders: Record<number, readonly StrategyColumnId[]> = {
	0: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	400: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	640: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	1280: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd']
}

const columnSizes: Record<number, Partial<Record<StrategyColumnId, number>>> = {
	0: {
		strategy: 250,
		totalApy: 150,
		delta: 100,
		ltv: 90,
		borrowAvailableUsd: 120,
		farmTvlUsd: 100
	},
	812: {
		strategy: 300,
		totalApy: 150,
		delta: 100,
		ltv: 90,
		borrowAvailableUsd: 120,
		farmTvlUsd: 100
	}
}

export const STRATEGY_TABLE_CONFIG: YieldsTableConfig<IYieldsStrategyTableRow, StrategyColumnId> = {
	kind: 'strategy',
	columnIds: STRATEGY_COLUMN_IDS,
	columns,
	columnOrders,
	columnSizes,
	rowSize: 80
}

export function YieldsStrategyTable({ data }) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(STRATEGY_TABLE_CONFIG, undefined)
	return (
		<YieldsTableWrapper
			data={data}
			columns={resolvedConfig.columns}
			columnSizes={resolvedConfig.columnSizes}
			columnOrders={resolvedConfig.columnOrders}
			rowSize={resolvedConfig.rowSize}
		/>
	)
}
