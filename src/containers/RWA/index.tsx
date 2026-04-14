import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import type {
	IHBarChartProps,
	IMultiSeriesChart2Props,
	IPieChartProps,
	ITreemapChartProps
} from '~/components/ECharts/types'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Select } from '~/components/Select/Select'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { formattedNum, slug } from '~/utils'
import { pushShallowQuery, toQueryString } from '~/utils/routerQuery'
import type { IRWAAssetsOverview, RWATickerChartTarget } from './api.types'
import { RWAAssetsTable } from './AssetsTable'
import { emptyChartDatasets, type RWAChartAggregationMode } from './chartAggregation'
import {
	createRwaChartModeState,
	getBreakdownLabel,
	getChartBreakdownOptions,
	getChartBreakdownQueryValue,
	getChartMetricLabel,
	getChartMetricOptions,
	getChartMetricQueryValue,
	getChartViewOptions,
	getChartViewQueryValue,
	getDefaultChartBreakdown,
	type RWAChartBreakdown,
	getTreemapNestedByLabel,
	getTreemapNestedByOptions,
	getTreemapNestedByQueryValue,
	getTreemapParentGrouping,
	parseRwaChartState,
	setChartBreakdown,
	setTreemapNestedBy,
	type RWAChartState
} from './chartState'
import { type RWAOverviewMode } from './constants'
import { definitions } from './definitions'
import { RWAOverviewFilters } from './Filters'
import {
	useFilteredRwaAssets,
	useRWATableQueryParams,
	useRWAAssetCategoryPieChartData,
	useRwaAssetGroupPieChartData,
	useRwaAssetNamePieChartData,
	useRwaAssetPlatformPieChartData,
	useRwaCategoryAssetClassPieChartData,
	useRwaChainBreakdownPieChartData,
	useRwaChartDataset,
	hasActiveChartFilters
} from './hooks'
import { rwaSlug } from './rwaSlug'
import { buildRwaNestedTreemapTreeData, buildRwaTreemapTreeData, canBuildRwaNestedTreemap } from './treemap'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const HBarChart = lazy(() => import('~/components/ECharts/HBarChart')) as React.FC<IHBarChartProps>
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>
const EMPTY_INITIAL_CHART_DATASET = emptyChartDatasets()

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const router = useRouter()
	const getSelectedFilterValue = (value: string | string[]) => (Array.isArray(value) ? value[0] : value)

	const mode = getRWAOverviewMode(props)
	const isChainMode = mode === 'chain'
	const isCategoryMode = mode === 'category'
	const isPlatformMode = mode === 'platform'
	const isAssetGroupMode = mode === 'assetGroup'
	const canBreakdownByChain = isCategoryMode || isPlatformMode || isAssetGroupMode || props.selectedChain === 'All'
	const chartMode = createRwaChartModeState(mode, canBreakdownByChain)
	const chartState = parseRwaChartState(router.query, chartMode)
	const chartTypeKey = chartState.metric
	const chartView = chartState.view
	const rawTimeSeriesBreakdownQuery = router.query.timeSeriesChartBreakdown
	const isTotalTimeSeriesSelected =
		chartView === 'timeSeries' &&
		(Array.isArray(rawTimeSeriesBreakdownQuery) ? rawTimeSeriesBreakdownQuery[0] : rawTimeSeriesBreakdownQuery) ===
			'total'
	const timeSeriesBreakdown =
		chartView === 'timeSeries'
			? isTotalTimeSeriesSelected
				? 'total'
				: chartState.breakdown
			: getDefaultChartBreakdown(chartMode, 'timeSeries')
	const nonTimeSeriesBreakdown =
		chartView === 'timeSeries' ? getDefaultChartBreakdown(chartMode, 'pie') : chartState.breakdown

	const {
		selectedAssetNames,
		selectedTypes,
		selectedCategories,
		selectedPlatforms,
		selectedAssetGroups,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
		selectedRedeemableStates,
		selectedAttestationsStates,
		selectedCexListedStates,
		selectedKycForMintRedeemStates,
		selectedKycAllowlistedWhitelistedToTransferHoldStates,
		selectedTransferableStates,
		selectedSelfCustodyStates,
		minDefiActiveTvlToOnChainMcapPct,
		maxDefiActiveTvlToOnChainMcapPct,
		minActiveMcapToOnChainMcapPct,
		maxActiveMcapToOnChainMcapPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct,
		includeStablecoins,
		includeGovernance,
		setDefiActiveTvlToOnChainMcapPctRange,
		setActiveMcapToOnChainMcapPctRange,
		setDefiActiveTvlToActiveMcapPctRange,
		setIncludeStablecoins,
		setIncludeGovernance,
		setRedeemableStates,
		setAttestationsStates,
		setCexListedStates,
		setKycForMintRedeemStates,
		setKycAllowlistedWhitelistedToTransferHoldStates,
		setTransferableStates,
		setSelfCustodyStates
	} = useRWATableQueryParams({
		assetNames: props.assetNames,
		types: props.types,
		categories: props.categories,
		platforms: props.platforms,
		assetClasses: props.assetClasses,
		rwaClassifications: props.rwaClassifications,
		accessModels: props.accessModels,
		issuers: props.issuers,
		assetGroups: props.assetGroups,
		categorySlug: props.categorySlug,
		mode
	})

	const { filteredAssets, totalOnChainMcap, totalActiveMcap, totalOnChainDeFiActiveTvl, totalIssuersCount } =
		useFilteredRwaAssets({
			assets: props.assets,
			isPlatformMode,
			selectedAssetNames,
			selectedCategories,
			selectedPlatforms,
			selectedAssetGroups,
			selectedAssetClasses,
			selectedRwaClassifications,
			selectedAccessModels,
			selectedIssuers,
			selectedTypes,
			selectedRedeemableStates,
			selectedAttestationsStates,
			selectedCexListedStates,
			selectedKycForMintRedeemStates,
			selectedKycAllowlistedWhitelistedToTransferHoldStates,
			selectedTransferableStates,
			selectedSelfCustodyStates,
			includeStablecoins,
			includeGovernance,
			minDefiActiveTvlToOnChainMcapPct,
			maxDefiActiveTvlToOnChainMcapPct,
			minActiveMcapToOnChainMcapPct,
			maxActiveMcapToOnChainMcapPct,
			minDefiActiveTvlToActiveMcapPct,
			maxDefiActiveTvlToActiveMcapPct
		})

	const activeFilters = hasActiveChartFilters(router.query, mode, props.categorySlug)
	const initialChartDataset = props.initialChartDataset ?? EMPTY_INITIAL_CHART_DATASET
	const chartTarget = getTickerChartTarget(props)
	const { chartDataset, isChartLoading, chartError } = useRwaChartDataset({
		selectedMetric: chartTypeKey,
		initialDataset: initialChartDataset[chartTypeKey],
		filteredAssets,
		mode: getRwaChartAggregationMode(timeSeriesBreakdown),
		target: chartTarget,
		includeStablecoins,
		includeGovernance,
		useInitialDataset:
			chartTypeKey === 'activeMcap' &&
			!activeFilters &&
			timeSeriesBreakdown === getDefaultChartBreakdown(chartMode, 'timeSeries')
	})

	const {
		assetCategoryOnChainMcapPieChartData,
		assetCategoryActiveMcapPieChartData,
		assetCategoryDefiActiveTvlPieChartData,
		pieChartStackColors: assetCategoryPieChartStackColors
	} = useRWAAssetCategoryPieChartData({
		enabled: nonTimeSeriesBreakdown === 'category',
		assets: filteredAssets,
		categories: props.categories,
		selectedCategories
	})

	const {
		assetClassOnChainMcapPieChartData,
		assetClassActiveMcapPieChartData,
		assetClassDefiActiveTvlPieChartData,
		assetClassPieChartStackColors
	} = useRwaCategoryAssetClassPieChartData({
		enabled: nonTimeSeriesBreakdown === 'assetClass',
		assets: filteredAssets,
		assetClasses: props.assetClasses,
		selectedAssetClasses
	})

	const {
		assetNameOnChainMcapPieChartData,
		assetNameActiveMcapPieChartData,
		assetNameDefiActiveTvlPieChartData,
		assetNamePieChartStackColors
	} = useRwaAssetNamePieChartData({
		enabled: nonTimeSeriesBreakdown === 'assetName',
		assets: filteredAssets,
		selectedAssetNames: isAssetGroupMode
			? filteredAssets.map((asset) => asset.assetName || asset.ticker)
			: selectedAssetNames
	})

	const {
		assetGroupOnChainMcapPieChartData,
		assetGroupActiveMcapPieChartData,
		assetGroupDefiActiveTvlPieChartData,
		assetGroupPieChartStackColors
	} = useRwaAssetGroupPieChartData({
		enabled: nonTimeSeriesBreakdown === 'assetGroup',
		assets: filteredAssets
	})

	const {
		assetPlatformOnChainMcapPieChartData,
		assetPlatformActiveMcapPieChartData,
		assetPlatformDefiActiveTvlPieChartData,
		assetPlatformPieChartStackColors
	} = useRwaAssetPlatformPieChartData({
		enabled: nonTimeSeriesBreakdown === 'platform',
		assets: filteredAssets
	})
	const {
		chainOnChainMcapPieChartData,
		chainActiveMcapPieChartData,
		chainDefiActiveTvlPieChartData,
		chainPieChartStackColors
	} = useRwaChainBreakdownPieChartData({
		enabled: canBreakdownByChain,
		assets: filteredAssets
	})

	// Select pie chart breakdown based on route mode (same precedence as nav links).
	const { onChainPieChartData, activeMcapPieChartData, defiActiveTvlPieChartData, pieChartStackColors } =
		useMemo(() => {
			switch (nonTimeSeriesBreakdown) {
				case 'chain':
					return {
						onChainPieChartData: chainOnChainMcapPieChartData,
						activeMcapPieChartData: chainActiveMcapPieChartData,
						defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
						pieChartStackColors: chainPieChartStackColors
					}
				case 'assetGroup':
					return {
						onChainPieChartData: assetGroupOnChainMcapPieChartData,
						activeMcapPieChartData: assetGroupActiveMcapPieChartData,
						defiActiveTvlPieChartData: assetGroupDefiActiveTvlPieChartData,
						pieChartStackColors: assetGroupPieChartStackColors
					}
				case 'platform':
					return {
						onChainPieChartData: assetPlatformOnChainMcapPieChartData,
						activeMcapPieChartData: assetPlatformActiveMcapPieChartData,
						defiActiveTvlPieChartData: assetPlatformDefiActiveTvlPieChartData,
						pieChartStackColors: assetPlatformPieChartStackColors
					}
				case 'assetClass':
					return {
						onChainPieChartData: assetClassOnChainMcapPieChartData,
						activeMcapPieChartData: assetClassActiveMcapPieChartData,
						defiActiveTvlPieChartData: assetClassDefiActiveTvlPieChartData,
						pieChartStackColors: assetClassPieChartStackColors
					}
				case 'assetName':
					return {
						onChainPieChartData: assetNameOnChainMcapPieChartData,
						activeMcapPieChartData: assetNameActiveMcapPieChartData,
						defiActiveTvlPieChartData: assetNameDefiActiveTvlPieChartData,
						pieChartStackColors: assetNamePieChartStackColors
					}
				case 'category':
					return {
						onChainPieChartData: assetCategoryOnChainMcapPieChartData,
						activeMcapPieChartData: assetCategoryActiveMcapPieChartData,
						defiActiveTvlPieChartData: assetCategoryDefiActiveTvlPieChartData,
						pieChartStackColors: assetCategoryPieChartStackColors
					}
				default:
					return assertNever(nonTimeSeriesBreakdown)
			}
		}, [
			assetGroupActiveMcapPieChartData,
			assetGroupDefiActiveTvlPieChartData,
			assetGroupOnChainMcapPieChartData,
			assetGroupPieChartStackColors,
			assetClassActiveMcapPieChartData,
			assetClassDefiActiveTvlPieChartData,
			assetClassOnChainMcapPieChartData,
			assetClassPieChartStackColors,
			assetNameActiveMcapPieChartData,
			assetNameDefiActiveTvlPieChartData,
			assetNameOnChainMcapPieChartData,
			assetNamePieChartStackColors,
			assetPlatformOnChainMcapPieChartData,
			assetPlatformActiveMcapPieChartData,
			assetPlatformDefiActiveTvlPieChartData,
			assetPlatformPieChartStackColors,
			assetCategoryActiveMcapPieChartData,
			assetCategoryDefiActiveTvlPieChartData,
			assetCategoryOnChainMcapPieChartData,
			assetCategoryPieChartStackColors,
			nonTimeSeriesBreakdown,
			chainOnChainMcapPieChartData,
			chainActiveMcapPieChartData,
			chainDefiActiveTvlPieChartData,
			chainPieChartStackColors
		])

	// Preserve filter/toggle query params only in chain mode.
	// (The chain/category/platform itself is in the pathname, so we strip the dynamic param from the query object.)
	const navLinks = useMemo(() => {
		const baseLinks = getModeLinks(
			mode,
			props.chainLinks,
			props.categoryLinks,
			props.platformLinks,
			props.assetGroupLinks
		)

		// Only preserve query filters/toggles on chain mode. In category/platform mode, links should be "clean".
		const shouldPreserveQuery = isChainMode
		if (!shouldPreserveQuery) return baseLinks

		const { chain: _chain, category: _category, platform: _platform, ...restQuery } = router.query
		const qs = toQueryString(restQuery as Record<string, string | string[] | undefined>)
		if (!qs) return baseLinks
		return baseLinks.map((link) => ({ ...link, to: `${link.to}${qs}` }))
	}, [
		isChainMode,
		mode,
		props.assetGroupLinks,
		props.categoryLinks,
		props.platformLinks,
		props.chainLinks,
		router.query
	])

	const showFilters = props.assets.length > 1

	const showCharts = props.assets.length > 1

	const { chartInstance: multiSeriesChart2Instance, handleChartReady: handleMultiSeriesChart2Ready } =
		useChartImageExport()
	const chartMetricLabel = getChartMetricLabel(chartTypeKey)
	const chartMetricOptions = getChartMetricOptions()
	const chartViewOptions = getChartViewOptions()
	const selectedModeLabel = getSelectedModeLabel(mode, props)
	const exportChartTitle = getRwaExportChartTitle({
		mode,
		metricLabel: chartMetricLabel,
		selectedModeLabel
	})
	const timeSeriesChartFilename = `rwa-time-series-chart-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`
	const { chartInstance: pieChartInstance, handleChartReady: handlePieChartReady } = useChartImageExport()
	const pieChartFilename = `rwa-pie-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`
	const { chartInstance: barChartInstance, handleChartReady: handleBarChartReady } = useChartImageExport()
	const barChartFilename = `rwa-bar-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`
	const { chartInstance: treemapChartInstance, handleChartReady: handleTreemapChartReady } = useChartImageExport()
	const treemapChartFilename = `rwa-treemap-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`

	const selectedTimeSeriesDataset = chartDataset
	const selectedPieChartData =
		chartTypeKey === 'onChainMcap'
			? onChainPieChartData
			: chartTypeKey === 'activeMcap'
				? activeMcapPieChartData
				: defiActiveTvlPieChartData
	const deferredSelectedTimeSeriesDataset = useDeferredValue(selectedTimeSeriesDataset)
	const deferredSelectedPieChartData = useDeferredValue(selectedPieChartData)
	const valueSortedPieChartStackColors = useMemo(() => {
		const stackColors = { ...pieChartStackColors }
		const sortedData = [...deferredSelectedPieChartData]
			.filter((item) => Number.isFinite(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

		for (const [index, item] of sortedData.entries()) {
			stackColors[item.name] = CHART_COLORS[index % CHART_COLORS.length]
		}

		return stackColors
	}, [pieChartStackColors, deferredSelectedPieChartData])
	const selectedBarChartData = useMemo(() => {
		let othersValue = 0
		const sorted: Array<{ name: string; value: number }> = []

		for (const item of deferredSelectedPieChartData) {
			if (!Number.isFinite(item.value) || item.value <= 0) continue

			if (item.name === 'Others') {
				othersValue += item.value
				continue
			}

			sorted.push({ name: item.name, value: item.value })
		}

		sorted.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

		if (sorted.length <= MAX_HORIZONTAL_BARS - (othersValue > 0 ? 1 : 0)) {
			return othersValue > 0 ? [...sorted, { name: 'Others', value: othersValue }] : sorted
		}

		const limitedData = sorted.slice(0, MAX_HORIZONTAL_BARS - 1)
		const overflowValue = sorted.slice(MAX_HORIZONTAL_BARS - 1).reduce((sum, item) => sum + item.value, 0) + othersValue
		if (overflowValue > 0) {
			limitedData.push({ name: 'Others', value: overflowValue })
		}
		return limitedData
	}, [deferredSelectedPieChartData])
	const selectedBarChartCategories = useMemo(
		() => selectedBarChartData.map((item) => item.name),
		[selectedBarChartData]
	)
	const selectedBarChartValues = useMemo(() => selectedBarChartData.map((item) => item.value), [selectedBarChartData])
	const selectedBarChartColors = useMemo(
		() => selectedBarChartData.map((item) => valueSortedPieChartStackColors[item.name] ?? '#1f77b4'),
		[selectedBarChartData, valueSortedPieChartStackColors]
	)

	const chartTypeSwitch = (
		<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			{chartMetricOptions.map(({ key, label }) => (
				<button
					key={`pie-chart-type-${key}`}
					className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
					data-active={chartTypeKey === key}
					onClick={() => {
						void pushShallowQuery(router, { chartType: getChartMetricQueryValue(key) })
					}}
				>
					{label}
				</button>
			))}
		</div>
	)

	const chartViewSwitch = (
		<Select
			allValues={chartViewOptions}
			selectedValues={chartView}
			setSelectedValues={(value) => {
				const selectedView = getSelectedFilterValue(value) as RWAChartState['view']
				void pushShallowQuery(router, { chartView: getChartViewQueryValue(selectedView) })
			}}
			label={chartViewOptions.find(({ key }) => key === chartView)?.name ?? chartViewOptions[0].name}
			labelType="none"
			variant="filter"
		/>
	)
	const chartBreakdownOptions = getChartBreakdownOptions(chartState)
	const timeSeriesChartBreakdownOptions =
		chartView === 'timeSeries'
			? ([{ key: 'total', name: 'Total' }, ...chartBreakdownOptions] as const)
			: chartBreakdownOptions
	const chartBreakdownLabel =
		chartView === 'timeSeries' && isTotalTimeSeriesSelected ? 'Total' : getBreakdownLabel(chartState.breakdown)
	const timeSeriesChartBreakdownSwitch = (
		<Select
			allValues={timeSeriesChartBreakdownOptions}
			selectedValues={isTotalTimeSeriesSelected ? 'total' : chartState.breakdown}
			setSelectedValues={(value) => {
				const nextBreakdown = getSelectedFilterValue(value)
				if (nextBreakdown === 'total') {
					void pushShallowQuery(router, {
						timeSeriesChartBreakdown: 'total'
					})
					return
				}

				const nextState = setChartBreakdown(chartState, nextBreakdown as RWAChartState['breakdown'])
				void pushShallowQuery(router, {
					timeSeriesChartBreakdown: getChartBreakdownQueryValue(nextState)
				})
			}}
			label={chartBreakdownLabel}
			labelType="none"
			variant="filter"
		/>
	)

	const treemapParentGrouping = getTreemapParentGrouping(nonTimeSeriesBreakdown)
	const treemapNestedBy = chartState.treemapNestedBy
	const treemapNestedByOptions = getTreemapNestedByOptions(treemapParentGrouping)
	const isNestedTreemapSupported = canBuildRwaNestedTreemap({
		parentGrouping: treemapParentGrouping,
		childGrouping: treemapNestedBy
	})
	const pieChartBreakdownSwitch = (
		<Select
			allValues={chartBreakdownOptions}
			selectedValues={chartState.breakdown}
			setSelectedValues={(value) => {
				const nextBreakdown = getSelectedFilterValue(value) as RWAChartState['breakdown']
				const nextState = setChartBreakdown(chartState, nextBreakdown)
				void pushShallowQuery(router, {
					nonTimeSeriesChartBreakdown: getChartBreakdownQueryValue(nextState),
					treemapNestedBy: getTreemapNestedByQueryValue(nextState)
				})
			}}
			label={chartBreakdownLabel}
			labelType="none"
			variant="filter"
		/>
	)
	const treemapNestedByLabel = getTreemapNestedByLabel(treemapNestedBy)
	const treemapNestedBySwitch = (
		<Select
			allValues={treemapNestedByOptions}
			selectedValues={treemapNestedBy}
			setSelectedValues={(value) => {
				const selectedNestedBy = getSelectedFilterValue(value) as RWAChartState['treemapNestedBy']
				const nextState = setTreemapNestedBy(chartState, selectedNestedBy)
				void pushShallowQuery(router, { treemapNestedBy: getTreemapNestedByQueryValue(nextState) })
			}}
			label={`Nested by: ${treemapNestedByLabel}`}
			labelType="none"
			variant="filter"
		/>
	)

	const treemapTreeData = useMemo(() => {
		if (chartView !== 'treemap') return []
		if (isNestedTreemapSupported) {
			const nestedTreeData = buildRwaNestedTreemapTreeData({
				assets: filteredAssets,
				metric: chartTypeKey,
				rootLabel: chartBreakdownLabel,
				parentGrouping: treemapParentGrouping,
				childGrouping: treemapNestedBy
			})
			if (nestedTreeData.length > 0) return nestedTreeData
		}
		return buildRwaTreemapTreeData(selectedPieChartData, chartBreakdownLabel)
	}, [
		chartView,
		chartTypeKey,
		filteredAssets,
		chartBreakdownLabel,
		isNestedTreemapSupported,
		selectedPieChartData,
		treemapNestedBy,
		treemapParentGrouping
	])
	const nonTimeSeriesChartInstance =
		chartView === 'treemap' ? treemapChartInstance : chartView === 'hbar' ? barChartInstance : pieChartInstance
	const nonTimeSeriesChartFilename =
		chartView === 'treemap' ? treemapChartFilename : chartView === 'hbar' ? barChartFilename : pieChartFilename

	return (
		<>
			{/* <Announcement>
				Stablecoins, Governance are not included by default. To include them, toggle the corresponding filters.
			</Announcement> */}
			<RowLinksWithDropdown links={navLinks} activeLink={selectedModeLabel} />
			<RWAOverviewFilters
				enabled={showFilters}
				modes={{
					mode,
					isChainMode,
					isCategoryMode,
					isPlatformMode,
					isAssetGroupMode
				}}
				options={{
					assetNames: props.assetNames,
					typeOptions: props.typeOptions,
					categoriesOptions: props.categoriesOptions,
					platforms: props.platforms,
					assetGroups: props.assetGroups,
					assetClassOptions: props.assetClassOptions,
					rwaClassificationOptions: props.rwaClassificationOptions,
					accessModelOptions: props.accessModelOptions,
					issuers: props.issuers,
					categorySlug: props.categorySlug
				}}
				selections={{
					selectedAssetNames,
					selectedTypes,
					selectedCategories,
					selectedPlatforms,
					selectedAssetGroups,
					selectedAssetClasses,
					selectedRwaClassifications,
					selectedAccessModels,
					selectedIssuers,
					selectedRedeemableStates,
					selectedAttestationsStates,
					selectedCexListedStates,
					selectedKycForMintRedeemStates,
					selectedKycAllowlistedWhitelistedToTransferHoldStates,
					selectedTransferableStates,
					selectedSelfCustodyStates,
					minDefiActiveTvlToOnChainMcapPct,
					maxDefiActiveTvlToOnChainMcapPct,
					minActiveMcapToOnChainMcapPct,
					maxActiveMcapToOnChainMcapPct,
					minDefiActiveTvlToActiveMcapPct,
					maxDefiActiveTvlToActiveMcapPct,
					includeStablecoins,
					includeGovernance
				}}
				actions={{
					setDefiActiveTvlToOnChainMcapPctRange,
					setActiveMcapToOnChainMcapPctRange,
					setDefiActiveTvlToActiveMcapPctRange,
					setIncludeStablecoins,
					setIncludeGovernance,
					setRedeemableStates,
					setAttestationsStates,
					setCexListedStates,
					setKycForMintRedeemStates,
					setKycAllowlistedWhitelistedToTransferHoldStates,
					setTransferableStates,
					setSelfCustodyStates
				}}
			/>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalActiveMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.totalActiveMcap.label}
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalActiveMcap, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalOnChainMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.totalOnChainMcap.label}
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainMcap, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalDefiActiveTvl.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.totalDefiActiveTvl.label}
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainDeFiActiveTvl, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalAssetIssuers.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.totalAssetIssuers.label}
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalIssuersCount, false)}</span>
				</p>
			</div>
			{showCharts ? (
				<>
					{chartView === 'timeSeries' ? (
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="flex flex-wrap items-center justify-end gap-2 p-3">
								{chartTypeSwitch}
								{chartViewSwitch}
								{timeSeriesChartBreakdownSwitch}
								<ChartCsvExportButton chartInstance={multiSeriesChart2Instance} filename={timeSeriesChartFilename} />
								<ChartPngExportButton
									chartInstance={multiSeriesChart2Instance}
									filename={timeSeriesChartFilename}
									title={exportChartTitle}
								/>
							</div>
							{chartError ? (
								<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">{chartError}</p>
							) : isChartLoading ? (
								<p className="flex min-h-[360px] items-center justify-center gap-1">
									Loading
									<LoadingDots />
								</p>
							) : (
								<Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={deferredSelectedTimeSeriesDataset}
										hideDefaultLegend={false}
										showTotalInTooltip
										onReady={handleMultiSeriesChart2Ready}
									/>
								</Suspense>
							)}
						</div>
					) : null}
					{chartView === 'pie' || chartView === 'treemap' || chartView === 'hbar' ? (
						<div
							className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${
								chartView === 'treemap' ? 'min-h-[652px]' : 'min-h-[412px]'
							}`}
						>
							<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
								{chartTypeSwitch}
								{chartViewSwitch}
								{pieChartBreakdownSwitch}
								{chartView === 'treemap' ? treemapNestedBySwitch : null}
								{chartView === 'treemap' ? <ChartRestoreButton chartInstance={treemapChartInstance} /> : null}
								<ChartCsvExportButton
									chartInstance={nonTimeSeriesChartInstance}
									filename={nonTimeSeriesChartFilename}
								/>
								<ChartPngExportButton
									chartInstance={nonTimeSeriesChartInstance}
									filename={nonTimeSeriesChartFilename}
									title={exportChartTitle}
								/>
							</div>
							<Suspense fallback={<div className={chartView === 'treemap' ? 'min-h-[600px]' : 'min-h-[360px]'} />}>
								{chartView === 'pie' ? (
									<PieChart
										chartData={deferredSelectedPieChartData}
										stackColors={valueSortedPieChartStackColors}
										radius={pieChartRadius}
										legendPosition={pieChartLegendPosition}
										legendTextStyle={pieChartLegendTextStyle}
										onReady={handlePieChartReady}
									/>
								) : chartView === 'hbar' ? (
									<HBarChart
										categories={selectedBarChartCategories}
										values={selectedBarChartValues}
										colors={selectedBarChartColors}
										valueSymbol="$"
										onReady={handleBarChartReady}
									/>
								) : (
									<TreemapChart
										treeData={treemapTreeData}
										variant="rwa"
										height="600px"
										onReady={handleTreemapChartReady}
										valueLabel={chartMetricLabel}
									/>
								)}
							</Suspense>
						</div>
					) : null}
				</>
			) : null}
			<RWAAssetsTable assets={filteredAssets} selectedChain={props.selectedChain} />
		</>
	)
}

const getRWAOverviewMode = (props: IRWAAssetsOverview): RWAOverviewMode => {
	if (props.assetGroupLinks.length > 0) return 'assetGroup'
	if (props.categoryLinks.length > 0) return 'category'
	if (props.platformLinks.length > 0) return 'platform'
	return 'chain'
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

const getRwaChartAggregationMode = (state: RWAChartBreakdown | 'total'): RWAChartAggregationMode => {
	switch (state) {
		case 'total':
			return state
		case 'assetGroup':
		case 'category':
		case 'assetClass':
		case 'assetName':
		case 'platform':
			return state
		case 'chain':
			throw new Error('Chain breakdown is not valid for time-series charts')
		default:
			return assertNever(state)
	}
}

const getTickerChartTarget = (props: IRWAAssetsOverview): RWATickerChartTarget => {
	if (props.assetGroupSlug) return { kind: 'assetGroup', slug: props.assetGroupSlug }
	if (props.categorySlug) return { kind: 'category', slug: props.categorySlug }
	if (props.platformSlug) return { kind: 'platform', slug: props.platformSlug }
	if (props.chainSlug) return { kind: 'chain', slug: props.chainSlug }
	return { kind: 'all' }
}

const getModeLinks = (
	mode: RWAOverviewMode,
	chainLinks: IRWAAssetsOverview['chainLinks'],
	categoryLinks: IRWAAssetsOverview['categoryLinks'],
	platformLinks: IRWAAssetsOverview['platformLinks'],
	assetGroupLinks: IRWAAssetsOverview['assetGroupLinks']
) => {
	if (mode === 'assetGroup') return assetGroupLinks
	if (mode === 'category') return categoryLinks
	if (mode === 'platform') return platformLinks
	return chainLinks
}

const getSelectedModeLabel = (mode: RWAOverviewMode, props: IRWAAssetsOverview) => {
	if (mode === 'assetGroup') return props.selectedAssetGroup
	if (mode === 'category') return props.selectedCategory
	if (mode === 'platform') return props.selectedPlatform
	return props.selectedChain
}

const getRwaExportChartTitle = ({
	mode,
	metricLabel,
	selectedModeLabel
}: {
	mode: RWAOverviewMode
	metricLabel: string
	selectedModeLabel: string
}) => {
	if (mode === 'assetGroup') return `RWA ${metricLabel} in ${selectedModeLabel}`
	if (mode === 'category') return `RWA ${metricLabel} by Category`
	if (!selectedModeLabel || selectedModeLabel === 'All') return `RWA ${metricLabel}`
	return `RWA ${metricLabel} on ${selectedModeLabel}`
}

const pieChartRadius = ['50%', '70%'] as [string, string]
const pieChartLegendPosition = {
	left: 'center',
	top: 'bottom',
	orient: 'horizontal',
	formatter: function (name: string) {
		return name
	}
} as const
const pieChartLegendTextStyle = { fontSize: 14 }
const MAX_HORIZONTAL_BARS = 9
