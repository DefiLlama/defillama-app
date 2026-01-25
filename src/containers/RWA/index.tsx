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
import { useFilteredRwaAssets, useRwaAssetsSummary, useRWATableQueryParams } from './hooks'
import { IRWAAssetsOverview } from './queries'
import {
	useRwaAssetNamePieChartData,
	useRwaCategoryAssetClassPieChartData,
	useRwaChainPieChartData
} from './useRwaPieChartData'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMarketcap: { label: string; description: string }
	totalActiveMarketcap: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const router = useRouter()

	const isChainMode = props.chains.length > 0
	const isCategoryMode = props.categoryLinks.length > 0
	const isPlatformMode = props.platformLinks.length > 0

	const {
		selectedAssetNames,
		selectedCategories,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
		minDefiActiveTvlToOnChainPct,
		maxDefiActiveTvlToOnChainPct,
		minActiveMcapToOnChainPct,
		maxActiveMcapToOnChainPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct,
		includeStablecoins,
		includeGovernance,
		setDefiActiveTvlToOnChainPctRange,
		setActiveMcapToOnChainPctRange,
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

	const filteredAssets = useFilteredRwaAssets({
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
		minDefiActiveTvlToOnChainPct,
		maxDefiActiveTvlToOnChainPct,
		minActiveMcapToOnChainPct,
		maxActiveMcapToOnChainPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct
	})

	const {
		totalOnChainRwaValue,
		totalActiveMarketcap,
		totalOnChainStablecoinValue,
		totalOnChainDeFiActiveTvl,
		issuersCount
	} = useRwaAssetsSummary(filteredAssets)

	const {
		totalOnChainRwaPieChartData: chainOnChainPieChartData,
		activeMarketcapPieChartData: chainActiveMarketcapPieChartData,
		defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
		pieChartStackColors: chainPieChartStackColors
	} = useRwaChainPieChartData({
		enabled: isChainMode,
		assets: filteredAssets,
		categories: props.categories,
		selectedCategories
	})

	const {
		assetClassOnChainPieChartData,
		assetClassActiveMarketcapPieChartData,
		assetClassDefiActiveTvlPieChartData,
		assetClassPieChartStackColors
	} = useRwaCategoryAssetClassPieChartData({
		enabled: isCategoryMode,
		assets: filteredAssets,
		assetClasses: props.assetClasses,
		selectedAssetClasses
	})

	const {
		assetNameOnChainPieChartData,
		assetNameActiveMarketcapPieChartData,
		assetNameDefiActiveTvlPieChartData,
		assetNamePieChartStackColors
	} = useRwaAssetNamePieChartData({
		enabled: isPlatformMode,
		assets: filteredAssets,
		selectedAssetNames
	})

	// Select pie chart breakdown based on route mode (same precedence as nav links).
	const { onChainPieChartData, activeMarketcapPieChartData, defiActiveTvlPieChartData, pieChartStackColors } =
		useMemo(() => {
			if (isCategoryMode) {
				return {
					onChainPieChartData: assetClassOnChainPieChartData,
					activeMarketcapPieChartData: assetClassActiveMarketcapPieChartData,
					defiActiveTvlPieChartData: assetClassDefiActiveTvlPieChartData,
					pieChartStackColors: assetClassPieChartStackColors
				}
			}

			if (isPlatformMode) {
				return {
					onChainPieChartData: assetNameOnChainPieChartData,
					activeMarketcapPieChartData: assetNameActiveMarketcapPieChartData,
					defiActiveTvlPieChartData: assetNameDefiActiveTvlPieChartData,
					pieChartStackColors: assetNamePieChartStackColors
				}
			}

			return {
				onChainPieChartData: chainOnChainPieChartData,
				activeMarketcapPieChartData: chainActiveMarketcapPieChartData,
				defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
				pieChartStackColors: chainPieChartStackColors
			}
		}, [
			assetClassActiveMarketcapPieChartData,
			assetClassDefiActiveTvlPieChartData,
			assetClassOnChainPieChartData,
			assetClassPieChartStackColors,
			assetNameActiveMarketcapPieChartData,
			assetNameDefiActiveTvlPieChartData,
			assetNameOnChainPieChartData,
			assetNamePieChartStackColors,
			chainActiveMarketcapPieChartData,
			chainDefiActiveTvlPieChartData,
			chainOnChainPieChartData,
			chainPieChartStackColors,
			isCategoryMode,
			isPlatformMode
		])

	// Preserve filter/toggle query params only in chain mode.
	// (The chain/category/platform itself is in the pathname, so we strip the dynamic param from the query object.)
	const navLinks = useMemo(() => {
		const baseLinks = isCategoryMode ? props.categoryLinks : isPlatformMode ? props.platformLinks : props.chains

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
		props.chains,
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
				minDefiActiveTvlToOnChainPct={minDefiActiveTvlToOnChainPct}
				maxDefiActiveTvlToOnChainPct={maxDefiActiveTvlToOnChainPct}
				minActiveMcapToOnChainPct={minActiveMcapToOnChainPct}
				maxActiveMcapToOnChainPct={maxActiveMcapToOnChainPct}
				minDefiActiveTvlToActiveMcapPct={minDefiActiveTvlToActiveMcapPct}
				maxDefiActiveTvlToActiveMcapPct={maxDefiActiveTvlToActiveMcapPct}
				setDefiActiveTvlToOnChainPctRange={setDefiActiveTvlToOnChainPctRange}
				setActiveMcapToOnChainPctRange={setActiveMcapToOnChainPctRange}
				setDefiActiveTvlToActiveMcapPctRange={setDefiActiveTvlToActiveMcapPctRange}
				includeStablecoins={includeStablecoins}
				includeGovernance={includeGovernance}
				setIncludeStablecoins={setIncludeStablecoins}
				setIncludeGovernance={setIncludeGovernance}
			/>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalOnChainMarketcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total RWA Onchain
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainRwaValue, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalActiveMarketcap.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total RWA Active Marketcap
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalActiveMarketcap, true)}</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalAssetIssuers.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Asset Issuers
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(issuersCount, false)}</span>
				</p>
				{isChainMode ? (
					<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
						<Tooltip
							content={definitions.totalStablecoinsValue.description}
							className="text-(--text-label) underline decoration-dotted"
						>
							Total Stablecoins Value
						</Tooltip>
						<span className="font-jetbrains text-2xl font-medium">
							{formattedNum(totalOnChainStablecoinValue, true)}
						</span>
					</p>
				) : null}
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalDefiActiveTvl.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						DeFi Active TVL
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainDeFiActiveTvl, true)}</span>
				</p>
			</div>
			{showCharts ? (
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
							<Tooltip
								content={definitions.totalOnChainMarketcap.description}
								className="text-lg font-semibold underline decoration-dotted"
								render={<h2 />}
							>
								{definitions.totalOnChainMarketcap.label}
							</Tooltip>
							<DownloadPieChartCsv
								filename={
									[
										'rwa-pie',
										slug(definitions.totalOnChainMarketcap.label),
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
						</div>
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
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
							<Tooltip
								content={definitions.totalActiveMarketcap.description}
								className="text-lg font-semibold underline decoration-dotted"
								render={<h2 />}
							>
								{definitions.totalActiveMarketcap.label}
							</Tooltip>
							<DownloadPieChartCsv
								filename={
									[
										'rwa-pie',
										slug(definitions.totalActiveMarketcap.label),
										props.selectedChain !== 'All' ? props.selectedChain.toLowerCase() : null,
										props.selectedCategory !== 'All' ? slug(props.selectedCategory) : null,
										props.selectedPlatform !== 'All' ? slug(props.selectedPlatform) : null
									]
										.filter(Boolean)
										.join('-') + '.csv'
								}
								chartData={activeMarketcapPieChartData}
								smol
							/>
						</div>
						<Suspense fallback={<div className="h-[360px]" />}>
							<PieChart
								chartData={activeMarketcapPieChartData}
								stackColors={pieChartStackColors}
								radius={pieChartRadius}
								legendPosition={pieChartLegendPosition}
								legendTextStyle={pieChartLegendTextStyle}
							/>
						</Suspense>
					</div>
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
							<Tooltip
								content={definitions.totalDefiActiveTvl.description}
								className="text-lg font-semibold underline decoration-dotted"
								render={<h2 />}
							>
								{definitions.totalDefiActiveTvl.label}
							</Tooltip>
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
						</div>
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
