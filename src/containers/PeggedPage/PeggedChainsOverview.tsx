import * as React from 'react'

import dynamic from 'next/dynamic'
import { GroupStablecoins } from '~/components/MultiSelect/Stablecoins'
import { PeggedSearch } from '~/components/Search/Stablecoins'
import { ChartSelector } from '~/containers/PeggedPage/.'
import { PeggedChainsTable } from '~/components/Table/Stablecoins/PeggedChain'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from '~/hooks/data/stablecoins'
import { useBuildPeggedChartData } from '~/utils/stablecoins'
import {
	formattedNum,
	getPercentChange,
	getPeggedDominance,
	getPrevPeggedTotalFromChart,
	toNiceCsvDate,
	download
} from '~/utils'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

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

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = useBuildPeggedChartData(
		peggedChartDataByChain,
		chainList,
		[...Array(chainList.length).keys()],
		'mcap'
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

	const title = `Stablecoins Market Cap`

	const { percentChange, totalMcapCurrent } = React.useMemo(() => {
		const totalMcapCurrent = getPrevPeggedTotalFromChart(chartData, 0, 'totalCirculatingUSD')
		const totalMcapPrevDay = getPrevPeggedTotalFromChart(chartData, 7, 'totalCirculatingUSD')
		const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2)
		return { percentChange, totalMcapCurrent }
	}, [chartData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topChain = { name: 'Ethereum', mcap: 0 }
	if (chainTotals.length > 0) {
		const topChainData = chainTotals[0]
		topChain.name = topChainData.name
		topChain.mcap = topChainData.mcap
	}

	const dominance = getPeggedDominance(topChain, totalMcapCurrent)

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
			<CSVDownloadButton onClick={downloadCsv} style={{ width: '150px', alignSelf: 'flex-end' }} />
			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
				<div className="flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total {title}</span>
						<span className="font-semibold text-2xl font-jetbrains">{mcapToDisplay}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Change (7d)</span>
						<span className="font-semibold text-2xl font-jetbrains">{percentChange || 0}%</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">{topChain.name} Dominance</span>
						<span className="font-semibold text-2xl font-jetbrains">{dominance}%</span>
					</p>
				</div>
				<div className="flex flex-col gap-4 py-4 col-span-1 *:ml-4 last:*:ml-0 min-h-[444px]">
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

			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-sm">Filters</h2>
				<GroupStablecoins label="Filters" />
			</div>

			<PeggedChainsTable data={groupedChains} />
		</>
	)
}

export default PeggedChainsOverview
