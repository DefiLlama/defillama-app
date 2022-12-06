import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYieldPool, PoolStrategyRoute } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsStrategyTableRow } from '../types'
import { PoolStrategyWithProjects } from '../../shared'
import { Tooltip2 } from '~/components/Tooltip'
import styled from 'styled-components'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { lockupsRewards, preminedRewards, earlyExit } from '~/components/YieldsPage/utils'

const apyColors = {
	supply: '#4f8fea',
	borrow: '#E59421',
	positive: '#30c338'
}

export const columns: ColumnDef<IYieldsStrategyTableRow>[] = [
	{
		header: 'Strategy',
		accessorKey: 'strategy',
		enableSorting: false,
		cell: ({ row, table }) => {
			const name = `${row.original.symbol} ➞ ${row.original.borrow.symbol} ➞ ${row.original.farmSymbol}`

			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<PoolStrategyWithProjects>
					<NameYieldPool
						withoutLink
						value={name}
						configID={row.original.configID}
						url={row.original.url}
						index={index + 1}
						borrow={true}
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
				</PoolStrategyWithProjects>
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
					<>
						<span>{`Supply APY: ${row.original?.apy?.toFixed(2)}%`}</span>
						<span>{`Borrow APY: ${row.original?.borrow?.apyBorrow?.toFixed(2)}%`}</span>
						<span>{`Farm APY: ${row.original?.farmApy?.toFixed(2)}%`}</span>
					</>
				)
			}

			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.projectName) ? (
						<QuestionHelper text={earlyExit} />
					) : preminedRewards.includes(row.original.projectName) ? (
						<QuestionHelper text={`${row.original.projectName} has Pre-mined rewards, no available token yet!`} />
					) : null}
					<Tooltip content={<TooltipContent />}>
						<span
							style={{
								color: apyColors['positive']
							}}
						>
							{formattedPercent(getValue(), true, 700)}
						</span>
					</Tooltip>
				</AutoRow>
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
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

const Tooltip = styled(Tooltip2)`
	display: flex;
	flex-direction: column;
	gap: 4px;
`

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
