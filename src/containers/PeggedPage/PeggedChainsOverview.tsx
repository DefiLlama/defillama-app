import * as React from 'react'

import dynamic from 'next/dynamic'
import { GroupStablecoins } from '~/components/MultiSelect/Stablecoins'
import { PeggedSearch } from '~/components/Search/Stablecoins'
import { ChartSelector } from '~/containers/PeggedPage/.'
import { PeggedChainsTable } from '~/components/Table/Stablecoins/PeggedChain'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from '~/hooks/data/stablecoins'
import {
	buildStablecoinChartData,
	getStablecoinDominance,
	getPrevStablecoinTotalFromChart
} from '~/containers/Stablecoins/utils'
import { formattedNum, getPercentChange, toNiceCsvDate, download } from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

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
		const data = groupedChains.map((chain) => ({ name: chain.name, value: chain.mcap }))

		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [groupedChains])

	return (
		<>
			<PeggedSearch />

			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
				<div className="text-base flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
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
							<span className="flex flex-col">
								<span className="text-[#545757] dark:text-[#cccccc]">Change (7d)</span>

								<span className="flex items-end flex-nowrap gap-1 font-semibold text-2xl font-jetbrains">
									<span>{`$${change7d_nol}`}</span>
									<span
										className={`${change7d.startsWith('-') ? 'text-[#f85149]' : 'text-[#3fb950]'} font-inter text-base`}
									>{`(${change7d}%)`}</span>
								</span>
							</span>
						</summary>

						<p className="flex items-center flex-wrap justify-between gap-2 mt-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (1d)</span>
							<span className="flex items-center flex-nowrap gap-1 font-jetbrains">
								<span>{`$${change1d_nol}`}</span>
								<span
									className={`${change1d.startsWith('-') ? 'text-[#f85149]' : 'text-[#3fb950]'} font-inter text-base`}
								>{`(${change1d}%)`}</span>
							</span>
						</p>
						<p className="flex items-center flex-wrap justify-between gap-2 mt-3 mb-1">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
							<span className="flex items-center flex-nowrap gap-1 font-jetbrains">
								<span>{`$${change30d_nol}`}</span>
								<span
									className={`${change30d.startsWith('-') ? 'text-[#f85149]' : 'text-[#3fb950]'} font-inter text-base`}
								>{`(${change30d}%)`}</span>
							</span>
						</p>
					</details>

					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">{topChain.name} Dominance</span>
						<span className="font-semibold text-2xl font-jetbrains">{dominance}%</span>
					</p>

					<CSVDownloadButton onClick={downloadCsv} className="mt-auto mr-auto" />
				</div>
				<div className="flex flex-col col-span-1 min-h-[406px] bg-[var(--cards-bg)] rounded-md">
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
					{chartType === 'Total Market Cap' && (
						<AreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={totalMcapLabel}
							color={'lightcoral'}
							hideDefaultLegend={true}
							valueSymbol="$"
							hideGradient={true}
						/>
					)}
					{chartType === 'Chain Market Caps' && (
						<AreaChart
							title=""
							chartData={peggedAreaChartData}
							stacks={chainList}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
						/>
					)}
					{chartType === 'Dominance' && (
						<AreaChart
							title=""
							valueSymbol="%"
							chartData={dataWithExtraPeggedAndDominanceByDay}
							stacks={chainList}
							hideDefaultLegend={true}
							hideGradient={true}
							expandTo100Percent={true}
						/>
					)}
					{chartType === 'Pie' && <PieChart chartData={chainsCirculatingValues} />}
				</div>
			</div>

			<div className="flex flex-col gap-1 bg-[var(--cards-bg)] rounded-md p-3">
				<h2 className="font-semibold text-sm">Filters</h2>
				<GroupStablecoins label="Filters" />
			</div>

			<PeggedChainsTable data={groupedChains} />
		</>
	)
}

export default PeggedChainsOverview
