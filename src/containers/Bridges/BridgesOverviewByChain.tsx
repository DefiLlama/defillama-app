import * as React from 'react'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { BridgesTable } from '~/components/Table/Bridges'
import { BridgeVolumeChart } from '~/containers/Bridges/BridgeVolumeChart'
import { ChartSelector } from '~/containers/Bridges/ChartSelector'
import { LargeTxsTable } from '~/containers/Bridges/LargeTxsTable'
import { useBuildBridgeChartData } from '~/containers/Bridges/utils'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useDebounce } from '~/hooks/useDebounce'
import { formattedNum, getPrevVolumeFromChart, toNiceCsvDate } from '~/utils'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const NetflowChart = React.lazy(() => import('~/components/ECharts/BarChart/NetflowChart')) as React.FC<any>

const NET_FLOW_CHARTS = [{ type: 'bar' as const, name: 'Net Flow', encode: { x: 'timestamp', y: 'Net Flow' } }]

const NET_FLOW_PCT_CHARTS = [
	{ type: 'bar' as const, name: 'Inflows', encode: { x: 'timestamp', y: 'Inflows' }, stack: 'stackA' },
	{ type: 'bar' as const, name: 'Outflows', encode: { x: 'timestamp', y: 'Outflows' }, stack: 'stackA' }
]
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

const handleRouting = (selectedChain: string) => {
	if (selectedChain === 'All') return `/bridges`
	return `/bridges/${selectedChain}`
}

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
	const debouncedSearchValue = useDebounce(searchValue, 200)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()
	const handleBridgeVolumeChartReady = React.useCallback(
		(instance) => {
			handleChartReady(instance)
			handleChartCsvReady(instance)
		},
		[handleChartReady, handleChartCsvReady]
	)

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

	const netFlowDataset = React.useMemo(
		() => ({
			source: chainNetFlowData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
			dimensions: ['timestamp', 'Net Flow']
		}),
		[chainNetFlowData]
	)

	const netFlowPctDataset = React.useMemo(
		() => ({
			source: chainPercentageNet.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
			dimensions: ['timestamp', 'Inflows', 'Outflows']
		}),
		[chainPercentageNet]
	)

	const prepareCsv = () => {
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
	}

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
							<div className="flex items-center justify-end gap-2 border-b border-(--cards-border) *:last:mr-2">
								<div className="mr-auto flex items-center">
									<button
										className="flex items-center justify-center border-b-2 border-transparent px-4 py-2.5 text-xs font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue) data-[active=true]:text-(--old-blue)"
										data-active={chartView === 'netflow'}
										onClick={() => setChartView('netflow')}
									>
										Net Flows By Chain
									</button>

									<button
										className="flex items-center justify-center border-b-2 border-transparent px-4 py-2.5 text-xs font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-(--old-blue) data-[active=true]:text-(--old-blue)"
										onClick={() => setChartView('volume')}
										data-active={chartView === 'volume'}
									>
										Bridge Volume
									</button>
								</div>

								<ChartCsvExportButton
									chartInstance={exportChartCsvInstance}
									filename={chartView === 'volume' ? 'bridge-volume' : 'bridge-netflow-by-chain'}
								/>
								{chartView === 'volume' ? (
									<ChartExportButton
										chartInstance={exportChartInstance}
										filename="bridge-volume"
										title="Bridge Volume"
									/>
								) : (
									<ChartExportButton
										chartInstance={exportChartInstance}
										filename="bridge-netflow-by-chain"
										title="Net Flows By Chain"
									/>
								)}
							</div>

							{chartView === 'netflow' ? (
								<React.Suspense fallback={<div className="min-h-[600px]" />}>
									<NetflowChart height={600} onReady={handleBridgeVolumeChartReady} />
								</React.Suspense>
							) : (
								<BridgeVolumeChart
									chain={selectedChain === 'All' ? 'all' : selectedChain}
									height="360px"
									onReady={handleBridgeVolumeChartReady}
								/>
							)}
						</>
					) : (
						<>
							<div className="flex flex-wrap items-center justify-end gap-2 p-2">
								<ChartSelector options={BRIDGE_CHAIN_CHART_OPTIONS} selectedChart={chartType} onClick={setChartType} />
								<ChartCsvExportButton
									chartInstance={exportChartCsvInstance}
									filename={`${selectedChain}-${
										chartType === '24h Tokens Deposited'
											? 'tokens-deposited'
											: chartType === '24h Tokens Withdrawn'
												? 'tokens-withdrawn'
												: chartType === 'Net Flow'
													? 'netflow'
													: chartType === 'Net Flow (%)'
														? 'netflow-pct'
														: chartType === 'Inflows'
															? 'inflows'
															: 'bridge-volume'
									}`}
								/>
								<ChartExportButton
									chartInstance={exportChartInstance}
									filename={`${selectedChain}-${
										chartType === '24h Tokens Deposited'
											? 'tokens-deposited'
											: chartType === '24h Tokens Withdrawn'
												? 'tokens-withdrawn'
												: chartType === 'Net Flow'
													? 'netflow'
													: chartType === 'Net Flow (%)'
														? 'netflow-pct'
														: chartType === 'Inflows'
															? 'inflows'
															: 'bridge-volume'
									}`}
									title={`${selectedChain} ${chartType}`}
								/>
							</div>
							{chartType === 'Bridge Volume' ? (
								<BridgeVolumeChart
									chain={selectedChain === 'All' ? 'all' : selectedChain}
									height="360px"
									onReady={handleBridgeVolumeChartReady}
								/>
							) : chartType === 'Net Flow' ? (
								chainNetFlowData && chainNetFlowData.length > 0 ? (
									<React.Suspense fallback={<div className="min-h-[360px]" />}>
										<MultiSeriesChart2
											dataset={netFlowDataset}
											charts={NET_FLOW_CHARTS}
											hideDefaultLegend={true}
											valueSymbol="$"
											onReady={(instance) => {
												handleChartReady(instance)
												handleChartCsvReady(instance)
											}}
										/>
									</React.Suspense>
								) : null
							) : chartType === 'Net Flow (%)' ? (
								chainPercentageNet && chainPercentageNet.length > 0 ? (
									<React.Suspense fallback={<div className="min-h-[360px]" />}>
										<MultiSeriesChart2
											dataset={netFlowPctDataset}
											charts={NET_FLOW_PCT_CHARTS}
											hideDefaultLegend={true}
											valueSymbol="%"
											onReady={(instance) => {
												handleChartReady(instance)
												handleChartCsvReady(instance)
											}}
										/>
									</React.Suspense>
								) : null
							) : chartType === 'Inflows' ? (
								<BridgeVolumeChart
									chain={selectedChain === 'All' ? 'all' : selectedChain}
									height="360px"
									onReady={handleBridgeVolumeChartReady}
								/>
							) : chartType === 'Net Flow By Chain' ? (
								<React.Suspense fallback={<div className="min-h-[600px]" />}>
									<NetflowChart height={600} onReady={handleBridgeVolumeChartReady} />
								</React.Suspense>
							) : chartType === '24h Tokens Deposited' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart
										chartData={tokenDeposits}
										onReady={(instance) => {
											handleChartReady(instance)
											handleChartCsvReady(instance)
										}}
									/>
								</React.Suspense>
							) : chartType === '24h Tokens Withdrawn' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart
										chartData={tokenWithdrawals}
										onReady={(instance) => {
											handleChartReady(instance)
											handleChartCsvReady(instance)
										}}
									/>
								</React.Suspense>
							) : null}
						</>
					)}
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
						searchValue={debouncedSearchValue}
					/>
				)}
			</div>
		</>
	)
}
