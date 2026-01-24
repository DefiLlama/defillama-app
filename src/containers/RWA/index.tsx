import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import clsx from 'clsx'
import { matchSorter } from 'match-sorter'
import Router, { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IPieChartProps } from '~/components/ECharts/types'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum, slug } from '~/utils'
import { IRWAAssetsOverview } from './queries'

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMarketcap: { label: string; description: string }
	totalActiveMarketcap: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

const meetsRatioPercent = (
	numerator: number,
	denominator: number,
	minPercent: number | null,
	maxPercent: number | null
) => {
	if (minPercent == null && maxPercent == null) return true
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return false
	const percent = (numerator / denominator) * 100
	if (minPercent != null && percent < minPercent) return false
	if (maxPercent != null && percent > maxPercent) return false
	return true
}

const formatPercentRange = (minPercent: number | null, maxPercent: number | null) => {
	const minLabel = minPercent != null ? `${minPercent.toLocaleString()}%` : 'no min'
	const maxLabel = maxPercent != null ? `${maxPercent.toLocaleString()}%` : 'no max'
	return `${minLabel} - ${maxLabel}`
}

export const RWAOverview = (props: IRWAAssetsOverview) => {
	const router = useRouter()
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([{ id: 'onChainMarketcap.total', desc: true }])
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const isCategoryMode = props.categoryLinks.length > 0

	const {
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
		categories: props.categories,
		assetClasses: props.assetClasses,
		rwaClassifications: props.rwaClassifications,
		accessModels: props.accessModels,
		issuers: props.issuers,
		defaultIncludeStablecoins: isCategoryMode,
		defaultIncludeGovernance: isCategoryMode
	})

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	// Non-RWA Stablecoins
	// Crypto-collateralized stablecoin (non-RWA)
	const filteredAssets = useMemo(() => {
		// Create Sets for O(1) lookups
		const selectedCategoriesSet = new Set(selectedCategories)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const selectedRwaClassificationsSet = new Set(selectedRwaClassifications)
		const selectedAccessModelsSet = new Set(selectedAccessModels)
		const selectedIssuersSet = new Set(selectedIssuers)

		return props.assets.filter((asset) => {
			// By default, stablecoins & governance-token assets are excluded unless explicitly enabled.
			if (!includeStablecoins && asset.stablecoin) {
				return false
			}
			if (!includeGovernance && asset.governance) {
				return false
			}

			const onChainMarketcap = asset.onChainMarketcap.total
			if (
				!meetsRatioPercent(
					asset.defiActiveTvl.total,
					onChainMarketcap,
					minDefiActiveTvlToOnChainPct,
					maxDefiActiveTvlToOnChainPct
				)
			) {
				return false
			}
			if (
				!meetsRatioPercent(
					asset.activeMarketcap.total,
					onChainMarketcap,
					minActiveMcapToOnChainPct,
					maxActiveMcapToOnChainPct
				)
			) {
				return false
			}
			if (
				!meetsRatioPercent(
					asset.defiActiveTvl.total,
					asset.activeMarketcap.total,
					minDefiActiveTvlToActiveMcapPct,
					maxDefiActiveTvlToActiveMcapPct
				)
			) {
				return false
			}

			return (
				(asset.category?.length ? asset.category.some((category) => selectedCategoriesSet.has(category)) : true) &&
				(asset.assetClass?.length
					? asset.assetClass.some((assetClass) => selectedAssetClassesSet.has(assetClass))
					: true) &&
				(asset.rwaClassification ? selectedRwaClassificationsSet.has(asset.rwaClassification) : true) &&
				(asset.accessModel ? selectedAccessModelsSet.has(asset.accessModel) : true) &&
				(asset.issuer ? selectedIssuersSet.has(asset.issuer) : true)
			)
		})
	}, [
		props.assets,
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
	])

	// Recalculate summary values based on all filters
	const {
		totalOnChainRwaValue,
		totalActiveMarketcap,
		totalOnChainStablecoinValue,
		totalOnChainDeFiActiveTvl,
		issuersCount
	} = useMemo(() => {
		let rwaValue = 0
		let activeMarketcap = 0
		let stablecoinValue = 0
		let defiTvl = 0
		const issuersSet = new Set<string>()

		for (const asset of filteredAssets) {
			rwaValue += asset.onChainMarketcap.total
			activeMarketcap += asset.activeMarketcap.total
			if (asset.stablecoin) {
				stablecoinValue += asset.onChainMarketcap.total
			}
			defiTvl += asset.defiActiveTvl.total
			if (asset.issuer) {
				issuersSet.add(asset.issuer)
			}
		}

		return {
			totalOnChainRwaValue: rwaValue,
			totalActiveMarketcap: activeMarketcap,
			totalOnChainStablecoinValue: stablecoinValue,
			totalOnChainDeFiActiveTvl: defiTvl,
			issuersCount: issuersSet.size
		}
	}, [filteredAssets])

	// Pie charts (single pass):
	// - keep category colors consistent across all 3 category charts via `stackColors`
	// - optionally compute an asset-class breakdown off the same `filteredAssets` pass
	const {
		totalOnChainRwaPieChartData,
		activeMarketcapPieChartData,
		defiActiveTvlPieChartData,
		pieChartStackColors,
		assetClassOnChainPieChartData,
		assetClassPieChartStackColors
	} = useMemo(() => {
		const selectedCategoriesSet = new Set(selectedCategories)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const categoryTotals = new Map<string, { onChain: number; active: number; defi: number }>()
		const assetClassTotals = new Map<string, number>()

		for (const asset of filteredAssets) {
			for (const category of asset.category ?? []) {
				if (!category || !selectedCategoriesSet.has(category)) continue

				const prev = categoryTotals.get(category) ?? { onChain: 0, active: 0, defi: 0 }
				prev.onChain += asset.onChainMarketcap.total
				prev.active += asset.activeMarketcap.total
				prev.defi += asset.defiActiveTvl.total
				categoryTotals.set(category, prev)
			}

			for (const assetClass of asset.assetClass ?? []) {
				if (!assetClass || !selectedAssetClassesSet.has(assetClass)) continue
				assetClassTotals.set(assetClass, (assetClassTotals.get(assetClass) ?? 0) + asset.onChainMarketcap.total)
			}
		}

		// Stable mapping so the same category renders with the same color on all pie charts
		// Respect the category order we already use in the UI (`props.categories`)
		// so colors match the same "category list" order consistently.
		const pieChartStackColors: Record<string, string> = {}
		for (const [idx, category] of props.categories.entries()) {
			pieChartStackColors[category] = CHART_COLORS[idx % CHART_COLORS.length]
		}

		// Stable mapping so the same asset class renders with the same color.
		// Respect the asset class order we already use in the UI (`props.assetClasses`).
		const assetClassPieChartStackColors: Record<string, string> = {}
		for (const [idx, assetClass] of props.assetClasses.entries()) {
			assetClassPieChartStackColors[assetClass] = CHART_COLORS[idx % CHART_COLORS.length]
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			Array.from(categoryTotals.entries())
				.map(([name, totals]) => ({ name, value: totals[metric] }))
				.filter((x) => x.value > 0)
				.sort((a, b) => b.value - a.value)

		const assetClassOnChainPieChartData = Array.from(assetClassTotals.entries())
			.map(([name, value]) => ({ name, value }))
			.filter((x) => x.value > 0)
			.sort((a, b) => b.value - a.value)

		return {
			totalOnChainRwaPieChartData: toSortedChartData('onChain'),
			activeMarketcapPieChartData: toSortedChartData('active'),
			defiActiveTvlPieChartData: toSortedChartData('defi'),
			pieChartStackColors,
			assetClassOnChainPieChartData,
			assetClassPieChartStackColors
		}
	}, [filteredAssets, props.assetClasses, props.categories, selectedAssetClasses, selectedCategories])

	const assetsData = useMemo(() => {
		if (!deferredSearchValue) return filteredAssets

		return matchSorter(filteredAssets, deferredSearchValue, {
			keys: ['name', 'ticker'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [filteredAssets, deferredSearchValue])

	const instance = useReactTable({
		data: assetsData,
		columns,
		state: {
			sorting,
			columnFilters,
			expanded,
			columnSizing,
			columnOrder
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: any) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	useSortColumnSizesAndOrders({ instance, columnSizes })

	const prepareCsv = () => {
		const tableRows = instance.getSortedRowModel().rows
		const headers: Array<string | number | boolean> = [
			// Keep in sync with `columns` below (virtual table columns)
			'Name',
			definitions.type.label,
			definitions.rwaClassification.label,
			definitions.accessModel.label,
			definitions.category.label,
			definitions.assetClass.label,
			definitions.defiActiveTvl.label,
			definitions.activeMarketcap.label,
			definitions.onChainMarketcap.label,
			'Token Price',
			definitions.issuer.label,
			definitions.redeemable.label,
			definitions.attestations.label,
			definitions.cexListed.label,
			definitions.kycForMintRedeem.label,
			definitions.kycAllowlistedWhitelistedToTransferHold.label,
			definitions.transferable.label,
			definitions.selfCustody.label
		]

		const csvData: Array<Array<string | number | boolean>> = tableRows.map((row) => {
			const asset = row.original
			return [
				asset.name ?? asset.ticker ?? '',
				asset.type ?? '',
				asset.rwaClassification ?? '',
				asset.accessModel ?? '',
				asset.category?.join(', ') ?? '',
				asset.assetClass?.join(', ') ?? '',
				asset.defiActiveTvl.total ?? '',
				asset.activeMarketcap.total ?? '',
				asset.onChainMarketcap.total ?? '',
				asset.price != null ? formattedNum(asset.price, true) : '',
				asset.issuer ?? '',
				asset.redeemable != null ? (asset.redeemable ? 'Yes' : 'No') : '',
				asset.attestations != null ? (asset.attestations ? 'Yes' : 'No') : '',
				asset.cexListed != null ? (asset.cexListed ? 'Yes' : 'No') : '',
				asset.kycForMintRedeem != null ? (asset.kycForMintRedeem ? 'Yes' : 'No') : '',
				asset.kycAllowlistedWhitelistedToTransferHold != null
					? asset.kycAllowlistedWhitelistedToTransferHold
						? 'Yes'
						: 'No'
					: '',
				asset.transferable != null ? (asset.transferable ? 'Yes' : 'No') : '',
				asset.selfCustody != null ? (asset.selfCustody ? 'Yes' : 'No') : ''
			]
		})

		return {
			filename: `rwa-assets${props.selectedChain !== 'All' ? `-${props.selectedChain.toLowerCase()}` : ''}.csv`,
			rows: [headers, ...csvData]
		}
	}

	// Preserve filter/toggle query params when switching between chains/categories.
	// (The chain/category itself is in the pathname, so we strip the dynamic param from the query object.)
	const navLinks = useMemo(() => {
		const { chain: _chain, category: _category, ...restQuery } = router.query
		const qs = toQueryString(restQuery as Record<string, string | string[] | undefined>)
		const baseLinks = isCategoryMode ? props.categoryLinks : props.chains
		if (!qs) return baseLinks
		return baseLinks.map((link) => ({ ...link, to: `${link.to}${qs}` }))
	}, [isCategoryMode, props.categoryLinks, props.chains, router.query])

	return (
		<>
			<RowLinksWithDropdown
				links={navLinks}
				activeLink={isCategoryMode ? props.selectedCategory : props.selectedChain}
			/>
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:flex-row md:flex-wrap md:items-center">
				{!isCategoryMode ? (
					<SelectWithCombobox
						allValues={props.categoriesOptions}
						selectedValues={selectedCategories}
						includeQueryKey="categories"
						excludeQueryKey="excludeCategories"
						label={'Categories'}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
					/>
				) : null}
				<SelectWithCombobox
					allValues={props.assetClassOptions}
					selectedValues={selectedAssetClasses}
					includeQueryKey="assetClasses"
					excludeQueryKey="excludeAssetClasses"
					label={'Asset Classes'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<SelectWithCombobox
					allValues={props.rwaClassificationOptions}
					selectedValues={selectedRwaClassifications}
					includeQueryKey="rwaClassifications"
					excludeQueryKey="excludeRwaClassifications"
					label={'RWA Classification'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<SelectWithCombobox
					allValues={props.accessModelOptions}
					selectedValues={selectedAccessModels}
					includeQueryKey="accessModels"
					excludeQueryKey="excludeAccessModels"
					label={'Access Model'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<SelectWithCombobox
					allValues={props.issuers}
					selectedValues={selectedIssuers}
					includeQueryKey="issuers"
					excludeQueryKey="excludeIssuers"
					label={'Issuers'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<FilterBetweenRange
					name="DeFi TVL / Onchain %"
					trigger={
						minDefiActiveTvlToOnChainPct != null || maxDefiActiveTvlToOnChainPct != null ? (
							<>
								<span>DeFi TVL / Onchain: </span>
								<span className="text-(--link)">
									{formatPercentRange(minDefiActiveTvlToOnChainPct, maxDefiActiveTvlToOnChainPct)}
								</span>
							</>
						) : (
							<span>DeFi TVL / Onchain %</span>
						)
					}
					onSubmit={(e) => {
						e.preventDefault()
						const form = e.currentTarget
						const minValue = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
						const maxValue = (form.elements.namedItem('max') as HTMLInputElement | null)?.value
						setDefiActiveTvlToOnChainPctRange(minValue, maxValue)
					}}
					onClear={() => setDefiActiveTvlToOnChainPctRange(null, null)}
					min={minDefiActiveTvlToOnChainPct}
					max={maxDefiActiveTvlToOnChainPct}
					minLabel="Min %"
					maxLabel="Max %"
					minInputProps={ratioPercentInputProps}
					maxInputProps={ratioPercentInputProps}
				/>
				<FilterBetweenRange
					name="Active Marketcap / Onchain %"
					trigger={
						minActiveMcapToOnChainPct != null || maxActiveMcapToOnChainPct != null ? (
							<>
								<span>Active Marketcap / Onchain: </span>
								<span className="text-(--link)">
									{formatPercentRange(minActiveMcapToOnChainPct, maxActiveMcapToOnChainPct)}
								</span>
							</>
						) : (
							<span>Active Marketcap / Onchain %</span>
						)
					}
					onSubmit={(e) => {
						e.preventDefault()
						const form = e.currentTarget
						const minValue = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
						const maxValue = (form.elements.namedItem('max') as HTMLInputElement | null)?.value
						setActiveMcapToOnChainPctRange(minValue, maxValue)
					}}
					onClear={() => setActiveMcapToOnChainPctRange(null, null)}
					min={minActiveMcapToOnChainPct}
					max={maxActiveMcapToOnChainPct}
					minLabel="Min %"
					maxLabel="Max %"
					minInputProps={ratioPercentInputProps}
					maxInputProps={ratioPercentInputProps}
				/>
				<FilterBetweenRange
					name="DeFi TVL / Active Marketcap %"
					trigger={
						minDefiActiveTvlToActiveMcapPct != null || maxDefiActiveTvlToActiveMcapPct != null ? (
							<>
								<span>DeFi TVL / Active Marketcap: </span>
								<span className="text-(--link)">
									{formatPercentRange(minDefiActiveTvlToActiveMcapPct, maxDefiActiveTvlToActiveMcapPct)}
								</span>
							</>
						) : (
							<span>DeFi TVL / Active Marketcap %</span>
						)
					}
					onSubmit={(e) => {
						e.preventDefault()
						const form = e.currentTarget
						const minValue = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
						const maxValue = (form.elements.namedItem('max') as HTMLInputElement | null)?.value
						setDefiActiveTvlToActiveMcapPctRange(minValue, maxValue)
					}}
					onClear={() => setDefiActiveTvlToActiveMcapPctRange(null, null)}
					min={minDefiActiveTvlToActiveMcapPct}
					max={maxDefiActiveTvlToActiveMcapPct}
					minLabel="Min %"
					maxLabel="Max %"
					minInputProps={ratioPercentInputProps}
					maxInputProps={ratioPercentInputProps}
				/>
				{!isCategoryMode ? (
					<>
						<Switch
							label="Stablecoins"
							value="includeStablecoins"
							checked={includeStablecoins}
							help="Include stablecoin assets in the table."
							onChange={() => setIncludeStablecoins(!includeStablecoins)}
							className="ml-auto"
						/>
						<Switch
							label="Governance Tokens"
							value="includeGovernance"
							checked={includeGovernance}
							help="Include governance-token assets in the table."
							onChange={() => setIncludeGovernance(!includeGovernance)}
						/>
					</>
				) : null}
			</div>
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
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<Tooltip
						content={definitions.totalStablecoinsValue.description}
						className="text-(--text-label) underline decoration-dotted"
					>
						Total Stablecoins Value
					</Tooltip>
					<span className="font-jetbrains text-2xl font-medium">{formattedNum(totalOnChainStablecoinValue, true)}</span>
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
			</div>
			{isCategoryMode ? (
				<div className="grid grid-cols-1 gap-2">
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
						<h2 className="px-3 text-lg font-semibold">Asset Classes</h2>
						<Suspense fallback={<div className="h-[360px]" />}>
							<PieChart
								chartData={assetClassOnChainPieChartData}
								stackColors={assetClassPieChartStackColors}
								radius={pieChartRadius}
								legendPosition={pieChartLegendPosition}
								legendTextStyle={pieChartLegendTextStyle}
							/>
						</Suspense>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<h2 className="px-3 text-lg font-semibold">Total RWA Onchain</h2>
						<Suspense fallback={<div className="h-[360px]" />}>
							<PieChart
								chartData={totalOnChainRwaPieChartData}
								stackColors={pieChartStackColors}
								radius={pieChartRadius}
								legendPosition={pieChartLegendPosition}
								legendTextStyle={pieChartLegendTextStyle}
							/>
						</Suspense>
					</div>
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<h2 className="px-3 text-lg font-semibold">Active Marketcap</h2>
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
					<div className="col-span-1 min-h-[368px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<h2 className="px-3 text-lg font-semibold">DeFi Active TVL</h2>
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
			)}
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<h1 className="mr-auto p-3 text-lg font-semibold">Assets Rankings</h1>
				<div className="flex flex-wrap items-center justify-end gap-2 p-3">
					<label className="relative mr-auto w-full sm:max-w-[280px]">
						<span className="sr-only">Search assets</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							value={searchValue}
							onChange={(e) => {
								setSearchValue(e.target.value)
							}}
							placeholder="Search assets..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
					<CSVDownloadButton prepareCsv={prepareCsv} />
				</div>
				<VirtualTable instance={instance} />
			</div>
		</>
	)
}

const columns: ColumnDef<IRWAAssetsOverview['assets'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (asset) => asset.name ?? asset.ticker,
		enableSorting: false,
		cell: (info) => {
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<span className="-my-1.5 flex flex-col overflow-hidden">
						{info.row.original.ticker ? (
							<>
								<BasicLink
									href={`/rwa/asset/${slug(info.row.original.ticker)}`}
									className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
								>
									{info.row.original.name ?? info.row.original.ticker}
								</BasicLink>
								{info.row.original.name ? (
									<span className="text-[0.7rem] text-(--text-disabled)">{info.row.original.ticker}</span>
								) : null}
							</>
						) : (
							<>
								{info.row.original.name && (
									<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">
										{info.row.original.name}
									</span>
								)}
							</>
						)}
					</span>
				</span>
			)
		},
		size: 240
	},
	{
		id: 'type',
		header: definitions.type.label,
		accessorFn: (asset) => asset.type,
		cell: (info) => {
			const value = info.getValue() as string
			return <span>{value}</span>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: definitions.type.description
		}
	},
	{
		id: 'rwaClassification',
		header: definitions.rwaClassification.label,
		accessorFn: (asset) => asset.rwaClassification,
		cell: (info) => {
			const value = info.getValue() as string
			const isTrueRWA = info.row.original.trueRWA
			// If trueRWA flag, show green color with True RWA definition but display "RWA"
			const tooltipContent = isTrueRWA
				? definitions.rwaClassification.values?.['True RWA']
				: definitions.rwaClassification.values?.[value]
			if (tooltipContent) {
				return (
					<Tooltip
						content={tooltipContent}
						className={`inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted ${isTrueRWA ? 'text-(--success)' : ''}`}
					>
						{value}
					</Tooltip>
				)
			}
			return <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{value}</span>
		},
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: definitions.rwaClassification.description
		}
	},
	{
		id: 'accessModel',
		header: definitions.accessModel.label,
		accessorFn: (asset) => asset.accessModel,
		cell: (info) => {
			const value = info.getValue() as
				| 'Permissioned'
				| 'Permissionless'
				| 'Non-transferable'
				| 'Custodial Only'
				| 'Unknown'
			const valueDescription = definitions.accessModel.values?.[value]
			if (valueDescription) {
				return (
					<Tooltip
						content={valueDescription}
						className={clsx(
							'justify-end underline decoration-dotted',
							value === 'Permissioned' && 'text-(--warning)',
							value === 'Permissionless' && 'text-(--success)',
							value === 'Non-transferable' && 'text-(--error)',
							value === 'Custodial Only' && 'text-(--error)'
						)}
					>
						{value}
					</Tooltip>
				)
			}
			return (
				<span
					className={clsx(
						'inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap',
						value === 'Permissioned' && 'text-(--warning)',
						value === 'Permissionless' && 'text-(--success)',
						value === 'Non-transferable' && 'text-(--error)',
						value === 'Custodial Only' && 'text-(--error)'
					)}
				>
					{value}
				</span>
			)
		},
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: definitions.accessModel.description
		}
	},
	{
		id: 'category',
		header: definitions.category.label,
		accessorFn: (asset) => asset.category?.join(', ') ?? '',
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 168,
		meta: {
			align: 'end',
			headerHelperText: definitions.category.description
		}
	},
	{
		id: 'assetClass',
		header: definitions.assetClass.label,
		accessorFn: (asset) => asset.assetClass?.join(', ') ?? '',
		cell: (info) => {
			const assetClasses = info.row.original.assetClass
			if (!assetClasses || assetClasses.length === 0) return null
			// For single asset class with definition, show tooltip
			if (assetClasses.length === 1) {
				const ac = assetClasses[0]
				const description = definitions.assetClass.values?.[ac]
				if (description) {
					return (
						<Tooltip
							content={description}
							className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted"
						>
							{ac}
						</Tooltip>
					)
				}
				return <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{ac}</span>
			}
			// For multiple asset classes, show combined tooltip
			const tooltipContent = (
				<span className="flex flex-col gap-1">
					{assetClasses.map((ac) => {
						const description = definitions.assetClass.values?.[ac]
						return (
							<span key={ac}>
								<strong>{ac}</strong>: {description || 'No description'}
							</span>
						)
					})}
				</span>
			)
			return (
				<Tooltip
					content={tooltipContent}
					className="inline-block max-w-full justify-end overflow-hidden text-ellipsis whitespace-nowrap underline decoration-dotted"
				>
					{assetClasses.join(', ')}
				</Tooltip>
			)
		},
		size: 168,
		meta: {
			align: 'end',
			headerHelperText: definitions.assetClass.description
		}
	},
	{
		id: 'defiActiveTvl.total',
		header: definitions.defiActiveTvl.label,
		accessorFn: (asset) => asset.defiActiveTvl.total,
		cell: (info) => (
			<TVLBreakdownCell value={info.getValue() as number} breakdown={info.row.original.defiActiveTvl.breakdown} />
		),
		meta: {
			headerHelperText: definitions.defiActiveTvl.description,
			align: 'end'
		}
	},
	{
		id: 'activeMarketcap.total',
		header: definitions.activeMarketcap.label,
		accessorFn: (asset) => asset.activeMarketcap.total,
		cell: (info) => (
			<TVLBreakdownCell value={info.getValue() as number} breakdown={info.row.original.activeMarketcap.breakdown} />
		),
		meta: {
			headerHelperText: definitions.activeMarketcap.description,
			align: 'end'
		}
	},
	{
		id: 'onChainMarketcap.total',
		header: definitions.onChainMarketcap.label,
		accessorFn: (asset) => asset.onChainMarketcap.total,
		cell: (info) => (
			<TVLBreakdownCell value={info.getValue() as number} breakdown={info.row.original.onChainMarketcap.breakdown} />
		),
		size: 168,
		meta: {
			headerHelperText: definitions.onChainMarketcap.description,
			align: 'end'
		}
	},
	{
		id: 'tokenPrice',
		header: 'Token Price',
		accessorFn: (asset) => asset.price,
		cell: (info) => (info.getValue() != null ? <span>{formattedNum(info.getValue() as number, true)}</span> : null),
		size: 168,
		meta: {
			align: 'end'
		}
	},
	{
		id: 'issuer',
		header: definitions.issuer.label,
		accessorFn: (asset) => asset.issuer,
		cell: (info) => {
			const value = info.getValue() as string
			return (
				<span title={value} className="overflow-hidden text-ellipsis whitespace-nowrap">
					{value}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: definitions.issuer.description
		}
	},
	{
		id: 'redeemable',
		header: definitions.redeemable.label,
		accessorFn: (asset) => asset.redeemable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.redeemable.description
		},
		size: 120
	},
	{
		id: 'attestations',
		header: definitions.attestations.label,
		accessorFn: (asset) => asset.attestations,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.attestations.description
		},
		size: 120
	},
	{
		id: 'cex_listed',
		header: definitions.cexListed.label,
		accessorFn: (asset) => asset.cexListed,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.cexListed.description
		},
		size: 120
	},
	{
		id: 'kycForMintRedeem',
		header: definitions.kycForMintRedeem.label,
		accessorFn: (asset) => asset.kycForMintRedeem,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.kycForMintRedeem.description
		},
		size: 188
	},
	{
		id: 'kycAllowlistedWhitelistedToTransferHold',
		header: definitions.kycAllowlistedWhitelistedToTransferHold.label,
		accessorFn: (asset) => asset.kycAllowlistedWhitelistedToTransferHold,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--warning)' : 'text-(--success)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.kycAllowlistedWhitelistedToTransferHold.description
		},
		size: 332
	},
	{
		id: 'transferable',
		header: definitions.transferable.label,
		accessorFn: (asset) => asset.transferable,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.transferable.description
		},
		size: 120
	},
	{
		id: 'self_custody',
		header: definitions.selfCustody.label,
		accessorFn: (asset) => asset.selfCustody,
		cell: (info) => (
			<span className={info.getValue() ? 'text-(--success)' : 'text-(--error)'}>
				{info.getValue() != null ? (info.getValue() ? 'Yes' : 'No') : null}
			</span>
		),
		meta: {
			align: 'end',
			headerHelperText: definitions.selfCustody.description
		},
		size: 120
	}
]

const BreakdownTooltipContent = ({ breakdown }: { breakdown: Array<[string, number]> }) => (
	<span className="flex flex-col gap-1">
		{breakdown.map(([chain, tvl]) => (
			<span key={`${chain}-${tvl}`}>
				{chain}: {formattedNum(tvl, true)}
			</span>
		))}
	</span>
)

const TVLBreakdownCell = ({
	value,
	breakdown
}: {
	value: number | null
	breakdown: Array<[string, number]> | null
}) => {
	if (value == null) {
		return null
	}

	if (!breakdown || breakdown.length === 0) {
		return formattedNum(value, true)
	}

	return (
		<Tooltip
			content={<BreakdownTooltipContent breakdown={breakdown} />}
			className="justify-end underline decoration-dotted"
		>
			{formattedNum(value, true)}
		</Tooltip>
	)
}

const columnSizes: ColumnSizesByBreakpoint = {
	0: { name: 180 },
	640: { name: 240 }
}

const toArrayParam = (p: string | string[] | undefined): string[] => {
	if (!p) return []
	return Array.isArray(p) ? p.filter(Boolean) : [p].filter(Boolean)
}

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

const parseNumberInput = (value: string | number | null | undefined): number | null => {
	if (value == null) return null
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	const trimmed = value.trim()
	if (!trimmed) return null
	const n = Number(trimmed)
	return Number.isFinite(n) ? n : null
}

const toNumberParam = (p: string | string[] | undefined): number | null => {
	if (Array.isArray(p)) {
		return parseNumberInput(p[0])
	}
	return parseNumberInput(p)
}

const toBooleanParam = (p: string | string[] | undefined): boolean => {
	if (Array.isArray(p)) return p[0] === 'true'
	return p === 'true'
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

const updateNumberRangeQuery = (
	minKey: string,
	maxKey: string,
	minValue: string | number | null | undefined,
	maxValue: string | number | null | undefined
) => {
	const nextQuery: Record<string, any> = { ...Router.query }
	const parsedMin = parseNumberInput(minValue)
	const parsedMax = parseNumberInput(maxValue)
	if (parsedMin == null) {
		delete nextQuery[minKey]
	} else {
		nextQuery[minKey] = String(parsedMin)
	}
	if (parsedMax == null) {
		delete nextQuery[maxKey]
	} else {
		nextQuery[maxKey] = String(parsedMax)
	}
	Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
}

const useRWATableQueryParams = ({
	categories,
	assetClasses,
	rwaClassifications,
	accessModels,
	issuers,
	defaultIncludeStablecoins,
	defaultIncludeGovernance
}: {
	categories: string[]
	assetClasses: string[]
	rwaClassifications: string[]
	accessModels: string[]
	issuers: string[]
	defaultIncludeStablecoins: boolean
	defaultIncludeGovernance: boolean
}) => {
	const router = useRouter()
	const {
		categories: categoriesQ,
		excludeCategories: excludeCategoriesQ,
		assetClasses: assetClassesQ,
		excludeAssetClasses: excludeAssetClassesQ,
		rwaClassifications: rwaClassificationsQ,
		excludeRwaClassifications: excludeRwaClassificationsQ,
		accessModels: accessModelsQ,
		excludeAccessModels: excludeAccessModelsQ,
		issuers: issuersQ,
		excludeIssuers: excludeIssuersQ,
		minDefiActiveTvlToOnChainPct: minDefiActiveTvlToOnChainPctQ,
		maxDefiActiveTvlToOnChainPct: maxDefiActiveTvlToOnChainPctQ,
		minActiveMcapToOnChainPct: minActiveMcapToOnChainPctQ,
		maxActiveMcapToOnChainPct: maxActiveMcapToOnChainPctQ,
		minDefiActiveTvlToActiveMcapPct: minDefiActiveTvlToActiveMcapPctQ,
		maxDefiActiveTvlToActiveMcapPct: maxDefiActiveTvlToActiveMcapPctQ,
		includeStablecoins: stablecoinsQ,
		includeGovernance: governanceQ
	} = router.query

	const {
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
		includeGovernance
	} = useMemo(() => {
		// If query param is 'None', return empty array. If no param, return all (default). Otherwise parse the array.
		const parseArrayParam = (param: string | string[] | undefined, allValues: string[]): string[] => {
			if (param === 'None') return []
			if (!param) return allValues
			const arr = toArrayParam(param)
			const validSet = new Set(allValues)
			return arr.filter((v) => validSet.has(v))
		}

		// Parse exclude sets
		const excludeCategoriesSet = parseExcludeParam(excludeCategoriesQ)
		const excludeAssetClassesSet = parseExcludeParam(excludeAssetClassesQ)
		const excludeRwaClassificationsSet = parseExcludeParam(excludeRwaClassificationsQ)
		const excludeAccessModelsSet = parseExcludeParam(excludeAccessModelsQ)
		const excludeIssuersSet = parseExcludeParam(excludeIssuersQ)

		// Default toggles:
		// - category pages: ON (include stablecoins + governance by default)
		// - other pages: OFF (unless explicitly set in the URL)
		const includeStablecoins = stablecoinsQ != null ? toBooleanParam(stablecoinsQ) : defaultIncludeStablecoins
		const includeGovernance = governanceQ != null ? toBooleanParam(governanceQ) : defaultIncludeGovernance

		// Build selected arrays with correct "exclude" semantics:
		// - if include param missing but exclude param exists, selection is (all - excluded), NOT "defaults - excluded"
		const baseCategories =
			categoriesQ != null
				? parseArrayParam(categoriesQ, categories)
				: excludeCategoriesSet.size > 0
					? categories
					: categories
		let selectedCategories =
			excludeCategoriesSet.size > 0 ? baseCategories.filter((c) => !excludeCategoriesSet.has(c)) : baseCategories

		const baseAssetClasses =
			assetClassesQ != null
				? parseArrayParam(assetClassesQ, assetClasses)
				: excludeAssetClassesSet.size > 0
					? assetClasses
					: assetClasses
		let selectedAssetClasses =
			excludeAssetClassesSet.size > 0
				? baseAssetClasses.filter((a) => !excludeAssetClassesSet.has(a))
				: baseAssetClasses

		const baseRwaClassifications =
			rwaClassificationsQ != null
				? parseArrayParam(rwaClassificationsQ, rwaClassifications)
				: excludeRwaClassificationsSet.size > 0
					? rwaClassifications
					: rwaClassifications
		let selectedRwaClassifications =
			excludeRwaClassificationsSet.size > 0
				? baseRwaClassifications.filter((r) => !excludeRwaClassificationsSet.has(r))
				: baseRwaClassifications

		const baseAccessModels = parseArrayParam(accessModelsQ, accessModels)
		let selectedAccessModels =
			excludeAccessModelsSet.size > 0
				? baseAccessModels.filter((a) => !excludeAccessModelsSet.has(a))
				: baseAccessModels

		const baseIssuers = parseArrayParam(issuersQ, issuers)
		let selectedIssuers =
			excludeIssuersSet.size > 0 ? baseIssuers.filter((i) => !excludeIssuersSet.has(i)) : baseIssuers

		const minDefiActiveTvlToOnChainPct = toNumberParam(minDefiActiveTvlToOnChainPctQ)
		const maxDefiActiveTvlToOnChainPct = toNumberParam(maxDefiActiveTvlToOnChainPctQ)
		const minActiveMcapToOnChainPct = toNumberParam(minActiveMcapToOnChainPctQ)
		const maxActiveMcapToOnChainPct = toNumberParam(maxActiveMcapToOnChainPctQ)
		const minDefiActiveTvlToActiveMcapPct = toNumberParam(minDefiActiveTvlToActiveMcapPctQ)
		const maxDefiActiveTvlToActiveMcapPct = toNumberParam(maxDefiActiveTvlToActiveMcapPctQ)

		return {
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
			includeGovernance
		}
	}, [
		categoriesQ,
		excludeCategoriesQ,
		assetClassesQ,
		excludeAssetClassesQ,
		rwaClassificationsQ,
		excludeRwaClassificationsQ,
		accessModelsQ,
		excludeAccessModelsQ,
		issuersQ,
		excludeIssuersQ,
		minDefiActiveTvlToOnChainPctQ,
		maxDefiActiveTvlToOnChainPctQ,
		minActiveMcapToOnChainPctQ,
		maxActiveMcapToOnChainPctQ,
		minDefiActiveTvlToActiveMcapPctQ,
		maxDefiActiveTvlToActiveMcapPctQ,
		stablecoinsQ,
		governanceQ,
		defaultIncludeStablecoins,
		defaultIncludeGovernance,
		categories,
		assetClasses,
		rwaClassifications,
		accessModels,
		issuers
	])

	const setDefiActiveTvlToOnChainPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minDefiActiveTvlToOnChainPct', 'maxDefiActiveTvlToOnChainPct', minValue, maxValue)
	const setActiveMcapToOnChainPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minActiveMcapToOnChainPct', 'maxActiveMcapToOnChainPct', minValue, maxValue)
	const setDefiActiveTvlToActiveMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minDefiActiveTvlToActiveMcapPct', 'maxDefiActiveTvlToActiveMcapPct', minValue, maxValue)

	const setIncludeStablecoins = (value: boolean) => {
		const nextQuery: Record<string, any> = { ...Router.query }
		if (value) {
			nextQuery.includeStablecoins = 'true'
		} else {
			delete nextQuery.includeStablecoins
		}
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	const setIncludeGovernance = (value: boolean) => {
		const nextQuery: Record<string, any> = { ...Router.query }
		if (value) {
			nextQuery.includeGovernance = 'true'
		} else {
			delete nextQuery.includeGovernance
		}
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

	return {
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
	}
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
const ratioPercentInputProps = { min: 0, step: '0.01' } as const
