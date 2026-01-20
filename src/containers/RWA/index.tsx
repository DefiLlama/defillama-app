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
import { NextRouter, useRouter } from 'next/router'
import { lazy, Suspense, useCallback, useDeferredValue, useMemo, useState } from 'react'
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
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([{ id: 'onChainMarketcap.total', desc: true }])
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

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
		setSelectedCategories,
		setSelectedAssetClasses,
		setSelectedRwaClassifications,
		setSelectedAccessModels,
		setSelectedIssuers,
		setDefiActiveTvlToOnChainPctRange,
		setActiveMcapToOnChainPctRange,
		setDefiActiveTvlToActiveMcapPctRange,
		setIncludeStablecoins,
		setIncludeGovernance,
		selectOnlyOneCategory,
		toggleAllCategories,
		clearAllCategories,
		selectOnlyOneAssetClass,
		toggleAllAssetClasses,
		clearAllAssetClasses,
		selectOnlyOneRwaClassification,
		toggleAllRwaClassifications,
		clearAllRwaClassifications,
		selectOnlyOneAccessModel,
		toggleAllAccessModels,
		clearAllAccessModels,
		selectOnlyOneIssuer,
		toggleAllIssuers,
		clearAllIssuers
	} = useRWATableQueryParams({
		categories: props.categories,
		assetClasses: props.assetClasses,
		rwaClassifications: props.rwaClassifications,
		accessModels: props.accessModels,
		issuers: props.issuers
	})

	const [searchValue, setSearchValue] = useState('')
	const deferredSearchValue = useDeferredValue(searchValue)

	// Memoize filter arrays as Sets for O(1) lookups
	const selectedCategoriesSet = useMemo(() => new Set(selectedCategories), [selectedCategories])
	const selectedAssetClassesSet = useMemo(() => new Set(selectedAssetClasses), [selectedAssetClasses])
	const selectedRwaClassificationsSet = useMemo(() => new Set(selectedRwaClassifications), [selectedRwaClassifications])
	const selectedAccessModelsSet = useMemo(() => new Set(selectedAccessModels), [selectedAccessModels])
	const selectedIssuersSet = useMemo(() => new Set(selectedIssuers), [selectedIssuers])

	// Non-RWA Stablecoins
	// Crypto-collateralized stablecoin (non-RWA)
	const filteredAssets = useMemo(() => {
		return props.assets.filter((asset) => {
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
		selectedCategoriesSet,
		selectedAssetClassesSet,
		selectedRwaClassificationsSet,
		selectedAccessModelsSet,
		selectedIssuersSet,
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

	// Pie charts (single pass): keep category colors consistent across all 3 charts via `stackColors`
	const { totalOnChainRwaPieChartData, activeMarketcapPieChartData, defiActiveTvlPieChartData, pieChartStackColors } =
		useMemo(() => {
			const categoryTotals = new Map<string, { onChain: number; active: number; defi: number }>()

			for (const asset of filteredAssets) {
				for (const category of asset.category ?? []) {
					if (!category || !selectedCategoriesSet.has(category)) continue

					const prev = categoryTotals.get(category) ?? { onChain: 0, active: 0, defi: 0 }
					prev.onChain += asset.onChainMarketcap.total
					prev.active += asset.activeMarketcap.total
					prev.defi += asset.defiActiveTvl.total
					categoryTotals.set(category, prev)
				}
			}

			// Stable mapping so the same category renders with the same color on all pie charts
			// Respect the category order we already use in the UI (`props.categories`)
			// so colors match the same "category list" order consistently.
			const pieChartStackColors: Record<string, string> = {}
			for (const [idx, category] of props.categories.entries()) {
				pieChartStackColors[category] = CHART_COLORS[idx % CHART_COLORS.length]
			}

			const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
				Array.from(categoryTotals.entries())
					.map(([name, totals]) => ({ name, value: totals[metric] }))
					.filter((x) => x.value > 0)
					.sort((a, b) => b.value - a.value)

			return {
				totalOnChainRwaPieChartData: toSortedChartData('onChain'),
				activeMarketcapPieChartData: toSortedChartData('active'),
				defiActiveTvlPieChartData: toSortedChartData('defi'),
				pieChartStackColors
			}
		}, [filteredAssets, props.categories, selectedCategoriesSet])

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

	const prepareCsv = useCallback(() => {
		const tableRows = instance.getSortedRowModel().rows
		const headers: Array<string | number | boolean> = [
			// Keep in sync with `columns` below (virtual table columns)
			'Name',
			definitions.type.label,
			definitions.category.label,
			definitions.assetClass.label,
			definitions.onChainMarketcap.label,
			definitions.activeMarketcap.label,
			definitions.defiActiveTvl.label,
			definitions.rwaClassification.label,
			definitions.accessModel.label,
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
				asset.category?.join(', ') ?? '',
				asset.assetClass?.join(', ') ?? '',
				asset.onChainMarketcap.total ?? '',
				asset.activeMarketcap.total ?? '',
				asset.defiActiveTvl.total ?? '',
				asset.rwaClassification ?? '',
				asset.accessModel ?? '',
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
	}, [instance, props.selectedChain])

	return (
		<>
			<RowLinksWithDropdown links={props.chains} activeLink={props.selectedChain} />
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:flex-row md:flex-wrap md:items-center">
				<SelectWithCombobox
					allValues={props.categories}
					selectedValues={selectedCategories}
					setSelectedValues={setSelectedCategories}
					selectOnlyOne={selectOnlyOneCategory}
					toggleAll={toggleAllCategories}
					clearAll={clearAllCategories}
					label={'Categories'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<SelectWithCombobox
					allValues={props.assetClassOptions}
					selectedValues={selectedAssetClasses}
					setSelectedValues={setSelectedAssetClasses}
					selectOnlyOne={selectOnlyOneAssetClass}
					toggleAll={toggleAllAssetClasses}
					clearAll={clearAllAssetClasses}
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
					setSelectedValues={setSelectedRwaClassifications}
					selectOnlyOne={selectOnlyOneRwaClassification}
					toggleAll={toggleAllRwaClassifications}
					clearAll={clearAllRwaClassifications}
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
					setSelectedValues={setSelectedAccessModels}
					selectOnlyOne={selectOnlyOneAccessModel}
					toggleAll={toggleAllAccessModels}
					clearAll={clearAllAccessModels}
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
					setSelectedValues={setSelectedIssuers}
					selectOnlyOne={selectOnlyOneIssuer}
					toggleAll={toggleAllIssuers}
					clearAll={clearAllIssuers}
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
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					onChange={() => setIncludeStablecoins(!includeStablecoins)}
					className="ml-auto"
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					onChange={() => setIncludeGovernance(!includeGovernance)}
				/>
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
			const index =
				info.row.depth === 0
					? info.table.getSortedRowModel().rows.findIndex((x) => x.id === info.row.id)
					: info.row.index

			return (
				<span className="flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
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

	const Breakdown = () => (
		<span className="flex flex-col gap-1">
			{breakdown.map(([chain, tvl]) => (
				<span key={`${chain}-${tvl}`}>
					{chain}: {formattedNum(tvl, true)}
				</span>
			))}
		</span>
	)

	return (
		<Tooltip content={<Breakdown />} className="justify-end underline decoration-dotted">
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

const updateArrayQuery = (key: string, values: string[] | 'None', router: NextRouter) => {
	const nextQuery: Record<string, any> = { ...router.query }
	if (values === 'None') {
		nextQuery[key] = 'None'
	} else if (values.length > 0) {
		nextQuery[key] = values
	} else {
		delete nextQuery[key]
	}
	router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
}

const updateNumberRangeQuery = (
	minKey: string,
	maxKey: string,
	minValue: string | number | null | undefined,
	maxValue: string | number | null | undefined,
	router: NextRouter
) => {
	const nextQuery: Record<string, any> = { ...router.query }
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
	router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
}

const useRWATableQueryParams = ({
	categories,
	assetClasses,
	rwaClassifications,
	accessModels,
	issuers
}: {
	categories: string[]
	assetClasses: string[]
	rwaClassifications: string[]
	accessModels: string[]
	issuers: string[]
}) => {
	const router = useRouter()

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
		const {
			categories: categoriesQ,
			assetClasses: assetClassesQ,
			rwaClassifications: rwaClassificationsQ,
			accessModels: accessModelsQ,
			issuers: issuersQ,
			minDefiActiveTvlToOnChainPct: minDefiActiveTvlToOnChainPctQ,
			maxDefiActiveTvlToOnChainPct: maxDefiActiveTvlToOnChainPctQ,
			minActiveMcapToOnChainPct: minActiveMcapToOnChainPctQ,
			maxActiveMcapToOnChainPct: maxActiveMcapToOnChainPctQ,
			minDefiActiveTvlToActiveMcapPct: minDefiActiveTvlToActiveMcapPctQ,
			maxDefiActiveTvlToActiveMcapPct: maxDefiActiveTvlToActiveMcapPctQ,
			includeStablecoins: stablecoinsQ,
			includeGovernance: governanceQ
		} = router.query

		// If query param is 'None', return empty array. If no param, return all (default). Otherwise parse the array.
		const parseArrayParam = (param: string | string[] | undefined, allValues: string[]): string[] => {
			if (param === 'None') return []
			if (!param) return allValues
			const arr = toArrayParam(param)
			const validSet = new Set(allValues)
			return arr.filter((v) => validSet.has(v))
		}

		const selectedCategories = parseArrayParam(categoriesQ, categories)
		const selectedAssetClasses = parseArrayParam(assetClassesQ, assetClasses)
		const selectedRwaClassifications = parseArrayParam(rwaClassificationsQ, rwaClassifications)
		const selectedAccessModels = parseArrayParam(accessModelsQ, accessModels)
		const selectedIssuers = parseArrayParam(issuersQ, issuers)
		const minDefiActiveTvlToOnChainPct = toNumberParam(minDefiActiveTvlToOnChainPctQ)
		const maxDefiActiveTvlToOnChainPct = toNumberParam(maxDefiActiveTvlToOnChainPctQ)
		const minActiveMcapToOnChainPct = toNumberParam(minActiveMcapToOnChainPctQ)
		const maxActiveMcapToOnChainPct = toNumberParam(maxActiveMcapToOnChainPctQ)
		const minDefiActiveTvlToActiveMcapPct = toNumberParam(minDefiActiveTvlToActiveMcapPctQ)
		const maxDefiActiveTvlToActiveMcapPct = toNumberParam(maxDefiActiveTvlToActiveMcapPctQ)

		// includeStablecoins is true by default, unless explicitly set to 'false'
		const includeStablecoins = stablecoinsQ !== 'false'
		const includeGovernance = governanceQ !== 'false'
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
	}, [router.query, categories, assetClasses, rwaClassifications, accessModels, issuers])

	const setSelectedCategories = useCallback(
		(values: string[]) => updateArrayQuery('categories', values, router),
		[router]
	)
	const selectOnlyOneCategory = useCallback(
		(category: string) => updateArrayQuery('categories', [category], router),
		[router]
	)
	const toggleAllCategories = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.categories
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllCategories = useCallback(() => updateArrayQuery('categories', 'None', router), [router])

	const setSelectedAssetClasses = useCallback(
		(values: string[]) => updateArrayQuery('assetClasses', values, router),
		[router]
	)
	const selectOnlyOneAssetClass = useCallback(
		(assetClass: string) => updateArrayQuery('assetClasses', [assetClass], router),
		[router]
	)
	const toggleAllAssetClasses = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.assetClasses
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllAssetClasses = useCallback(() => updateArrayQuery('assetClasses', 'None', router), [router])

	const setSelectedRwaClassifications = useCallback(
		(values: string[]) => updateArrayQuery('rwaClassifications', values, router),
		[router]
	)
	const selectOnlyOneRwaClassification = useCallback(
		(rwaClassification: string) => updateArrayQuery('rwaClassifications', [rwaClassification], router),
		[router]
	)
	const toggleAllRwaClassifications = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.rwaClassifications
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllRwaClassifications = useCallback(() => updateArrayQuery('rwaClassifications', 'None', router), [router])

	const setSelectedAccessModels = useCallback(
		(values: string[]) => updateArrayQuery('accessModels', values, router),
		[router]
	)
	const selectOnlyOneAccessModel = useCallback(
		(accessModel: string) => updateArrayQuery('accessModels', [accessModel], router),
		[router]
	)
	const toggleAllAccessModels = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.accessModels
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllAccessModels = useCallback(() => updateArrayQuery('accessModels', 'None', router), [router])

	const setSelectedIssuers = useCallback((values: string[]) => updateArrayQuery('issuers', values, router), [router])
	const selectOnlyOneIssuer = useCallback((issuer: string) => updateArrayQuery('issuers', [issuer], router), [router])
	const toggleAllIssuers = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		delete nextQuery.issuers
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [router])
	const clearAllIssuers = useCallback(() => updateArrayQuery('issuers', 'None', router), [router])

	const setDefiActiveTvlToOnChainPctRange = useCallback(
		(minValue: string | number | null, maxValue: string | number | null) =>
			updateNumberRangeQuery(
				'minDefiActiveTvlToOnChainPct',
				'maxDefiActiveTvlToOnChainPct',
				minValue,
				maxValue,
				router
			),
		[router]
	)
	const setActiveMcapToOnChainPctRange = useCallback(
		(minValue: string | number | null, maxValue: string | number | null) =>
			updateNumberRangeQuery('minActiveMcapToOnChainPct', 'maxActiveMcapToOnChainPct', minValue, maxValue, router),
		[router]
	)
	const setDefiActiveTvlToActiveMcapPctRange = useCallback(
		(minValue: string | number | null, maxValue: string | number | null) =>
			updateNumberRangeQuery(
				'minDefiActiveTvlToActiveMcapPct',
				'maxDefiActiveTvlToActiveMcapPct',
				minValue,
				maxValue,
				router
			),
		[router]
	)

	const setIncludeStablecoins = useCallback(
		(value: boolean) => {
			const nextQuery: Record<string, any> = { ...router.query }
			if (value) {
				delete nextQuery.includeStablecoins
			} else {
				nextQuery.includeStablecoins = 'false'
			}
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		},
		[router]
	)

	const setIncludeGovernance = useCallback(
		(value: boolean) => {
			const nextQuery: Record<string, any> = { ...router.query }
			if (value) {
				delete nextQuery.includeGovernance
			} else {
				nextQuery.includeGovernance = 'false'
			}
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		},
		[router]
	)

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
		setSelectedCategories,
		setSelectedAssetClasses,
		setSelectedRwaClassifications,
		setSelectedAccessModels,
		setSelectedIssuers,
		setDefiActiveTvlToOnChainPctRange,
		setActiveMcapToOnChainPctRange,
		setDefiActiveTvlToActiveMcapPctRange,
		setIncludeStablecoins,
		setIncludeGovernance,
		selectOnlyOneCategory,
		toggleAllCategories,
		clearAllCategories,
		selectOnlyOneAssetClass,
		toggleAllAssetClasses,
		clearAllAssetClasses,
		selectOnlyOneRwaClassification,
		toggleAllRwaClassifications,
		clearAllRwaClassifications,
		selectOnlyOneAccessModel,
		toggleAllAccessModels,
		clearAllAccessModels,
		selectOnlyOneIssuer,
		toggleAllIssuers,
		clearAllIssuers
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
