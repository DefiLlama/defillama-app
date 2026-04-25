import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import * as React from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps
} from '~/components/ECharts/types'
import { preparePieChartData } from '~/components/ECharts/utils'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { Icon } from '~/components/Icon'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Select } from '~/components/Select/Select'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import type { StablecoinChartType, StablecoinsChartConfig } from '~/containers/ProDashboard/types'
import type { StablecoinChartSeriesPayload, StablecoinOverviewChartType } from '~/containers/Stablecoins/chartSeries'
import {
	createStablecoinOverviewChartMode,
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
import {
	PeggedFilters,
	stablecoinAttributeOptions,
	stablecoinBackingOptions,
	stablecoinPegTypeOptions,
	type StablecoinFilterOption
} from '~/containers/Stablecoins/Filters'
import { useCalcCirculating } from '~/containers/Stablecoins/hooks'
import { useStablecoinChartSeriesData, useStablecoinVolumeChartData } from '~/containers/Stablecoins/queries.client'
import { type FormattedStablecoinAsset } from '~/containers/Stablecoins/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug, toNiceCsvDate } from '~/utils'
import { isTruthyQueryParam, parseNumberQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { StablecoinVolumeChartKind } from './api.types'
import { useFormatStablecoinQueryParams } from './hooks'
import { StablecoinsTable } from './StablecoinsAssetsTable'
import { groupStablecoinVolumeChartPayload } from './volumeChart'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const HBarChart = React.lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const EMPTY_CHAINS: string[] = []
const MAX_HORIZONTAL_BARS = 9
const STABLECOIN_FILTER_QUERY_KEYS = [
	'attribute',
	'excludeAttribute',
	'pegtype',
	'excludePegtype',
	'backing',
	'excludeBacking',
	'minMcap',
	'maxMcap'
] as const
const UNRELEASED_QUERY_KEY = 'unreleased'

type StablecoinFilterResolverParams = {
	filteredPeggedAssets: FormattedStablecoinAsset[]
	hasActiveStablecoinUrlFilters: boolean
	selectedAttributes: string[]
	selectedPegTypes: string[]
	selectedBackings: string[]
	minMcap: number | null
	maxMcap: number | null
}

type MultiSeriesChartState =
	| { status: 'loading' }
	| { status: 'unavailable' }
	| { status: 'ready'; data: StablecoinChartSeriesPayload }

const stablecoinAttributeOptionsMap: Map<string, StablecoinFilterOption> = new Map(
	stablecoinAttributeOptions.map((option) => [option.key, option])
)
const stablecoinPegTypeOptionsMap: Map<string, StablecoinFilterOption> = new Map(
	stablecoinPegTypeOptions.map((option) => [option.key, option])
)
const stablecoinBackingOptionsMap: Map<string, StablecoinFilterOption> = new Map(
	stablecoinBackingOptions.map((option) => [option.key, option])
)

const matchesAnySelectedOption = (
	asset: FormattedStablecoinAsset,
	selectedOptions: string[],
	optionsMap: Map<string, StablecoinFilterOption>
): boolean => {
	if (selectedOptions.length === 0) return false
	for (const optionKey of selectedOptions) {
		const option = optionsMap.get(optionKey)
		if (option?.filterFn(asset)) return true
	}
	return false
}

const isWithinMcapRange = (
	asset: FormattedStablecoinAsset,
	minMcap: number | null,
	maxMcap: number | null
): boolean => {
	if (minMcap == null && maxMcap == null) return true
	const mcap = asset.mcap ?? 0
	if (minMcap != null && mcap < minMcap) return false
	if (maxMcap != null && mcap > maxMcap) return false
	return true
}

const resolveFilteredStablecoinData = ({
	filteredPeggedAssets,
	hasActiveStablecoinUrlFilters,
	selectedAttributes,
	selectedPegTypes,
	selectedBackings,
	minMcap,
	maxMcap
}: StablecoinFilterResolverParams): { peggedAssets: FormattedStablecoinAsset[] } => {
	// Fast path: default page load (no URL filters) should avoid per-asset filtering work.
	if (!hasActiveStablecoinUrlFilters) {
		return {
			peggedAssets: filteredPeggedAssets
		}
	}

	const peggedAssets: FormattedStablecoinAsset[] = []

	for (const asset of filteredPeggedAssets) {
		const matchesAttribute = matchesAnySelectedOption(asset, selectedAttributes, stablecoinAttributeOptionsMap)
		if (!matchesAttribute) continue

		const matchesPegType = matchesAnySelectedOption(asset, selectedPegTypes, stablecoinPegTypeOptionsMap)
		if (!matchesPegType) continue

		const matchesBacking = matchesAnySelectedOption(asset, selectedBackings, stablecoinBackingOptionsMap)
		if (!matchesBacking) continue

		if (!isWithinMcapRange(asset, minMcap, maxMcap)) continue

		peggedAssets.push(asset)
	}

	return { peggedAssets }
}

interface StablecoinsByChainProps {
	selectedChain?: string
	chains?: string[]
	filteredPeggedAssets: FormattedStablecoinAsset[]
	availableBackings: string[]
	availablePegTypes: string[]
	defaultChartData: StablecoinChartSeriesPayload
	entityQuestions?: string[]
}

const INFLOWS_TOOLTIP_FORMATTER = createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })

const mapChartStateToConfig = (
	chartType: StablecoinChartCategory,
	chartView: StablecoinChartView
): StablecoinChartType => {
	if (chartType === 'inflows') return chartView === 'token' ? 'tokenInflows' : 'usdInflows'
	if (chartView === 'breakdown') return 'tokenMcaps'
	if (chartView === 'dominance') return 'dominance'
	if (chartView === 'pie' || chartView === 'hbar' || chartView === 'treemap') return 'pie'
	return 'totalMcap'
}

const getOverviewChartType = (
	chartType: StablecoinChartCategory,
	chartView: StablecoinChartView
): StablecoinOverviewChartType | null => {
	if (chartType === 'inflows') return chartView === 'token' ? 'tokenInflows' : 'usdInflows'
	if (chartType !== 'marketCap') return null
	if (chartView === 'total') return 'totalMcap'
	if (chartView === 'breakdown') return 'tokenMcaps'
	if (chartView === 'dominance') return 'dominance'
	return null
}

const getVolumeChartKind = (
	chartType: StablecoinChartCategory,
	chartView: StablecoinChartView,
	selectedChain: string
): StablecoinVolumeChartKind | null => {
	if (chartType !== 'volume') return null
	if (selectedChain !== 'All') return 'chain'
	if (chartView === 'byChain') return 'chain'
	if (chartView === 'byToken') return 'token'
	if (chartView === 'byCurrency') return 'currency'
	return 'total'
}

export function StablecoinsByChain({
	selectedChain = 'All',
	chains = EMPTY_CHAINS,
	filteredPeggedAssets,
	availableBackings,
	availablePegTypes,
	defaultChartData,
	entityQuestions
}: StablecoinsByChainProps) {
	const router = useRouter()
	const chartMode = React.useMemo(() => createStablecoinOverviewChartMode(selectedChain), [selectedChain])
	const chartState = parseStablecoinChartState(router.query, chartMode)
	const chartType = chartState.type
	const chartView = chartState.view
	const volumeGroupBy = React.useMemo<LowercaseDwmcGrouping>(() => {
		const value = Array.isArray(router.query.groupBy) ? router.query.groupBy[0] : router.query.groupBy
		const normalized = value?.toLowerCase()
		return DWMC_GROUPING_OPTIONS_LOWERCASE.find((option) => option.value === normalized)?.value ?? 'daily'
	}, [router.query.groupBy])
	const chartTypeOptions = React.useMemo(() => getStablecoinChartTypeOptions(chartMode), [chartMode])
	const chartViewOptions = React.useMemo(() => getStablecoinChartViewOptions(chartState), [chartState])
	const { chartInstance: exportChartInstance, handleChartReady: handleExportChartReady } = useGetChartInstance()
	const onChartTypeChange = React.useCallback(
		(nextChartType: StablecoinChartCategory) => {
			handleExportChartReady(null)
			void pushShallowQuery(router, {
				chartType: getStablecoinChartTypeQueryValue(chartMode, nextChartType),
				chartView: undefined
			})
		},
		[chartMode, handleExportChartReady, router]
	)
	const onChartViewChange = React.useCallback(
		(nextChartView: string) => {
			const view = nextChartView as StablecoinChartView
			handleExportChartReady(null)
			void pushShallowQuery(router, {
				chartView: getStablecoinChartViewQueryValue(chartMode, chartType, view)
			})
		},
		[chartMode, chartType, handleExportChartReady, router]
	)
	const onVolumeGroupByChange = React.useCallback(
		(nextGroupBy: LowercaseDwmcGrouping) => {
			void pushShallowQuery(router, { groupBy: nextGroupBy === 'daily' ? undefined : nextGroupBy })
		},
		[router]
	)
	const volumeChartKind = getVolumeChartKind(chartType, chartView, selectedChain)
	const volumeChartDimension = volumeChartKind === 'chain' && selectedChain !== 'All' ? selectedChain : undefined
	const volumeChartQuery = useStablecoinVolumeChartData({
		chart: volumeChartKind,
		dimension: volumeChartDimension,
		enabled: volumeChartKind != null
	})
	const unreleasedQueryParam = router.query[UNRELEASED_QUERY_KEY]

	const minMcap = parseNumberQueryParam(router.query.minMcap)
	const maxMcap = parseNumberQueryParam(router.query.maxMcap)
	const includeUnreleased = isTruthyQueryParam(unreleasedQueryParam)
	const hasActiveStablecoinUrlFilters = STABLECOIN_FILTER_QUERY_KEYS.some((key) => {
		const value = router.query[key]
		if (value == null) return false
		if (Array.isArray(value)) return value.length > 0
		return value !== ''
	})

	// `handleExportChartReady` is passed to charts' `onReady` prop to share
	// a single ECharts instance across CSV + PNG exports.

	// Selected arrays already have excludes filtered out at hook level
	const { selectedAttributes, selectedPegTypes, selectedBackings } = useFormatStablecoinQueryParams({
		stablecoinAttributeOptions,
		stablecoinPegTypeOptions,
		stablecoinBackingOptions
	})

	const { peggedAssets } = React.useMemo(() => {
		return resolveFilteredStablecoinData({
			filteredPeggedAssets,
			hasActiveStablecoinUrlFilters,
			selectedAttributes,
			selectedPegTypes,
			selectedBackings,
			minMcap,
			maxMcap
		})
	}, [
		filteredPeggedAssets,
		hasActiveStablecoinUrlFilters,
		minMcap,
		maxMcap,
		selectedAttributes,
		selectedPegTypes,
		selectedBackings
	])

	const chainOptions = React.useMemo(
		() => ['All', ...chains].map((label) => ({ label, to: handleRouting(label, router.query) })),
		[chains, router.query]
	)

	const peggedTotals = useCalcCirculating<FormattedStablecoinAsset>(peggedAssets, includeUnreleased)

	const chainsCirculatingValues = React.useMemo(() => {
		return preparePieChartData({ data: peggedTotals, sliceIdentifier: 'symbol', sliceValue: 'mcap', limit: 10 })
	}, [peggedTotals])
	const hbarMarketCapData = React.useMemo(() => {
		return preparePieChartData({
			data: peggedTotals,
			sliceIdentifier: 'symbol',
			sliceValue: 'mcap',
			limit: MAX_HORIZONTAL_BARS
		})
	}, [peggedTotals])
	const rankedMarketCapData = React.useMemo(() => {
		const data: Array<{ name: string; value: number; color: string }> = []
		for (const asset of peggedTotals) {
			const value = Number(asset.mcap ?? 0)
			if (!Number.isFinite(value) || value <= 0) continue
			data.push({
				name: asset.symbol || asset.name,
				value,
				color: CHART_COLORS[data.length % CHART_COLORS.length]
			})
			if (data.length >= 20) break
		}
		return data
	}, [peggedTotals])
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
		return rankedMarketCapData.map((item) => ({
			name: item.name,
			path: `Stablecoins/${item.name}`,
			value: [
				item.value,
				total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0,
				total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0
			],
			itemStyle: { color: item.color }
		}))
	}, [rankedMarketCapData])

	let title = `Stablecoins Market Cap`
	if (selectedChain !== 'All') {
		title = `${selectedChain} Stablecoins Market Cap`
	}

	const chartTypeConfig = mapChartStateToConfig(chartType, chartView)
	const isVolumeChart = volumeChartKind != null
	const overviewChartType = getOverviewChartType(chartType, chartView)
	const isMarketCapTableChart =
		chartType === 'marketCap' && (chartView === 'pie' || chartView === 'hbar' || chartView === 'treemap')
	const overviewFilters = React.useMemo(
		() => ({
			attribute: router.query.attribute,
			excludeAttribute: router.query.excludeAttribute,
			pegtype: router.query.pegtype,
			excludePegtype: router.query.excludePegtype,
			backing: router.query.backing,
			excludeBacking: router.query.excludeBacking,
			minMcap: router.query.minMcap,
			maxMcap: router.query.maxMcap
		}),
		[
			router.query.attribute,
			router.query.excludeAttribute,
			router.query.pegtype,
			router.query.excludePegtype,
			router.query.backing,
			router.query.excludeBacking,
			router.query.minMcap,
			router.query.maxMcap
		]
	)
	const shouldFetchOverviewChart =
		overviewChartType != null && (chartType !== 'marketCap' || chartView !== 'total' || hasActiveStablecoinUrlFilters)
	const overviewChartQuery = useStablecoinChartSeriesData({
		scope: 'overview',
		chain: selectedChain,
		chart: overviewChartType,
		filters: overviewFilters,
		enabled: shouldFetchOverviewChart
	})
	const summaryChartQuery = useStablecoinChartSeriesData({
		scope: 'overview',
		chain: selectedChain,
		chart: 'totalMcap',
		filters: overviewFilters,
		enabled: isMarketCapTableChart && hasActiveStablecoinUrlFilters
	})
	const selectedChartData =
		shouldFetchOverviewChart && overviewChartType
			? (overviewChartQuery.data ?? null)
			: overviewChartType
				? defaultChartData
				: null
	const isSelectedChartLoading =
		shouldFetchOverviewChart &&
		(overviewChartQuery.isLoading ||
			(selectedChartData == null && (overviewChartQuery.isFetching || overviewChartQuery.data != null)))
	const isSelectedChartUnavailable =
		shouldFetchOverviewChart && !isSelectedChartLoading && (overviewChartQuery.error != null || !selectedChartData)
	const chartSummary =
		(isMarketCapTableChart && hasActiveStablecoinUrlFilters
			? summaryChartQuery.data?.summary
			: selectedChartData?.summary) ?? defaultChartData.summary
	const oneDay = chartSummary?.change1d ?? '0'
	const sevenDay = chartSummary?.change7d ?? '0'
	const thirtyDay = chartSummary?.change30d ?? '0'
	const oneDayUsd = formattedNum(String(chartSummary?.change1dUsd ?? 0), true)
	const sevenDayUsd = formattedNum(String(chartSummary?.change7dUsd ?? 0), true)
	const thirtyDayUsd = formattedNum(String(chartSummary?.change30dUsd ?? 0), true)
	const change1d = oneDay.startsWith('-') ? oneDay : `+${oneDay}`
	const change7d = sevenDay.startsWith('-') ? sevenDay : `+${sevenDay}`
	const change30d = thirtyDay.startsWith('-') ? thirtyDay : `+${thirtyDay}`
	const totalMcapCurrent = chartSummary?.totalMcapCurrent ?? null
	const change1d_nol = oneDayUsd.startsWith('-') ? oneDayUsd : `+${oneDayUsd}`
	const change7d_nol = sevenDayUsd.startsWith('-') ? sevenDayUsd : `+${sevenDayUsd}`
	const change30d_nol = thirtyDayUsd.startsWith('-') ? thirtyDayUsd : `+${thirtyDayUsd}`
	const mcapToDisplay = formattedNum(totalMcapCurrent, true)
	const dominance = chartSummary?.dominance ?? null
	const topTokenSymbol = chartSummary?.topToken.symbol ?? 'USDT'

	const stablecoinsChartConfig: StablecoinsChartConfig = {
		id: `stablecoins-${selectedChain}-${chartTypeConfig}`,
		kind: 'stablecoins',
		chain: selectedChain,
		chartType: chartTypeConfig
	}

	const getImageExportTitle = () => {
		const chainPrefix = selectedChain !== 'All' ? `${selectedChain} ` : ''
		return `${chainPrefix}Stablecoins - ${getStablecoinChartTypeLabel(chartType)} ${getStablecoinChartViewLabel(chartView)}`
	}

	const getImageExportFilename = () => {
		const chainSlug = selectedChain !== 'All' ? `${slug(selectedChain)}-` : ''
		const chartSlug = `${chartType}-${chartView}`.toLowerCase()
		return `stablecoins-${chainSlug}${chartSlug}`
	}

	const groupedVolumeChartData = React.useMemo(
		() => (volumeChartQuery.data ? groupStablecoinVolumeChartPayload(volumeChartQuery.data, volumeGroupBy) : null),
		[volumeChartQuery.data, volumeGroupBy]
	)
	const prepareCsv = React.useCallback(() => {
		if (isMarketCapTableChart) {
			const rows: Array<Array<string | number | boolean>> = [['Name', 'Market Cap']]
			for (const peggedAsset of peggedTotals) {
				rows.push([peggedAsset.symbol ?? peggedAsset.name, peggedAsset.mcap ?? 0])
			}
			return { filename: 'stablecoins', rows }
		}
		const payload = isVolumeChart ? groupedVolumeChartData : selectedChartData
		if (!payload) throw new Error('Chart data is still loading')
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
		return { filename: 'stablecoins', rows }
	}, [groupedVolumeChartData, isMarketCapTableChart, isVolumeChart, peggedTotals, selectedChartData])

	const deferredChainsCirculatingValues = React.useDeferredValue(chainsCirculatingValues)
	const deferredSelectedChartData = React.useDeferredValue(selectedChartData)
	const deferredVolumeChartData = React.useDeferredValue(groupedVolumeChartData)
	const isVolumeChartLoading =
		deferredVolumeChartData == null &&
		(volumeChartQuery.isLoading || volumeChartQuery.isFetching || volumeChartQuery.data != null)
	const showDefaultLegend =
		(chartType === 'marketCap' && (chartView === 'breakdown' || chartView === 'dominance')) ||
		(chartType === 'volume' && chartView !== 'total')
	let activeChartState: MultiSeriesChartState
	if (isVolumeChart) {
		if (isVolumeChartLoading) activeChartState = { status: 'loading' }
		else if (volumeChartQuery.error || !deferredVolumeChartData) activeChartState = { status: 'unavailable' }
		else activeChartState = { status: 'ready', data: deferredVolumeChartData }
	} else if (isSelectedChartLoading || (selectedChartData != null && deferredSelectedChartData == null)) {
		activeChartState = { status: 'loading' }
	} else if (isSelectedChartUnavailable || !deferredSelectedChartData) {
		activeChartState = { status: 'unavailable' }
	} else {
		activeChartState = { status: 'ready', data: deferredSelectedChartData }
	}

	let tokenInflowsChartState: MultiSeriesChartState
	if (isSelectedChartLoading || (selectedChartData != null && deferredSelectedChartData == null)) {
		tokenInflowsChartState = { status: 'loading' }
	} else if (isSelectedChartUnavailable || !deferredSelectedChartData)
		tokenInflowsChartState = { status: 'unavailable' }
	else tokenInflowsChartState = { status: 'ready', data: deferredSelectedChartData }
	const tokenInflowNames = selectedChartData?.dataset.dimensions.slice(1) ?? []
	const tokenInflowsSelectionKey = tokenInflowNames.length ? tokenInflowNames.join('|') : ''

	return (
		<>
			<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
			{entityQuestions != null && entityQuestions.length > 0 ? (
				<EntityQuestionsStrip
					questions={entityQuestions}
					entitySlug="stablecoins"
					entityType="page"
					entityName="Stablecoins"
				/>
			) : null}

			<PeggedFilters
				pathname={selectedChain === 'All' ? '/stablecoins' : `/stablecoins/${selectedChain}`}
				prepareCsv={prepareCsv}
				availableBackings={availableBackings}
				availablePegTypes={availablePegTypes}
			/>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<div className="flex flex-col">
						<h1 className="text-(--text-label)">Total {title}</h1>
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
						<span className="text-(--text-label)">{topTokenSymbol} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>
				</div>
				<div className="relative col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
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
						{isVolumeChart || chartView === 'hbar' || chartView === 'treemap' ? null : (
							<AddToDashboardButton chartConfig={stablecoinsChartConfig} smol />
						)}
						{isVolumeChart ? (
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
							filename={getImageExportFilename()}
							title={getImageExportTitle()}
						/>
					</div>
					{chartType === 'marketCap' && chartView === 'pie' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<PieChart chartData={deferredChainsCirculatingValues} onReady={handleExportChartReady} />
						</React.Suspense>
					) : chartType === 'marketCap' && chartView === 'hbar' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<HBarChart
								categories={hbarCategories}
								values={hbarValues}
								colors={hbarColors}
								valueSymbol="$"
								onReady={handleExportChartReady}
							/>
						</React.Suspense>
					) : chartType === 'marketCap' && chartView === 'treemap' ? (
						<React.Suspense fallback={<div className="min-h-[600px]" />}>
							<TreemapChart
								treeData={treemapData}
								variant="rwa"
								height="600px"
								onReady={handleExportChartReady}
								valueLabel="Market Cap"
							/>
						</React.Suspense>
					) : chartType === 'inflows' && chartView === 'token' ? (
						<TokenInflowsChartPanel
							key={tokenInflowsSelectionKey}
							onReady={handleExportChartReady}
							tokenInflowNames={tokenInflowNames}
							state={tokenInflowsChartState}
						/>
					) : (
						<MultiSeriesChartPanel
							state={activeChartState}
							hideDefaultLegend={!showDefaultLegend}
							groupBy={isVolumeChart ? volumeGroupBy : undefined}
							onReady={handleExportChartReady}
						/>
					)}
				</div>
			</div>

			<StablecoinsTable data={peggedTotals} />
		</>
	)
}

function TokenInflowsChartPanel({
	onReady,
	tokenInflowNames,
	state
}: {
	onReady: (instance: echarts.ECharts | null) => void
	tokenInflowNames: string[]
	state: MultiSeriesChartState
}) {
	const [selectedTokenInflows, setSelectedTokenInflows] = React.useState<string[]>(() => tokenInflowNames)
	const selectedTokenInflowsSet = new Set(selectedTokenInflows)

	return (
		<>
			<div className="flex items-center gap-2 p-2 pb-0">
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
			</div>
			<MultiSeriesChartPanel
				state={state}
				selectedCharts={selectedTokenInflowsSet}
				chartOptions={
					selectedTokenInflowsSet.size > 1 ? { tooltip: { formatter: INFLOWS_TOOLTIP_FORMATTER } } : undefined
				}
				onReady={onReady}
			/>
		</>
	)
}

function MultiSeriesChartPanel({
	state,
	selectedCharts,
	chartOptions,
	hideDefaultLegend,
	groupBy,
	onReady
}: {
	state: MultiSeriesChartState
	selectedCharts?: Set<string>
	chartOptions?: IMultiSeriesChart2Props['chartOptions']
	hideDefaultLegend?: boolean
	groupBy?: IMultiSeriesChart2Props['groupBy']
	onReady: (instance: echarts.ECharts | null) => void
}) {
	if (state.status === 'loading') {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">Loading chart...</div>
		)
	}
	if (state.status === 'unavailable') {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	if (state.data.charts.length === 0 || state.data.dataset.source.length === 0) {
		return (
			<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
				Chart unavailable
			</div>
		)
	}
	return (
		<React.Suspense fallback={<div className="min-h-[360px]" />}>
			<MultiSeriesChart2
				dataset={state.data.dataset}
				charts={state.data.charts}
				selectedCharts={selectedCharts}
				stacked={state.data.stacked}
				expandTo100Percent={state.data.expandTo100Percent}
				valueSymbol={state.data.valueSymbol}
				showTotalInTooltip={state.data.showTotalInTooltip}
				chartOptions={chartOptions}
				hideDefaultLegend={hideDefaultLegend}
				groupBy={groupBy}
				onReady={onReady}
			/>
		</React.Suspense>
	)
}

function handleRouting(selectedChain: string, queryParams: Record<string, string | string[] | undefined>) {
	const { chain: _chain, ...filters } = queryParams

	let params = ''

	const filterKeys: string[] = []
	for (const filterKey in filters) {
		filterKeys.push(filterKey)
	}
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

				params += `${encodeURIComponent(filter)}=${encodeURIComponent(f)}`
			}
		} else {
			const value = filters[filter]
			if (typeof value !== 'string') continue
			params += `${encodeURIComponent(filter)}=${encodeURIComponent(value)}`
		}
	}

	if (selectedChain === 'All') return `/stablecoins${params}`
	return `/stablecoins/${slug(selectedChain)}${params}`
}
