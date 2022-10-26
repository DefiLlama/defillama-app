import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BRIDGES_SHOWING_TXS, useBridgesManager } from '~/contexts/LocalStorage'
import {
	BreakpointPanel,
	BreakpointPanels,
	ChartAndValuesWrapper,
	PanelHiddenMobile,
	DownloadButton,
	DownloadIcon
} from '~/components'
import { Header } from '~/Theme'
import { PeggedChainResponsivePie } from '~/components/Charts'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import type { IBarChartProps } from '~/components/ECharts/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearchWithBreakdown } from '../Search/Bridges'
import { ChartSelector } from '~/components/BridgesPage/.'
import { BridgesTable } from '~/components/Table'
import { LargeTxsTable } from './LargeTxsTable'
import { TxsTableSwitch } from '../BridgesPage/TableSwitch'
import { useBuildBridgeChartData } from '~/utils/bridges'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import { getRandomColor, formattedNum, getPrevVolumeFromChart, download, toNiceCsvDate } from '~/utils'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

function BridgesOverview({
	selectedChain = 'All',
	chains = [],
	filteredBridges,
	bridgeNames,
	bridgeNameToChartDataIndex,
	chartDataByBridge,
	chainVolumeData,
	bridgeStatsCurrentDay,
	largeTxsData
}) {
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [chartType, setChartType] = useState(selectedChain === 'All' ? 'Volumes' : 'Net Flow')

	const chartTypeList =
		selectedChain === 'All' ? ['Volumes'] : ['Net Flow', 'Inflows', '24h Tokens Deposited', '24h Tokens Withdrawn']

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const [bridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	const handleRouting = (selectedChain) => {
		if (selectedChain === 'All') return `/bridges`
		return `/bridges/${selectedChain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

	const chartData = React.useMemo(() => {
		if (enableBreakdownChart) {
			let unformattedChartData = {}
			bridgeNames.map((name) => {
				const chartDataIndex = bridgeNameToChartDataIndex[name]
				const charts = chartDataByBridge[chartDataIndex]
				charts.map((chart) => {
					const date = chart.date
					const volume = chart.volume
					unformattedChartData[date] = unformattedChartData[date] || {}
					unformattedChartData[date][name] = volume
				})
			})
			const chartDates = Object.keys(unformattedChartData)
			return bridgeNames
				.map((name) => {
					return {
						name: name,
						data: chartDates.map((date) => [new Date(parseInt(date) * 1000), unformattedChartData[date][name] ?? 0])
					}
				})
				.filter((chart) => chart.data.length !== 0)
		} else return chainVolumeData.map((chart) => [new Date(chart.date * 1000 + 3600 * 12 * 1000), chart.volume]) // added 12 hours so date will match charts that use unix timestamp
	}, [bridgeNames, bridgeNameToChartDataIndex, chartDataByBridge, chainVolumeData, enableBreakdownChart])

	const { tokenDeposits, tokenWithdrawals } = useBuildBridgeChartData(bridgeStatsCurrentDay)

	const chainNetFlowData = React.useMemo(() => {
		return chainVolumeData.map((entry) => {
			return {
				date: entry.date,
				'Net Flow': entry.Deposits + entry.Withdrawals
			}
		})
	}, [chainVolumeData])

	const downloadCsv = () => {
		const filteredBridgeNames = bridgeNames.filter((bridgeName) => {
			const chartDataIndex = bridgeNameToChartDataIndex[bridgeName]
			const charts = chartDataByBridge[chartDataIndex]
			return charts.length
		})
		const rows = [['Timestamp', 'Date', ...filteredBridgeNames, 'Total']]
		let stackedDatasetObject = {} as any
		filteredBridgeNames.map((bridgeName) => {
			const chartDataIndex = bridgeNameToChartDataIndex[bridgeName]
			const charts = chartDataByBridge[chartDataIndex]
			charts.map((chart) => {
				const date = chart.date
				stackedDatasetObject[date] = stackedDatasetObject[date] || {}
				stackedDatasetObject[date][bridgeName] = chart.volume
			})
		})
		const stackedData = Object.entries(stackedDatasetObject).map((data: [string, object]) => {
			return { date: parseInt(data[0]), ...data[1] }
		})
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...filteredBridgeNames.map((chain) => day[chain] ?? ''),
					filteredBridgeNames.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('bridge-volumes.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	const tokenColor = useMemo(
		() =>
			Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token) => {
					return typeof token === 'string' ? ['-', getRandomColor()] : [token.name, getRandomColor()]
				})
			),
		[tokenDeposits, tokenWithdrawals]
	)

	const { dayTotalVolume, weekTotalVolume, monthTotalVolume } = useMemo(() => {
		let dayTotalVolume, weekTotalVolume, monthTotalVolume
		dayTotalVolume = weekTotalVolume = monthTotalVolume = 0
		for (let i = 0; i < 30; i++) {
			const dailyVolume = getPrevVolumeFromChart(chainVolumeData, i, false, selectedChain !== 'All')
			if (i < 1) {
				dayTotalVolume += dailyVolume
			}
			if (i < 7) {
				weekTotalVolume += dailyVolume
			}
			monthTotalVolume += dailyVolume
		}
		return { dayTotalVolume, weekTotalVolume, monthTotalVolume }
	}, [chainVolumeData, selectedChain])

	return (
		<>
			<BridgesSearchWithBreakdown
				step={{
					category: 'Bridges',
					name: selectedChain
				}}
				onToggleClick={(enabled) => setEnableBreakdownChart(enabled)}
			/>

			<HeaderWrapper>
				<span>Bridge Volume in {selectedChain === 'All' ? 'all bridges' : selectedChain}</span>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total volume (24h)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							{formattedNum(dayTotalVolume, true)}
						</p>
						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadIcon />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h1>Total volume (7d)</h1>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
							{formattedNum(weekTotalVolume, true)}
						</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h1>Total volume (1m)</h1>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
							{formattedNum(monthTotalVolume, true)}
						</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
					{chartType === 'Net Flow' && chainNetFlowData && chainNetFlowData.length > 0 && (
						<BarChart
							chartData={chainNetFlowData}
							title=""
							hidedefaultlegend={true}
							customLegendName="Volume"
							customLegendOptions={['Net Flow']}
						/>
					)}
					{chartType === 'Inflows' && chainVolumeData && chainVolumeData.length > 0 && (
						<BarChart
							chartData={chainVolumeData}
							title=""
							hidedefaultlegend={true}
							customLegendName="Volume"
							customLegendOptions={['Deposits', 'Withdrawals']}
							key={['Deposits', 'Withdrawals'] as any} // escape hatch to rerender state in legend options
							chartOptions={volumeChartOptions}
						/>
					)}
					{chartType === 'Volumes' && chartData && chartData.length > 0 && (
						<StackedBarChart
							chartData={
								enableBreakdownChart
									? (chartData as IStackedBarChartProps['chartData'])
									: [
											{
												name: selectedChain,
												data: chartData as IStackedBarChartProps['chartData'][0]['data']
											}
									  ]
							}
						/>
					)}
					{chartType === '24h Tokens Deposited' && (
						<PeggedChainResponsivePie data={tokenWithdrawals} chainColor={tokenColor} aspect={aspect} />
					)}
					{chartType === '24h Tokens Withdrawn' && (
						<PeggedChainResponsivePie data={tokenDeposits} chainColor={tokenColor} aspect={aspect} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<TxsTableSwitch />

			<RowLinksWrapper>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			</RowLinksWrapper>

			{isBridgesShowingTxs && <LargeTxsTable data={largeTxsData} />}
			{!isBridgesShowingTxs && <BridgesTable data={filteredBridges} />}
		</>
	)
}

const volumeChartOptions = {
	overrides: {
		inflow: true
	}
}

export default BridgesOverview
