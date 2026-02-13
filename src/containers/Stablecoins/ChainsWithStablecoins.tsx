import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { StablecoinChartType, StablecoinsChartConfig } from '~/containers/ProDashboard/types'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import {
	parseBooleanQueryParam,
	useCalcCirculating,
	useCalcGroupExtraPeggedByDay,
	useGroupChainsPegged
} from '~/containers/Stablecoins/hooks'
import {
	getStablecoinDominance,
	type IBuildStablecoinChartDataResult,
	type IFormattedStablecoinChainRow
} from '~/containers/Stablecoins/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, toNiceCsvDate } from '~/utils'
import { StablecoinsChainsTable } from './StablecoinsChainsTable'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const UNRELEASED_QUERY_KEY = 'unreleased'

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

interface ChainsWithStablecoinsProps {
	chainCirculatings: IFormattedStablecoinChainRow[]
	chainList: string[]
	chainsGroupbyParent: Record<string, Record<string, string[]>>
	change1d: string
	change7d: string
	change30d: string
	totalMcapCurrent: number | null
	change1d_nol: string
	change7d_nol: string
	change30d_nol: string
	peggedAreaChartData: IBuildStablecoinChartDataResult['peggedAreaChartData']
	peggedAreaTotalData: {
		dataset: MultiSeriesChart2Dataset
		charts: MultiSeriesCharts
	}
	stackedDataset: IBuildStablecoinChartDataResult['stackedDataset']
}

const mapChartTypeToConfig = (displayType: string): StablecoinChartType => {
	const mapping: Record<string, StablecoinChartType> = {
		'Total Market Cap': 'totalMcap',
		'Token Market Caps': 'tokenMcaps',
		'Chain Market Caps': 'tokenMcaps',
		Pie: 'pie',
		Dominance: 'dominance',
		'USD Inflows': 'usdInflows',
		'Token Inflows': 'tokenInflows'
	}
	return mapping[displayType] ?? 'totalMcap'
}

export function ChainsWithStablecoins({
	chainCirculatings,
	chainList,
	chainsGroupbyParent,
	change1d,
	change7d,
	change30d,
	totalMcapCurrent,
	change1d_nol,
	change7d_nol,
	change30d_nol,
	peggedAreaChartData,
	peggedAreaTotalData,
	stackedDataset
}: ChainsWithStablecoinsProps) {
	const router = useRouter()
	const [chartType, setChartType] = React.useState('Pie')
	const chartTypeList = ['Total Market Cap', 'Chain Market Caps', 'Pie', 'Dominance']
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const filteredPeggedAssets = chainCirculatings
	const includeUnreleased = React.useMemo(
		() => parseBooleanQueryParam(router.query[UNRELEASED_QUERY_KEY]),
		[router.query]
	)
	const chainTotals = useCalcCirculating<Parameters<typeof useGroupChainsPegged>[0][number]>(
		filteredPeggedAssets,
		includeUnreleased
	)

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(
		stackedDataset,
		includeUnreleased
	)

	const prepareCsv = () => {
		const rows: Array<Array<string | number | boolean>> = [['Timestamp', 'Date', ...chainList, 'Total']]
		const sortedData = [...stackedData].sort((a, b) => a.date - b.date)
		for (const day of sortedData) {
			rows.push([
				day.date,
				toNiceCsvDate(day.date),
				...chainList.map((chain: string) => day[chain] ?? ''),
				chainList.reduce((acc: number, curr: string) => {
					return (acc += day[curr] ?? 0)
				}, 0)
			])
		}
		return { filename: 'stablecoinsChainTotals.csv', rows }
	}

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topChain = { name: 'Ethereum', mcap: 0 }
	if (chainTotals.length > 0) {
		const topChainData = chainTotals[0]
		topChain.name = topChainData.name
		topChain.mcap = topChainData.mcap ?? 0
	}

	const dominance = getStablecoinDominance(topChain, totalMcapCurrent)

	const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: groupedChains, sliceIdentifier: 'name', sliceValue: 'mcap', limit: 10 })
	}, [groupedChains])

	const { chainMcapsDataset, chainMcapsCharts } = React.useMemo(
		() => ({
			chainMcapsDataset: {
				source: peggedAreaChartData
					.map(({ date, ...rest }) => {
						const timestamp = Number(date) * 1e3
						if (!Number.isFinite(timestamp)) return null
						const row: Record<string, number> = { timestamp }
						for (const chain of chainList) {
							const raw = rest[chain]
							const value = typeof raw === 'number' ? raw : Number(raw)
							row[chain] = Number.isFinite(value) ? value : 0
						}
						return row
					})
					.filter((row): row is Record<string, number> => row !== null),
				dimensions: ['timestamp', ...chainList]
			},
			chainMcapsCharts: chainList.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				stack: 'chainMcap'
			}))
		}),
		[peggedAreaChartData, chainList]
	)

	const { dominanceDataset, dominanceCharts } = React.useMemo(
		() => ({
			dominanceDataset: {
				source: dataWithExtraPeggedAndDominanceByDay
					.map(({ date, ...rest }) => {
						const timestamp = Number(date) * 1e3
						if (!Number.isFinite(timestamp)) return null
						const row: Record<string, number> = { timestamp }
						for (const chain of chainList) {
							const raw = rest[chain]
							const value = typeof raw === 'number' ? raw : Number(raw)
							row[chain] = Number.isFinite(value) ? value : 0
						}
						return row
					})
					.filter((row): row is Record<string, number> => row !== null),
				dimensions: ['timestamp', ...chainList]
			},
			dominanceCharts: chainList.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				stack: 'dominance'
			}))
		}),
		[dataWithExtraPeggedAndDominanceByDay, chainList]
	)

	const stablecoinsChartConfig = React.useMemo<StablecoinsChartConfig>(
		() => ({
			id: `stablecoins-All-${mapChartTypeToConfig(chartType)}`,
			kind: 'stablecoins',
			chain: 'All',
			chartType: mapChartTypeToConfig(chartType)
		}),
		[chartType]
	)

	const exportMeta = React.useMemo(() => {
		switch (chartType) {
			case 'Total Market Cap':
				return {
					filename: 'stablecoins-chains-total-market-cap',
					title: 'Stablecoins Total Market Cap'
				}
			case 'Chain Market Caps':
				return {
					filename: 'stablecoins-chains-chain-market-caps',
					title: 'Stablecoins Market Caps by Chain'
				}
			case 'Dominance':
				return {
					filename: 'stablecoins-chains-dominance',
					title: 'Stablecoin Dominance by Chain'
				}
			case 'Pie':
			default:
				return {
					filename: 'stablecoins-chains-pie',
					title: 'Stablecoins by Chain'
				}
		}
	}, [chartType])

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Stablecoins Market Cap</span>
						<span className="font-jetbrains text-2xl font-semibold">{mcapToDisplay}</span>
					</p>

					<details className="group text-base">
						<summary className="flex items-center">
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-mb-5 -ml-5 transition-transform duration-100 group-open:rotate-90"
							/>
							<span className="flex w-full flex-col">
								<span className="text-(--text-label)">Change (7d)</span>

								<span className="flex flex-nowrap items-end justify-between gap-1">
									<span className="font-jetbrains text-2xl font-semibold">{change7d_nol}</span>
									<span
										className={`${
											change7d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
										} overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap`}
									>{`${change7d}%`}</span>
								</span>
							</span>
						</summary>

						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (1d)</span>
							<Tooltip
								content={change1d_nol}
								className={`overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change1d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change1d}%`}
							</Tooltip>
						</p>
						<p className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<span className="text-(--text-label)">Change (30d)</span>
							<Tooltip
								content={change30d_nol}
								className={`overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap underline decoration-dotted ${
									change30d.startsWith('-') ? 'text-(--error)' : 'text-(--success)'
								}`}
							>
								{`${change30d}%`}
							</Tooltip>
						</p>
					</details>

					<p className="flex flex-col">
						<span className="text-(--text-label)">{topChain.name} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>

					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mt-auto mr-auto" />
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center gap-2 p-2 pb-0">
						<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
						<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol />
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={exportMeta.filename}
							title={exportMeta.title}
						/>
					</div>
					{chartType === 'Total Market Cap' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={peggedAreaTotalData.dataset}
								charts={peggedAreaTotalData.charts}
								valueSymbol="$"
								chartOptions={chartOptions}
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : chartType === 'Chain Market Caps' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={chainMcapsDataset}
								charts={chainMcapsCharts}
								stacked={true}
								valueSymbol="$"
								chartOptions={chartOptions}
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : chartType === 'Dominance' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={dominanceDataset}
								charts={dominanceCharts}
								stacked={true}
								expandTo100Percent={true}
								valueSymbol="%"
								chartOptions={chartOptions}
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : chartType === 'Pie' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<PieChart chartData={chainsCirculatingValues} onReady={handleChartReady} />
						</React.Suspense>
					) : null}
				</div>
			</div>

			<StablecoinsChainsTable data={groupedChains} />
		</>
	)
}

const chartOptions = {
	grid: {
		left: 12,
		bottom: 68,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}
