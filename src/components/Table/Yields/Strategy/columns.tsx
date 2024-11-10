import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYieldPool, PoolStrategyRoute } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsStrategyTableRow } from '../types'
import { Tooltip } from '~/components/Tooltip'
import { QuestionHelper } from '~/components/QuestionHelper'
import { lockupsRewards, earlyExit } from '~/containers/YieldsPage/utils'
import { ColoredAPY } from '../ColoredAPY'

export const columns: ColumnDef<IYieldsStrategyTableRow>[] = [
	{
		header: 'Strategy',
		accessorKey: 'strategy',
		enableSorting: false,
		cell: ({ row, table }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol} ➞ ${row.original.farmSymbol}`

			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<div className="flex flex-col gap-2 text-xs">
					<NameYieldPool
						value={name}
						// in case of cdp row.original.pool === row.original.borrow.pool
						configID={`${row.original.pool}_${row.original.borrow.pool}_${row.original.farmPool}`}
						url={row.original.url}
						index={index + 1}
						strategy={true}
						maxCharacters={50}
						bookmark={false}
					/>
					<PoolStrategyRoute
						project1={row.original.projectName}
						airdropProject1={row.original.airdrop}
						project2={row.original.farmProjectName}
						airdropProject2={false}
						chain={row.original.chains[0]}
						index={index + 1}
					/>
				</div>
			)
		},
		size: 400
	},
	{
		header: 'Strategy APY',
		accessorKey: 'totalApy',
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
						<div className="w-full flex items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip content={<TooltipContent />}>
								<ColoredAPY data-variant="positive" style={{ '--weight': 700 }}>
									{formattedPercent(getValue(), true, 700, true)}
								</ColoredAPY>
							</Tooltip>
						</div>
					) : (
						<Tooltip content={<TooltipContent />}>
							<ColoredAPY data-variant="positive" style={{ '--weight': 700, marginLeft: 'auto' }}>
								{formattedPercent(getValue(), true, 700, true)}
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
	},
	{
		header: 'Delta',
		accessorKey: 'delta',
		enableSorting: true,
		cell: (info) => {
			return <ColoredAPY data-variant="borrow">{formattedPercent(info.getValue(), true, 400, true)}</ColoredAPY>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'APY Increase by following this strategy compared to just supplying the collateral token'
		}
	},
	{
		header: 'Available',
		accessorKey: 'borrowAvailableUsd',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.borrow.totalAvailableUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value === null ? null : '$' + formattedNum(value)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Available Borrow Liquidity for the debt token'
		}
	},
	{
		header: 'Farm TVL',
		accessorKey: 'farmTvlUsd',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.farmTvlUsd
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value === null ? null : '$' + formattedNum(value)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Locked for the farm token in the last part of the strategy'
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
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	400: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	640: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd'],
	1280: ['strategy', 'totalApy', 'delta', 'ltv', 'borrowAvailableUsd', 'farmTvlUsd']
}

export const columnSizes = {
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

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
