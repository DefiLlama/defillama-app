import * as React from 'react'
import dynamic from 'next/dynamic'
import { BRIDGES_SHOWING_TXS, useBridgesManager } from '~/contexts/LocalStorage'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearchWithBreakdown } from '~/components/Search/Bridges'
import { ChartSelector } from '~/containers/BridgesPage'
import { BridgesTable } from '~/components/Table/Bridges'
import { LargeTxsTable } from './LargeTxsTable'
import { TxsTableSwitch } from '~/containers/BridgesPage/TableSwitch'
import { useBuildBridgeChartData } from '~/utils/bridges'
import { formattedNum, getPrevVolumeFromChart, download, toNiceCsvDate } from '~/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useEffect } from 'react'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const NetflowChart = dynamic(() => import('~/components/ECharts/BarChart/NetflowChart'), {
	ssr: false
}) as React.FC<any>

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
	const [chartView, setChartView] = React.useState<'default' | 'netflow'>('default')

	useEffect(() => {
		setChartView('netflow')
	}, [])

	const chartTypeList =
		selectedChain === 'All'
			? ['Volumes', 'Net Flow By Chain']
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
			<BridgesSearchWithBreakdown onToggleClick={(enabled) => setEnableBreakdownChart(enabled)} />
			<h1 className="text-2xl font-medium mb-2 flex items-center justify-between flex-wrap gap-4">
				<span>Bridge Volume in {selectedChain === 'All' ? 'all bridges' : selectedChain}</span>
				<CSVDownloadButton onClick={downloadCsv} />
			</h1>
			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
				<div className="flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (24h)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(dayTotalVolume, true)}</span>
					</p>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (7d)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(weekTotalVolume, true)}</span>
					</p>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (1mo)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(monthTotalVolume, true)}</span>
					</p>
				</div>
				<div className="flex flex-col gap-4 py-4 col-span-1 *:ml-4 last:*:ml-0 min-h-[444px]">
					{selectedChain === 'All' ? (
						<>
							<div className="flex items-center gap-2 p-2 rounded-lg">
								<button
									className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
										chartView === 'netflow'
											? 'bg-blue-500 text-white shadow-lg hover:opacity-90 ring-blue-500 ring-offset-2 '
											: 'bg-[var(--bg7)] text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)] border border-[var(--divider)]'
									}`}
									onClick={() => setChartView('netflow')}
								>
									Net Flows By Chain
								</button>
								<button
									className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
										chartView === 'default'
											? 'bg-blue-500 text-white shadow-lg hover:opacity-90 ring-blue-500 ring-offset-2 '
											: 'bg-[var(--bg7)] text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)] border border-[var(--divider)]'
									}`}
									onClick={() => setChartView('default')}
								>
									Volume Chart
								</button>
							</div>

							{chartView === 'default' ? (
								<>
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
								</>
							) : (
								<div className="relative shadow rounded-xl">
									<div className="p-4">
										<NetflowChart height="600px" />
									</div>
								</div>
							)}
						</>
					) : (
						<>
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
							{chartType === 'Net Flow By Chain' && (
								<div className="grid grid-cols-1 relative isolate shadow rounded-xl mb-4">
									<div className="p-4">
										<NetflowChart height="600px" />
									</div>
								</div>
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
						</>
					)}
				</div>
			</div>
			<TxsTableSwitch />
			<nav className="flex items-center gap-5 overflow-hidden -mb-5">
				<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			</nav>
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
