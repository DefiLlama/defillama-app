import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import type { IPieChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
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

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

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
		minDefiActiveTvlToOnChainMcapPct,
		maxDefiActiveTvlToOnChainMcapPct,
		minActiveMcapToOnChainMcapPct,
		maxActiveMcapToOnChainMcapPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct
	})

	const { totalOnChainMcap, totalActiveMcap, totalOnChainStablecoinMcap, totalOnChainDeFiActiveTvl, issuersCount } =
		useRwaAssetsSummary(filteredAssets)

	const {
		totalOnChainMcapPieChartData: chainOnChainMcapPieChartData,
		activeMcapPieChartData: chainActiveMcapPieChartData,
		defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
		pieChartStackColors: chainPieChartStackColors
	} = useRwaChainPieChartData({
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

	// Select pie chart breakdown based on route mode (same precedence as nav links).
	const { onChainPieChartData, activeMcapPieChartData, defiActiveTvlPieChartData, pieChartStackColors } =
		useMemo(() => {
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
				onChainPieChartData: chainOnChainMcapPieChartData,
				activeMcapPieChartData: chainActiveMcapPieChartData,
				defiActiveTvlPieChartData: chainDefiActiveTvlPieChartData,
				pieChartStackColors: chainPieChartStackColors
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
			chainActiveMcapPieChartData,
			chainDefiActiveTvlPieChartData,
			chainOnChainMcapPieChartData,
			chainPieChartStackColors,
			isCategoryMode,
			isPlatformMode
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
				{isChainMode ? (
					<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
						<Tooltip
							content={definitions.totalStablecoinsMcap.description}
							className="text-(--text-label) underline decoration-dotted"
						>
							Total Stablecoins Marketcap
						</Tooltip>
						<span className="font-jetbrains text-2xl font-medium">
							{formattedNum(totalOnChainStablecoinMcap, true)}
						</span>
					</p>
				) : null}
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalAssetIssuers.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Asset Issuers
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(issuersCount, false)}</span>
				</p>
			</div>
			{props.chartData && props.chartData.length > 0 ? (
				<div className="min-h-[372px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-3">
					<Suspense fallback={<></>}>
						<MultiSeriesChart2
							charts={isChainMode ? chainTimeSeriesCharts : timeSeriesCharts}
							data={props.chartData}
							hideDefaultLegend={false}
						/>
					</Suspense>
				</div>
			) : null}
			{showCharts ? (
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
							<Tooltip
								content={definitions.totalOnChainMcap.description}
								className="text-lg font-semibold underline decoration-dotted"
								render={<h2 />}
							>
								{definitions.totalOnChainMcap.label}
							</Tooltip>
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
								content={definitions.totalActiveMcap.description}
								className="text-lg font-semibold underline decoration-dotted"
								render={<h2 />}
							>
								{definitions.totalActiveMcap.label}
							</Tooltip>
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
						</div>
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

const chainTimeSeriesCharts: Array<{
	type: 'line' | 'bar'
	name: string
	stack: string
	encode: { x: number | Array<number>; y: number | Array<number> }
	color?: string
}> = [
	{ type: 'line', name: 'Active Mcap', stack: 'activeMcap', encode: { x: 0, y: 2 }, color: CHART_COLORS[1] },
	{ type: 'line', name: 'Onchain Mcap', stack: 'onchainMcap', encode: { x: 0, y: 3 }, color: CHART_COLORS[2] }
]

const timeSeriesCharts: Array<{
	type: 'line' | 'bar'
	name: string
	stack: string
	encode: { x: number | Array<number>; y: number | Array<number> }
	color?: string
}> = [
	// Use distinct stack keys so ECharts doesn't cumulatively stack these series.
	{ type: 'line', name: 'DeFi Active TVL', stack: 'defiActiveTvl', encode: { x: 0, y: 1 }, color: CHART_COLORS[0] },
	{ type: 'line', name: 'Active Mcap', stack: 'activeMcap', encode: { x: 0, y: 2 }, color: CHART_COLORS[1] },
	{ type: 'line', name: 'Onchain Mcap', stack: 'onchainMcap', encode: { x: 0, y: 3 }, color: CHART_COLORS[2] }
]
