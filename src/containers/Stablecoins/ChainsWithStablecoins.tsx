import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { StablecoinChartType, StablecoinsChartConfig } from '~/containers/ProDashboard/types'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import { getStablecoinDominance } from '~/containers/Stablecoins/utils'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from '~/hooks/data/stablecoins'
import { formattedNum, preparePieChartData, toNiceCsvDate } from '~/utils'
import { PeggedChainsTable } from './Table'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const mapChartTypeToConfig = (displayType: string): StablecoinChartType => {
	const mapping: Record<string, StablecoinChartType> = {
		'Total Market Cap': 'totalMcap',
		'Token Market Caps': 'tokenMcaps',
		'Chain Market Caps': 'tokenMcaps',
		Pie: 'pie',
		Dominance: 'dominance',
		'USD Inflows': 'usdInflows',
		'Token Inflows': 'tokenInflows'
	}
	return mapping[displayType] || 'totalMcap'
}

export function ChainsWithStablecoins({
	chainCirculatings,
	chainList,
	chainsGroupbyParent,
	change1d,
	change7d,
	change30d,
	totalMcapCurrent,
	change1d_nol,
	change7d_nol,
	change30d_nol,
	peggedAreaChartData,
	peggedAreaTotalData,
	stackedDataset
}) {
	const [chartType, setChartType] = React.useState('Pie')
	const chartTypeList = ['Total Market Cap', 'Chain Market Caps', 'Pie', 'Dominance']

	const filteredPeggedAssets = chainCirculatings
	const chainTotals = useCalcCirculating(filteredPeggedAssets)

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const prepareeCsv = React.useCallback(() => {
		const rows = [['Timestamp', 'Date', ...chainList, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...chainList.map((chain) => day[chain] ?? ''),
					chainList.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		return { filename: 'stablecoinsChainTotals.csv', rows: rows as (string | number | boolean)[][] }
	}, [stackedData, chainList])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topChain = { name: 'Ethereum', mcap: 0 }
	if (chainTotals.length > 0) {
		const topChainData = chainTotals[0]
		topChain.name = topChainData.name
		topChain.mcap = topChainData.mcap
	}

	const dominance = getStablecoinDominance(topChain, totalMcapCurrent)

	const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: groupedChains, sliceIdentifier: 'name', sliceValue: 'mcap', limit: 10 })
	}, [groupedChains])

	const stablecoinsChartConfig = React.useMemo<StablecoinsChartConfig>(
		() => ({
			id: `stablecoins-All-${mapChartTypeToConfig(chartType)}`,
			kind: 'stablecoins',
			chain: 'All',
			chartType: mapChartTypeToConfig(chartType)
		}),
		[chartType]
	)

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Stablecoins Market Cap</span>
						<span className="font-jetbrains text-2xl font-semibold">{mcapToDisplay}</span>
					</p>

					<details className="group text-base">
						<summary className="flex items-center">
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-mb-5 -ml-5 transition-transform duration-100 group-open:rotate-90"
							/>
							<span className="flex w-full flex-col">
								<span className="text-(--text-label)">Change (7d)</span>

								<span className="flex flex-nowrap items-end justify-between gap-1">
									<span className="font-jetbrains text-2xl font-semibold">{change7d_nol}</span>
									<span
										className={`${
											change7d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
										} font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap`}
									>{`${change7d}%`}</span>
								</span>
							</span>
						</summary>

						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (1d)</span>
							<Tooltip
								content={change1d_nol}
								className={`font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change1d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change1d}%`}
							</Tooltip>
						</p>
						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (30d)</span>
							<Tooltip
								content={change30d_nol}
								className={`font-jetbrains overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change30d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change30d}%`}
							</Tooltip>
						</p>
					</details>

					<p className="flex flex-col">
						<span className="text-(--text-label)">{topChain.name} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>

					<CSVDownloadButton prepareCsv={prepareeCsv} smol className="mt-auto mr-auto" />
				</div>
				<div className="col-span-2 flex min-h-[412px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					{chartType === 'Total Market Cap' && (
						<React.Suspense fallback={<></>}>
							<div className="flex items-center gap-2 px-2">
								<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
								<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol className="-mr-2" />
							</div>
							<LineAndBarChart charts={peggedAreaTotalData} valueSymbol="$" />
						</React.Suspense>
					)}
					{chartType === 'Chain Market Caps' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaChartData}
								stacks={chainList}
								valueSymbol="$"
								hideDefaultLegend={true}
								hideGradient={true}
								chartOptions={chartOptions}
								customComponents={
									<>
										<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
										<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol className="-mr-2" />
									</>
								}
							/>
						</React.Suspense>
					)}
					{chartType === 'Dominance' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								valueSymbol="%"
								chartData={dataWithExtraPeggedAndDominanceByDay}
								stacks={chainList}
								hideDefaultLegend={true}
								hideGradient={true}
								expandTo100Percent={true}
								chartOptions={chartOptions}
								customComponents={
									<>
										<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
										<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol className="-mr-2" />
									</>
								}
							/>
						</React.Suspense>
					)}
					{chartType === 'Pie' && (
						<React.Suspense fallback={<></>}>
							<PieChart
								chartData={chainsCirculatingValues}
								customComponents={
									<>
										<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
										<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol className="-mr-3" />
									</>
								}
							/>
						</React.Suspense>
					)}
				</div>
			</div>

			<PeggedChainsTable data={groupedChains} />
		</>
	)
}

const chartOptions = {
	grid: {
		left: 12,
		bottom: 68,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}
