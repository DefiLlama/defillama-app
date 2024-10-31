import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYieldPool, FRStrategyRoute } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsStrategyTableRow } from '../types'
import { PoolStrategyWithProjects } from '../../shared'
import { Tooltip } from '~/components/Tooltip'
import styled from 'styled-components'
import { QuestionHelper } from '~/components/QuestionHelper'
import { lockupsRewards, earlyExit } from '~/containers/YieldsPage/utils'
import { ColoredAPY } from '../ColoredAPY'

export const columns: ColumnDef<IYieldsStrategyTableRow>[] = [
	{
		header: 'Strategy',
		accessorKey: 'strategy',
		enableSorting: false,
		cell: ({ row, table }) => {
			const name = `Long ${row.original.symbol} | Short ${row.original.symbolPerp}`

			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<PoolStrategyWithProjects>
					<NameYieldPool
						value={name}
						configID={row.original.pool}
						withoutLink={true}
						url={row.original.url}
						index={index + 1}
						strategy={true}
						maxCharacters={50}
						bookmark={false}
					/>
					<FRStrategyRoute
						project1={row.original.projectName}
						airdropProject1={row.original.airdrop}
						project2={row.original.marketplace}
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
		accessorKey: 'strategyAPY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant="positive" style={{ '--weight': 700, marginLeft: 'auto' }}>
					{formattedPercent(getValue(), true, 700, true)}
				</ColoredAPY>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Farm APY + Funding APY'
		}
	},
	{
		header: 'Farm APY',
		accessorKey: 'apy',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<div className="flex items-center justify-end gap-1 w-full">
							<QuestionHelper text={earlyExit} />
							<>{formattedPercent(Number(getValue()), true, 400)}</>
						</div>
					) : (
						<>{formattedPercent(Number(getValue()), true, 400)}</>
					)}
				</>
			)
		},
		size: 125,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised Farm Yield'
		}
	},
	{
		header: 'Funding APY',
		accessorKey: 'afr',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			const TooltipContent = () => {
				return (
					<span className="flex flex-col gap-1">
						<span>{`8h: ${row.original?.afr?.toFixed(2)}%`}</span>
						<span>{`7d: ${row.original?.afr7d?.toFixed(2)}%`}</span>
						<span>{`30d: ${row.original?.afr30d?.toFixed(2)}%`}</span>
					</span>
				)
			}

			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<div className="flex items-center justify-end gap-1 w-full">
							<QuestionHelper text={earlyExit} />
							<Tooltip content={<TooltipContent />}>{formattedPercent(getValue(), true, 700)}</Tooltip>
						</div>
					) : (
						<Tooltip content={<TooltipContent />}>{formattedPercent(getValue(), true, 700)}</Tooltip>
					)}
				</>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText:
				'Annualised Funding Yield based on previous settled Funding Rate. Hover for detailed breakdown of different APY windows using 7day or 30day paid Funding Rate sums'
		}
	},
	{
		header: 'Funding Rate',
		accessorKey: 'fr8hCurrent',
		enableSorting: true,
		cell: ({ getValue }) => getValue() + '%',
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Current (predicted) Funding Rate'
		}
	},
	{
		header: 'Avg Funding Rate',
		accessorKey: 'fundingRate7dAverage',
		enableSorting: true,
		cell: ({ getValue }) => getValue() + '%',
		size: 175,
		meta: {
			align: 'end',
			headerHelperText: 'Average of previously settled funding rates from the last 7 days'
		}
	},
	{
		header: 'Farm TVL',
		accessorKey: 'tvlUsd',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.tvlUsd
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
			align: 'end'
		}
	},
	{
		header: 'Open Interest',
		accessorKey: 'openInterest',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.openInterest
			const indexPrice = info.row.original.indexPrice
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'var(--text-disabled)' : 'inherit'
					}}
				>
					{value === null ? null : '$' + formattedNum(value * indexPrice)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	400: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	640: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	1280: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest']
}

export const columnSizes = {
	0: {
		strategy: 250,
		strategyAPY: 145,
		apy: 125,
		afr: 145,
		fr8hCurrent: 145,
		fundingRate7dAverage: 175,
		tvlUsd: 100,
		openInterest: 140
	},
	812: {
		strategy: 300,
		strategyAPY: 145,
		apy: 125,
		afr: 145,
		fr8hCurrent: 145,
		fundingRate7dAverage: 175,
		tvlUsd: 100,
		openInterest: 140
	}
}

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
