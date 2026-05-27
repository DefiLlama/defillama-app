import { createColumnHelper } from '@tanstack/react-table'
import { PercentChange, formatPercentChangeText } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { usePaginatedTableDisplayRowNumber } from '~/components/Table/PaginatedTable'
import { Tooltip } from '~/components/Tooltip'
import { earlyExit, lockupsRewards } from '~/containers/Yields/constants'
import { formattedNum } from '~/utils'
import { ColoredAPY } from './ColoredAPY'
import { resolveVirtualYieldsTableConfig, type YieldsTableConfig } from './config'
import { FRStrategyRoute, NameYieldPool } from './Name'
import { PaginatedYieldsTableWrapper, YieldsTableWrapper } from './shared'
import type { IYieldsTableProps, YieldLongShortStrategyTableRow } from './types'

const FundingRateTooltipContent = ({ afr, afr7d, afr30d }: { afr: number; afr7d: number; afr30d: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`8h: ${afr?.toFixed(2)}%`}</span>
			<span>{`7d: ${afr7d?.toFixed(2)}%`}</span>
			<span>{`30d: ${afr30d?.toFixed(2)}%`}</span>
		</span>
	)
}

const columnHelper = createColumnHelper<YieldLongShortStrategyTableRow>()
const STRATEGY_FR_COLUMN_IDS = [
	'strategy',
	'strategyAPY',
	'apy',
	'afr',
	'fr8hCurrent',
	'fundingRate7dAverage',
	'tvlUsd',
	'openInterest'
] as const
type StrategyFrColumnId = (typeof STRATEGY_FR_COLUMN_IDS)[number]

function StrategyFrNameCell({ row }: { row: { id: string; index: number; original: YieldLongShortStrategyTableRow } }) {
	const name = `Long ${row.original.symbol} | Short ${row.original.symbolPerp}`
	const rowIndex = usePaginatedTableDisplayRowNumber(row.id)

	return (
		<span className="grid grid-cols-[auto_1fr] gap-2 text-xs">
			<span className="shrink-0 tabular-nums lg:pt-1.25" aria-hidden="true">
				{rowIndex ?? row.index + 1}
			</span>
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
}

const columns = [
	columnHelper.accessor((row) => row.strategy ?? '', {
		id: 'strategy',
		header: 'Strategy',
		enableSorting: false,
		cell: ({ row }) => <StrategyFrNameCell row={row} />,
		meta: {
			headerClassName: 'w-[250px] min-[812px]:w-[300px]'
		}
	}),
	columnHelper.accessor((row) => row.strategyAPY ?? undefined, {
		id: 'strategyAPY',
		header: 'Strategy APY',
		enableSorting: true,
		cell: ({ getValue }) => {
			return (
				<ColoredAPY data-variant="positive" className="ml-auto font-bold">
					{formatPercentChangeText(getValue(), true)}
				</ColoredAPY>
			)
		},
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end',
			headerHelperText: 'Farm APY + Funding APY'
		}
	}),
	columnHelper.accessor((row) => row.apy ?? undefined, {
		id: 'apy',
		header: 'Farm APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<>
								<PercentChange percent={getValue()} noSign fontWeight={400} />
							</>
						</span>
					) : (
						<>
							<PercentChange percent={getValue()} noSign fontWeight={400} />
						</>
					)}
				</>
			)
		},
		meta: {
			headerClassName: 'w-[125px]',
			align: 'end',
			headerHelperText: 'Annualised Farm Yield'
		}
	}),
	columnHelper.accessor((row) => row.afr ?? undefined, {
		id: 'afr',
		header: 'Funding APY',
		enableSorting: true,
		cell: ({ getValue, row }) => {
			return (
				<>
					{lockupsRewards.includes(row.original.projectName) ? (
						<span className="flex w-full items-center justify-end gap-1">
							<QuestionHelper text={earlyExit} />
							<Tooltip
								className="ml-auto"
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
						</span>
					) : (
						<span className="flex w-full items-center justify-end">
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
						</span>
					)}
				</>
			)
		},
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end',
			headerHelperText:
				'Annualised Funding Yield based on previous settled Funding Rate. Hover for detailed breakdown of different APY windows using 7day or 30day paid Funding Rate sums'
		}
	}),
	columnHelper.accessor((row) => row.fr8hCurrent ?? undefined, {
		id: 'fr8hCurrent',
		header: 'Funding Rate',
		enableSorting: true,
		cell: (info) => (info.getValue() == null ? null : `${info.getValue()}%`),
		meta: {
			headerClassName: 'w-[145px]',
			align: 'end',
			headerHelperText: 'Current (predicted) Funding Rate'
		}
	}),
	columnHelper.accessor((row) => row.fundingRate7dAverage ?? undefined, {
		id: 'fundingRate7dAverage',
		header: 'Avg Funding Rate',
		enableSorting: true,
		cell: (info) => (info.getValue() == null ? null : `${info.getValue()}%`),
		meta: {
			headerClassName: 'w-[175px]',
			align: 'end',
			headerHelperText: 'Average of previously settled funding rates from the last 7 days'
		}
	}),
	columnHelper.accessor((row) => row.tvlUsd ?? undefined, {
		id: 'tvlUsd',
		header: 'Farm TVL',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.tvlUsd
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null ? null : formattedNum(value, true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[100px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: 'Open Interest',
		enableSorting: true,
		cell: (info) => {
			const value = info.row.original.openInterest
			const indexPrice = info.row.original.indexPrice
			return (
				<span
					data-strike={info.row.original.strikeTvl ? 'true' : 'false'}
					className="data-[strike=true]:text-(--text-disabled)"
				>
					{value == null || indexPrice == null ? null : formattedNum(value * indexPrice, true)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end'
		}
	})
]

const columnOrders: Record<number, readonly StrategyFrColumnId[]> = {
	0: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	400: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	640: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest'],
	1280: ['strategy', 'strategyAPY', 'apy', 'afr', 'fr8hCurrent', 'fundingRate7dAverage', 'tvlUsd', 'openInterest']
}
export const STRATEGY_FR_TABLE_CONFIG: YieldsTableConfig<YieldLongShortStrategyTableRow, StrategyFrColumnId> = {
	kind: 'strategyFr',
	columnIds: STRATEGY_FR_COLUMN_IDS,
	columns,
	columnOrders,
	rowSize: 80
}

export function YieldsStrategyTableFR({ data }: IYieldsTableProps<YieldLongShortStrategyTableRow>) {
	const resolvedConfig = resolveVirtualYieldsTableConfig(STRATEGY_FR_TABLE_CONFIG, undefined)
	return (
		<YieldsTableWrapper
			data={data}
			columns={resolvedConfig.columns}
			columnOrders={resolvedConfig.columnOrders}
			rowSize={resolvedConfig.rowSize}
		/>
	)
}

export function PaginatedYieldsStrategyTableFR(props: IYieldsTableProps<YieldLongShortStrategyTableRow>) {
	return <PaginatedYieldsTableWrapper {...props} config={STRATEGY_FR_TABLE_CONFIG} />
}
