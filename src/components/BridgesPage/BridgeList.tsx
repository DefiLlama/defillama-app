import * as React from 'react'

import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BRIDGES_SHOWING_TXS, useBridgesManager } from '~/contexts/LocalStorage'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { Header } from '~/Theme'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearchWithBreakdown } from '../Search/Bridges'
import { ChartSelector } from '~/components/BridgesPage/.'
import { BridgesTable } from '~/components/Table'
import { LargeTxsTable } from './LargeTxsTable'
import { TxsTableSwitch } from '../BridgesPage/TableSwitch'
import { useBuildBridgeChartData } from '~/utils/bridges'
import { formattedNum, getPrevVolumeFromChart, download, toNiceCsvDate } from '~/utils'
import CSVDownloadButton from '../ButtonStyled/CsvButton'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

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
	const [chartType, setChartType] = React.useState(selectedChain === 'All' ? 'Volumes' : 'Net Flow')

	const chartTypeList =
		selectedChain === 'All'
			? ['Volumes']
			: ['Net Flow', 'Net Flow (%)', 'Inflows', '24h Tokens Deposited', '24h Tokens Withdrawn']

	const [bridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	const handleRouting = (selectedChain) => {
		if (selectedChain === 'All') return `/bridges`
		return `/bridges/${selectedChain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

	const chartData = React.useMemo(() => {
		const secondsOffset = 3600 * 12 * 1000 // added 12 hours so date will match charts that use unix timestamp
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
						data: chartDates.map((date) => [
							new Date(parseInt(date) * 1000 + secondsOffset),
							unformattedChartData[date][name] ?? 0
						])
					}
				})
				.filter((chart) => chart.data.length !== 0)
		} else return chainVolumeData.map((chart) => [new Date(chart.date * 1000 + secondsOffset), chart.volume])
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

	const chainPercentageNet = React.useMemo(() => {
		return chainVolumeData.map((entry) => {
			return {
				date: entry.date,
				Inflows: (+entry.Deposits / (entry.Deposits + Math.abs(entry.Withdrawals))) * 100 || 0,
				Outflows: (Math.abs(entry.Withdrawals) / (entry.Deposits + Math.abs(entry.Withdrawals))) * 100 || 0
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

	const { dayTotalVolume, weekTotalVolume, monthTotalVolume } = React.useMemo(() => {
		let dayTotalVolume, weekTotalVolume, monthTotalVolume
		dayTotalVolume = weekTotalVolume = monthTotalVolume = 0
		// start from i = 1 to exclude current day

		if (filteredBridges) {
			filteredBridges?.forEach((bridge) => {
				dayTotalVolume += Number(bridge?.lastDailyVolume) || 0
				weekTotalVolume += Number(bridge?.weeklyVolume) || 0
				monthTotalVolume += Number(bridge?.monthlyVolume) || 0
			})
		} else {
			for (let i = 1; i < 31; i++) {
				const dailyVolume = getPrevVolumeFromChart(chainVolumeData, i, false, selectedChain !== 'All')
				if (i < 2) {
					dayTotalVolume += dailyVolume
				}
				if (i < 8) {
					weekTotalVolume += dailyVolume
				}
				monthTotalVolume += dailyVolume
			}
		}
		return { dayTotalVolume, weekTotalVolume, monthTotalVolume }
	}, [chainVolumeData, selectedChain, filteredBridges])

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
				<CSVDownloadButton onClick={downloadCsv} />
			</HeaderWrapper>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total volume (24h)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							{formattedNum(dayTotalVolume, true)}
						</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h1>Total volume (7d)</h1>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
							{formattedNum(weekTotalVolume, true)}
						</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h1>Total volume (1mo)</h1>
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
							hideDefaultLegend={true}
							customLegendName="Volume"
							customLegendOptions={['Net Flow']}
						/>
					)}
					{chartType === 'Net Flow (%)' && chainPercentageNet && chainPercentageNet.length > 0 && (
						<BarChart
							chartData={chainPercentageNet}
							title=""
							valueSymbol="%"
							stacks={{ Inflows: 'stackA', Outflows: 'stackA' }}
							hideDefaultLegend={true}
							customLegendName="Volume"
							customLegendOptions={['Inflows', 'Outflows']}
						/>
					)}
					{chartType === 'Inflows' && chainVolumeData && chainVolumeData.length > 0 && (
						<BarChart
							chartData={chainVolumeData}
							title=""
							hideDefaultLegend={true}
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
					{chartType === '24h Tokens Deposited' && <PieChart chartData={tokenWithdrawals} />}
					{chartType === '24h Tokens Withdrawn' && <PieChart chartData={tokenDeposits} />}
				</BreakpointPanel>
			</ChartAndValuesWrapper>
			<TxsTableSwitch />
			<RowLinksWrapper>
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			</RowLinksWrapper>
			{isBridgesShowingTxs && <LargeTxsTable data={largeTxsData} chain={selectedChain} />}
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
