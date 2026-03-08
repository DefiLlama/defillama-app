import { createColumnHelper } from '@tanstack/react-table'
import { PercentChange, formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, lockupsRewards } from '~/containers/Yields/utils'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { FRStrategyRoute, NameYieldPool } from './Name'
import { YieldsTableWrapper } from './shared'
import type { IYieldsStrategyTableRow } from './types'

const FundingRateTooltipContent = ({ afr, afr7d, afr30d }: { afr: number; afr7d: number; afr30d: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`8h: ${afr?.toFixed(2)}%`}</span>
			<span>{`7d: ${afr7d?.toFixed(2)}%`}</span>
			<span>{`30d: ${afr30d?.toFixed(2)}%`}</span>
		</span>
	)
}

const columnHelper = createColumnHelper<IYieldsStrategyTableRow>()

const columns = [
	columnHelper.accessor((row) => (row as any).strategy as string, {
		id: 'strategy',
		header: 'Strategy',
		enableSorting: false,
		cell: ({ row }) => {
			const name = `Long ${row.original.symbol} | Short ${row.original.symbolPerp}`

			return (
				<span className="grid grid-cols-[auto_1fr] gap-2 text-xs">
					<span className="vf-row-index shrink-0 lg:pt-1.25" aria-hidden="true" />
					<span className="flex min-w-0 flex-col gap-2">
						<NameYieldPool
							value={name}
							configID={row.original.pool}
							withoutLink={true}
							url={row.original.url}
							strategy={true}
							maxCharacters={50}
							bookmark={false}
						/>
						<FRStrategyRoute
							project1={row.original.projectName}
							airdropProject1={row.original.airdrop}
							raiseValuationProject1={row.original.raiseValuation}
							project2={row.original.marketplace}
							airdropProject2={false}
							chain={row.original.chains[0]}
						/>
					</span>
				</span>
			)
		},
		size: 400
	}),
	columnHelper.accessor((row) => (row as any).strategyAPY as number | null, {
		id: 'strategyAPY',
		header: 'Strategy APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant="positive" style={{ '--weight': 700, marginLeft: 'auto' }}>
					{formatPercentChangeText(getValue(), true)}
				</ColoredAPY>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Farm APY + Funding APY'
		}
	}),
	columnHelper.accessor('apy', {
		header: 'Farm APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<div className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<>
								<PercentChange percent={Number(getValue())} noSign fontWeight={400} />
							</>
						</div>
					) : (
						<>
							<PercentChange percent={Number(getValue())} noSign fontWeight={400} />
						</>
					)}
				</>
			)
		},
		size: 125,
		meta: {
			align: 'end',
			headerHelperText: 'Annualised Farm Yield'
		}
	}),
	columnHelper.accessor('afr', {
		header: 'Funding APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<div className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip
								content={
									<FundingRateTooltipContent
										afr={row.original?.afr}
										afr7d={row.original?.afr7d}
										afr30d={row.original?.afr30d}
									/>
								}
							>
								<PercentChange percent={getValue()} noSign fontWeight={700} />
							</Tooltip>
						</div>
					) : (
						<Tooltip
							content={
								<FundingRateTooltipContent
									afr={row.original?.afr}
									afr7d={row.original?.afr7d}
									afr30d={row.original?.afr30d}
								/>
							}
						>
							<PercentChange percent={getValue()} noSign fontWeight={700} />
						</Tooltip>
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
	}),
	columnHelper.accessor((row) => (row as any).fr8hCurrent as number | string, {
		id: 'fr8hCurrent',
		header: 'Funding Rate',
		enableSorting: true,
		cell: (info) => `${info.getValue()}%`,
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'Current (predicted) Funding Rate'
		}
	}),
	columnHelper.accessor((row) => (row as any).fundingRate7dAverage as number | string, {
		id: 'fundingRate7dAverage',
		header: 'Avg Funding Rate',
		enableSorting: true,
		cell: (info) => `${info.getValue()}%`,
		size: 175,
		meta: {
			align: 'end',
			headerHelperText: 'Average of previously settled funding rates from the last 7 days'
		}
	}),
	columnHelper.accessor('tvlUsd', {
		header: 'Farm TVL',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.tvlUsd
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
			align: 'end'
		}
	}),
	columnHelper.accessor('openInterest', {
		header: 'Open Interest',
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
					{value === null ? null : formattedNum(value * indexPrice, true)}
				</span>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	})
]

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	400: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	640: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	1280: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest']
}

const columnSizes: ColumnSizesByBreakpoint = {
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

export function YieldsStrategyTableFR({ data }) {
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
