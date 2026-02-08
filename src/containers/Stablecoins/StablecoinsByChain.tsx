import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createInflowsTooltipFormatter, preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { StablecoinChartType, StablecoinsChartConfig } from '~/containers/ProDashboard/types'
import { ChartSelector } from '~/containers/Stablecoins/ChartSelector'
import {
	PeggedFilters,
	stablecoinAttributeOptions,
	stablecoinBackingOptions,
	stablecoinPegTypeOptions
} from '~/containers/Stablecoins/Filters'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay } from '~/containers/Stablecoins/hooks'
import { buildStablecoinChartData, getStablecoinDominance } from '~/containers/Stablecoins/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, getPercentChange, slug, toNiceCsvDate, toNumberOrNullFromQueryParam } from '~/utils'
import { useFormatStablecoinQueryParams } from './hooks'
import { PeggedAssetsTable } from './Table'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const EMPTY_CHAINS: string[] = []
const EMPTY_IDS: number[] = []

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

const INFLOWS_TOOLTIP_FORMATTER = createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })

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
	return mapping[displayType] || 'totalMcap'
}

export function StablecoinsByChain({
	selectedChain = 'All',
	chains = EMPTY_CHAINS,
	filteredPeggedAssets,
	peggedAssetNames,
	peggedNameToChartDataIndex,
	chartDataByPeggedAsset,
	doublecountedIds = EMPTY_IDS,
	availableBackings,
	availablePegTypes
}) {
	const [chartType, setChartType] = React.useState('Total Market Cap')

	const chartTypeList =
		selectedChain !== 'All'
			? ['Total Market Cap', 'USD Inflows', 'Token Market Caps', 'Token Inflows', 'Pie', 'Dominance']
			: ['Total Market Cap', 'Token Market Caps', 'Pie', 'Dominance', 'USD Inflows', 'Token Inflows']

	const { chartInstance: exportChartInstance, handleChartReady: handleExportChartReady } = useGetChartInstance()

	const router = useRouter()

	const minMcap = toNumberOrNullFromQueryParam(router.query.minMcap)
	const maxMcap = toNumberOrNullFromQueryParam(router.query.maxMcap)

	// `handleExportChartReady` is passed to charts' `onReady` prop to share
	// a single ECharts instance across CSV + PNG exports.

	// Selected arrays already have excludes filtered out at hook level
	const { selectedAttributes, selectedPegTypes, selectedBackings } = useFormatStablecoinQueryParams({
		stablecoinAttributeOptions,
		stablecoinPegTypeOptions,
		stablecoinBackingOptions
	})

	const { peggedAssets, filteredIndexes } = React.useMemo(() => {
		const pegTypeOptionsMap = new Map<string, (typeof stablecoinPegTypeOptions)[number]>(
			stablecoinPegTypeOptions.map((option) => [option.key, option])
		)
		const backingOptionsMap = new Map<string, (typeof stablecoinBackingOptions)[number]>(
			stablecoinBackingOptions.map((option) => [option.key, option])
		)

		const chartDataIndexes: number[] = []
		const peggedAssets = filteredPeggedAssets.reduce((acc: any[], curr: any) => {
			let toFilter = false

			// Attribute filter:
			// - Missing param => all selected (handled in `useFormatStablecoinQueryParams`)
			// - Param="None" => none selected
			// - selectedAttributes already has excludes filtered out
			if (!selectedAttributes || selectedAttributes.length === 0) {
				toFilter = false
			} else {
				const selectedAttrSet = new Set(selectedAttributes)
				toFilter = stablecoinAttributeOptions.some((opt) => selectedAttrSet.has(opt.key) && opt.filterFn(curr))
			}

			// selectedPegTypes already has excludes filtered out
			toFilter =
				toFilter &&
				selectedPegTypes.some((pegtype) => {
					const pegTypeOption = pegTypeOptionsMap.get(pegtype)
					return pegTypeOption ? pegTypeOption.filterFn(curr) : false
				})

			// selectedBackings already has excludes filtered out
			toFilter =
				toFilter &&
				selectedBackings.some((backing) => {
					const backingOption = backingOptionsMap.get(backing)
					return backingOption ? backingOption.filterFn(curr) : false
				})

			// Mcap range should work with min-only, max-only, or both.
			// Values are parsed via `toNumberOrNullFromQueryParam`, so invalid inputs become null.
			if (minMcap != null || maxMcap != null) {
				toFilter =
					toFilter && (minMcap != null ? curr.mcap >= minMcap : true) && (maxMcap != null ? curr.mcap <= maxMcap : true)
			}

			if (toFilter) {
				// `filteredIndexes` is later used to index into `peggedAssetNames`.
				// Never push an undefined index here, or downstream chart series/dimensions can be corrupted.
				const maybeIndex = peggedNameToChartDataIndex[curr.name]
				if (typeof maybeIndex === 'undefined') {
					console.log(
						`[StablecoinsByChain] Missing chart data index for pegged asset "${curr.name}". Skipping series index to avoid invalid peggedAssetNames indexing.`
					)
				} else {
					const numericIndex = typeof maybeIndex === 'number' ? maybeIndex : Number(maybeIndex)
					if (Number.isFinite(numericIndex)) {
						chartDataIndexes.push(numericIndex)
					} else {
						console.log(
							`[StablecoinsByChain] Invalid chart data index for pegged asset "${curr.name}": ${String(maybeIndex)}. Skipping series index.`
						)
					}
				}
				return acc.concat(curr)
			} else return acc
		}, [] as any[])

		return { peggedAssets, filteredIndexes: chartDataIndexes }
	}, [
		filteredPeggedAssets,
		peggedNameToChartDataIndex,
		minMcap,
		maxMcap,
		selectedAttributes,
		selectedPegTypes,
		selectedBackings
	])

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows } =
		React.useMemo(() => {
			return buildStablecoinChartData({
				chartDataByAssetOrChain: chartDataByPeggedAsset,
				assetsOrChainsList: peggedAssetNames,
				filteredIndexes,
				issuanceType: 'mcap',
				selectedChain,
				doublecountedIds
			})
		}, [chartDataByPeggedAsset, peggedAssetNames, filteredIndexes, selectedChain, doublecountedIds])

	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label, router.query) }))

	const peggedTotals = useCalcCirculating(peggedAssets)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: peggedTotals, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [peggedTotals])

	const { data: stackedData, dataWithExtraPeggedAndDominanceByDay } = useCalcGroupExtraPeggedByDay(stackedDataset)

	const prepareCsv = () => {
		const rows = [['Timestamp', 'Date', ...filteredPeggedNames, 'Total']]
		const sortedData = stackedData.sort((a, b) => a.date - b.date)
		for (const day of sortedData) {
			rows.push([
				day.date,
				toNiceCsvDate(day.date),
				...filteredPeggedNames.map((peggedAsset) => day[peggedAsset] ?? ''),
				filteredPeggedNames.reduce((acc, curr) => {
					return (acc += day[curr] ?? 0)
				}, 0)
			])
		}
		return { filename: 'stablecoins.csv', rows: rows as (string | number | boolean)[][] }
	}

	let title = `Stablecoins Market Cap`
	if (selectedChain !== 'All') {
		title = `${selectedChain} Stablecoins Market Cap`
	}

	const { change1d, change7d, change30d, totalMcapCurrent, change1d_nol, change7d_nol, change30d_nol } =
		React.useMemo(() => {
			let totalMcapCurrent = peggedAreaTotalData?.[peggedAreaTotalData.length - 1]?.Mcap
			let totalMcapPrevDay = peggedAreaTotalData?.[peggedAreaTotalData.length - 2]?.Mcap
			let totalMcapPrevWeek = peggedAreaTotalData?.[peggedAreaTotalData.length - 8]?.Mcap
			let totalMcapPrevMonth = peggedAreaTotalData?.[peggedAreaTotalData.length - 31]?.Mcap
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
		}, [peggedAreaTotalData])

	const mcapToDisplay = formattedNum(totalMcapCurrent, true)

	let topToken = { symbol: 'USDT', mcap: 0 }
	if (peggedTotals.length > 0) {
		const topTokenData = peggedTotals[0]
		topToken.symbol = topTokenData.symbol
		topToken.mcap = topTokenData.mcap
	}

	const dominance = getStablecoinDominance(topToken, totalMcapCurrent)

	const stablecoinsChartConfig = React.useMemo<StablecoinsChartConfig>(
		() => ({
			id: `stablecoins-${selectedChain}-${mapChartTypeToConfig(chartType)}`,
			kind: 'stablecoins',
			chain: selectedChain,
			chartType: mapChartTypeToConfig(chartType)
		}),
		[selectedChain, chartType]
	)

	const getImageExportTitle = () => {
		const chainPrefix = selectedChain !== 'All' ? `${selectedChain} ` : ''
		return `${chainPrefix}Stablecoins - ${chartType}`
	}

	const getImageExportFilename = () => {
		const chainSlug = selectedChain !== 'All' ? `${slug(selectedChain)}-` : ''
		const chartSlug = chartType.toLowerCase().replace(/\s+/g, '-')
		return `stablecoins-${chainSlug}${chartSlug}`
	}

	const totalMcapDataset = React.useMemo(
		() => ({
			source: peggedAreaTotalData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
			dimensions: ['timestamp', 'Mcap']
		}),
		[peggedAreaTotalData]
	)

	// Keep chart dimensions in sync with the filtered indexes & remove doublecounted series.
	// This prevents NaN/undefined values from crashing ECharts (especially stacked % charts like Dominance).
	const filteredPeggedNames = React.useMemo(() => {
		const doublecountedSet = new Set(doublecountedIds)
		const names: string[] = []
		for (const i of filteredIndexes) {
			if (doublecountedSet.has(i)) continue
			const name = peggedAssetNames[i]
			if (typeof name === 'string' && name) names.push(name)
		}
		return names
	}, [filteredIndexes, peggedAssetNames, doublecountedIds])

	const { tokenMcapsDataset, tokenMcapsCharts } = React.useMemo(
		() => ({
			tokenMcapsDataset: {
				source: peggedAreaChartData.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...filteredPeggedNames]
			},
			tokenMcapsCharts: filteredPeggedNames.map((name, i) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: tokenColors[name] ?? CHART_COLORS[i % CHART_COLORS.length],
				stack: 'tokenMcaps'
			}))
		}),
		[peggedAreaChartData, filteredPeggedNames]
	)

	const { dominanceDataset, dominanceCharts } = React.useMemo(
		() => ({
			dominanceDataset: {
				source: dataWithExtraPeggedAndDominanceByDay
					.map(({ date, ...rest }) => {
						const timestamp = Number(date) * 1e3
						if (!Number.isFinite(timestamp)) return null

						// Ensure every dimension exists and is numeric (ECharts can crash on undefined/NaN in stacked % charts)
						const row: Record<string, number> = { timestamp }
						for (const name of filteredPeggedNames) {
							const raw = (rest as any)[name]
							const value = typeof raw === 'number' ? raw : Number(raw)
							row[name] = Number.isFinite(value) ? value : 0
						}
						return row
					})
					.filter(Boolean),
				dimensions: ['timestamp', ...filteredPeggedNames]
			},
			dominanceCharts: filteredPeggedNames.map((name, i) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: tokenColors[name] ?? CHART_COLORS[i % CHART_COLORS.length],
				stack: 'dominance'
			}))
		}),
		[dataWithExtraPeggedAndDominanceByDay, filteredPeggedNames]
	)

	const { tokenInflowsDataset, tokenInflowsCharts } = React.useMemo(() => {
		const names = tokenInflowNames ?? []
		if (!tokenInflows) return { tokenInflowsDataset: { source: [], dimensions: ['timestamp'] }, tokenInflowsCharts: [] }
		return {
			tokenInflowsDataset: {
				source: tokenInflows.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...names]
			},
			tokenInflowsCharts: names.map((name, i) => ({
				type: 'bar' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: tokenColors[name] ?? CHART_COLORS[i % CHART_COLORS.length],
				stack: 'tokenInflows'
			}))
		}
	}, [tokenInflows, tokenInflowNames])

	const usdInflowsDataset = React.useMemo(
		() =>
			usdInflows
				? {
						source: usdInflows.map(([d, v]) => ({ timestamp: +d * 1e3, Inflows: v })),
						dimensions: ['timestamp', 'Inflows']
					}
				: { source: [], dimensions: ['timestamp', 'Inflows'] },
		[usdInflows]
	)

	const tokenInflowsSelectionKey = React.useMemo(
		() => (tokenInflowNames?.length ? tokenInflowNames.join('|') : ''),
		[tokenInflowNames]
	)

	return (
		<>
			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />

			<PeggedFilters
				pathname={selectedChain === 'All' ? '/stablecoins' : `/stablecoins/${selectedChain}`}
				prepareCsv={prepareCsv}
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
			/>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total {title}</span>
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
						<span className="text-(--text-label)">{topToken.symbol} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>
				</div>
				<div className="relative col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{chartType === 'Token Inflows' ? (
						<TokenInflowsChartPanel
							key={tokenInflowsSelectionKey}
							chartTypeList={chartTypeList}
							chartType={chartType}
							setChartType={setChartType}
							stablecoinsChartConfig={stablecoinsChartConfig}
							chartInstance={exportChartInstance}
							exportFilename={getImageExportFilename()}
							exportTitle={getImageExportTitle()}
							onReady={handleExportChartReady}
							tokenInflowNames={tokenInflowNames ?? []}
							dataset={tokenInflowsDataset}
							charts={tokenInflowsCharts}
						/>
					) : (
						<>
							<div className="flex items-center gap-2 p-2 pb-0">
								<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
								<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol />
								<ChartExportButtons
									chartInstance={exportChartInstance}
									filename={getImageExportFilename()}
									title={getImageExportTitle()}
								/>
							</div>
							{chartType === 'Total Market Cap' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={totalMcapDataset}
										charts={TOTAL_MCAP_CHARTS}
										valueSymbol="$"
										chartOptions={chartOptions}
										onReady={handleExportChartReady}
									/>
								</React.Suspense>
							) : chartType === 'Token Market Caps' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={tokenMcapsDataset}
										charts={tokenMcapsCharts}
										stacked={true}
										valueSymbol="$"
										chartOptions={chartOptions}
										onReady={handleExportChartReady}
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
										onReady={handleExportChartReady}
									/>
								</React.Suspense>
							) : chartType === 'Pie' ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<PieChart
										chartData={chainsCirculatingValues}
										stackColors={tokenColors}
										onReady={handleExportChartReady}
									/>
								</React.Suspense>
							) : chartType === 'USD Inflows' && usdInflows ? (
								<React.Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={usdInflowsDataset}
										charts={USD_INFLOWS_CHARTS}
										chartOptions={chartOptions}
										onReady={handleExportChartReady}
									/>
								</React.Suspense>
							) : null}
						</>
					)}
				</div>
			</div>

			<PeggedAssetsTable data={peggedTotals} />
		</>
	)
}

function TokenInflowsChartPanel({
	chartTypeList,
	chartType,
	setChartType,
	stablecoinsChartConfig,
	chartInstance,
	exportFilename,
	exportTitle,
	onReady,
	tokenInflowNames,
	dataset,
	charts
}: {
	chartTypeList: string[]
	chartType: string
	setChartType: (next: string) => void
	stablecoinsChartConfig: StablecoinsChartConfig
	chartInstance: () => echarts.ECharts | null
	exportFilename: string
	exportTitle: string
	onReady: (instance: echarts.ECharts | null) => void
	tokenInflowNames: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const [selectedTokenInflows, setSelectedTokenInflows] = React.useState<string[]>(() => tokenInflowNames)
	const selectedTokenInflowsSet = React.useMemo(() => new Set(selectedTokenInflows), [selectedTokenInflows])

	return (
		<>
			<div className="flex items-center gap-2 p-2 pb-0">
				<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
				<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol />
				{tokenInflowNames.length > 0 ? (
					<SelectWithCombobox
						allValues={tokenInflowNames}
						selectedValues={selectedTokenInflows}
						setSelectedValues={setSelectedTokenInflows}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilename} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					selectedCharts={selectedTokenInflowsSet}
					chartOptions={
						selectedTokenInflowsSet.size > 1
							? { ...chartOptions, tooltip: { formatter: INFLOWS_TOOLTIP_FORMATTER } }
							: chartOptions
					}
					onReady={onReady}
				/>
			</React.Suspense>
		</>
	)
}

function handleRouting(selectedChain, queryParams) {
	const { chain: _chain, ...filters } = queryParams

	let params = ''

	const filterKeys = Object.keys(filters)
	for (let index = 0; index < filterKeys.length; index++) {
		const filter = filterKeys[index]
		// append '?' before all query params and '&' bertween diff params
		if (index === 0) {
			params += '?'
		} else params += '&'

		// query params of same query like pegType will return in array form - pegType=['USD','EUR'], expected output is pegType=USD&pegType=EUR
		if (Array.isArray(filters[filter])) {
			for (let i = 0; i < filters[filter].length; i++) {
				const f = filters[filter][i]
				if (i > 0) {
					params += '&'
				}

				params += `${filter}=${f}`
			}
		} else {
			params += `${filter}=${filters[filter]}`
		}
	}

	if (selectedChain === 'All') return `/stablecoins${params}`
	return `/stablecoins/${slug(selectedChain)}${params}`
}

const TOTAL_MCAP_CHARTS = [
	{ type: 'line' as const, name: 'Mcap', encode: { x: 'timestamp', y: 'Mcap' }, color: CHART_COLORS[0] }
]

const USD_INFLOWS_CHARTS = [
	{ type: 'bar' as const, name: 'Inflows', encode: { x: 'timestamp', y: 'Inflows' }, color: CHART_COLORS[0] }
]

const tokenColors: Record<string, string> = {
	USDT: '#009393',
	USDC: '#0B53BF',
	DAI: '#F4B731',
	USDe: '#3A3A3A',
	BUIDL: '#111111',
	USD1: '#D2B48C',
	USDS: '#E67E22',
	PYUSD: '#4A90E2',
	USDTB: '#C0C0C0',
	FDUSD: '#00FF00',
	Others: '#FF1493'
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
