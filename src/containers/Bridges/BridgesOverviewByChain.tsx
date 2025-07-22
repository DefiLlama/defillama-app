import * as React from 'react'
import { BRIDGES_SHOWING_TXS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { BridgesSearchWithBreakdown } from '~/components/Search/Bridges'
import { ChartSelector } from '~/containers/Bridges/ChartSelector'
import { BridgesTable } from '~/components/Table/Bridges'
import { LargeTxsTable } from '~/containers/Bridges/LargeTxsTable'
import { TxsTableSwitch } from '~/containers/Bridges/TableSwitch'
import { useBuildBridgeChartData } from '~/containers/Bridges/utils'
import { formattedNum, getPrevVolumeFromChart, download, toNiceCsvDate } from '~/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { useEffect } from 'react'
import { BridgeVolumeChart } from '~/components/Charts/BridgeVolumeChart'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const NetflowChart = React.lazy(() => import('~/components/ECharts/BarChart/NetflowChart')) as React.FC<any>

export function BridgesOverviewByChain({
	selectedChain = 'All',
	chains = [],
	filteredBridges,
	messagingProtocols,
	bridgeNames,
	bridgeNameToChartDataIndex,
	chartDataByBridge,
	chainVolumeData,
	bridgeStatsCurrentDay,
	largeTxsData
}) {
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [chartType, setChartType] = React.useState(selectedChain === 'All' ? 'Volumes' : 'Bridge Volume')
	const [chartView, setChartView] = React.useState<'default' | 'netflow' | 'volume'>('netflow')
	const [activeTab, setActiveTab] = React.useState<'bridges' | 'messaging'>('bridges')

	useEffect(() => {
		setChartView('netflow')
	}, [])

	const [bridgesSettings] = useLocalStorageSettingsManager('bridges')
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
		const allBridges = [...(filteredBridges || []), ...(messagingProtocols || [])]
		const allBridgeNames = allBridges.map((bridge) => bridge.displayName)

		const filteredBridgeNames = allBridgeNames.filter((bridgeName) => {
			const chartDataIndex = bridgeNameToChartDataIndex[bridgeName]
			const charts = chartDataByBridge[chartDataIndex]
			return charts && charts.length
		})

		const fileName = 'bridge-and-messaging-volumes.csv'
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
		download(fileName, rows.map((r) => r.join(',')).join('\n'))
	}

	const downloadChartCsv = () => {
		let rows = []
		let fileName = 'bridge-chart-data.csv'

		if (selectedChain === 'All' && chartView === 'volume') {
			fileName = 'bridge-volume-data.csv'
			// For volume chart
			rows = [['Timestamp', 'Date', 'Volume']]
			chainVolumeData.forEach((entry) => {
				rows.push([entry.date, toNiceCsvDate(entry.date), entry.volume])
			})
		} else if (chartType === 'Bridge Volume') {
			fileName = `${selectedChain}-bridge-volume.csv`
			rows = [['Timestamp', 'Date', 'Volume']]
			chainVolumeData.forEach((entry) => {
				rows.push([entry.date, toNiceCsvDate(entry.date), entry.volume])
			})
		} else if (chartType === 'Net Flow') {
			fileName = `${selectedChain}-netflow.csv`
			rows = [['Timestamp', 'Date', 'Net Flow']]
			chainNetFlowData.forEach((entry) => {
				rows.push([entry.date, toNiceCsvDate(entry.date), entry['Net Flow']])
			})
		} else if (chartType === 'Net Flow (%)') {
			fileName = `${selectedChain}-netflow-percentage.csv`
			rows = [['Timestamp', 'Date', 'Inflows (%)', 'Outflows (%)']]
			chainPercentageNet.forEach((entry) => {
				rows.push([entry.date, toNiceCsvDate(entry.date), entry.Inflows, entry.Outflows])
			})
		} else if (chartType === '24h Tokens Deposited') {
			fileName = `${selectedChain}-tokens-deposited.csv`
			rows = [['Token', 'Amount']]
			tokenDeposits.forEach((entry) => {
				rows.push([entry.name, entry.value])
			})
		} else if (chartType === '24h Tokens Withdrawn') {
			fileName = `${selectedChain}-tokens-withdrawn.csv`
			rows = [['Token', 'Amount']]
			tokenWithdrawals.forEach((entry) => {
				rows.push([entry.name, entry.value])
			})
		}

		if (rows.length === 0) {
			alert('Not supported for this chart type')
		} else {
			download(fileName, rows.map((r) => r.join(',')).join('\n'))
		}
	}

	const { dayTotalVolume, weekTotalVolume, monthTotalVolume } = React.useMemo(() => {
		let dayTotalVolume, weekTotalVolume, monthTotalVolume
		dayTotalVolume = weekTotalVolume = monthTotalVolume = 0

		const bridgesToCalculate = activeTab === 'bridges' ? filteredBridges : messagingProtocols

		if (bridgesToCalculate) {
			bridgesToCalculate?.forEach((bridge) => {
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
	}, [chainVolumeData, selectedChain, filteredBridges, messagingProtocols, activeTab])

	return (
		<>
			<BridgesSearchWithBreakdown onToggleClick={(enabled) => setEnableBreakdownChart(enabled)} />

			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (24h)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(dayTotalVolume, true)}</span>
					</h1>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (7d)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(weekTotalVolume, true)}</span>
					</p>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total volume (1mo)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(monthTotalVolume, true)}</span>
					</p>

					<CSVDownloadButton onClick={downloadCsv} className="mt-auto mr-auto" />
				</div>
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2">
					{selectedChain === 'All' ? (
						<>
							<div className="flex items-center">
								<button
									className="flex-1 flex items-center justify-center p-3 text-xs font-medium border-b-2 border-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-bg) data-[active=true]:border-(--old-blue)"
									data-active={chartView === 'netflow'}
									onClick={() => setChartView('netflow')}
								>
									Net Flows By Chain
								</button>

								<button
									className="flex-1 flex items-center justify-center p-3 text-xs font-medium border-b-2 border-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--link-bg) data-[active=true]:border-(--old-blue)"
									onClick={() => setChartView('volume')}
									data-active={chartView === 'volume'}
								>
									Bridge Volume
								</button>
							</div>

							{chartView === 'netflow' ? (
								<React.Suspense fallback={<div className="min-h-[600px]" />}>
									<NetflowChart height={600} />
								</React.Suspense>
							) : (
								<BridgeVolumeChart chain={selectedChain === 'All' ? 'all' : selectedChain} height="360px" />
							)}
						</>
					) : (
						<>
							<div className="flex items-center justify-between p-3 overflow-x-auto">
								<ChartSelector
									options={[
										'Bridge Volume',
										'Net Flow',
										'Net Flow (%)',
										'Inflows',
										'24h Tokens Deposited',
										'24h Tokens Withdrawn'
									]}
									selectedChart={chartType}
									onClick={setChartType}
								/>
							</div>
							{chartType === 'Bridge Volume' && (
								<BridgeVolumeChart chain={selectedChain === 'All' ? 'all' : selectedChain} height="360px" />
							)}
							{chartType === 'Net Flow' && chainNetFlowData && chainNetFlowData.length > 0 && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<BarChart
										chartData={chainNetFlowData}
										title=""
										hideDefaultLegend={true}
										customLegendName="Volume"
										customLegendOptions={['Net Flow']}
									/>
								</React.Suspense>
							)}
							{chartType === 'Net Flow (%)' && chainPercentageNet && chainPercentageNet.length > 0 && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<BarChart
										chartData={chainPercentageNet}
										title=""
										valueSymbol="%"
										stacks={{ Inflows: 'stackA', Outflows: 'stackA' }}
										hideDefaultLegend={true}
										customLegendName="Volume"
										customLegendOptions={['Inflows', 'Outflows']}
									/>
								</React.Suspense>
							)}
							{chartType === 'Inflows' && (
								<BridgeVolumeChart chain={selectedChain === 'All' ? 'all' : selectedChain} height="360px" />
							)}
							{chartType === 'Net Flow By Chain' && (
								<React.Suspense fallback={<div className="min-h-[600px]" />}>
									<NetflowChart height="600px" />
								</React.Suspense>
							)}
							{chartType === '24h Tokens Deposited' && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart chartData={tokenWithdrawals} />
								</React.Suspense>
							)}
							{chartType === '24h Tokens Withdrawn' && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart chartData={tokenDeposits} />
								</React.Suspense>
							)}
						</>
					)}
					<div className="flex items-center justify-end p-3">
						<CSVDownloadButton onClick={downloadChartCsv} customText="Download chart .csv" />
					</div>
				</div>
			</div>

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<div className="flex items-center justify-between p-3">
					<div className="flex items-center">
						<button
							className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue)"
							data-active={activeTab === 'bridges'}
							onClick={() => setActiveTab('bridges')}
						>
							Bridges
						</button>
						<button
							className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue)"
							data-active={activeTab === 'messaging'}
							onClick={() => setActiveTab('messaging')}
						>
							Messaging Protocols
						</button>
					</div>
					<div className="ml-auto">
						<TxsTableSwitch />
					</div>
				</div>

				{isBridgesShowingTxs ? (
					<LargeTxsTable data={largeTxsData} chain={selectedChain} />
				) : (
					<BridgesTable data={activeTab === 'bridges' ? filteredBridges : messagingProtocols} />
				)}
			</div>
		</>
	)
}

const volumeChartOptions = {
	overrides: {
		inflow: true
	}
}
