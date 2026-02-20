import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, formattedNum, renderPercentChange, lastDayOfWeek } from '~/utils'
import type { ILSTTokenRow, LSTOverviewProps } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const GROUP_BY = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
type GroupByType = (typeof GROUP_BY)[number]

const GROUP_BY_TO_TOOLTIP: Record<GroupByType, 'daily' | 'weekly' | 'monthly' | 'cumulative'> = {
	Daily: 'daily',
	Weekly: 'weekly',
	Monthly: 'monthly',
	Cumulative: 'cumulative'
}

const DEFAULT_SORTING_STATE = [{ id: 'stakedEth', desc: true }]

const ETHPegTooltipContent = ({ marketRate, expectedRate }: { marketRate: number; expectedRate: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`Market Rate: ${marketRate?.toFixed(4)}`}</span>
			<span>{`Expected Rate: ${expectedRate?.toFixed(4)}`}</span>
		</span>
	)
}

const McapTooltipContent = ({ mcap, tvl }: { mcap: number; tvl: number }) => {
	return (
		<span className="flex flex-col gap-1">
			<span>{`Market Cap: ${mcap?.toFixed(4)}`}</span>
			<span>{`TVL: ${tvl?.toFixed(4)}`}</span>
		</span>
	)
}

const renderLSTPercentChangeCell: ColumnDef<ILSTTokenRow>['cell'] = ({ getValue }) => (
	<>{renderPercentChange(getValue<number | null>())}</>
)

const LSDColumn: ColumnDef<ILSTTokenRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const nameSlug = row.original.name.replace(/\s+/g, '-').toLowerCase()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={row.original.logo} data-lgonly />
					<BasicLink
						href={`/protocol/${nameSlug}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue<string | null>()}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Staked ETH',
		accessorKey: 'stakedEth',
		cell: ({ getValue }) => <>{formattedNum(getValue<number>())}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'TVL',
		accessorKey: 'stakedEthInUsd',
		cell: ({ getValue }) => <>{formattedNum(getValue<number>(), true)}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '7d Change',
		accessorKey: 'stakedEthPctChange7d',
		cell: renderLSTPercentChangeCell,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '30d Change',
		accessorKey: 'stakedEthPctChange30d',
		cell: renderLSTPercentChangeCell,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Market Share',
		accessorKey: 'marketShare',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 125
	},
	{
		header: 'LST',
		accessorKey: 'lsdSymbol',
		cell: ({ getValue, row }) => {
			const value = getValue<string | null>()
			const stringValue = typeof value === 'string' ? value : ''
			if (!row.original.pegInfo) return stringValue
			return (
				<span className="flex items-center justify-end gap-1">
					{row.original.pegInfo ? <QuestionHelper text={row.original.pegInfo} /> : null}
					{stringValue}
				</span>
			)
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'ETH Peg',
		accessorKey: 'ethPeg',
		cell: ({ getValue, row }) => {
			return (
				<Tooltip
					content={
						<ETHPegTooltipContent
							marketRate={row.original?.marketRate ?? 0}
							expectedRate={row.original?.expectedRate ?? 0}
						/>
					}
					className="justify-end"
				>
					{getValue<number | null>() != null ? renderPercentChange(getValue<number | null>()) : null}
				</Tooltip>
			)
		},
		meta: {
			align: 'end',
			headerHelperText:
				'Market Rate (pulled from 1inch) divided by Expected Rate. Hover for Market Rate and Expected Rate Info.'
		},
		size: 115
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcapOverTvl',
		cell: ({ getValue, row }) => {
			return (
				<Tooltip
					content={<McapTooltipContent mcap={row.original.mcap ?? 0} tvl={row.original.stakedEthInUsd} />}
					className="justify-end"
				>
					{getValue<string | null>() ?? null}
				</Tooltip>
			)
		},
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: 'LST APR',
		accessorKey: 'apy',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Fee',
		accessorKey: 'fee',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Protocol Fee'
		},
		size: 90
	}
]

export const LSTOverview = ({
	areaChartData,
	pieChartData,
	tokensList,
	tokens,
	stakedEthSum,
	stakedEthInUsdSum,
	lsdColors,
	inflowsChartData,
	barChartStacks
}: LSTOverviewProps) => {
	const [tab, setTab] = React.useState('breakdown')
	const [groupBy, setGroupBy] = React.useState<GroupByType>('Weekly')
	const [selectedBreakdownTokens, setSelectedBreakdownTokens] = React.useState<string[]>(tokens ?? [])
	const [selectedInflowTokens, setSelectedInflowTokens] = React.useState<string[]>(tokens ?? [])
	const selectedBreakdownTokensSet = React.useMemo(() => new Set(selectedBreakdownTokens), [selectedBreakdownTokens])
	const selectedInflowTokensSet = React.useMemo(() => new Set(selectedInflowTokens), [selectedInflowTokens])

	const inflowsTooltipFormatter = React.useMemo(() => {
		return createInflowsTooltipFormatter({ groupBy: GROUP_BY_TO_TOOLTIP[groupBy], valueSymbol: 'ETH' })
	}, [groupBy])

	const { chartInstance: breakdownChartInstance, handleChartReady: handleBreakdownReady } = useGetChartInstance()

	const breakdownExportFilenameBase = 'lst-breakdown-dominance'
	const breakdownExportTitle = 'LST Breakdown (Dominance)'

	const inflowsData = React.useMemo(() => {
		const store: Record<string | number, Record<string, number>> = {}

		const isWeekly = groupBy === 'Weekly'
		const isMonthly = groupBy === 'Monthly'
		const isCumulative = groupBy === 'Cumulative'
		const totalByToken: Record<string, number> = {}

		for (const [date, dateEntry] of Object.entries(inflowsChartData)) {
			for (const [token, value] of Object.entries(dateEntry)) {
				const dateKey = isWeekly ? lastDayOfWeek(+date) : isMonthly ? firstDayOfMonth(+date) : date
				if (!store[dateKey]) {
					store[dateKey] = {}
				}
				store[dateKey][token] = (store[dateKey][token] ?? 0) + value + (totalByToken[token] ?? 0)

				if (isCumulative) {
					totalByToken[token] = (totalByToken[token] ?? 0) + value
				}
			}
		}

		const finalData: Array<Record<string, number>> = []
		for (const [date, dateStore] of Object.entries(store)) {
			finalData.push({ ...dateStore, date: +date })
		}

		return finalData
	}, [inflowsChartData, groupBy])

	const { breakdownDataset, breakdownCharts } = React.useMemo(
		() => ({
			breakdownDataset: {
				source: areaChartData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokens]
			},
			breakdownCharts: tokens.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: lsdColors[name],
				stack: 'breakdown'
			}))
		}),
		[areaChartData, tokens, lsdColors]
	)

	const { inflowsDataset, inflowsCumulativeCharts, inflowsBarCharts } = React.useMemo(
		() => ({
			inflowsDataset: {
				source: inflowsData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokens]
			},
			inflowsCumulativeCharts: tokens.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: lsdColors[name]
			})),
			inflowsBarCharts: tokens.map((name) => ({
				type: 'bar' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: lsdColors[name],
				stack: barChartStacks[name]
			}))
		}),
		[inflowsData, tokens, lsdColors, barChartStacks]
	)

	return (
		<>
			<h1 className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-xl font-semibold">
				<span>Total Value Locked ETH LSTs</span>
				<span className="font-jetbrains">{`${formattedNum(stakedEthSum)} ETH (${formattedNum(
					stakedEthInUsdSum,
					true
				)})`}</span>
			</h1>

			<div className="flex w-full flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap overflow-x-auto border-b border-(--form-control-border)">
					<button
						className="border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b data-[selected=true]:border-b-(--primary)"
						onClick={() => React.startTransition(() => setTab('breakdown'))}
						data-selected={tab === 'breakdown'}
					>
						Breakdown
					</button>
					<button
						className="border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b data-[selected=true]:border-b-(--primary)"
						onClick={() => React.startTransition(() => setTab('inflows'))}
						data-selected={tab === 'inflows'}
					>
						Inflows
					</button>
				</div>

				<div className="flex flex-col">
					{tab === 'breakdown' ? (
						<div className="grid grid-cols-1 gap-2 pt-2 xl:grid-cols-2">
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<PieChart
									chartData={pieChartData}
									stackColors={lsdColors}
									exportButtons={{ png: true, csv: true, filename: 'lst-breakdown', pngTitle: 'LST Breakdown' }}
								/>
							</React.Suspense>
							<div className="flex flex-col">
								<div className="flex items-center justify-end gap-2 px-2">
									<SelectWithCombobox
										allValues={tokens}
										selectedValues={selectedBreakdownTokens}
										setSelectedValues={setSelectedBreakdownTokens}
										label="LST"
										labelType="smol"
										variant="filter"
										portal
									/>
									<ChartExportButtons
										chartInstance={breakdownChartInstance}
										filename={breakdownExportFilenameBase}
										title={breakdownExportTitle}
									/>
								</div>
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={breakdownDataset}
										charts={breakdownCharts}
										stacked={true}
										expandTo100Percent={true}
										hideDefaultLegend
										valueSymbol="%"
										selectedCharts={selectedBreakdownTokensSet}
										onReady={handleBreakdownReady}
									/>
								</React.Suspense>
							</div>
						</div>
					) : (
						<div className="flex flex-col">
							<div className="flex items-center justify-end gap-2 p-2 pb-0">
								<TagGroup
									selectedValue={groupBy}
									setValue={(period) => setGroupBy(period as GroupByType)}
									values={GROUP_BY}
									className="mr-auto"
								/>
								<SelectWithCombobox
									allValues={tokens}
									selectedValues={selectedInflowTokens}
									setSelectedValues={setSelectedInflowTokens}
									label={groupBy === 'Cumulative' ? 'LST' : 'Protocol'}
									labelType="smol"
									variant="filter"
									portal
								/>
							</div>

							{groupBy === 'Cumulative' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={inflowsDataset}
										charts={inflowsCumulativeCharts}
										hideDefaultLegend
										valueSymbol="ETH"
										selectedCharts={selectedInflowTokensSet}
										chartOptions={
											selectedInflowTokens.length > 1 ? { tooltip: { formatter: inflowsTooltipFormatter } } : undefined
										}
									/>
								</React.Suspense>
							) : (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={inflowsDataset}
										charts={inflowsBarCharts}
										hideDefaultLegend
										valueSymbol="ETH"
										selectedCharts={selectedInflowTokensSet}
										chartOptions={
											selectedInflowTokens.length > 1 ? { tooltip: { formatter: inflowsTooltipFormatter } } : undefined
										}
									/>
								</React.Suspense>
							)}
						</div>
					)}
				</div>
			</div>

			<TableWithSearch
				data={tokensList}
				columns={LSDColumn}
				columnToSearch={'name'}
				placeholder={'Search protocols...'}
				header="Liquid Staking Protocols"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}
