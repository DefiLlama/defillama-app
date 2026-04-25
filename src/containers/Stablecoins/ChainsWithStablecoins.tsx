import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import type { IHBarChartProps, IPieChartProps, ITreemapChartProps } from '~/components/ECharts/types'
import { preparePieChartData } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { Select } from '~/components/Select/Select'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { StablecoinChartType, StablecoinsChartConfig } from '~/containers/ProDashboard/types'
import type { StablecoinChartSeriesPayload } from '~/containers/Stablecoins/chartSeries'
import {
	getStablecoinChartTypeLabel,
	getStablecoinChartTypeOptions,
	getStablecoinChartTypeQueryValue,
	getStablecoinChartViewLabel,
	getStablecoinChartViewOptions,
	getStablecoinChartViewQueryValue,
	parseStablecoinChartState,
	type StablecoinChartType as StablecoinChartCategory,
	type StablecoinChartView
} from '~/containers/Stablecoins/chartState'
import { useCalcCirculating, useGroupChainsPegged } from '~/containers/Stablecoins/hooks'
import { useStablecoinChartSeriesData, useStablecoinVolumeChartData } from '~/containers/Stablecoins/queries.client'
import { getStablecoinDominance, type IFormattedStablecoinChainRow } from '~/containers/Stablecoins/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, toNiceCsvDate } from '~/utils'
import { isTruthyQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { StablecoinVolumeChartKind } from './api.types'
import { StablecoinsChainsTable } from './StablecoinsChainsTable'
import { groupStablecoinVolumeChartPayload } from './volumeChart'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const HBarChart = React.lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>
const UNRELEASED_QUERY_KEY = 'unreleased'
const MAX_HORIZONTAL_BARS = 9

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
}

const CHAINS_CHART_MODE = { page: 'chains' } as const

const mapChartStateToConfig = (chartView: StablecoinChartView): StablecoinChartType => {
	if (chartView === 'breakdown') return 'tokenMcaps'
	if (chartView === 'dominance') return 'dominance'
	if (chartView === 'pie' || chartView === 'hbar' || chartView === 'treemap') return 'pie'
	return 'totalMcap'
}

const getVolumeChartKind = (
	chartType: StablecoinChartCategory,
	chartView: StablecoinChartView
): StablecoinVolumeChartKind | null => {
	if (chartType !== 'volume') return null
	if (chartView === 'byChain') return 'chain'
	if (chartView === 'byToken') return 'token'
	if (chartView === 'byCurrency') return 'currency'
	return 'total'
}

export function ChainsWithStablecoins({
	chainCirculatings,
	chainList: _chainList,
	chainsGroupbyParent,
	change1d,
	change7d,
	change30d,
	totalMcapCurrent,
	change1d_nol,
	change7d_nol,
	change30d_nol
}: ChainsWithStablecoinsProps) {
	const router = useRouter()
	const chartState = parseStablecoinChartState(router.query, CHAINS_CHART_MODE)
	const chartType = chartState.type
	const chartView = chartState.view
	const volumeGroupBy = React.useMemo<LowercaseDwmcGrouping>(() => {
		const value = Array.isArray(router.query.groupBy) ? router.query.groupBy[0] : router.query.groupBy
		const normalized = value?.toLowerCase()
		return DWMC_GROUPING_OPTIONS_LOWERCASE.find((option) => option.value === normalized)?.value ?? 'daily'
	}, [router.query.groupBy])
	const chartTypeOptions = React.useMemo(() => getStablecoinChartTypeOptions(CHAINS_CHART_MODE), [])
	const chartViewOptions = React.useMemo(() => getStablecoinChartViewOptions(chartState), [chartState])
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()
	const onChartTypeChange = React.useCallback(
		(nextChartType: StablecoinChartCategory) => {
			handleChartReady(null)
			void pushShallowQuery(router, {
				chartType: getStablecoinChartTypeQueryValue(CHAINS_CHART_MODE, nextChartType),
				chartView: undefined
			})
		},
		[handleChartReady, router]
	)
	const onChartViewChange = React.useCallback(
		(nextChartView: string) => {
			const view = nextChartView as StablecoinChartView
			handleChartReady(null)
			void pushShallowQuery(router, {
				chartView: getStablecoinChartViewQueryValue(CHAINS_CHART_MODE, chartType, view)
			})
		},
		[chartType, handleChartReady, router]
	)
	const onVolumeGroupByChange = React.useCallback(
		(nextGroupBy: LowercaseDwmcGrouping) => {
			void pushShallowQuery(router, { groupBy: nextGroupBy === 'daily' ? undefined : nextGroupBy })
		},
		[router]
	)
	const volumeChartKind = getVolumeChartKind(chartType, chartView)
	const volumeChartQuery = useStablecoinVolumeChartData({
		scope: 'global',
		chart: volumeChartKind,
		enabled: volumeChartKind != null
	})

	const filteredPeggedAssets = chainCirculatings
	const includeUnreleased = React.useMemo(() => isTruthyQueryParam(router.query[UNRELEASED_QUERY_KEY]), [router.query])
	const chainTotals = useCalcCirculating<Parameters<typeof useGroupChainsPegged>[0][number]>(
		filteredPeggedAssets,
		includeUnreleased
	)

	const prepareCsv = () => {
		if (chartType === 'marketCap' && (chartView === 'pie' || chartView === 'hbar' || chartView === 'treemap')) {
			const rows: Array<Array<string | number | boolean>> = [['Name', 'Market Cap']]
			for (const chain of chainTotals) {
				rows.push([chain.name, chain.mcap ?? 0])
			}
			return { filename: 'stablecoinsChainTotals', rows }
		}
		const payload = volumeChartKind ? volumeChartQuery.data : selectedChartData
		const dimensions = payload?.dataset.dimensions ?? ['timestamp']
		const rows: Array<Array<string | number | boolean>> = [['Timestamp', 'Date', ...dimensions.slice(1)]]
		for (const row of payload?.dataset.source ?? []) {
			const timestamp = Number(row.timestamp)
			rows.push([
				Number.isFinite(timestamp) ? timestamp : '',
				Number.isFinite(timestamp) ? toNiceCsvDate(Math.floor(timestamp / 1e3)) : '',
				...dimensions.slice(1).map((dimension) => row[dimension] ?? '')
			])
		}
		return { filename: 'stablecoinsChainTotals', rows }
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
	const hbarMarketCapData = React.useMemo(() => {
		return preparePieChartData({
			data: groupedChains,
			sliceIdentifier: 'name',
			sliceValue: 'mcap',
			limit: MAX_HORIZONTAL_BARS
		})
	}, [groupedChains])
	const rankedMarketCapData = React.useMemo(() => {
		const data: Array<{ name: string; value: number; color: string }> = []
		for (const chain of groupedChains) {
			const value = Number(chain.mcap ?? 0)
			if (!Number.isFinite(value) || value <= 0) continue
			data.push({
				name: chain.name,
				value,
				color: CHART_COLORS[data.length % CHART_COLORS.length]
			})
			if (data.length >= 20) break
		}
		return data
	}, [groupedChains])
	const hbarCategories = React.useMemo(() => hbarMarketCapData.map((item) => item.name), [hbarMarketCapData])
	const hbarValues = React.useMemo(() => hbarMarketCapData.map((item) => item.value), [hbarMarketCapData])
	const hbarColors = React.useMemo(
		() => hbarMarketCapData.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
		[hbarMarketCapData]
	)
	const treemapData = React.useMemo(() => {
		let total = 0
		for (const item of rankedMarketCapData) {
			total += item.value
		}
		return rankedMarketCapData.map((item) => {
			const share = total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0
			return {
				name: item.name,
				path: `Stablecoins/${item.name}`,
				value: [item.value, share, share],
				itemStyle: { color: item.color }
			}
		})
	}, [rankedMarketCapData])

	const selectedSeriesChart =
		chartType === 'marketCap' && chartView === 'total'
			? 'totalMcap'
			: chartType === 'marketCap' && chartView === 'breakdown'
				? 'chainMcaps'
				: chartType === 'marketCap' && chartView === 'dominance'
					? 'dominance'
					: null
	const chartSeriesQuery = useStablecoinChartSeriesData({
		scope: 'chains',
		chart: selectedSeriesChart,
		includeUnreleased: selectedSeriesChart === 'dominance' && includeUnreleased,
		enabled: selectedSeriesChart != null
	})
	const selectedChartData = chartSeriesQuery.data ?? null
	const deferredSelectedChartData = React.useDeferredValue(selectedChartData)
	const groupedVolumeChartData = React.useMemo(
		() => (volumeChartQuery.data ? groupStablecoinVolumeChartPayload(volumeChartQuery.data, volumeGroupBy) : null),
		[volumeChartQuery.data, volumeGroupBy]
	)
	const deferredVolumeChartData = React.useDeferredValue(groupedVolumeChartData)
	const deferredChainsCirculatingValues = React.useDeferredValue(chainsCirculatingValues)
	const isSelectedChartLoading =
		deferredSelectedChartData == null &&
		(chartSeriesQuery.isLoading || chartSeriesQuery.isFetching || chartSeriesQuery.data != null)
	const isVolumeChartLoading =
		deferredVolumeChartData == null &&
		(volumeChartQuery.isLoading || volumeChartQuery.isFetching || volumeChartQuery.data != null)
	const showDefaultLegend =
		(chartType === 'marketCap' && (chartView === 'breakdown' || chartView === 'dominance')) ||
		(chartType === 'volume' && chartView !== 'total')

	const stablecoinsChartConfig = React.useMemo<StablecoinsChartConfig>(
		() => ({
			id: `stablecoins-All-${mapChartStateToConfig(chartView)}`,
			kind: 'stablecoins',
			chain: 'All',
			chartType: mapChartStateToConfig(chartView)
		}),
		[chartView]
	)

	const exportMeta = React.useMemo(() => {
		const label = `${getStablecoinChartTypeLabel(chartType)} ${getStablecoinChartViewLabel(chartView)}`
		return {
			filename: `stablecoins-chains-${chartType}-${chartView}`,
			title: `Stablecoins by Chain - ${label}`
		}
	}, [chartType, chartView])

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<div className="flex flex-col">
						<h1 className="text-(--text-label)">Total Stablecoins Market Cap</h1>
						<p className="font-jetbrains text-2xl font-semibold">{mcapToDisplay}</p>
					</div>

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
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
						<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
							{chartTypeOptions.map(({ key, name }) => (
								<button
									key={key}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={chartType === key}
									onClick={() => onChartTypeChange(key)}
								>
									{name}
								</button>
							))}
						</div>
						<Select
							allValues={chartViewOptions}
							selectedValues={chartView}
							setSelectedValues={onChartViewChange}
							label={getStablecoinChartViewLabel(chartView)}
							labelType="none"
							variant="filter"
						/>
						{chartType === 'volume' || chartView === 'hbar' || chartView === 'treemap' ? null : (
							<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol />
						)}
						{chartType === 'volume' ? (
							<ChartGroupingSelector
								value={volumeGroupBy}
								options={DWMC_GROUPING_OPTIONS_LOWERCASE}
								onValueChange={onVolumeGroupByChange}
							/>
						) : null}
						{chartType === 'marketCap' && chartView === 'treemap' ? (
							<ChartRestoreButton chartInstance={exportChartInstance} />
						) : null}
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={exportMeta.filename}
							title={exportMeta.title}
						/>
					</div>
					{chartType === 'marketCap' && chartView === 'pie' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<PieChart chartData={deferredChainsCirculatingValues} onReady={handleChartReady} />
						</React.Suspense>
					) : chartType === 'marketCap' && chartView === 'hbar' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<HBarChart
								categories={hbarCategories}
								values={hbarValues}
								colors={hbarColors}
								valueSymbol="$"
								onReady={handleChartReady}
							/>
						</React.Suspense>
					) : chartType === 'marketCap' && chartView === 'treemap' ? (
						<React.Suspense fallback={<div className="min-h-[600px]" />}>
							<TreemapChart
								treeData={treemapData}
								variant="rwa"
								height="600px"
								onReady={handleChartReady}
								valueLabel="Market Cap"
							/>
						</React.Suspense>
					) : chartType === 'volume' ? (
						<SelectedChainsChart
							data={deferredVolumeChartData}
							isLoading={isVolumeChartLoading}
							isError={!isVolumeChartLoading && volumeChartQuery.error != null}
							hideDefaultLegend={!showDefaultLegend}
							groupBy={volumeGroupBy}
							onReady={handleChartReady}
						/>
					) : (
						<SelectedChainsChart
							data={deferredSelectedChartData}
							isLoading={isSelectedChartLoading}
							isError={!isSelectedChartLoading && chartSeriesQuery.error != null}
							hideDefaultLegend={!showDefaultLegend}
							onReady={handleChartReady}
						/>
					)}
				</div>
			</div>

			<StablecoinsChainsTable data={groupedChains} />
		</>
	)
}

function SelectedChainsChart({
	data,
	isLoading,
	isError,
	hideDefaultLegend,
	groupBy,
	onReady
}: {
	data: StablecoinChartSeriesPayload | null
	isLoading: boolean
	isError: boolean
	hideDefaultLegend: boolean
	groupBy?: LowercaseDwmcGrouping
	onReady: (instance: echarts.ECharts | null) => void
}) {
	if (isLoading) {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">Loading chart...</div>
		)
	}
	if (isError || !data) {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	if (data.charts.length === 0 || data.dataset.source.length === 0) {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	return (
		<React.Suspense fallback={<div className="min-h-[360px]" />}>
			<MultiSeriesChart2
				dataset={data.dataset}
				charts={data.charts}
				stacked={data.stacked}
				expandTo100Percent={data.expandTo100Percent}
				valueSymbol={data.valueSymbol}
				showTotalInTooltip={data.showTotalInTooltip}
				hideDefaultLegend={hideDefaultLegend}
				groupBy={groupBy}
				onReady={onReady}
			/>
		</React.Suspense>
	)
}
