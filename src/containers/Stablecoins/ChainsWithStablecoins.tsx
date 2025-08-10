import * as React from 'react'
import { GroupStablecoins } from '~/components/MultiSelect/Stablecoins'
import { PeggedSearch } from '~/components/Search/Stablecoins'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import { PeggedChainsTable } from './Table'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from '~/hooks/data/stablecoins'
import {
	buildStablecoinChartData,
	getStablecoinDominance,
	getPrevStablecoinTotalFromChart
} from '~/containers/Stablecoins/utils'
import { formattedNum, getPercentChange, toNiceCsvDate, download, preparePieChartData } from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { Metrics } from '~/components/Metrics'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

function PeggedChainsOverview({
	chainCirculatings,
	chartData,
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent
}) {
	const [chartType, setChartType] = React.useState('Pie')
	const chartTypeList = ['Total Market Cap', 'Chain Market Caps', 'Pie', 'Dominance']

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = React.useMemo(
		() =>
			buildStablecoinChartData({
				chartDataByAssetOrChain: peggedChartDataByChain,
				assetsOrChainsList: chainList,
				filteredIndexes: [...Array(chainList.length).keys()],
				issuanceType: 'mcap'
			}),
		[peggedChartDataByChain, chainList]
	)

	const filteredPeggedAssets = chainCirculatings
	const chainTotals = useCalcCirculating(filteredPeggedAssets)

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const downloadCsv = () => {
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
		download('stablecoinsChainTotals.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const { change1d, change7d, change30d, totalMcapCurrent, change1d_nol, change7d_nol, change30d_nol } =
		React.useMemo(() => {
			const totalMcapCurrent = getPrevStablecoinTotalFromChart(chartData, 0, 'totalCirculatingUSD')
			const totalMcapPrevDay = getPrevStablecoinTotalFromChart(chartData, 1, 'totalCirculatingUSD')
			const totalMcapPrevWeek = getPrevStablecoinTotalFromChart(chartData, 7, 'totalCirculatingUSD')
			const totalMcapPrevMonth = getPrevStablecoinTotalFromChart(chartData, 30, 'totalCirculatingUSD')
			const change1d = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? '0'
			const change7d = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? '0'
			const change30d = getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? '0'
			const change1d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevDay as string)
						: 0
				),
				true
			)
			const change7d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevWeek as string)
						: 0
				),
				true
			)
			const change30d_nol = formattedNum(
				String(
					totalMcapCurrent && totalMcapPrevDay
						? parseFloat(totalMcapCurrent as string) - parseFloat(totalMcapPrevMonth as string)
						: 0
				),
				true
			)
			return {
				change1d: change1d.startsWith('-') ? change1d : `+${change1d}`,
				change7d: change7d.startsWith('-') ? change7d : `+${change7d}`,
				change30d: change30d.startsWith('-') ? change30d : `+${change30d}`,
				totalMcapCurrent,
				change1d_nol: change1d_nol.startsWith('-') ? change1d_nol : `+${change1d_nol}`,
				change7d_nol: change7d_nol.startsWith('-') ? change7d_nol : `+${change7d_nol}`,
				change30d_nol: change30d_nol.startsWith('-') ? change30d_nol : `+${change30d_nol}`
			}
		}, [chartData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topChain = { name: 'Ethereum', mcap: 0 }
	if (chainTotals.length > 0) {
		const topChainData = chainTotals[0]
		topChain.name = topChainData.name
		topChain.mcap = topChainData.mcap
	}

	const dominance = getStablecoinDominance(topChain, totalMcapCurrent)

	const totalMcapLabel = ['Mcap', 'TVL']

	const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: groupedChains, sliceIdentifier: 'name', sliceValue: 'mcap', limit: 10 })
	}, [groupedChains])

	return (
		<>
			<PeggedSearch />

			<Metrics currentMetric="Stablecoin Supply" isChains={true} />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Stablecoins Market Cap</span>
						<span className="font-semibold text-2xl font-jetbrains">{mcapToDisplay}</span>
					</p>

					<details className="group text-base">
						<summary className="flex items-center">
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
							/>
							<span className="flex flex-col w-full">
								<span className="text-[#545757] dark:text-[#cccccc]">Change (7d)</span>

								<span className="flex items-end justify-between flex-nowrap gap-1">
									<span className="font-semibold text-2xl font-jetbrains">{change7d_nol}</span>
									<span
										className={`${
											change7d.startsWith('-') ? 'text-(--pct-red)' : 'text-(--pct-green)'
										} font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis`}
									>{`${change7d}%`}</span>
								</span>
							</span>
						</summary>

						<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (1d)</span>
							<Tooltip
								content={change1d_nol}
								className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
									change1d.startsWith('-') ? 'text-(--pct-red)' : 'text-(--pct-green)'
								}`}
							>
								{`${change1d}%`}
							</Tooltip>
						</p>
						<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
							<Tooltip
								content={change30d_nol}
								className={`font-jetbrains overflow-hidden whitespace-nowrap text-ellipsis underline decoration-dotted ${
									change30d.startsWith('-') ? 'text-(--pct-red)' : 'text-(--pct-green)'
								}`}
							>
								{`${change30d}%`}
							</Tooltip>
						</p>
					</details>

					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">{topChain.name} Dominance</span>
						<span className="font-semibold text-2xl font-jetbrains">{dominance}%</span>
					</p>

					<CSVDownloadButton onClick={downloadCsv} className="mt-auto mr-auto" />
				</div>
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2 min-h-[406px]">
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
					{chartType === 'Total Market Cap' && (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={peggedAreaTotalData}
								stacks={totalMcapLabel}
								color={'lightcoral'}
								hideDefaultLegend={true}
								valueSymbol="$"
								hideGradient={true}
							/>
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
							/>
						</React.Suspense>
					)}
					{chartType === 'Pie' && (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={chainsCirculatingValues} />
						</React.Suspense>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-1 bg-(--cards-bg) border border-(--cards-border) rounded-md p-3">
				<h2 className="font-semibold text-sm">Filters</h2>
				<GroupStablecoins label="Filters" />
			</div>

			<PeggedChainsTable data={groupedChains} />
		</>
	)
}

export default PeggedChainsOverview
