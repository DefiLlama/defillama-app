import { useRouter } from 'next/router'
import { startTransition } from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ExcludeQueryKey, SelectValues } from '~/components/Select/types'
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

type RWAFilterModes = {
	isChainMode: boolean
	isPlatformMode: boolean
}

type RWAFilterOptions = {
	assetNames: IRWAAssetsOverview['assetNames']
	typeOptions: IRWAAssetsOverview['typeOptions']
	categoriesOptions: IRWAAssetsOverview['categoriesOptions']
	assetClassOptions: IRWAAssetsOverview['assetClassOptions']
	rwaClassificationOptions: IRWAAssetsOverview['rwaClassificationOptions']
	accessModelOptions: IRWAAssetsOverview['accessModelOptions']
	issuers: IRWAAssetsOverview['issuers']
}

type RWAFilterSelections = {
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
	includeStablecoins: boolean
	includeGovernance: boolean
}

type RWAFilterActions = {
	setDefiActiveTvlToOnChainMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	setActiveMcapToOnChainMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	setDefiActiveTvlToActiveMcapPctRange: (minValue: string | number | null, maxValue: string | number | null) => void
	setIncludeStablecoins: (value: boolean) => void
	setIncludeGovernance: (value: boolean) => void
}

type RWAOverviewFiltersProps = {
	enabled: boolean
	modes: RWAFilterModes
	options: RWAFilterOptions
	selections: RWAFilterSelections
	actions: RWAFilterActions
}

export function RWAOverviewFilters(props: RWAOverviewFiltersProps) {
	if (!props.enabled) return null

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<ResponsiveFilterLayout desktopClassName="hidden min-h-[116px] flex-wrap items-center gap-2 min-[1260px]:min-h-[78px] min-[2102px]:min-h-[40px] sm:flex">
				{(nestedMenu) => <Filters {...props} nestedMenu={nestedMenu} />}
			</ResponsiveFilterLayout>
		</div>
	)
}

function Filters({
	enabled,
	modes,
	options,
	selections,
	actions,
	nestedMenu
}: RWAOverviewFiltersProps & { nestedMenu?: boolean }) {
	const router = useRouter()

	if (!enabled) return null

	const defaultSelectedTypes = options.typeOptions.flatMap((option) => (option.key !== 'Wrapper' ? [option.key] : []))

	// Determine active filters purely from URL query.
	// Selected arrays often default to "all values" when there is no query set.
	const hasActiveFilters = FILTER_QUERY_KEYS.some((key) => router.query[key] != null)

	const switchesAndResetClassName = nestedMenu
		? 'mt-2 flex flex-col gap-3 border-t border-(--form-control-border) px-3 pt-3'
		: 'flex flex-wrap items-center gap-2 md:ml-auto'

	const resetButtonClassName = nestedMenu
		? 'relative flex w-full cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40'
		: 'relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40'

	const selectFilters: Array<{
		enabled: boolean
		allValues: SelectValues
		selectedValues: string[]
		includeQueryKey: string
		excludeQueryKey: ExcludeQueryKey
		label: string
		defaultSelectedValues?: string[]
	}> = [
		{
			enabled: options.typeOptions.length > 1,
			allValues: options.typeOptions,
			selectedValues: selections.selectedTypes,
			includeQueryKey: 'types',
			excludeQueryKey: 'excludeTypes',
			label: 'Types',
			defaultSelectedValues: defaultSelectedTypes
		},
		{
			enabled: modes.isPlatformMode && options.assetNames.length > 1,
			allValues: options.assetNames,
			selectedValues: selections.selectedAssetNames,
			includeQueryKey: 'assetNames',
			excludeQueryKey: 'excludeAssetNames',
			label: 'Asset Names'
		},
		{
			enabled: modes.isChainMode && options.categoriesOptions.length > 1,
			allValues: options.categoriesOptions,
			selectedValues: selections.selectedCategories,
			includeQueryKey: 'categories',
			excludeQueryKey: 'excludeCategories',
			label: 'Categories'
		},
		{
			enabled: options.assetClassOptions.length > 1,
			allValues: options.assetClassOptions,
			selectedValues: selections.selectedAssetClasses,
			includeQueryKey: 'assetClasses',
			excludeQueryKey: 'excludeAssetClasses',
			label: 'Asset Classes'
		},
		{
			enabled: options.rwaClassificationOptions.length > 1,
			allValues: options.rwaClassificationOptions,
			selectedValues: selections.selectedRwaClassifications,
			includeQueryKey: 'rwaClassifications',
			excludeQueryKey: 'excludeRwaClassifications',
			label: 'RWA Classification'
		},
		{
			enabled: options.accessModelOptions.length > 1,
			allValues: options.accessModelOptions,
			selectedValues: selections.selectedAccessModels,
			includeQueryKey: 'accessModels',
			excludeQueryKey: 'excludeAccessModels',
			label: 'Access Model'
		},
		{
			enabled: options.issuers.length > 1,
			allValues: options.issuers,
			selectedValues: selections.selectedIssuers,
			includeQueryKey: 'issuers',
			excludeQueryKey: 'excludeIssuers',
			label: 'Issuers'
		}
	]

	const rangeFilters: Array<{
		name: string
		label: string
		min: number | null
		max: number | null
		onSubmitRange: (minValue: string | number | null, maxValue: string | number | null) => void
	}> = [
		{
			name: 'DeFi TVL / Onchain %',
			label: 'DeFi TVL / Onchain',
			min: selections.minDefiActiveTvlToOnChainMcapPct,
			max: selections.maxDefiActiveTvlToOnChainMcapPct,
			onSubmitRange: actions.setDefiActiveTvlToOnChainMcapPctRange
		},
		{
			name: 'Active Marketcap / Onchain %',
			label: 'Active Marketcap / Onchain',
			min: selections.minActiveMcapToOnChainMcapPct,
			max: selections.maxActiveMcapToOnChainMcapPct,
			onSubmitRange: actions.setActiveMcapToOnChainMcapPctRange
		},
		{
			name: 'DeFi TVL / Active Marketcap %',
			label: 'DeFi TVL / Active Marketcap',
			min: selections.minDefiActiveTvlToActiveMcapPct,
			max: selections.maxDefiActiveTvlToActiveMcapPct,
			onSubmitRange: actions.setDefiActiveTvlToActiveMcapPctRange
		}
	]

	return (
		<>
			{selectFilters.map((config) =>
				config.enabled ? (
					<SelectWithCombobox
						key={`${config.includeQueryKey}-${config.excludeQueryKey}`}
						allValues={config.allValues}
						selectedValues={config.selectedValues}
						includeQueryKey={config.includeQueryKey}
						excludeQueryKey={config.excludeQueryKey}
						defaultSelectedValues={config.defaultSelectedValues}
						label={config.label}
						labelType="smol"
						nestedMenu={nestedMenu}
						variant="filter"
					/>
				) : null
			)}
			{rangeFilters.map((config) => (
				<FilterBetweenRange
					key={config.name}
					name={config.name}
					trigger={
						config.min != null || config.max != null ? (
							<>
								<span>{config.label}: </span>
								<span className="text-(--link)">{formatPercentRange(config.min, config.max)}</span>
							</>
						) : (
							<span>{config.name}</span>
						)
					}
					onSubmit={(e) => {
						e.preventDefault()
						const form = e.currentTarget
						const minValue = (form.elements.namedItem('min') as HTMLInputElement | null)?.value
						const maxValue = (form.elements.namedItem('max') as HTMLInputElement | null)?.value
						config.onSubmitRange(minValue, maxValue)
					}}
					onClear={() => config.onSubmitRange(null, null)}
					nestedMenu={nestedMenu}
					min={config.min}
					max={config.max}
					minLabel="Min %"
					maxLabel="Max %"
					minInputProps={ratioPercentInputProps}
					maxInputProps={ratioPercentInputProps}
				/>
			))}
			<div className={switchesAndResetClassName}>
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={selections.includeStablecoins}
					onChange={() => {
						const next = !selections.includeStablecoins
						startTransition(() => actions.setIncludeStablecoins(next))
					}}
					className={nestedMenu ? 'text-base' : undefined}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={selections.includeGovernance}
					onChange={() => {
						const next = !selections.includeGovernance
						startTransition(() => actions.setIncludeGovernance(next))
					}}
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
