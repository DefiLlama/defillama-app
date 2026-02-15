import { useRouter } from 'next/router'
import { startTransition } from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { Icon } from '~/components/Icon'
import { NestedMenu, NestedMenuItem } from '~/components/NestedMenu'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ExcludeQueryKey, SelectValues } from '~/components/Select/types'
import { Switch } from '~/components/Switch'
import type { IRWAAssetsOverview } from './api.types'
import { definitions } from './definitions'

const ratioPercentInputProps = { min: 0, step: '0.01' } as const
const ATTRIBUTE_FILTER_STATES = ['yes', 'no', 'unknown'] as const
type RWAAttributeFilterState = (typeof ATTRIBUTE_FILTER_STATES)[number]
const ATTRIBUTE_FILTER_STATE_LABELS: Record<RWAAttributeFilterState, string> = {
	yes: 'Yes',
	no: 'No',
	unknown: 'Unknown'
}

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
	'includeGovernance',
	'redeemableStates',
	'attestationsStates',
	'cexListedStates',
	'kycForMintRedeemStates',
	'kycAllowlistedWhitelistedToTransferHoldStates',
	'transferableStates',
	'selfCustodyStates'
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
	selectedRedeemableStates: RWAAttributeFilterState[]
	selectedAttestationsStates: RWAAttributeFilterState[]
	selectedCexListedStates: RWAAttributeFilterState[]
	selectedKycForMintRedeemStates: RWAAttributeFilterState[]
	selectedKycAllowlistedWhitelistedToTransferHoldStates: RWAAttributeFilterState[]
	selectedTransferableStates: RWAAttributeFilterState[]
	selectedSelfCustodyStates: RWAAttributeFilterState[]
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
	setRedeemableStates: (values: RWAAttributeFilterState[]) => void
	setAttestationsStates: (values: RWAAttributeFilterState[]) => void
	setCexListedStates: (values: RWAAttributeFilterState[]) => void
	setKycForMintRedeemStates: (values: RWAAttributeFilterState[]) => void
	setKycAllowlistedWhitelistedToTransferHoldStates: (values: RWAAttributeFilterState[]) => void
	setTransferableStates: (values: RWAAttributeFilterState[]) => void
	setSelfCustodyStates: (values: RWAAttributeFilterState[]) => void
}

type RWAOverviewFiltersProps = {
	enabled: boolean
	modes: RWAFilterModes
	options: RWAFilterOptions
	selections: RWAFilterSelections
	actions: RWAFilterActions
}

type RWAAttributeFilterConfig = {
	queryKey: string
	label: string
	selectedStates: RWAAttributeFilterState[]
	onUpdateStates: (values: RWAAttributeFilterState[]) => void
}

const toggleAttributeFilterState = (
	selectedStates: RWAAttributeFilterState[],
	state: RWAAttributeFilterState
): RWAAttributeFilterState[] => {
	const selectedSet = new Set(selectedStates)
	if (selectedSet.has(state)) {
		selectedSet.delete(state)
	} else {
		selectedSet.add(state)
	}
	return ATTRIBUTE_FILTER_STATES.filter((value) => selectedSet.has(value))
}

function AttributesFilter({
	nestedMenu,
	attributeFilters
}: {
	nestedMenu?: boolean
	attributeFilters: RWAAttributeFilterConfig[]
}) {
	const useDesktopPortal = !nestedMenu

	const activeAttributeFiltersCount = attributeFilters.filter(
		(filter) => filter.selectedStates.length !== ATTRIBUTE_FILTER_STATES.length
	).length

	const trigger =
		activeAttributeFiltersCount > 0 ? (
			<>
				<span>Attributes: </span>
				<span className="text-(--link)">{activeAttributeFiltersCount} active</span>
			</>
		) : (
			<span>Attributes</span>
		)

	const renderAttributeSubmenus = () =>
		attributeFilters.map((filter) => {
			const subMenuLabel =
				filter.selectedStates.length === ATTRIBUTE_FILTER_STATES.length
					? filter.label
					: `${filter.label} (${filter.selectedStates.length}/3)`

			return (
				<NestedMenu
					key={filter.queryKey}
					label={subMenuLabel}
					menuPortal={useDesktopPortal}
					className="flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover) sm:rounded-none"
				>
					{ATTRIBUTE_FILTER_STATES.map((state) => {
						const isSelected = filter.selectedStates.includes(state)
						return (
							<NestedMenuItem
								key={`${filter.queryKey}-${state}`}
								hideOnClick={false}
								onClick={(event) => {
									event.preventDefault()
									event.stopPropagation()
									filter.onUpdateStates(toggleAttributeFilterState(filter.selectedStates, state))
								}}
								className="flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
							>
								<span>{ATTRIBUTE_FILTER_STATE_LABELS[state]}</span>
								<span className="flex h-3.5 w-3.5 items-center justify-center">
									{isSelected ? <Icon name="check" height={12} width={12} className="text-(--link)" /> : null}
								</span>
							</NestedMenuItem>
						)
					})}
				</NestedMenu>
			)
		})

	if (nestedMenu) {
		return (
			<NestedMenu label={trigger} menuPortal={useDesktopPortal}>
				{renderAttributeSubmenus()}
			</NestedMenu>
		)
	}

	return (
		<NestedMenu
			label={trigger}
			menuPortal={useDesktopPortal}
			buttonVariant="filter"
		>
			{renderAttributeSubmenus()}
		</NestedMenu>
	)
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

	const attributeFilters: RWAAttributeFilterConfig[] = [
		{
			queryKey: 'redeemableStates',
			label: definitions.redeemable.label,
			selectedStates: selections.selectedRedeemableStates,
			onUpdateStates: actions.setRedeemableStates
		},
		{
			queryKey: 'attestationsStates',
			label: definitions.attestations.label,
			selectedStates: selections.selectedAttestationsStates,
			onUpdateStates: actions.setAttestationsStates
		},
		{
			queryKey: 'cexListedStates',
			label: definitions.cexListed.label,
			selectedStates: selections.selectedCexListedStates,
			onUpdateStates: actions.setCexListedStates
		},
		{
			queryKey: 'kycForMintRedeemStates',
			label: definitions.kycForMintRedeem.label,
			selectedStates: selections.selectedKycForMintRedeemStates,
			onUpdateStates: actions.setKycForMintRedeemStates
		},
		{
			queryKey: 'kycAllowlistedWhitelistedToTransferHoldStates',
			label: definitions.kycAllowlistedWhitelistedToTransferHold.label,
			selectedStates: selections.selectedKycAllowlistedWhitelistedToTransferHoldStates,
			onUpdateStates: actions.setKycAllowlistedWhitelistedToTransferHoldStates
		},
		{
			queryKey: 'transferableStates',
			label: definitions.transferable.label,
			selectedStates: selections.selectedTransferableStates,
			onUpdateStates: actions.setTransferableStates
		},
		{
			queryKey: 'selfCustodyStates',
			label: definitions.selfCustody.label,
			selectedStates: selections.selectedSelfCustodyStates,
			onUpdateStates: actions.setSelfCustodyStates
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
			<AttributesFilter nestedMenu={nestedMenu} attributeFilters={attributeFilters} />
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
						config.onSubmitRange(minValue ?? null, maxValue ?? null)
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
				{modes.isChainMode ? (
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
				) : null}
				{modes.isChainMode ? (
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
				) : null}
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
