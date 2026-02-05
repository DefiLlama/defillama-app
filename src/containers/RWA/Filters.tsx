import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { NestedMenu } from '~/components/NestedMenu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import type { IRWAAssetsOverview } from './queries'

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

type RWAOverviewFiltersProps = {
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
}

export function RWAOverviewFilters(props: RWAOverviewFiltersProps) {
	if (!props.enabled) return null

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:invisible sm:hidden">
				<NestedMenu label="Filters" className="w-full">
					<Filters {...props} nestedMenu />
				</NestedMenu>
			</div>

			<div className="invisible hidden min-h-[116px] flex-wrap items-center gap-2 min-[1260px]:min-h-[78px] min-[2102px]:min-h-[40px] sm:visible sm:flex">
				<Filters {...props} />
			</div>
		</div>
	)
}

function Filters({
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
	setIncludeGovernance,
	nestedMenu
}: RWAOverviewFiltersProps & { nestedMenu?: boolean }) {
	const router = useRouter()

	if (!enabled) return null

	const defaultSelectedTypes = typeOptions.map((option) => option.key).filter((type) => type !== 'Wrapper')

	// Determine active filters purely from URL query.
	// Selected arrays often default to "all values" when there is no query set.
	const hasActiveFilters = FILTER_QUERY_KEYS.some((key) => router.query[key] != null)

	const switchesAndResetClassName = nestedMenu
		? 'mt-2 flex flex-col gap-3 border-t border-(--form-control-border) px-3 pt-3'
		: 'flex flex-wrap items-center gap-2 md:ml-auto'

	const resetButtonClassName = nestedMenu
		? 'relative flex w-full cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40'
		: 'relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40'

	return (
		<>
			{typeOptions.length > 1 ? (
				<SelectWithCombobox
					allValues={typeOptions}
					selectedValues={selectedTypes}
					includeQueryKey="types"
					excludeQueryKey="excludeTypes"
					defaultSelectedValues={defaultSelectedTypes}
					label={'Types'}
					labelType="smol"
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
					nestedMenu={nestedMenu}
					variant="filter"
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
				nestedMenu={nestedMenu}
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
				nestedMenu={nestedMenu}
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
				nestedMenu={nestedMenu}
				min={minDefiActiveTvlToActiveMcapPct}
				max={maxDefiActiveTvlToActiveMcapPct}
				minLabel="Min %"
				maxLabel="Max %"
				minInputProps={ratioPercentInputProps}
				maxInputProps={ratioPercentInputProps}
			/>
			<div className={switchesAndResetClassName}>
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					onChange={() => setIncludeStablecoins(!includeStablecoins)}
					className={nestedMenu ? 'text-base' : undefined}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					onChange={() => setIncludeGovernance(!includeGovernance)}
					className={nestedMenu ? 'text-base' : undefined}
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
					className={resetButtonClassName}
				>
					Reset filters
				</button>
			</div>
		</>
	)
}
