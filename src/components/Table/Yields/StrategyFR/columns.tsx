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
		header: 'Strategy Return (1d)',
		accessorKey: 'strategyReturn',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{lockupsRewards.includes(row.original.projectName) ? <QuestionHelper text={earlyExit} /> : null}

					<ColoredAPY data-variant="positive">{formattedPercent(getValue(), true, 700)}</ColoredAPY>
				</AutoRow>
			)
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Funding Rate (1d) + Farm Return (1d)'
		}
	},
	{
		header: 'Funding Rate (1d)',
		accessorKey: 'frDay',
		enableSorting: true,

		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{formattedNum(Number(info.getValue())) + '%'}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Last funding rate (paid every 8h) * 3 = 24h projection.'
		}
	},
	{
		header: 'Farm Return (1d)',
		accessorKey: 'poolReturnDay',
		enableSorting: true,

		cell: (info) => {
			return (
				<span
					style={{
						color: info.row.original.strikeTvl ? 'gray' : 'inherit'
					}}
				>
					{formattedNum(Number(info.getValue())) + '%'}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Total Farm APY / 365'
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
	}
]

// key: min width of window/screen
// values: table columns order
const columnOrders = {
	0: ['strategy', 'strategyReturn', 'frDay', 'poolReturnDay', 'tvlUsd', 'openInterest'],
	400: ['strategy', 'strategyReturn', 'frDay', 'poolReturnDay', 'tvlUsd', 'openInterest'],
	640: ['strategy', 'strategyReturn', 'frDay', 'poolReturnDay', 'tvlUsd', 'openInterest'],
	1280: ['strategy', 'strategyReturn', 'frDay', 'poolReturnDay', 'tvlUsd', 'openInterest']
}

export const columnSizes = {
	0: {
		strategy: 250,
		strategyReturn: 150,
		frDay: 100,
		poolReturnDay: 100,
		tvlUsd: 100,
		openInterest: 100
	},
	812: {
		strategy: 250,
		strategyReturn: 150,
		frDay: 100,
		poolReturnDay: 100,
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
