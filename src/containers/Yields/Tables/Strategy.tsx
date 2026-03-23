import { createColumnHelper } from '@tanstack/react-table'
import { formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { NameYieldPool, PoolStrategyRoute } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsStrategyTableRow } from './types'

const columnHelper = createColumnHelper<IYieldsStrategyTableRow>()

const columns = [
	columnHelper.accessor((row) => (row as any).strategy as string, {
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
	columnHelper.accessor((row) => (row as any).totalApy as number | null, {
		id: 'totalApy',
		header: 'Strategy APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const TooltipContent = () => {
				return (
					<span className="flex flex-col gap-1">
						<span>{`Supply APY: ${row.original?.apy?.toFixed(2)}%`}</span>
						<span>{`Borrow APY: ${row.original?.borrow?.apyBorrow?.toFixed(2)}%`}</span>
						<span>{`Farm APY: ${row.original?.farmApy?.toFixed(2)}%`}</span>
					</span>
				)
			}

			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<div className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip content={<TooltipContent />}>
								<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
									{formatPercentChangeText(getValue(), true)}
								</ColoredAPY>
							</Tooltip>
						</div>
					) : (
						<Tooltip content={<TooltipContent />}>
							<ColoredAPY data-variant="positive" style={{ '--weight': 700, marginLeft: 'auto' }}>
								{formatPercentChangeText(getValue(), true)}
							</ColoredAPY>
						</Tooltip>
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
	columnHelper.accessor((row) => (row as any).delta as number | null, {
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
	columnHelper.accessor((row) => (row as any).borrowAvailableUsd as number | null, {
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
					{value === null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Available Borrow Liquidity for the debt token'
		}
	}),
	columnHelper.accessor('farmTvlUsd', {
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
					{value === null ? null : formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Locked for the farm token in the last part of the strategy'
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
	})
]

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	400: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	640: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	1280: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd']
}

const columnSizes: ColumnSizesByBreakpoint = {
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

export function YieldsStrategyTable({ data }) {
	return (
		<YieldsTableWrapper
			data={data}
			columns={columns}
			columnSizes={columnSizes}
			columnOrders={columnOrders}
			rowSize={80}
		/>
	)
}
