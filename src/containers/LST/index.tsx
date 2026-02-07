import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { LSDColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, formattedNum, lastDayOfWeek } from '~/utils'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const GROUP_BY = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
type GroupByType = (typeof GROUP_BY)[number]
const DEFAULT_SORTING_STATE = [{ id: 'stakedEth', desc: true }]

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
}) => {
	const [tab, setTab] = React.useState('breakdown')
	const [groupBy, setGroupBy] = React.useState<GroupByType>('Weekly')
	const [selectedBreakdownTokens, setSelectedBreakdownTokens] = React.useState<string[]>(tokens ?? [])
	const [selectedInflowTokens, setSelectedInflowTokens] = React.useState<string[]>(tokens ?? [])
	const selectedBreakdownTokensSet = React.useMemo(() => new Set(selectedBreakdownTokens), [selectedBreakdownTokens])
	const selectedInflowTokensSet = React.useMemo(() => new Set(selectedInflowTokens), [selectedInflowTokens])

	const inflowsTooltipFormatter = React.useMemo(() => {
		const gb =
			groupBy === 'Weekly'
				? 'weekly'
				: groupBy === 'Monthly'
					? 'monthly'
					: groupBy === 'Cumulative'
						? 'cumulative'
						: 'daily'
		return createInflowsTooltipFormatter({ groupBy: gb, valueSymbol: 'ETH' })
	}, [groupBy])

	const { chartInstance: breakdownChartInstance, handleChartReady: handleBreakdownReady } = useGetChartInstance()

	const breakdownExportFilenameBase = 'lst-breakdown-dominance'
	const breakdownExportTitle = 'LST Breakdown (Dominance)'

	const inflowsData = React.useMemo(() => {
		const store = {}

		const isWeekly = groupBy === 'Weekly'
		const isMonthly = groupBy === 'Monthly'
		const isCumulative = groupBy === 'Cumulative'
		const totalByToken = {}
		for (const date in inflowsChartData) {
			for (const token in inflowsChartData[date]) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (!store[dateKey]) {
					store[dateKey] = {}
				}
				store[dateKey][token] =
					(store[dateKey][token] || 0) + inflowsChartData[date][token] + (totalByToken[token] || 0)

				if (isCumulative) {
					totalByToken[token] = (totalByToken[token] || 0) + inflowsChartData[date][token]
				}
			}
		}
		const finalData = []

		for (const date in store) {
			const dateStore = store[date]
			dateStore.date = date
			finalData.push(dateStore)
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
						onClick={() => setTab('breakdown')}
						data-selected={tab === 'breakdown'}
					>
						Breakdown
					</button>
					<button
						className="border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b data-[selected=true]:border-b-(--primary)"
						onClick={() => setTab('inflows')}
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
