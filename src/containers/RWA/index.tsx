import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import type { IPieChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Tooltip } from '~/components/Tooltip'
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
	useRwaChainBreakdownPieChartData
} from './hooks'
import { IRWAAssetsOverview } from './queries'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

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
	const pieChartBreakdown = router.query.pieChartBreakdown
	const pieChartType =
		typeof router.query.pieChartType === 'string' && validPieChartTypes.has(router.query.pieChartType)
			? router.query.pieChartType
			: 'onChainMcap'

	const {
		selectedAssetNames,
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
			includeStablecoins,
			includeGovernance,
			minDefiActiveTvlToOnChainMcapPct,
			maxDefiActiveTvlToOnChainMcapPct,
			minActiveMcapToOnChainMcapPct,
			maxActiveMcapToOnChainMcapPct,
			minDefiActiveTvlToActiveMcapPct,
			maxDefiActiveTvlToActiveMcapPct
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
		(props.categoriesOptions.length > 1 ||
			props.assetClassOptions.length > 1 ||
			props.rwaClassificationOptions.length > 1 ||
			props.accessModelOptions.length > 1 ||
			props.issuers.length > 1) &&
		props.assets.length > 1

	const showCharts = props.assets.length > 1
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
				categoriesOptions={props.categoriesOptions}
				assetClassOptions={props.assetClassOptions}
				rwaClassificationOptions={props.rwaClassificationOptions}
				accessModelOptions={props.accessModelOptions}
				issuers={props.issuers}
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
						Total RWA Onchain
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainMcap, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalActiveMcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total RWA Active Marketcap
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalActiveMcap, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalDefiActiveTvl.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						DeFi Active TVL
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainDeFiActiveTvl, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalAssetIssuers.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Asset Issuers
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalIssuersCount, false)}</span>
				</p>
			</div>
			{showCharts ? (
				<div className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="m-3 mb-0 flex items-center justify-end gap-3">
						<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
							{PIE_CHART_TYPES.map(({ key, label }) => (
								<button
									key={`pie-chart-type-${key}`}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={pieChartType === key}
									onClick={() => {
										router.push(
											{ pathname: router.pathname, query: { ...router.query, pieChartType: key } },
											undefined,
											{ shallow: true }
										)
									}}
								>
									{label}
								</button>
							))}
						</div>
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
											{ pathname: router.pathname, query: { ...router.query, pieChartBreakdown: 'chain' } },
											undefined,
											{ shallow: true }
										)
									}}
								>
									Chain
								</button>
							</div>
						) : null}
						{pieChartType === 'onChainMcap' ? (
							<DownloadPieChartCsv
								filename={
									[
										'rwa-pie',
										slug(definitions.totalOnChainMcap.label),
										props.selectedChain !== 'All' ? props.selectedChain.toLowerCase() : null,
										props.selectedCategory !== 'All' ? slug(props.selectedCategory) : null,
										props.selectedPlatform !== 'All' ? slug(props.selectedPlatform) : null
									]
										.filter(Boolean)
										.join('-') + '.csv'
								}
								chartData={onChainPieChartData}
								smol
							/>
						) : pieChartType === 'activeMcap' ? (
							<DownloadPieChartCsv
								filename={
									[
										'rwa-pie',
										slug(definitions.totalActiveMcap.label),
										props.selectedChain !== 'All' ? props.selectedChain.toLowerCase() : null,
										props.selectedCategory !== 'All' ? slug(props.selectedCategory) : null,
										props.selectedPlatform !== 'All' ? slug(props.selectedPlatform) : null
									]
										.filter(Boolean)
										.join('-') + '.csv'
								}
								chartData={activeMcapPieChartData}
								smol
							/>
						) : pieChartType === 'defiActiveTvl' ? (
							<DownloadPieChartCsv
								filename={
									[
										'rwa-pie',
										slug(definitions.totalDefiActiveTvl.label),
										props.selectedChain !== 'All' ? props.selectedChain.toLowerCase() : null,
										props.selectedCategory !== 'All' ? slug(props.selectedCategory) : null,
										props.selectedPlatform !== 'All' ? slug(props.selectedPlatform) : null
									]
										.filter(Boolean)
										.join('-') + '.csv'
								}
								chartData={defiActiveTvlPieChartData}
								smol
							/>
						) : null}
					</div>
					{pieChartType === 'onChainMcap' ? (
						<div className="relative col-span-1 min-h-[368px]">
							<Suspense fallback={<div className="h-[360px]" />}>
								<PieChart
									chartData={onChainPieChartData}
									stackColors={pieChartStackColors}
									radius={pieChartRadius}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
								/>
							</Suspense>
						</div>
					) : pieChartType === 'activeMcap' ? (
						<div className="relative col-span-1 min-h-[368px]">
							<Suspense fallback={<div className="h-[360px]" />}>
								<PieChart
									chartData={activeMcapPieChartData}
									stackColors={pieChartStackColors}
									radius={pieChartRadius}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
								/>
							</Suspense>
						</div>
					) : pieChartType === 'defiActiveTvl' ? (
						<div className="relative col-span-1 min-h-[368px]">
							<Suspense fallback={<div className="h-[360px]" />}>
								<PieChart
									chartData={defiActiveTvlPieChartData}
									stackColors={pieChartStackColors}
									radius={pieChartRadius}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
								/>
							</Suspense>
						</div>
					) : null}
				</div>
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
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const validPieChartTypes = new Set(PIE_CHART_TYPES.map(({ key }) => key))
