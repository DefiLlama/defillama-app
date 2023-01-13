import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYieldPool, FRStrategyRoute } from '../Name'
import { formatColumnOrder } from '../../utils'
import type { IYieldsStrategyTableRow } from '../types'
import { PoolStrategyWithProjects } from '../../shared'
import { Tooltip2 } from '~/components/Tooltip'
import styled from 'styled-components'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
import { lockupsRewards, earlyExit } from '~/components/YieldsPage/utils'
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					<ColoredAPY data-variant="positive">{formattedPercent(getValue(), true, 700)}</ColoredAPY>
				</AutoRow>
			)
		},
		size: 140,
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.projectName) ? <QuestionHelper text={earlyExit} /> : null}
					{formattedPercent(Number(getValue()), true, 400)}
				</AutoRow>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised Farm Yield'
		}
	},
	{
		header: 'Funding APY',
		accessorKey: 'afr',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{formattedPercent(getValue(), true, 400)}
				</AutoRow>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised Funding Yield based on previous Funding Rate'
		}
	},
	{
		header: 'Funding Rate',
		accessorKey: 'fr8hCurrent',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>{getValue() + '%'}</AutoRow>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Current Funding Rate'
		}
	},
	{
		header: 'Avg Funding Rate',
		accessorKey: 'fundingRate7dAverage',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>{getValue() + '%'}</AutoRow>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Average of previous funding rates from the last 7 days'
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
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
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{value === null ? null : '$' + formattedNum(value * indexPrice)}
				</span>
			)
		},
		size: 120,
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
		strategyAPY: 190,
		apy: 180,
		afr: 190,
		fr8hCurrent: 190,
		fundingRate7dAverage: 190,
		tvlUsd: 100,
		openInterest: 120
	},
	812: {
		strategy: 300,
		strategyAPY: 130,
		apy: 130,
		afr: 130,
		fr8hCurrent: 130,
		fundingRate7dAverage: 150,
		tvlUsd: 100,
		openInterest: 100
	}
}

const Tooltip = styled(Tooltip2)`
	display: flex;
	flex-direction: column;
	gap: 4px;
`

export const yieldsColumnOrders = formatColumnOrder(columnOrders)
