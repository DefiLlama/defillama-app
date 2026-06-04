import type { NextRouter } from 'next/router'
import { isTrueQueryParam, toNonEmptyArrayParam } from '~/utils/routerQuery'
import type { RWAAssetOverviewRow, RWAOverviewDisplayRow, RWAPerpsContractOverlayRow } from './api.types'
import { normalizeRwaAssetGroup } from './assetGroup'
import { getDefaultRWAOverviewInclusion, type RWAOverviewInclusionContext, type RWAOverviewMode } from './constants'
import { getRwaPlatforms, UNKNOWN_PLATFORM } from './grouping'

export const RWA_ATTRIBUTE_FILTER_STATES = ['yes', 'no', 'unknown'] as const
export type RWAAttributeFilterState = (typeof RWA_ATTRIBUTE_FILTER_STATES)[number]

const RWA_ATTRIBUTE_FILTER_STATE_SET = new Set<RWAAttributeFilterState>(RWA_ATTRIBUTE_FILTER_STATES)

const RWA_PERPS_OVERLAY_BLOCKING_FILTER_KEYS = new Set([
	'assetNames',
	'excludeAssetNames',
	'types',
	'excludeTypes',
	'redeemableStates',
	'attestationsStates',
	'cexListedStates',
	'kycForMintRedeemStates',
	'kycAllowlistedWhitelistedToTransferHoldStates',
	'transferableStates',
	'selfCustodyStates',
	'minDefiActiveTvlToOnChainMcapPct',
	'maxDefiActiveTvlToOnChainMcapPct',
	'minActiveMcapToOnChainMcapPct',
	'maxActiveMcapToOnChainMcapPct',
	'minDefiActiveTvlToActiveMcapPct',
	'maxDefiActiveTvlToActiveMcapPct'
])

export type RWAFilterState = {
	isPlatformMode: boolean
	selectedAssetNames: string[]
	selectedTypes: string[]
	selectedCategories: string[]
	selectedPlatforms: string[]
	selectedAssetGroups: string[]
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
	includeStablecoins: boolean
	includeGovernance: boolean
	includeRwaPerps: boolean
	hasPerpsOverlayBlockingFilters: boolean
	minDefiActiveTvlToOnChainMcapPct: number | null
	maxDefiActiveTvlToOnChainMcapPct: number | null
	minActiveMcapToOnChainMcapPct: number | null
	maxActiveMcapToOnChainMcapPct: number | null
	minDefiActiveTvlToActiveMcapPct: number | null
	maxDefiActiveTvlToActiveMcapPct: number | null
}

export type RWAFilteredRowsResult = {
	filteredAssets: RWAOverviewDisplayRow[]
	totalOnChainMcap: number
	totalActiveMcap: number
	totalOnChainDeFiActiveTvl: number
	totalOpenInterest: number
	totalIssuersCount: number
}

export const parseAttributeFilterStatesParam = (param: string | string[] | undefined): RWAAttributeFilterState[] => {
	if (!param) return [...RWA_ATTRIBUTE_FILTER_STATES]

	const values = toNonEmptyArrayParam(param).map((value) => value.toLowerCase())
	if (values.some((value) => value === 'none')) return []

	const selectedSet = new Set<RWAAttributeFilterState>()
	for (const value of values) {
		if (RWA_ATTRIBUTE_FILTER_STATE_SET.has(value as RWAAttributeFilterState)) {
			selectedSet.add(value as RWAAttributeFilterState)
		}
	}

	if (selectedSet.size === 0) return [...RWA_ATTRIBUTE_FILTER_STATES]
	return RWA_ATTRIBUTE_FILTER_STATES.filter((value) => selectedSet.has(value))
}

export function resolveRWAOverviewInclusionFlag(
	queryValue: string | string[] | undefined,
	defaultValue: boolean
): boolean {
	return queryValue != null ? isTrueQueryParam(queryValue) : defaultValue
}

export function hasActiveInclusionOverride(queryValue: string | string[] | undefined, defaultValue: boolean): boolean {
	if (queryValue == null) return false
	if (Array.isArray(queryValue)) return true
	return resolveRWAOverviewInclusionFlag(queryValue, defaultValue) !== defaultValue
}

export function hasPerpsOverlayBlockingFiltersFromQuery(
	query: NextRouter['query'],
	inclusionContext: RWAOverviewInclusionContext
): boolean {
	const defaultInclusion = getDefaultRWAOverviewInclusion(inclusionContext)

	if (hasActiveInclusionOverride(query.includeStablecoins, defaultInclusion.includeStablecoins)) return true
	if (hasActiveInclusionOverride(query.includeGovernance, defaultInclusion.includeGovernance)) return true

	for (const key of RWA_PERPS_OVERLAY_BLOCKING_FILTER_KEYS) {
		if (key in query) return true
	}

	return false
}

export function updateAttributeFilterStatesQueryValue(
	values: RWAAttributeFilterState[]
): string | string[] | undefined {
	const selectedSet = new Set<RWAAttributeFilterState>()
	for (const value of values) {
		if (RWA_ATTRIBUTE_FILTER_STATE_SET.has(value)) selectedSet.add(value)
	}

	const normalizedStates = RWA_ATTRIBUTE_FILTER_STATES.filter((value) => selectedSet.has(value))
	if (normalizedStates.length === RWA_ATTRIBUTE_FILTER_STATES.length) return undefined
	if (normalizedStates.length === 0) return 'none'
	if (normalizedStates.length === 1) return normalizedStates[0]
	return normalizedStates
}

export function filterRwaAssetOverviewRows(
	assets: RWAAssetOverviewRow[],
	filterState: RWAFilterState
): RWAAssetOverviewRow[] {
	const filteredRows: RWAAssetOverviewRow[] = []
	const selectedAssetNamesSet = filterState.isPlatformMode ? new Set(filterState.selectedAssetNames) : null

	for (const asset of assets) {
		if (selectedAssetNamesSet) {
			const name = asset.assetName || asset.ticker
			if (!selectedAssetNamesSet.has(name)) continue
		}

		if (!filterState.includeStablecoins && asset.stablecoin) continue
		if (!filterState.includeGovernance && asset.governance) continue
		if (!matchesAssetAttributeFilters(asset, filterState)) continue
		if (!matchesAssetRatioFilters(asset, filterState)) continue
		if (!new Set(filterState.selectedTypes).has(asset.type || 'Unknown')) continue
		if (!matchesSharedRwaFilters(asset, filterState)) continue

		filteredRows.push(asset)
	}

	return filteredRows
}

export function filterRwaPerpsContractOverlayRows(
	rows: RWAPerpsContractOverlayRow[],
	filterState: RWAFilterState
): RWAPerpsContractOverlayRow[] {
	if (!filterState.includeRwaPerps || filterState.hasPerpsOverlayBlockingFilters) return []

	return rows.filter((row) => matchesSharedRwaFilters(row, filterState))
}

export function filterRwaOverviewDisplayRows(
	assets: RWAOverviewDisplayRow[],
	filterState: RWAFilterState
): RWAFilteredRowsResult {
	const filteredSpotRows = filterRwaAssetOverviewRows(
		assets.filter((asset): asset is RWAAssetOverviewRow => asset.kind === 'spot'),
		filterState
	)
	const filteredPerpsRows = filterRwaPerpsContractOverlayRows(
		assets.filter((asset): asset is RWAPerpsContractOverlayRow => asset.kind === 'perps'),
		filterState
	)
	const filteredAssets: RWAOverviewDisplayRow[] = [...filteredSpotRows, ...filteredPerpsRows]

	let totalOnChainMcap = 0
	let totalActiveMcap = 0
	let totalOnChainDeFiActiveTvl = 0
	let totalOpenInterest = 0
	const totalIssuersSet = new Set<string>()

	for (const asset of filteredAssets) {
		totalOnChainMcap += asset.onChainMcap?.total ?? 0
		totalActiveMcap += asset.activeMcap?.total ?? 0
		totalOnChainDeFiActiveTvl += asset.defiActiveTvl?.total ?? 0
		totalOpenInterest += asset.openInterest ?? 0
		if (asset.issuer) totalIssuersSet.add(asset.issuer)
	}

	return {
		filteredAssets,
		totalOnChainMcap,
		totalActiveMcap,
		totalOnChainDeFiActiveTvl,
		totalOpenInterest,
		totalIssuersCount: totalIssuersSet.size
	}
}

export function getEmptyRwaFilteredRowsResult(): RWAFilteredRowsResult {
	return {
		filteredAssets: [],
		totalOnChainMcap: 0,
		totalActiveMcap: 0,
		totalOnChainDeFiActiveTvl: 0,
		totalOpenInterest: 0,
		totalIssuersCount: 0
	}
}

export function isRwaPlatformMode(mode: RWAOverviewMode): boolean {
	return mode === 'platform'
}

function matchesSharedRwaFilters(asset: RWAOverviewDisplayRow, filterState: RWAFilterState): boolean {
	const selectedCategoriesSet = new Set(filterState.selectedCategories)
	const selectedPlatformsSet = new Set(filterState.selectedPlatforms)
	const selectedAssetGroupsSet = new Set(filterState.selectedAssetGroups)
	const selectedAssetClassesSet = new Set(filterState.selectedAssetClasses)
	const selectedRwaClassificationsSet = new Set(filterState.selectedRwaClassifications)
	const selectedAccessModelsSet = new Set(filterState.selectedAccessModels)
	const selectedIssuersSet = new Set(filterState.selectedIssuers)

	const assetGroup = normalizeRwaAssetGroup(asset.assetGroup)
	const platforms = getRwaPlatforms(asset.parentPlatform).filter((platform) => platform !== UNKNOWN_PLATFORM)

	return (
		(asset.category?.length ? asset.category.some((category) => selectedCategoriesSet.has(category)) : true) &&
		(platforms.length > 0 ? platforms.some((platform) => selectedPlatformsSet.has(platform)) : true) &&
		selectedAssetGroupsSet.has(assetGroup) &&
		(asset.assetClass?.length
			? asset.assetClass.some((assetClass) => selectedAssetClassesSet.has(assetClass))
			: true) &&
		(asset.rwaClassification ? selectedRwaClassificationsSet.has(asset.rwaClassification) : true) &&
		(asset.accessModel ? selectedAccessModelsSet.has(asset.accessModel) : true) &&
		selectedIssuersSet.has(asset.issuer || 'Unknown')
	)
}

function matchesAssetAttributeFilters(asset: RWAAssetOverviewRow, filterState: RWAFilterState): boolean {
	const selectedRedeemableStatesSet = new Set(filterState.selectedRedeemableStates)
	const selectedAttestationsStatesSet = new Set(filterState.selectedAttestationsStates)
	const selectedCexListedStatesSet = new Set(filterState.selectedCexListedStates)
	const selectedKycForMintRedeemStatesSet = new Set(filterState.selectedKycForMintRedeemStates)
	const selectedKycAllowlistedWhitelistedToTransferHoldStatesSet = new Set(
		filterState.selectedKycAllowlistedWhitelistedToTransferHoldStates
	)
	const selectedTransferableStatesSet = new Set(filterState.selectedTransferableStates)
	const selectedSelfCustodyStatesSet = new Set(filterState.selectedSelfCustodyStates)

	return (
		selectedRedeemableStatesSet.has(toAttributeFilterState(asset.redeemable)) &&
		selectedAttestationsStatesSet.has(toAttributeFilterState(asset.attestations)) &&
		selectedCexListedStatesSet.has(toAttributeFilterState(asset.cexListed)) &&
		selectedKycForMintRedeemStatesSet.has(toAttributeFilterState(asset.kycForMintRedeem)) &&
		selectedKycAllowlistedWhitelistedToTransferHoldStatesSet.has(
			toAttributeFilterState(asset.kycAllowlistedWhitelistedToTransferHold)
		) &&
		selectedTransferableStatesSet.has(toAttributeFilterState(asset.transferable)) &&
		selectedSelfCustodyStatesSet.has(toAttributeFilterState(asset.selfCustody))
	)
}

function matchesAssetRatioFilters(asset: RWAAssetOverviewRow, filterState: RWAFilterState): boolean {
	const onChainMcap = asset.onChainMcap?.total ?? 0
	const activeMcap = asset.activeMcap?.total ?? 0
	const defiActiveTvl = asset.defiActiveTvl?.total ?? 0

	return (
		meetsRatioPercent(
			defiActiveTvl,
			onChainMcap,
			filterState.minDefiActiveTvlToOnChainMcapPct,
			filterState.maxDefiActiveTvlToOnChainMcapPct
		) &&
		meetsRatioPercent(
			activeMcap,
			onChainMcap,
			filterState.minActiveMcapToOnChainMcapPct,
			filterState.maxActiveMcapToOnChainMcapPct
		) &&
		meetsRatioPercent(
			defiActiveTvl,
			activeMcap,
			filterState.minDefiActiveTvlToActiveMcapPct,
			filterState.maxDefiActiveTvlToActiveMcapPct
		)
	)
}

function meetsRatioPercent(
	numerator: number,
	denominator: number,
	minPercent: number | null,
	maxPercent: number | null
) {
	if (minPercent == null && maxPercent == null) return true
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return false
	const percent = (numerator / denominator) * 100
	if (minPercent != null && percent < minPercent) return false
	if (maxPercent != null && percent > maxPercent) return false
	return true
}

function toAttributeFilterState(value: boolean | null | undefined): RWAAttributeFilterState {
	if (value == null) return 'unknown'
	return value ? 'yes' : 'no'
}
