import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { ChartRestoreButton } from '~/components/ButtonStyled/ChartRestoreButton'
import type { IMultiSeriesChart2Props, IPieChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Select } from '~/components/Select/Select'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { formattedNum, slug } from '~/utils'
import type { IRWAAssetsOverview } from './api.types'
import { RWAAssetsTable } from './AssetsTable'
import { definitions } from './definitions'
import { RWAOverviewFilters } from './Filters'
import {
	useFilteredRwaAssets,
	useRWATableQueryParams,
	useRWAAssetCategoryPieChartData,
	useRwaAssetNamePieChartData,
	useRwaAssetPlatformPieChartData,
	useRwaCategoryAssetClassPieChartData,
	useRwaChainBreakdownPieChartData,
	useRwaChartDataByAssetClass,
	useRwaChartDataByAssetName,
	useRwaChartDataByCategory
} from './hooks'
import { rwaSlug } from './rwaSlug'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
interface ITreemapChartProps {
	treeData: RwaTreemapNode[]
	variant?: 'yields' | 'narrative' | 'rwa'
	height?: string
	onReady?: (instance: echarts.ECharts | null) => void
	valueLabel?: string
}
const TreemapChart = lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

type RWAChartType = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'
type RWAOverviewMode = 'chain' | 'category' | 'platform'
type RwaPieChartDatum = { name: string; value: number }
type RwaTreemapNode = {
	name: string
	path: string
	value: [number, number | null, number | null]
	itemStyle?: { color?: string }
	children?: RwaTreemapNode[]
}

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const router = useRouter()

	const mode = getRWAOverviewMode(props)
	const isChainMode = mode === 'chain'
	const isCategoryMode = mode === 'category'
	const isPlatformMode = mode === 'platform'
	const nonTimeSeriesChartBreakdown =
		typeof router.query.nonTimeSeriesChartBreakdown === 'string' ? router.query.nonTimeSeriesChartBreakdown : null
	const chartType =
		typeof router.query.chartType === 'string' && validPieChartTypes.has(router.query.chartType)
			? router.query.chartType
			: 'activeMcap'
	const chartView =
		typeof router.query.chartView === 'string' &&
		(router.query.chartView === 'pie' || router.query.chartView === 'treemap')
			? router.query.chartView
			: 'timeSeries'
	const chartTypeKey = chartType as RWAChartType

	const {
		selectedAssetNames,
		selectedTypes,
		selectedCategories,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
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
		setIncludeGovernance
	} = useRWATableQueryParams({
		assetNames: props.assetNames,
		types: props.types,
		categories: props.categories,
		assetClasses: props.assetClasses,
		rwaClassifications: props.rwaClassifications,
		accessModels: props.accessModels,
		issuers: props.issuers,
		defaultIncludeStablecoins: !isChainMode,
		defaultIncludeGovernance: !isChainMode
	})

	const { filteredAssets, totalOnChainMcap, totalActiveMcap, totalOnChainDeFiActiveTvl, totalIssuersCount } =
		useFilteredRwaAssets({
			assets: props.assets,
			isPlatformMode,
			selectedAssetNames,
			selectedCategories,
			selectedAssetClasses,
			selectedRwaClassifications,
			selectedAccessModels,
			selectedIssuers,
			selectedTypes,
			includeStablecoins,
			includeGovernance,
			minDefiActiveTvlToOnChainMcapPct,
			maxDefiActiveTvlToOnChainMcapPct,
			minActiveMcapToOnChainMcapPct,
			maxActiveMcapToOnChainMcapPct,
			minDefiActiveTvlToActiveMcapPct,
			maxDefiActiveTvlToActiveMcapPct
		})

	const { chartDatasetByCategory } = useRwaChartDataByCategory({
		enabled: isChainMode,
		assets: filteredAssets,
		chartDataByTicker: props.chartData
	})

	const { chartDatasetByAssetClass } = useRwaChartDataByAssetClass({
		enabled: isCategoryMode,
		assets: filteredAssets,
		chartDataByTicker: props.chartData
	})

	const { chartDatasetByAssetName } = useRwaChartDataByAssetName({
		enabled: isPlatformMode,
		assets: filteredAssets,
		chartDataByTicker: props.chartData
	})

	const {
		assetCategoryOnChainMcapPieChartData,
		assetCategoryActiveMcapPieChartData,
		assetCategoryDefiActiveTvlPieChartData,
		pieChartStackColors: assetCategoryPieChartStackColors
	} = useRWAAssetCategoryPieChartData({
		enabled: isChainMode,
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
		enabled: isCategoryMode || isChainMode,
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
		enabled: isPlatformMode,
		assets: filteredAssets,
		selectedAssetNames
	})

	const {
		assetPlatformOnChainMcapPieChartData,
		assetPlatformActiveMcapPieChartData,
		assetPlatformDefiActiveTvlPieChartData,
		assetPlatformPieChartStackColors
	} = useRwaAssetPlatformPieChartData({
		enabled: isChainMode,
		assets: filteredAssets
	})

	const canBreakdownByChain = isCategoryMode || isPlatformMode || props.selectedChain === 'All'
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
			if (canBreakdownByChain && nonTimeSeriesChartBreakdown === 'chain') {
				return {
					onChainPieChartData: chainOnChainMcapPieChartData,
					activeMcapPieChartData: chainActiveMcapPieChartData,
					defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
					pieChartStackColors: chainPieChartStackColors
				}
			}

			if (isChainMode && nonTimeSeriesChartBreakdown === 'platform') {
				return {
					onChainPieChartData: assetPlatformOnChainMcapPieChartData,
					activeMcapPieChartData: assetPlatformActiveMcapPieChartData,
					defiActiveTvlPieChartData: assetPlatformDefiActiveTvlPieChartData,
					pieChartStackColors: assetPlatformPieChartStackColors
				}
			}

			if (isChainMode && nonTimeSeriesChartBreakdown === 'assetClass') {
				return {
					onChainPieChartData: assetClassOnChainMcapPieChartData,
					activeMcapPieChartData: assetClassActiveMcapPieChartData,
					defiActiveTvlPieChartData: assetClassDefiActiveTvlPieChartData,
					pieChartStackColors: assetClassPieChartStackColors
				}
			}

			if (isCategoryMode) {
				return {
					onChainPieChartData: assetClassOnChainMcapPieChartData,
					activeMcapPieChartData: assetClassActiveMcapPieChartData,
					defiActiveTvlPieChartData: assetClassDefiActiveTvlPieChartData,
					pieChartStackColors: assetClassPieChartStackColors
				}
			}

			if (isPlatformMode) {
				return {
					onChainPieChartData: assetNameOnChainMcapPieChartData,
					activeMcapPieChartData: assetNameActiveMcapPieChartData,
					defiActiveTvlPieChartData: assetNameDefiActiveTvlPieChartData,
					pieChartStackColors: assetNamePieChartStackColors
				}
			}

			return {
				onChainPieChartData: assetCategoryOnChainMcapPieChartData,
				activeMcapPieChartData: assetCategoryActiveMcapPieChartData,
				defiActiveTvlPieChartData: assetCategoryDefiActiveTvlPieChartData,
				pieChartStackColors: assetCategoryPieChartStackColors
			}
		}, [
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
			isChainMode,
			isCategoryMode,
			isPlatformMode,
			canBreakdownByChain,
			nonTimeSeriesChartBreakdown,
			chainOnChainMcapPieChartData,
			chainActiveMcapPieChartData,
			chainDefiActiveTvlPieChartData,
			chainPieChartStackColors
		])

	// Preserve filter/toggle query params only in chain mode.
	// (The chain/category/platform itself is in the pathname, so we strip the dynamic param from the query object.)
	const navLinks = useMemo(() => {
		const baseLinks = getModeLinks(mode, props.chainLinks, props.categoryLinks, props.platformLinks)

		// Only preserve query filters/toggles on chain mode. In category/platform mode, links should be "clean".
		const shouldPreserveQuery = isChainMode
		if (!shouldPreserveQuery) return baseLinks

		const { chain: _chain, category: _category, platform: _platform, ...restQuery } = router.query
		const qs = toQueryString(restQuery as Record<string, string | string[] | undefined>)
		if (!qs) return baseLinks
		return baseLinks.map((link) => ({ ...link, to: `${link.to}${qs}` }))
	}, [isChainMode, mode, props.categoryLinks, props.platformLinks, props.chainLinks, router.query])

	const showFilters =
		(props.typeOptions.length > 1 ||
			props.categoriesOptions.length > 1 ||
			props.assetClassOptions.length > 1 ||
			props.rwaClassificationOptions.length > 1 ||
			props.accessModelOptions.length > 1 ||
			props.issuers.length > 1) &&
		props.assets.length > 1

	const showCharts = props.assets.length > 1

	const { chartInstance: multiSeriesChart2Instance, handleChartReady: handleMultiSeriesChart2Ready } =
		useChartImageExport()
	const chartMetricLabel =
		chartType === 'onChainMcap' ? 'Onchain Mcap' : chartType === 'activeMcap' ? 'Active Mcap' : 'DeFi Active TVL'
	const selectedModeLabel = getSelectedModeLabel(mode, props)
	const exportChartTitle = getRwaExportChartTitle({
		mode,
		metricLabel: chartMetricLabel,
		selectedModeLabel
	})
	const timeSeriesChartFilename = `rwa-time-series-chart-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`
	const { chartInstance: pieChartInstance, handleChartReady: handlePieChartReady } = useChartImageExport()
	const pieChartFilename = `rwa-pie-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`
	const { chartInstance: treemapChartInstance, handleChartReady: handleTreemapChartReady } = useChartImageExport()
	const treemapChartFilename = `rwa-treemap-${slug(chartMetricLabel)}-${rwaSlug(selectedModeLabel)}`

	const chartDatasetByMode =
		mode === 'category'
			? chartDatasetByAssetClass
			: mode === 'platform'
				? chartDatasetByAssetName
				: chartDatasetByCategory

	const selectedTimeSeriesDataset = chartDatasetByMode[chartTypeKey] ?? chartDatasetByMode.onChainMcap
	const selectedPieChartData =
		chartTypeKey === 'onChainMcap'
			? onChainPieChartData
			: chartTypeKey === 'activeMcap'
				? activeMcapPieChartData
				: defiActiveTvlPieChartData
	const valueSortedPieChartStackColors = useMemo(() => {
		const stackColors = { ...pieChartStackColors }
		const sortedData = [...selectedPieChartData]
			.filter((item) => Number.isFinite(item.value) && item.value > 0)
			.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))

		for (const [index, item] of sortedData.entries()) {
			stackColors[item.name] = CHART_COLORS[index % CHART_COLORS.length]
		}

		return stackColors
	}, [pieChartStackColors, selectedPieChartData])

	const chartTypeSwitch = (
		<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			{PIE_CHART_TYPES.map(({ key, label }) => (
				<button
					key={`pie-chart-type-${key}`}
					className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
					data-active={chartType === key}
					onClick={() => {
						router.push({ pathname: router.pathname, query: { ...router.query, chartType: key } }, undefined, {
							shallow: true
						})
					}}
				>
					{label}
				</button>
			))}
		</div>
	)

	const chartViewSwitch = (
		<Select
			allValues={CHART_VIEW_OPTIONS}
			selectedValues={chartView}
			setSelectedValues={(value) => {
				const selectedView = Array.isArray(value) ? value[0] : value

				if (selectedView === 'pie' || selectedView === 'treemap') {
					router.push({ pathname: router.pathname, query: { ...router.query, chartView: selectedView } }, undefined, {
						shallow: true
					})
					return
				}

				const {
					chartView: _chartView,
					nonTimeSeriesChartBreakdown: _nonTimeSeriesChartBreakdown,
					pieChartBreakdown: _pieChartBreakdown,
					...restQuery
				} = router.query
				router.push({ pathname: router.pathname, query: { ...restQuery } }, undefined, { shallow: true })
			}}
			label={chartView === 'pie' ? 'Pie Chart' : chartView === 'treemap' ? 'Treemap Chart' : 'Time Series'}
			labelType="none"
			variant="filter"
		/>
	)

	const pieChartBreakdownDefaultLabel =
		mode === 'chain' ? 'Asset Category' : mode === 'category' ? 'Asset Class' : 'Asset Name'
	const pieChartBreakdownOptions = isChainMode
		? [
				{ key: 'default', name: pieChartBreakdownDefaultLabel },
				{ key: 'assetClass', name: 'Asset Class' },
				{ key: 'platform', name: 'Asset Platform' },
				...(canBreakdownByChain ? [{ key: 'chain', name: 'Chain' }] : [])
			]
		: [
				{ key: 'default', name: pieChartBreakdownDefaultLabel },
				{ key: 'chain', name: 'Chain' }
			]
	const selectedPieChartBreakdown =
		nonTimeSeriesChartBreakdown === 'chain' && canBreakdownByChain
			? 'chain'
			: isChainMode && nonTimeSeriesChartBreakdown === 'platform'
				? 'platform'
				: isChainMode && nonTimeSeriesChartBreakdown === 'assetClass'
					? 'assetClass'
					: 'default'
	const selectedPieChartBreakdownLabel =
		selectedPieChartBreakdown === 'chain'
			? 'Chain'
			: selectedPieChartBreakdown === 'platform'
				? 'Asset Platform'
				: selectedPieChartBreakdown === 'assetClass'
					? 'Asset Class'
					: pieChartBreakdownDefaultLabel
	const pieChartBreakdownSwitch = (
		<Select
			allValues={pieChartBreakdownOptions}
			selectedValues={selectedPieChartBreakdown}
			setSelectedValues={(value) => {
				const selectedBreakdown = Array.isArray(value) ? value[0] : value

				if (selectedBreakdown === 'chain' && canBreakdownByChain) {
					router.push(
						{
							pathname: router.pathname,
							query: { ...router.query, nonTimeSeriesChartBreakdown: 'chain' }
						},
						undefined,
						{ shallow: true }
					)
					return
				}

				if (selectedBreakdown === 'chain') {
					const { nonTimeSeriesChartBreakdown: _nonTimeSeriesChartBreakdown, ...restQuery } = router.query
					router.push(
						{
							pathname: router.pathname,
							query: { ...restQuery }
						},
						undefined,
						{ shallow: true }
					)
					return
				}

				if (selectedBreakdown === 'platform') {
					router.push(
						{
							pathname: router.pathname,
							query: { ...router.query, nonTimeSeriesChartBreakdown: 'platform' }
						},
						undefined,
						{ shallow: true }
					)
					return
				}

				if (selectedBreakdown === 'assetClass') {
					router.push(
						{
							pathname: router.pathname,
							query: { ...router.query, nonTimeSeriesChartBreakdown: 'assetClass' }
						},
						undefined,
						{ shallow: true }
					)
					return
				}

				const { nonTimeSeriesChartBreakdown: _nonTimeSeriesChartBreakdown, ...restQuery } = router.query
				router.push(
					{
						pathname: router.pathname,
						query: { ...restQuery }
					},
					undefined,
					{ shallow: true }
				)
			}}
			label={selectedPieChartBreakdownLabel}
			labelType="none"
			variant="filter"
		/>
	)

	const treemapTreeData = useMemo(() => {
		if (chartView !== 'treemap') return []
		return buildRwaTreemapTreeData(selectedPieChartData, selectedPieChartBreakdownLabel, valueSortedPieChartStackColors)
	}, [chartView, selectedPieChartData, selectedPieChartBreakdownLabel, valueSortedPieChartStackColors])

	return (
		<>
			<RowLinksWithDropdown links={navLinks} activeLink={selectedModeLabel} />
			<RWAOverviewFilters
				enabled={showFilters}
				modes={{
					isChainMode,
					isPlatformMode
				}}
				options={{
					assetNames: props.assetNames,
					typeOptions: props.typeOptions,
					categoriesOptions: props.categoriesOptions,
					assetClassOptions: props.assetClassOptions,
					rwaClassificationOptions: props.rwaClassificationOptions,
					accessModelOptions: props.accessModelOptions,
					issuers: props.issuers
				}}
				selections={{
					selectedAssetNames,
					selectedTypes,
					selectedCategories,
					selectedAssetClasses,
					selectedRwaClassifications,
					selectedAccessModels,
					selectedIssuers,
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
					setIncludeGovernance
				}}
			/>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
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
						content={definitions.totalActiveMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						{definitions.totalActiveMcap.label}
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalActiveMcap, true)}</span>
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
								<ChartCsvExportButton chartInstance={multiSeriesChart2Instance} filename={timeSeriesChartFilename} />
								<ChartPngExportButton
									chartInstance={multiSeriesChart2Instance}
									filename={timeSeriesChartFilename}
									title={exportChartTitle}
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={selectedTimeSeriesDataset}
									hideDefaultLegend={false}
									stacked
									showTotalInTooltip
									tooltipTotalPosition="top"
									onReady={handleMultiSeriesChart2Ready}
								/>
							</Suspense>
						</div>
					) : null}
					{chartView === 'pie' || chartView === 'treemap' ? (
						<div
							className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${
								chartView === 'treemap' ? 'min-h-[652px]' : 'min-h-[412px]'
							}`}
						>
							<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
								{chartTypeSwitch}
								{chartViewSwitch}
								{pieChartBreakdownSwitch}
								{chartView === 'treemap' ? <ChartRestoreButton chartInstance={treemapChartInstance} /> : null}
								{chartView === 'pie' || chartView === 'treemap' ? (
									<ChartCsvExportButton
										chartInstance={chartView === 'treemap' ? treemapChartInstance : pieChartInstance}
										filename={chartView === 'treemap' ? treemapChartFilename : pieChartFilename}
									/>
								) : null}
								<ChartPngExportButton
									chartInstance={chartView === 'treemap' ? treemapChartInstance : pieChartInstance}
									filename={chartView === 'treemap' ? treemapChartFilename : `${pieChartFilename}.png`}
									title={exportChartTitle}
								/>
							</div>
							<Suspense fallback={<div className={chartView === 'treemap' ? 'min-h-[600px]' : 'min-h-[360px]'} />}>
								{chartView === 'pie' ? (
									<PieChart
										chartData={selectedPieChartData}
										stackColors={valueSortedPieChartStackColors}
										radius={pieChartRadius}
										legendPosition={pieChartLegendPosition}
										legendTextStyle={pieChartLegendTextStyle}
										onReady={handlePieChartReady}
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

const toQueryString = (query: Record<string, string | string[] | undefined>): string => {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(query)) {
		if (value == null) continue
		if (Array.isArray(value)) {
			for (const v of value) {
				if (!v) continue
				params.append(key, String(v))
			}
		} else if (value) {
			params.set(key, String(value))
		}
	}
	const qs = params.toString()
	return qs ? `?${qs}` : ''
}

const getRWAOverviewMode = (props: IRWAAssetsOverview): RWAOverviewMode => {
	if (props.categoryLinks.length > 0) return 'category'
	if (props.platformLinks.length > 0) return 'platform'
	return 'chain'
}

const getModeLinks = (
	mode: RWAOverviewMode,
	chainLinks: IRWAAssetsOverview['chainLinks'],
	categoryLinks: IRWAAssetsOverview['categoryLinks'],
	platformLinks: IRWAAssetsOverview['platformLinks']
) => {
	if (mode === 'category') return categoryLinks
	if (mode === 'platform') return platformLinks
	return chainLinks
}

const getSelectedModeLabel = (mode: RWAOverviewMode, props: IRWAAssetsOverview) => {
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
	if (mode === 'category') return `RWA ${metricLabel} by Category`
	if (!selectedModeLabel || selectedModeLabel === 'All') return `RWA ${metricLabel}`
	return `RWA ${metricLabel} on ${selectedModeLabel}`
}

const buildRwaTreemapTreeData = (
	pieData: RwaPieChartDatum[],
	breakdownLabel: string,
	stackColors: Record<string, string>
): RwaTreemapNode[] => {
	const data = (pieData ?? []).filter((item) => Number.isFinite(item.value) && item.value > 0)
	if (data.length === 0) return []

	const total = data.reduce((sum, item) => sum + item.value, 0)
	const rootLabel = breakdownLabel || 'Breakdown'
	const children: RwaTreemapNode[] = data.map((item, index) => {
		const sharePct = total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0
		return {
			name: item.name,
			path: `${rootLabel}/${item.name}`,
			value: [item.value, sharePct, sharePct],
			itemStyle: { color: stackColors[item.name] ?? CHART_COLORS[index % CHART_COLORS.length] }
		}
	})

	return [
		{
			name: rootLabel,
			path: rootLabel,
			value: [total, 100, 100],
			children
		}
	]
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

const PIE_CHART_TYPES = [
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const CHART_VIEW_OPTIONS = [
	{ key: 'timeSeries', name: 'Time Series Chart' },
	{ key: 'pie', name: 'Pie Chart' },
	{ key: 'treemap', name: 'Treemap Chart' }
]

const validPieChartTypes = new Set(PIE_CHART_TYPES.map(({ key }) => key))
