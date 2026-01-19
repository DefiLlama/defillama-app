import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BridgeVolumeChart } from '~/components/Charts/BridgeVolumeChart'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { BridgesTable } from '~/components/Table/Bridges'
import { ChartSelector } from '~/containers/Bridges/ChartSelector'
import { LargeTxsTable } from '~/containers/Bridges/LargeTxsTable'
import { useBuildBridgeChartData } from '~/containers/Bridges/utils'
import { formattedNum, getPrevVolumeFromChart, toNiceCsvDate } from '~/utils'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const NetflowChart = React.lazy(() => import('~/components/ECharts/BarChart/NetflowChart')) as React.FC<any>

const NET_FLOW_LEGEND_OPTIONS: string[] = ['Net Flow']
const INFLOWS_OUTFLOWS_LEGEND_OPTIONS: string[] = ['Inflows', 'Outflows']
const INFLOWS_OUTFLOWS_STACKS = { Inflows: 'stackA', Outflows: 'stackA' }
const BRIDGE_CHAIN_CHART_OPTIONS = [
	'Bridge Volume',
	'Net Flow',
	'Net Flow (%)',
	'Inflows',
	'24h Tokens Deposited',
	'24h Tokens Withdrawn'
]
const EMPTY_CHAINS: string[] = []
const EMPTY_PROTOCOLS: any[] = []

export function BridgesOverviewByChain({
	selectedChain = 'All',
	chains = EMPTY_CHAINS,
	filteredBridges,
	messagingProtocols = EMPTY_PROTOCOLS,
	bridgeNames: _bridgeNames,
	bridgeNameToChartDataIndex,
	chartDataByBridge,
	chainVolumeData,
	bridgeStatsCurrentDay,
	largeTxsData
}) {
	const [chartType, setChartType] = React.useState(selectedChain === 'All' ? 'Volumes' : 'Bridge Volume')
	const [chartView, setChartView] = React.useState<'default' | 'netflow' | 'volume'>('netflow')
	const [activeTab, setActiveTab] = React.useState<'bridges' | 'messaging' | 'largeTxs'>('bridges')
	const [searchValue, setSearchValue] = React.useState('')

	const handleRouting = (selectedChain) => {
		if (selectedChain === 'All') return `/bridges`
		return `/bridges/${selectedChain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

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

	const prepareCsv = React.useCallback(() => {
		const resolvedFilteredBridges = filteredBridges ?? EMPTY_PROTOCOLS
		const resolvedMessagingProtocols = messagingProtocols ?? EMPTY_PROTOCOLS
		const allBridges = [...resolvedFilteredBridges, ...resolvedMessagingProtocols]
		const allBridgeNames = allBridges.map((bridge) => bridge.displayName)

		const filteredBridgeNames = allBridgeNames.filter((bridgeName) => {
			const chartDataIndex = bridgeNameToChartDataIndex[bridgeName]
			const charts = chartDataByBridge[chartDataIndex]
			return charts && charts.length
		})

		const fileName = 'bridge-and-messaging-volumes.csv'
		const rows = [['Timestamp', 'Date', ...filteredBridgeNames, 'Total']]
		let stackedDatasetObject = {} as any
		for (const bridgeName of filteredBridgeNames) {
			const chartDataIndex = bridgeNameToChartDataIndex[bridgeName]
			const charts = chartDataByBridge[chartDataIndex]
			for (const chart of charts) {
				const date = chart.date
				stackedDatasetObject[date] = stackedDatasetObject[date] || {}
				stackedDatasetObject[date][bridgeName] = chart.volume
			}
		}
		const stackedData = Object.entries(stackedDatasetObject).map((data: [string, object]) => {
			return { date: parseInt(data[0]), ...data[1] }
		})
		const sortedStackedData = stackedData.sort((a, b) => a.date - b.date)
		for (const day of sortedStackedData) {
			rows.push([
				day.date,
				toNiceCsvDate(day.date),
				...filteredBridgeNames.map((chain) => day[chain] ?? ''),
				filteredBridgeNames.reduce((acc, curr) => {
					return (acc += day[curr] ?? 0)
				}, 0)
			])
		}

		return { filename: fileName, rows }
	}, [filteredBridges, messagingProtocols, bridgeNameToChartDataIndex, chartDataByBridge])

	const prepareChartCsv = React.useCallback(() => {
		type CsvConfig = {
			filename: string
			headers: string[]
			getData: () => Array<(string | number)[]>
		}

		const getChartCsvConfig = (): CsvConfig => {
			// Handle "All chains" volume view
			if (selectedChain === 'All' && chartView === 'volume') {
				return {
					filename: 'bridge-volume-data.csv',
					headers: ['Timestamp', 'Date', 'Volume'],
					getData: () => chainVolumeData.map((entry) => [entry.date, toNiceCsvDate(entry.date), entry.volume])
				}
			}

			// Handle specific chart types
			switch (chartType) {
				case 'Bridge Volume':
					return {
						filename: `${selectedChain}-bridge-volume.csv`,
						headers: ['Timestamp', 'Date', 'Volume'],
						getData: () => chainVolumeData.map((entry) => [entry.date, toNiceCsvDate(entry.date), entry.volume])
					}
				case 'Net Flow':
					return {
						filename: `${selectedChain}-netflow.csv`,
						headers: ['Timestamp', 'Date', 'Net Flow'],
						getData: () => chainNetFlowData.map((entry) => [entry.date, toNiceCsvDate(entry.date), entry['Net Flow']])
					}
				case 'Net Flow (%)':
					return {
						filename: `${selectedChain}-netflow-percentage.csv`,
						headers: ['Timestamp', 'Date', 'Inflows (%)', 'Outflows (%)'],
						getData: () =>
							chainPercentageNet.map((entry) => [entry.date, toNiceCsvDate(entry.date), entry.Inflows, entry.Outflows])
					}
				case '24h Tokens Deposited':
					return {
						filename: `${selectedChain}-tokens-deposited.csv`,
						headers: ['Token', 'Amount'],
						getData: () => tokenDeposits.map((entry) => [entry.name, entry.value])
					}
				case '24h Tokens Withdrawn':
					return {
						filename: `${selectedChain}-tokens-withdrawn.csv`,
						headers: ['Token', 'Amount'],
						getData: () => tokenWithdrawals.map((entry) => [entry.name, entry.value])
					}
				case 'Inflows':
					return {
						filename: `${selectedChain}-inflows.csv`,
						headers: ['Timestamp', 'Date', 'Volume'],
						getData: () => chainVolumeData.map((entry) => [entry.date, toNiceCsvDate(entry.date), entry.volume])
					}
				default:
					return {
						filename: 'bridge-chart-data.csv',
						headers: [],
						getData: () => []
					}
			}
		}

		const config = getChartCsvConfig()
		return {
			filename: config.filename,
			rows: config.headers.length > 0 ? [config.headers, ...config.getData()] : []
		}
	}, [
		selectedChain,
		chartView,
		chartType,
		chainVolumeData,
		chainNetFlowData,
		chainPercentageNet,
		tokenDeposits,
		tokenWithdrawals
	])

	const { dayTotalVolume, weekTotalVolume, monthTotalVolume } = React.useMemo(() => {
		let dayTotalVolume, weekTotalVolume, monthTotalVolume
		dayTotalVolume = weekTotalVolume = monthTotalVolume = 0

		const bridgesToCalculate = activeTab === 'bridges' ? filteredBridges : messagingProtocols

		if (bridgesToCalculate) {
			for (const bridge of bridgesToCalculate ?? []) {
				dayTotalVolume += Number(bridge?.lastDailyVolume) || 0
				weekTotalVolume += Number(bridge?.weeklyVolume) || 0
				monthTotalVolume += Number(bridge?.monthlyVolume) || 0
			}
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
			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex flex-col">
						<span className="text-(--text-label)">Total volume (24h)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(dayTotalVolume, true)}</span>
					</h1>
					<p className="hidden flex-col md:flex">
						<span className="text-(--text-label)">Total volume (7d)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(weekTotalVolume, true)}</span>
					</p>
					<p className="hidden flex-col md:flex">
						<span className="text-(--text-label)">Total volume (1mo)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(monthTotalVolume, true)}</span>
					</p>

					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mt-auto mr-auto" />
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{selectedChain === 'All' ? (
						<>
							<div className="flex items-center">
								<button
									className="flex flex-1 items-center justify-center border-b-2 border-(--link-bg) p-3 text-xs font-medium hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue) data-[active=true]:bg-(--link-bg)"
									data-active={chartView === 'netflow'}
									onClick={() => setChartView('netflow')}
								>
									Net Flows By Chain
								</button>

								<button
									className="flex flex-1 items-center justify-center border-b-2 border-(--link-bg) p-3 text-xs font-medium hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue) data-[active=true]:bg-(--link-bg)"
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
							<div className="flex items-center justify-between overflow-x-auto p-3">
								<ChartSelector
									options={BRIDGE_CHAIN_CHART_OPTIONS}
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
										customLegendOptions={NET_FLOW_LEGEND_OPTIONS}
									/>
								</React.Suspense>
							)}
							{chartType === 'Net Flow (%)' && chainPercentageNet && chainPercentageNet.length > 0 && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<BarChart
										chartData={chainPercentageNet}
										title=""
										valueSymbol="%"
										stacks={INFLOWS_OUTFLOWS_STACKS}
										hideDefaultLegend={true}
										customLegendName="Volume"
										customLegendOptions={INFLOWS_OUTFLOWS_LEGEND_OPTIONS}
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
									<PieChart chartData={tokenDeposits} />
								</React.Suspense>
							)}
							{chartType === '24h Tokens Withdrawn' && (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart chartData={tokenWithdrawals} />
								</React.Suspense>
							)}
						</>
					)}
					<div className="flex items-center justify-end p-3">
						<CSVDownloadButton prepareCsv={prepareChartCsv} smol />
					</div>
				</div>
			</div>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex w-full flex-wrap items-center justify-between gap-3 p-3">
					<div className="flex items-center overflow-x-auto">
						<button
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							data-active={activeTab === 'bridges'}
							onClick={() => setActiveTab('bridges')}
						>
							Bridges
						</button>
						<button
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							data-active={activeTab === 'messaging'}
							onClick={() => setActiveTab('messaging')}
						>
							Messaging Protocols
						</button>
						<button
							className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
							data-active={activeTab === 'largeTxs'}
							onClick={() => setActiveTab('largeTxs')}
						>
							Large Txs
						</button>
					</div>

					<label className="relative w-full max-w-full sm:max-w-[280px]">
						<span className="sr-only">Search bridges</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							placeholder="Search..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
				</div>

				{activeTab === 'largeTxs' ? (
					<LargeTxsTable data={largeTxsData} chain={selectedChain} />
				) : (
					<BridgesTable
						data={activeTab === 'bridges' ? filteredBridges : messagingProtocols}
						searchValue={searchValue}
						onSearchChange={setSearchValue}
					/>
				)}
			</div>
		</>
	)
}
