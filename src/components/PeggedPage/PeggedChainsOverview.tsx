import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, DownloadButton, DownloadIcon } from '~/components'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from '~/components/Charts'
import { AreaChart } from '~/components/Charts'
import { GroupStablecoins } from '~/components/MultiSelect'
import { PeggedSearch } from '~/components/Search'
import { ChartSelector } from '~/components/PeggedPage/.'
import { PeggedChainsTable } from '~/components/Table'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from '~/hooks/data/stablecoins'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import { useBuildPeggedChartData } from '~/utils/stablecoins'
import {
	getRandomColor,
	formattedNum,
	getPercentChange,
	getPeggedDominance,
	getPrevPeggedTotalFromChart,
	toNiceMonthlyDate,
	toNiceCsvDate,
	download
} from '~/utils'
import type { IChartProps } from '~/components/ECharts/types'

const PeggedAreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const AssetFilters = styled.div`
	margin: 12px 0 16px;

	& > h2 {
		margin: 0 2px 8px;
		font-weight: 600;
		font-size: 0.825rem;
		color: ${({ theme }) => theme.text1};
	}
`

// const ChartFilters = styled.div`
// 	display: flex;
// 	flex-wrap: wrap;
// 	align-items: center;
// 	justify-content: start;
// 	gap: 20px;
// 	margin: 0 0 -18px;
// `

function PeggedChainsOverview({
	chainCirculatings,
	chartData,
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent,
	chainTVLData
}) {
	const [chartType, setChartType] = useState('Pie')
	const chartTypeList = ['Total Market Cap', 'Chain Market Caps', 'Pie', 'Dominance']

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = useBuildPeggedChartData(
		peggedChartDataByChain,
		chainList,
		[...Array(chainList.length).keys()],
		'mcap',
		chainTVLData
	)

	const filteredPeggedAssets = chainCirculatings
	const chainTotals = useCalcCirculating(filteredPeggedAssets)

	const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

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

	const { percentChange, totalMcapCurrent } = useMemo(() => {
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

	const chainsCirculatingValues = useMemo(() => {
		const data = groupedChains.map((chain) => ({ name: chain.name, value: chain.mcap }))

		const otherCirculating = data.slice(10).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		return data
			.slice(0, 10)
			.sort((a, b) => b.value - a.value)
			.concat({ name: 'Others', value: otherCirculating })
	}, [groupedChains])

	const chainColor = useMemo(
		() =>
			Object.fromEntries(
				[...chainTotals, 'Others'].map((chain) => {
					return typeof chain === 'string' ? ['-', getRandomColor()] : [chain.name, getRandomColor()]
				})
			),
		[chainTotals]
	)

	const groupedChainColor = useMemo(
		() =>
			Object.fromEntries(
				[...groupedChains, 'Others'].map((chain) => {
					return typeof chain === 'string' ? ['-', getRandomColor()] : [chain.name, getRandomColor()]
				})
			),
		[groupedChains]
	)

	return (
		<>
			<PeggedSearch step={{ category: 'Stablecoins', name: 'Chains' }} />

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total {title}</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{mcapToDisplay}</p>
						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Change (7d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {percentChange || 0}%</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>{topChain.name} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {dominance}%</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />

					{chartType === 'Total Market Cap' && (
						<PeggedAreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={totalMcapLabel}
							color={'lightcoral'}
							hidedefaultlegend={true}
							valueSymbol="$"
						/>
					)}
					{chartType === 'Chain Market Caps' && (
						<AreaChart
							aspect={aspect}
							finalChartData={peggedAreaChartData}
							tokensUnique={chainList}
							color={'blue'}
							moneySymbol="$"
							formatDate={toNiceMonthlyDate}
							hallmarks={[]}
						/>
					)}
					{chartType === 'Dominance' && (
						<PeggedChainResponsiveDominance
							stackOffset="expand"
							formatPercent={true}
							stackedDataset={stackedData}
							chainsUnique={chainList}
							chainColor={chainColor}
							daySum={daySum}
							aspect={aspect}
						/>
					)}
					{chartType === 'Pie' && (
						<PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={groupedChainColor} aspect={aspect} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<AssetFilters>
				<h2>Filters</h2>
				<GroupStablecoins label="Filters" />
			</AssetFilters>

			<PeggedChainsTable data={groupedChains} />
		</>
	)
}

export default PeggedChainsOverview
