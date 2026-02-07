import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import type { IMultiSeriesChart2Props, IPieChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Tooltip } from '~/components/Tooltip'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum, slug } from '~/utils'
import { RWAAssetsTable } from './AssetsTable'
import { DownloadPieChartCsv } from './DownloadPieChartCsv'
import { RWAOverviewFilters } from './Filters'
import {
	useFilteredRwaAssets,
	useRWATableQueryParams,
	useRWAAssetCategoryPieChartData,
	useRwaAssetNamePieChartData,
	useRwaCategoryAssetClassPieChartData,
	useRwaChainBreakdownPieChartData,
	useRwaChartDataByAssetClass,
	useRwaChartDataByAssetName,
	useRwaChartDataByCategory
} from './hooks'
import { IRWAAssetsOverview } from './queries'
import { rwaSlug } from './rwaSlug'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

type RWAChartType = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMcap: { label: string; description: string }
	totalActiveMcap: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const router = useRouter()

	const isChainMode = props.chainLinks.length > 0
	const isCategoryMode = props.categoryLinks.length > 0
	const isPlatformMode = props.platformLinks.length > 0
	const pieChartBreakdown = typeof router.query.pieChartBreakdown === 'string' ? router.query.pieChartBreakdown : null
	const chartType =
		typeof router.query.chartType === 'string' && validPieChartTypes.has(router.query.chartType)
			? router.query.chartType
			: 'activeMcap'
	const chartView =
		typeof router.query.chartView === 'string' && router.query.chartView === 'pie' ? 'pie' : 'timeSeries'
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
		enabled: isCategoryMode,
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

	const isChainBreakdownEnabled = isCategoryMode || isPlatformMode || props.selectedChain === 'All'
	const {
		chainOnChainMcapPieChartData,
		chainActiveMcapPieChartData,
		chainDefiActiveTvlPieChartData,
		chainPieChartStackColors
	} = useRwaChainBreakdownPieChartData({
		enabled: isChainBreakdownEnabled,
		assets: filteredAssets
	})

	// Select pie chart breakdown based on route mode (same precedence as nav links).
	const { onChainPieChartData, activeMcapPieChartData, defiActiveTvlPieChartData, pieChartStackColors } =
		useMemo(() => {
			if (isChainBreakdownEnabled && pieChartBreakdown === 'chain') {
				return {
					onChainPieChartData: chainOnChainMcapPieChartData,
					activeMcapPieChartData: chainActiveMcapPieChartData,
					defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
					pieChartStackColors: chainPieChartStackColors
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
			assetCategoryActiveMcapPieChartData,
			assetCategoryDefiActiveTvlPieChartData,
			assetCategoryOnChainMcapPieChartData,
			assetCategoryPieChartStackColors,
			isCategoryMode,
			isPlatformMode,
			isChainBreakdownEnabled,
			pieChartBreakdown,
			chainOnChainMcapPieChartData,
			chainActiveMcapPieChartData,
			chainDefiActiveTvlPieChartData,
			chainPieChartStackColors
		])

	// Preserve filter/toggle query params only in chain mode.
	// (The chain/category/platform itself is in the pathname, so we strip the dynamic param from the query object.)
	const navLinks = useMemo(() => {
		const baseLinks = isCategoryMode ? props.categoryLinks : isPlatformMode ? props.platformLinks : props.chainLinks

		// Only preserve query filters/toggles on chain mode. In category/platform mode, links should be "clean".
		const shouldPreserveQuery = isChainMode && !isCategoryMode && !isPlatformMode
		if (!shouldPreserveQuery) return baseLinks

		const { chain: _chain, category: _category, platform: _platform, ...restQuery } = router.query
		const qs = toQueryString(restQuery as Record<string, string | string[] | undefined>)
		if (!qs) return baseLinks
		return baseLinks.map((link) => ({ ...link, to: `${link.to}${qs}` }))
	}, [
		isChainMode,
		isCategoryMode,
		isPlatformMode,
		props.categoryLinks,
		props.platformLinks,
		props.chainLinks,
		router.query
	])

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
	const timeSeriesChartTitle =
		chartType === 'onChainMcap' ? 'Onchain Mcap' : chartType === 'activeMcap' ? 'Active Mcap' : 'DeFi Active TVL'
	const timeSeriesChartFilename = `rwa-time-series-chart-${slug(timeSeriesChartTitle)}-${rwaSlug(isChainMode ? props.selectedChain : isCategoryMode ? props.selectedCategory : props.selectedPlatform)}`
	const { chartInstance: pieChartInstance, handleChartReady: handlePieChartReady } = useChartImageExport()
	const pieChartTitle =
		chartType === 'onChainMcap' ? 'Onchain Mcap' : chartType === 'activeMcap' ? 'Active Mcap' : 'DeFi Active TVL'
	const pieChartFilename = `rwa-pie-${slug(pieChartTitle)}-${rwaSlug(isChainMode ? props.selectedChain : isCategoryMode ? props.selectedCategory : props.selectedPlatform)}`

	const chartDatasetByMode = isCategoryMode
		? chartDatasetByAssetClass
		: isPlatformMode
			? chartDatasetByAssetName
			: chartDatasetByCategory

	const selectedTimeSeriesDataset = chartDatasetByMode[chartTypeKey] ?? chartDatasetByMode.onChainMcap
	const selectedPieChartData =
		chartTypeKey === 'onChainMcap'
			? onChainPieChartData
			: chartTypeKey === 'activeMcap'
				? activeMcapPieChartData
				: defiActiveTvlPieChartData

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
		<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
			<button
				className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
				data-active={chartView === 'timeSeries'}
				onClick={() => {
					const { chartView: _chartView, ...restQuery } = router.query
					router.push({ pathname: router.pathname, query: { ...restQuery } }, undefined, { shallow: true })
				}}
			>
				Time Series
			</button>
			<button
				className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
				data-active={chartView === 'pie'}
				onClick={() => {
					router.push({ pathname: router.pathname, query: { ...router.query, chartView: 'pie' } }, undefined, {
						shallow: true
					})
				}}
			>
				Pie Chart
			</button>
		</div>
	)

	return (
		<>
			<RowLinksWithDropdown
				links={navLinks}
				activeLink={
					isCategoryMode ? props.selectedCategory : isPlatformMode ? props.selectedPlatform : props.selectedChain
				}
			/>
			<RWAOverviewFilters
				enabled={showFilters}
				isChainMode={isChainMode}
				isPlatformMode={isPlatformMode}
				assetNames={props.assetNames}
				selectedAssetNames={selectedAssetNames}
				typeOptions={props.typeOptions}
				categoriesOptions={props.categoriesOptions}
				assetClassOptions={props.assetClassOptions}
				rwaClassificationOptions={props.rwaClassificationOptions}
				accessModelOptions={props.accessModelOptions}
				issuers={props.issuers}
				selectedTypes={selectedTypes}
				selectedCategories={selectedCategories}
				selectedAssetClasses={selectedAssetClasses}
				selectedRwaClassifications={selectedRwaClassifications}
				selectedAccessModels={selectedAccessModels}
				selectedIssuers={selectedIssuers}
				minDefiActiveTvlToOnChainMcapPct={minDefiActiveTvlToOnChainMcapPct}
				maxDefiActiveTvlToOnChainMcapPct={maxDefiActiveTvlToOnChainMcapPct}
				minActiveMcapToOnChainMcapPct={minActiveMcapToOnChainMcapPct}
				maxActiveMcapToOnChainMcapPct={maxActiveMcapToOnChainMcapPct}
				minDefiActiveTvlToActiveMcapPct={minDefiActiveTvlToActiveMcapPct}
				maxDefiActiveTvlToActiveMcapPct={maxDefiActiveTvlToActiveMcapPct}
				setDefiActiveTvlToOnChainMcapPctRange={setDefiActiveTvlToOnChainMcapPctRange}
				setActiveMcapToOnChainMcapPctRange={setActiveMcapToOnChainMcapPctRange}
				setDefiActiveTvlToActiveMcapPctRange={setDefiActiveTvlToActiveMcapPctRange}
				includeStablecoins={includeStablecoins}
				includeGovernance={includeGovernance}
				setIncludeStablecoins={setIncludeStablecoins}
				setIncludeGovernance={setIncludeGovernance}
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
									title={timeSeriesChartTitle}
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={selectedTimeSeriesDataset}
									hideDefaultLegend={false}
									stacked
									onReady={handleMultiSeriesChart2Ready}
								/>
							</Suspense>
						</div>
					) : null}
					{chartView === 'pie' ? (
						<div className="flex min-h-[412px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="flex items-center justify-end gap-2 p-3 pb-0">
								{chartTypeSwitch}
								{chartViewSwitch}
								{isChainBreakdownEnabled ? (
									<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
										<button
											className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
											data-active={pieChartBreakdown !== 'chain'}
											onClick={() => {
												const { pieChartBreakdown: _pieChartBreakdown, ...restQuery } = router.query
												router.push(
													{
														pathname: router.pathname,
														query: { ...restQuery }
													},
													undefined,
													{ shallow: true }
												)
											}}
										>
											{isChainMode ? 'Asset Category' : isCategoryMode ? 'Asset Class' : 'Asset Name'}
										</button>
										<button
											className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
											data-active={pieChartBreakdown === 'chain'}
											onClick={() => {
												router.push(
													{
														pathname: router.pathname,
														query: { ...router.query, pieChartBreakdown: 'chain' }
													},
													undefined,
													{ shallow: true }
												)
											}}
										>
											Chain
										</button>
									</div>
								) : null}
								<DownloadPieChartCsv filename={`${pieChartFilename}.csv`} chartData={selectedPieChartData} smol />
								<ChartPngExportButton
									chartInstance={pieChartInstance}
									filename={`${pieChartFilename}.png`}
									title={pieChartTitle}
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<PieChart
									chartData={selectedPieChartData}
									stackColors={pieChartStackColors}
									radius={pieChartRadius}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
									onReady={handlePieChartReady}
								/>
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

const pieChartRadius = ['50%', '70%'] as [string, string]
const pieChartLegendPosition = {
	left: 'center',
	top: 'bottom',
	orient: 'horizontal',
	formatter: function (name) {
		return name
	}
} as any
const pieChartLegendTextStyle = { fontSize: 14 }

const PIE_CHART_TYPES = [
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const validPieChartTypes = new Set(PIE_CHART_TYPES.map(({ key }) => key))
