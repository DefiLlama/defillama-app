import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import type { IRWAAssetsOverview } from './queries'

const filterTriggerClassName =
	'flex items-center justify-between gap-2 py-1.5 px-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'

const ratioPercentInputProps = { min: 0, step: '0.01' } as const

const FILTER_QUERY_KEYS = [
	'assetNames',
	'excludeAssetNames',
	'types',
	'excludeTypes',
	'categories',
	'excludeCategories',
	'assetClasses',
	'excludeAssetClasses',
	'rwaClassifications',
	'excludeRwaClassifications',
	'accessModels',
	'excludeAccessModels',
	'issuers',
	'excludeIssuers',
	'minDefiActiveTvlToOnChainMcapPct',
	'maxDefiActiveTvlToOnChainMcapPct',
	'minActiveMcapToOnChainMcapPct',
	'maxActiveMcapToOnChainMcapPct',
	'minDefiActiveTvlToActiveMcapPct',
	'maxDefiActiveTvlToActiveMcapPct',
	'includeStablecoins',
	'includeGovernance'
] as const

const formatPercentRange = (minPercent: number | null, maxPercent: number | null) => {
	const minLabel = minPercent != null ? `${minPercent.toLocaleString()}%` : 'no min'
	const maxLabel = maxPercent != null ? `${maxPercent.toLocaleString()}%` : 'no max'
	return `${minLabel} - ${maxLabel}`
}

export function RWAOverviewFilters({
	enabled,
	isChainMode,
	isPlatformMode,
	assetNames,
	typeOptions,
	categoriesOptions,
	assetClassOptions,
	rwaClassificationOptions,
	accessModelOptions,
	issuers,
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
	setDefiActiveTvlToOnChainMcapPctRange,
	setActiveMcapToOnChainMcapPctRange,
	setDefiActiveTvlToActiveMcapPctRange,
	includeStablecoins,
	includeGovernance,
	setIncludeStablecoins,
	setIncludeGovernance
}: {
	enabled: boolean
	isChainMode: boolean
	isPlatformMode: boolean
	assetNames: IRWAAssetsOverview['assetNames']
	typeOptions: IRWAAssetsOverview['typeOptions']
	categoriesOptions: IRWAAssetsOverview['categoriesOptions']
	assetClassOptions: IRWAAssetsOverview['assetClassOptions']
	rwaClassificationOptions: IRWAAssetsOverview['rwaClassificationOptions']
	accessModelOptions: IRWAAssetsOverview['accessModelOptions']
	issuers: IRWAAssetsOverview['issuers']
	selectedAssetNames: string[]
	selectedTypes: string[]
	selectedCategories: string[]
	selectedAssetClasses: string[]
	selectedRwaClassifications: string[]
	selectedAccessModels: string[]
	selectedIssuers: string[]
	minDefiActiveTvlToOnChainMcapPct: number | null
	maxDefiActiveTvlToOnChainMcapPct: number | null
	minActiveMcapToOnChainMcapPct: number | null
	maxActiveMcapToOnChainMcapPct: number | null
	minDefiActiveTvlToActiveMcapPct: number | null
	maxDefiActiveTvlToActiveMcapPct: number | null
	setDefiActiveTvlToOnChainMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	setActiveMcapToOnChainMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	setDefiActiveTvlToActiveMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	includeStablecoins: boolean
	includeGovernance: boolean
	setIncludeStablecoins: (value: boolean) => void
	setIncludeGovernance: (value: boolean) => void
}) {
	const router = useRouter()

	if (!enabled) return null

	const defaultSelectedTypes = typeOptions.map((option) => option.key).filter((type) => type !== 'Wrapper')

	// Determine active filters purely from URL query.
	// Selected arrays often default to "all values" when there is no query set.
	const hasActiveFilters = FILTER_QUERY_KEYS.some((key) => router.query[key] != null)

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:flex-row md:flex-wrap md:items-center">
			{typeOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={typeOptions}
					selectedValues={selectedTypes}
					includeQueryKey="types"
					excludeQueryKey="excludeTypes"
					defaultSelectedValues={defaultSelectedTypes}
					label={'Types'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{isPlatformMode && assetNames.length > 1 ? (
				<SelectWithCombobox
					allValues={assetNames}
					selectedValues={selectedAssetNames}
					includeQueryKey="assetNames"
					excludeQueryKey="excludeAssetNames"
					label={'Asset Names'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{isChainMode && categoriesOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={categoriesOptions}
					selectedValues={selectedCategories}
					includeQueryKey="categories"
					excludeQueryKey="excludeCategories"
					label={'Categories'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{assetClassOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={assetClassOptions}
					selectedValues={selectedAssetClasses}
					includeQueryKey="assetClasses"
					excludeQueryKey="excludeAssetClasses"
					label={'Asset Classes'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{rwaClassificationOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={rwaClassificationOptions}
					selectedValues={selectedRwaClassifications}
					includeQueryKey="rwaClassifications"
					excludeQueryKey="excludeRwaClassifications"
					label={'RWA Classification'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{accessModelOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={accessModelOptions}
					selectedValues={selectedAccessModels}
					includeQueryKey="accessModels"
					excludeQueryKey="excludeAccessModels"
					label={'Access Model'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			{issuers.length > 1 ? (
				<SelectWithCombobox
					allValues={issuers}
					selectedValues={selectedIssuers}
					includeQueryKey="issuers"
					excludeQueryKey="excludeIssuers"
					label={'Issuers'}
					labelType="smol"
					triggerProps={{
						className: filterTriggerClassName
					}}
				/>
			) : null}
			<FilterBetweenRange
				name="DeFi TVL / Onchain %"
				trigger={
					minDefiActiveTvlToOnChainMcapPct != null || maxDefiActiveTvlToOnChainMcapPct != null ? (
						<>
							<span>DeFi TVL / Onchain: </span>
							<span className="text-(--link)">
								{formatPercentRange(minDefiActiveTvlToOnChainMcapPct, maxDefiActiveTvlToOnChainMcapPct)}
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
					setDefiActiveTvlToOnChainMcapPctRange(minValue, maxValue)
				}}
				onClear={() => setDefiActiveTvlToOnChainMcapPctRange(null, null)}
				min={minDefiActiveTvlToOnChainMcapPct}
				max={maxDefiActiveTvlToOnChainMcapPct}
				minLabel="Min %"
				maxLabel="Max %"
				minInputProps={ratioPercentInputProps}
				maxInputProps={ratioPercentInputProps}
			/>
			<FilterBetweenRange
				name="Active Marketcap / Onchain %"
				trigger={
					minActiveMcapToOnChainMcapPct != null || maxActiveMcapToOnChainMcapPct != null ? (
						<>
							<span>Active Marketcap / Onchain: </span>
							<span className="text-(--link)">
								{formatPercentRange(minActiveMcapToOnChainMcapPct, maxActiveMcapToOnChainMcapPct)}
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
					setActiveMcapToOnChainMcapPctRange(minValue, maxValue)
				}}
				onClear={() => setActiveMcapToOnChainMcapPctRange(null, null)}
				min={minActiveMcapToOnChainMcapPct}
				max={maxActiveMcapToOnChainMcapPct}
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
			<div className="flex flex-wrap items-center gap-2 md:ml-auto">
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					onChange={() => setIncludeStablecoins(!includeStablecoins)}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					onChange={() => setIncludeGovernance(!includeGovernance)}
				/>
				<button
					onClick={() => {
						const nextQuery: Record<string, any> = { ...router.query }
						for (const key of FILTER_QUERY_KEYS) {
							delete nextQuery[key]
						}
						router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
					}}
					disabled={!hasActiveFilters}
					className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
				>
					Reset filters
				</button>
			</div>
		</div>
	)
}
