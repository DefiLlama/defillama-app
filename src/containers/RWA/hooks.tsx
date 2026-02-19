import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { useMemo } from 'react'
import { CHART_COLORS } from '~/constants/colors'
import {
	toNonEmptyArrayParam,
	parseExcludeParam,
	parseNumberInput,
	parseNumberQueryParam,
	isTrueQueryParam,
	pushShallowQuery
} from '~/utils/routerQuery'
import type { IRWAAssetsOverview } from './api.types'
import { rwaSlug } from './rwaSlug'

type PieChartDatum = { name: string; value: number }
const RWA_ATTRIBUTE_FILTER_STATES = ['yes', 'no', 'unknown'] as const
type RWAAttributeFilterState = (typeof RWA_ATTRIBUTE_FILTER_STATES)[number]
const RWA_ATTRIBUTE_FILTER_STATE_SET = new Set<RWAAttributeFilterState>(RWA_ATTRIBUTE_FILTER_STATES)
const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])

const toUniqueNonEmptyValues = (values: Array<string> | null | undefined): string[] => {
	if (!values || values.length === 0) return []
	const out = new Set<string>()
	for (const value of values) {
		const normalized = typeof value === 'string' ? value.trim() : ''
		if (!normalized) continue
		out.add(normalized)
	}
	return Array.from(out)
}

const buildStackColors = (order: string[]) => {
	const stackColors: Record<string, string> = {}
	for (const [idx, key] of order.entries()) {
		stackColors[key] = CHART_COLORS[idx % CHART_COLORS.length]
	}
	return stackColors
}

const parseAttributeFilterStatesParam = (param: string | string[] | undefined): RWAAttributeFilterState[] => {
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

const updateNumberRangeQuery = (
	minKey: string,
	maxKey: string,
	minValue: string | number | null | undefined,
	maxValue: string | number | null | undefined,
	router: NextRouter
) => {
	const parsedMin = parseNumberInput(minValue)
	const parsedMax = parseNumberInput(maxValue)
	pushShallowQuery(router, {
		[minKey]: parsedMin == null ? undefined : String(parsedMin),
		[maxKey]: parsedMax == null ? undefined : String(parsedMax)
	})
}

const updateAttributeFilterStatesQuery = (queryKey: string, values: RWAAttributeFilterState[], router: NextRouter) => {
	const selectedSet = new Set<RWAAttributeFilterState>()
	for (const value of values) {
		if (RWA_ATTRIBUTE_FILTER_STATE_SET.has(value)) selectedSet.add(value)
	}

	const normalizedStates = RWA_ATTRIBUTE_FILTER_STATES.filter((value) => selectedSet.has(value))
	pushShallowQuery(router, {
		[queryKey]:
			normalizedStates.length === RWA_ATTRIBUTE_FILTER_STATES.length
				? undefined
				: normalizedStates.length === 0
					? 'none'
					: normalizedStates.length === 1
						? normalizedStates[0]
						: normalizedStates
	})
}

export const useRWATableQueryParams = ({
	assetNames,
	types,
	categories,
	platforms,
	assetClasses,
	rwaClassifications,
	accessModels,
	issuers,
	defaultIncludeStablecoins,
	defaultIncludeGovernance
}: {
	assetNames: string[]
	types: string[]
	categories: string[]
	platforms: string[]
	assetClasses: string[]
	rwaClassifications: string[]
	accessModels: string[]
	issuers: string[]
	defaultIncludeStablecoins: boolean
	defaultIncludeGovernance: boolean
}) => {
	const router = useRouter()
	const {
		assetNames: assetNamesQ,
		excludeAssetNames: excludeAssetNamesQ,
		types: typesQ,
		excludeTypes: excludeTypesQ,
		categories: categoriesQ,
		excludeCategories: excludeCategoriesQ,
		platforms: platformsQ,
		excludePlatforms: excludePlatformsQ,
		assetClasses: assetClassesQ,
		excludeAssetClasses: excludeAssetClassesQ,
		rwaClassifications: rwaClassificationsQ,
		excludeRwaClassifications: excludeRwaClassificationsQ,
		accessModels: accessModelsQ,
		excludeAccessModels: excludeAccessModelsQ,
		issuers: issuersQ,
		excludeIssuers: excludeIssuersQ,
		minDefiActiveTvlToOnChainMcapPct: minDefiActiveTvlToOnChainMcapPctQ,
		maxDefiActiveTvlToOnChainMcapPct: maxDefiActiveTvlToOnChainMcapPctQ,
		minActiveMcapToOnChainMcapPct: minActiveMcapToOnChainMcapPctQ,
		maxActiveMcapToOnChainMcapPct: maxActiveMcapToOnChainMcapPctQ,
		minDefiActiveTvlToActiveMcapPct: minDefiActiveTvlToActiveMcapPctQ,
		maxDefiActiveTvlToActiveMcapPct: maxDefiActiveTvlToActiveMcapPctQ,
		includeStablecoins: stablecoinsQ,
		includeGovernance: governanceQ,
		redeemableStates: redeemableStatesQ,
		attestationsStates: attestationsStatesQ,
		cexListedStates: cexListedStatesQ,
		kycForMintRedeemStates: kycForMintRedeemStatesQ,
		kycAllowlistedWhitelistedToTransferHoldStates: kycAllowlistedWhitelistedToTransferHoldStatesQ,
		transferableStates: transferableStatesQ,
		selfCustodyStates: selfCustodyStatesQ
	} = router.query

	const {
		selectedAssetNames,
		selectedTypes,
		selectedCategories,
		selectedPlatforms,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
		selectedRedeemableStates,
		selectedAttestationsStates,
		selectedCexListedStates,
		selectedKycForMintRedeemStates,
		selectedKycAllowlistedWhitelistedToTransferHoldStates,
		selectedTransferableStates,
		selectedSelfCustodyStates,
		minDefiActiveTvlToOnChainMcapPct,
		maxDefiActiveTvlToOnChainMcapPct,
		minActiveMcapToOnChainMcapPct,
		maxActiveMcapToOnChainMcapPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct,
		includeStablecoins,
		includeGovernance
	} = useMemo(() => {
		// If query param is 'None', return empty array. If no param, return all (default). Otherwise parse the array.
		const parseArrayParam = (
			param: string | string[] | undefined,
			allValues: string[],
			validSet: Set<string>
		): string[] => {
			if (param === 'None') return []
			if (!param) return allValues
			const arr = toNonEmptyArrayParam(param)
			return arr.filter((v) => validSet.has(v))
		}

		const assetNamesValidSet = new Set(assetNames)
		const typesValidSet = new Set(types)
		const categoriesValidSet = new Set(categories)
		const platformsValidSet = new Set(platforms)
		const assetClassesValidSet = new Set(assetClasses)
		const rwaClassificationsValidSet = new Set(rwaClassifications)
		const accessModelsValidSet = new Set(accessModels)
		const issuersValidSet = new Set(issuers)

		// Parse exclude sets
		const excludeAssetNamesSet = parseExcludeParam(excludeAssetNamesQ)
		const excludeTypesSet = parseExcludeParam(excludeTypesQ)
		const excludeCategoriesSet = parseExcludeParam(excludeCategoriesQ)
		const excludePlatformsSet = parseExcludeParam(excludePlatformsQ)
		const excludeAssetClassesSet = parseExcludeParam(excludeAssetClassesQ)
		const excludeRwaClassificationsSet = parseExcludeParam(excludeRwaClassificationsQ)
		const excludeAccessModelsSet = parseExcludeParam(excludeAccessModelsQ)
		const excludeIssuersSet = parseExcludeParam(excludeIssuersQ)

		// Default toggles:
		// - category pages: ON (include stablecoins + governance by default)
		// - other pages: OFF (unless explicitly set in the URL)
		const includeStablecoins = stablecoinsQ != null ? isTrueQueryParam(stablecoinsQ) : defaultIncludeStablecoins
		const includeGovernance = governanceQ != null ? isTrueQueryParam(governanceQ) : defaultIncludeGovernance

		// Build selected arrays with correct "exclude" semantics:
		// - if include param missing but exclude param exists, selection is (all - excluded), NOT "defaults - excluded"
		const baseAssetNames =
			assetNamesQ != null
				? parseArrayParam(assetNamesQ, assetNames, assetNamesValidSet)
				: excludeAssetNamesSet.size > 0
					? assetNames
					: assetNames
		const selectedAssetNames =
			excludeAssetNamesSet.size > 0 ? baseAssetNames.filter((a) => !excludeAssetNamesSet.has(a)) : baseAssetNames

		const baseTypes =
			typesQ != null
				? parseArrayParam(typesQ, types, typesValidSet)
				: excludeTypesSet.size > 0
					? types
					: types.filter((t) => !DEFAULT_EXCLUDED_TYPES.has(t))
		const selectedTypes = excludeTypesSet.size > 0 ? baseTypes.filter((t) => !excludeTypesSet.has(t)) : baseTypes

		const baseCategories =
			categoriesQ != null
				? parseArrayParam(categoriesQ, categories, categoriesValidSet)
				: excludeCategoriesSet.size > 0
					? categories
					: categories
		const selectedCategories =
			excludeCategoriesSet.size > 0 ? baseCategories.filter((c) => !excludeCategoriesSet.has(c)) : baseCategories

		const basePlatforms =
			platformsQ != null
				? parseArrayParam(platformsQ, platforms, platformsValidSet)
				: excludePlatformsSet.size > 0
					? platforms
					: platforms
		const selectedPlatforms =
			excludePlatformsSet.size > 0 ? basePlatforms.filter((p) => !excludePlatformsSet.has(p)) : basePlatforms

		const baseAssetClasses =
			assetClassesQ != null
				? parseArrayParam(assetClassesQ, assetClasses, assetClassesValidSet)
				: excludeAssetClassesSet.size > 0
					? assetClasses
					: assetClasses
		const selectedAssetClasses =
			excludeAssetClassesSet.size > 0
				? baseAssetClasses.filter((a) => !excludeAssetClassesSet.has(a))
				: baseAssetClasses

		const baseRwaClassifications =
			rwaClassificationsQ != null
				? parseArrayParam(rwaClassificationsQ, rwaClassifications, rwaClassificationsValidSet)
				: excludeRwaClassificationsSet.size > 0
					? rwaClassifications
					: rwaClassifications
		const selectedRwaClassifications =
			excludeRwaClassificationsSet.size > 0
				? baseRwaClassifications.filter((r) => !excludeRwaClassificationsSet.has(r))
				: baseRwaClassifications

		const baseAccessModels = parseArrayParam(accessModelsQ, accessModels, accessModelsValidSet)
		const selectedAccessModels =
			excludeAccessModelsSet.size > 0
				? baseAccessModels.filter((a) => !excludeAccessModelsSet.has(a))
				: baseAccessModels

		const baseIssuers = parseArrayParam(issuersQ, issuers, issuersValidSet)
		const selectedIssuers =
			excludeIssuersSet.size > 0 ? baseIssuers.filter((i) => !excludeIssuersSet.has(i)) : baseIssuers

		const selectedRedeemableStates = parseAttributeFilterStatesParam(redeemableStatesQ)
		const selectedAttestationsStates = parseAttributeFilterStatesParam(attestationsStatesQ)
		const selectedCexListedStates = parseAttributeFilterStatesParam(cexListedStatesQ)
		const selectedKycForMintRedeemStates = parseAttributeFilterStatesParam(kycForMintRedeemStatesQ)
		const selectedKycAllowlistedWhitelistedToTransferHoldStates = parseAttributeFilterStatesParam(
			kycAllowlistedWhitelistedToTransferHoldStatesQ
		)
		const selectedTransferableStates = parseAttributeFilterStatesParam(transferableStatesQ)
		const selectedSelfCustodyStates = parseAttributeFilterStatesParam(selfCustodyStatesQ)

		const minDefiActiveTvlToOnChainMcapPct = parseNumberQueryParam(minDefiActiveTvlToOnChainMcapPctQ)
		const maxDefiActiveTvlToOnChainMcapPct = parseNumberQueryParam(maxDefiActiveTvlToOnChainMcapPctQ)
		const minActiveMcapToOnChainMcapPct = parseNumberQueryParam(minActiveMcapToOnChainMcapPctQ)
		const maxActiveMcapToOnChainMcapPct = parseNumberQueryParam(maxActiveMcapToOnChainMcapPctQ)
		const minDefiActiveTvlToActiveMcapPct = parseNumberQueryParam(minDefiActiveTvlToActiveMcapPctQ)
		const maxDefiActiveTvlToActiveMcapPct = parseNumberQueryParam(maxDefiActiveTvlToActiveMcapPctQ)

		return {
			selectedAssetNames,
			selectedTypes,
			selectedCategories,
			selectedPlatforms,
			selectedAssetClasses,
			selectedRwaClassifications,
			selectedAccessModels,
			selectedIssuers,
			selectedRedeemableStates,
			selectedAttestationsStates,
			selectedCexListedStates,
			selectedKycForMintRedeemStates,
			selectedKycAllowlistedWhitelistedToTransferHoldStates,
			selectedTransferableStates,
			selectedSelfCustodyStates,
			minDefiActiveTvlToOnChainMcapPct,
			maxDefiActiveTvlToOnChainMcapPct,
			minActiveMcapToOnChainMcapPct,
			maxActiveMcapToOnChainMcapPct,
			minDefiActiveTvlToActiveMcapPct,
			maxDefiActiveTvlToActiveMcapPct,
			includeStablecoins,
			includeGovernance
		}
	}, [
		assetNamesQ,
		excludeAssetNamesQ,
		typesQ,
		excludeTypesQ,
		categoriesQ,
		excludeCategoriesQ,
		platformsQ,
		excludePlatformsQ,
		assetClassesQ,
		excludeAssetClassesQ,
		rwaClassificationsQ,
		excludeRwaClassificationsQ,
		accessModelsQ,
		excludeAccessModelsQ,
		issuersQ,
		excludeIssuersQ,
		redeemableStatesQ,
		attestationsStatesQ,
		cexListedStatesQ,
		kycForMintRedeemStatesQ,
		kycAllowlistedWhitelistedToTransferHoldStatesQ,
		transferableStatesQ,
		selfCustodyStatesQ,
		minDefiActiveTvlToOnChainMcapPctQ,
		maxDefiActiveTvlToOnChainMcapPctQ,
		minActiveMcapToOnChainMcapPctQ,
		maxActiveMcapToOnChainMcapPctQ,
		minDefiActiveTvlToActiveMcapPctQ,
		maxDefiActiveTvlToActiveMcapPctQ,
		stablecoinsQ,
		governanceQ,
		defaultIncludeStablecoins,
		defaultIncludeGovernance,
		assetNames,
		types,
		categories,
		platforms,
		assetClasses,
		rwaClassifications,
		accessModels,
		issuers
	])

	const setDefiActiveTvlToOnChainMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery(
			'minDefiActiveTvlToOnChainMcapPct',
			'maxDefiActiveTvlToOnChainMcapPct',
			minValue,
			maxValue,
			router
		)
	const setActiveMcapToOnChainMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minActiveMcapToOnChainMcapPct', 'maxActiveMcapToOnChainMcapPct', minValue, maxValue, router)
	const setDefiActiveTvlToActiveMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery(
			'minDefiActiveTvlToActiveMcapPct',
			'maxDefiActiveTvlToActiveMcapPct',
			minValue,
			maxValue,
			router
		)

	const setIncludeStablecoins = (value: boolean) => {
		pushShallowQuery(router, { includeStablecoins: value ? 'true' : 'false' })
	}

	const setIncludeGovernance = (value: boolean) => {
		pushShallowQuery(router, { includeGovernance: value ? 'true' : 'false' })
	}

	const setRedeemableStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('redeemableStates', values, router)
	const setAttestationsStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('attestationsStates', values, router)
	const setCexListedStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('cexListedStates', values, router)
	const setKycForMintRedeemStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('kycForMintRedeemStates', values, router)
	const setKycAllowlistedWhitelistedToTransferHoldStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('kycAllowlistedWhitelistedToTransferHoldStates', values, router)
	const setTransferableStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('transferableStates', values, router)
	const setSelfCustodyStates = (values: RWAAttributeFilterState[]) =>
		updateAttributeFilterStatesQuery('selfCustodyStates', values, router)

	return {
		selectedAssetNames,
		selectedTypes,
		selectedCategories,
		selectedPlatforms,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
		selectedRedeemableStates,
		selectedAttestationsStates,
		selectedCexListedStates,
		selectedKycForMintRedeemStates,
		selectedKycAllowlistedWhitelistedToTransferHoldStates,
		selectedTransferableStates,
		selectedSelfCustodyStates,
		minDefiActiveTvlToOnChainMcapPct,
		maxDefiActiveTvlToOnChainMcapPct,
		minActiveMcapToOnChainMcapPct,
		maxActiveMcapToOnChainMcapPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct,
		includeStablecoins,
		includeGovernance,
		setRedeemableStates,
		setAttestationsStates,
		setCexListedStates,
		setKycForMintRedeemStates,
		setKycAllowlistedWhitelistedToTransferHoldStates,
		setTransferableStates,
		setSelfCustodyStates,
		setDefiActiveTvlToOnChainMcapPctRange,
		setActiveMcapToOnChainMcapPctRange,
		setDefiActiveTvlToActiveMcapPctRange,
		setIncludeStablecoins,
		setIncludeGovernance
	}
}

type RWAAsset = IRWAAssetsOverview['assets'][number]

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

const toAttributeFilterState = (value: boolean | null | undefined): RWAAttributeFilterState => {
	if (value == null) return 'unknown'
	return value ? 'yes' : 'no'
}

export const useFilteredRwaAssets = ({
	assets,
	isPlatformMode,
	selectedAssetNames,
	selectedTypes,
	selectedCategories,
	selectedPlatforms,
	selectedAssetClasses,
	selectedRwaClassifications,
	selectedAccessModels,
	selectedIssuers,
	selectedRedeemableStates,
	selectedAttestationsStates,
	selectedCexListedStates,
	selectedKycForMintRedeemStates,
	selectedKycAllowlistedWhitelistedToTransferHoldStates,
	selectedTransferableStates,
	selectedSelfCustodyStates,
	includeStablecoins,
	includeGovernance,
	minDefiActiveTvlToOnChainMcapPct,
	maxDefiActiveTvlToOnChainMcapPct,
	minActiveMcapToOnChainMcapPct,
	maxActiveMcapToOnChainMcapPct,
	minDefiActiveTvlToActiveMcapPct,
	maxDefiActiveTvlToActiveMcapPct
}: {
	assets: RWAAsset[]
	isPlatformMode: boolean
	selectedAssetNames: string[]
	selectedTypes: string[]
	selectedCategories: string[]
	selectedPlatforms: string[]
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
	minDefiActiveTvlToOnChainMcapPct: number | null
	maxDefiActiveTvlToOnChainMcapPct: number | null
	minActiveMcapToOnChainMcapPct: number | null
	maxActiveMcapToOnChainMcapPct: number | null
	minDefiActiveTvlToActiveMcapPct: number | null
	maxDefiActiveTvlToActiveMcapPct: number | null
}) => {
	// Non-RWA Stablecoins
	// Crypto-collateralized stablecoin (non-RWA)
	return useMemo(() => {
		const filteredAssets: RWAAsset[] = []

		let totalOnChainMcap = 0
		let totalActiveMcap = 0
		let totalOnChainDeFiActiveTvl = 0
		const totalIssuersSet = new Set<string>()

		// In platform mode, allow selecting "None" to show no assets.
		if (isPlatformMode && selectedAssetNames.length === 0)
			return {
				filteredAssets,
				totalOnChainMcap,
				totalActiveMcap,
				totalOnChainDeFiActiveTvl,
				totalIssuersCount: totalIssuersSet.size
			}

		// Create Sets for O(1) lookups
		const selectedAssetNamesSet = isPlatformMode ? new Set(selectedAssetNames) : null
		const selectedTypesSet = new Set(selectedTypes)
		const selectedCategoriesSet = new Set(selectedCategories)
		const selectedPlatformsSet = new Set(selectedPlatforms)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const selectedRwaClassificationsSet = new Set(selectedRwaClassifications)
		const selectedAccessModelsSet = new Set(selectedAccessModels)
		const selectedIssuersSet = new Set(selectedIssuers)
		const selectedRedeemableStatesSet = new Set(selectedRedeemableStates)
		const selectedAttestationsStatesSet = new Set(selectedAttestationsStates)
		const selectedCexListedStatesSet = new Set(selectedCexListedStates)
		const selectedKycForMintRedeemStatesSet = new Set(selectedKycForMintRedeemStates)
		const selectedKycAllowlistedWhitelistedToTransferHoldStatesSet = new Set(
			selectedKycAllowlistedWhitelistedToTransferHoldStates
		)
		const selectedTransferableStatesSet = new Set(selectedTransferableStates)
		const selectedSelfCustodyStatesSet = new Set(selectedSelfCustodyStates)

		for (const asset of assets) {
			// Only filter by asset name in platform mode.
			if (selectedAssetNamesSet) {
				// Keep the name mapping consistent with the pie chart logic.
				const name = asset.assetName || asset.ticker
				if (!selectedAssetNamesSet.has(name)) continue
			}

			// By default, stablecoins & governance-token assets are excluded unless explicitly enabled.
			if (!includeStablecoins && asset.stablecoin) {
				continue
			}
			if (!includeGovernance && asset.governance) {
				continue
			}
			if (
				!selectedRedeemableStatesSet.has(toAttributeFilterState(asset.redeemable)) ||
				!selectedAttestationsStatesSet.has(toAttributeFilterState(asset.attestations)) ||
				!selectedCexListedStatesSet.has(toAttributeFilterState(asset.cexListed)) ||
				!selectedKycForMintRedeemStatesSet.has(toAttributeFilterState(asset.kycForMintRedeem)) ||
				!selectedKycAllowlistedWhitelistedToTransferHoldStatesSet.has(
					toAttributeFilterState(asset.kycAllowlistedWhitelistedToTransferHold)
				) ||
				!selectedTransferableStatesSet.has(toAttributeFilterState(asset.transferable)) ||
				!selectedSelfCustodyStatesSet.has(toAttributeFilterState(asset.selfCustody))
			) {
				continue
			}

			const onChainMcap = asset.onChainMcap?.total ?? 0
			const activeMcap = asset.activeMcap?.total ?? 0
			const defiActiveTvl = asset.defiActiveTvl?.total ?? 0
			if (
				!meetsRatioPercent(
					defiActiveTvl,
					onChainMcap,
					minDefiActiveTvlToOnChainMcapPct,
					maxDefiActiveTvlToOnChainMcapPct
				)
			) {
				continue
			}
			if (!meetsRatioPercent(activeMcap, onChainMcap, minActiveMcapToOnChainMcapPct, maxActiveMcapToOnChainMcapPct)) {
				continue
			}
			if (
				!meetsRatioPercent(defiActiveTvl, activeMcap, minDefiActiveTvlToActiveMcapPct, maxDefiActiveTvlToActiveMcapPct)
			) {
				continue
			}

			const assetType = asset.type || 'Unknown'
			const platformRaw = asset.parentPlatform as unknown
			const platformCandidates = Array.isArray(platformRaw) ? platformRaw : [platformRaw]
			const normalizedPlatforms = toUniqueNonEmptyValues(
				platformCandidates
					.map((platform) => (typeof platform === 'string' ? platform : ''))
					.filter((platform) => platform.length > 0)
			)
			const toFilter =
				(asset.category?.length ? asset.category.some((category) => selectedCategoriesSet.has(category)) : true) &&
				(normalizedPlatforms.length > 0
					? normalizedPlatforms.some((platform) => selectedPlatformsSet.has(platform))
					: true) &&
				(asset.assetClass?.length
					? asset.assetClass.some((assetClass) => selectedAssetClassesSet.has(assetClass))
					: true) &&
				(asset.rwaClassification ? selectedRwaClassificationsSet.has(asset.rwaClassification) : true) &&
				(asset.accessModel ? selectedAccessModelsSet.has(asset.accessModel) : true) &&
				(asset.issuer ? selectedIssuersSet.has(asset.issuer) : true) &&
				selectedTypesSet.has(assetType)

			if (toFilter) {
				filteredAssets.push(asset)

				totalOnChainMcap += onChainMcap
				totalActiveMcap += activeMcap
				totalOnChainDeFiActiveTvl += defiActiveTvl
				if (asset.issuer) {
					totalIssuersSet.add(asset.issuer)
				}
			}
		}

		return {
			filteredAssets,
			totalOnChainMcap,
			totalActiveMcap,
			totalOnChainDeFiActiveTvl,
			totalIssuersCount: totalIssuersSet.size
		}
	}, [
		assets,
		isPlatformMode,
		selectedAssetNames,
		selectedTypes,
		selectedCategories,
		selectedPlatforms,
		selectedAssetClasses,
		selectedRwaClassifications,
		selectedAccessModels,
		selectedIssuers,
		selectedRedeemableStates,
		selectedAttestationsStates,
		selectedCexListedStates,
		selectedKycForMintRedeemStates,
		selectedKycAllowlistedWhitelistedToTransferHoldStates,
		selectedTransferableStates,
		selectedSelfCustodyStates,
		includeStablecoins,
		includeGovernance,
		minDefiActiveTvlToOnChainMcapPct,
		maxDefiActiveTvlToOnChainMcapPct,
		minActiveMcapToOnChainMcapPct,
		maxActiveMcapToOnChainMcapPct,
		minDefiActiveTvlToActiveMcapPct,
		maxDefiActiveTvlToActiveMcapPct
	])
}

export function useRWAAssetCategoryPieChartData({
	enabled,
	assets,
	categories,
	selectedCategories
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	categories: string[]
	selectedCategories: string[]
}) {
	return useMemo(() => {
		if (!enabled) {
			return {
				assetCategoryOnChainMcapPieChartData: [] as PieChartDatum[],
				assetCategoryActiveMcapPieChartData: [] as PieChartDatum[],
				assetCategoryDefiActiveTvlPieChartData: [] as PieChartDatum[],
				pieChartStackColors: {}
			}
		}
		const pieChartStackColors = buildStackColors(categories)
		const selectedCategoriesSet = new Set(selectedCategories)
		const categoryTotals = new Map<string, { onChain: number; active: number; defi: number }>()

		for (const asset of assets) {
			for (const category of toUniqueNonEmptyValues(asset.category)) {
				if (!category || !selectedCategoriesSet.has(category)) continue

				const prev = categoryTotals.get(category) ?? { onChain: 0, active: 0, defi: 0 }
				// Intentional full-count behavior for multi-category assets.
				// To migrate to split-even later, divide each metric by asset.category.length here.
				prev.onChain += asset.onChainMcap?.total ?? 0
				prev.active += asset.activeMcap?.total ?? 0
				prev.defi += asset.defiActiveTvl?.total ?? 0
				categoryTotals.set(category, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') => {
			const rows: PieChartDatum[] = []
			for (const [name, totals] of categoryTotals.entries()) {
				const value = totals[metric]
				if (value > 0) {
					rows.push({ name, value })
				}
			}
			rows.sort((a, b) => b.value - a.value)
			return rows
		}

		return {
			assetCategoryOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetCategoryActiveMcapPieChartData: toSortedChartData('active'),
			assetCategoryDefiActiveTvlPieChartData: toSortedChartData('defi'),
			pieChartStackColors
		}
	}, [assets, categories, enabled, selectedCategories])
}

export function useRwaCategoryAssetClassPieChartData({
	enabled,
	assets,
	assetClasses,
	selectedAssetClasses
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	assetClasses: string[]
	selectedAssetClasses: string[]
}) {
	return useMemo(() => {
		if (!enabled) {
			return {
				assetClassOnChainMcapPieChartData: [] as PieChartDatum[],
				assetClassActiveMcapPieChartData: [] as PieChartDatum[],
				assetClassDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetClassPieChartStackColors: {}
			}
		}

		const assetClassPieChartStackColors = buildStackColors(assetClasses)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const assetClassTotals = new Map<string, { onChain: number; active: number; defi: number }>()

		for (const asset of assets) {
			for (const assetClass of toUniqueNonEmptyValues(asset.assetClass)) {
				if (!assetClass || !selectedAssetClassesSet.has(assetClass)) continue

				const prev = assetClassTotals.get(assetClass) ?? { onChain: 0, active: 0, defi: 0 }
				// Intentional full-count behavior for multi-asset-class assets.
				// To migrate to split-even later, divide each metric by asset.assetClass.length here.
				prev.onChain += asset.onChainMcap?.total ?? 0
				prev.active += asset.activeMcap?.total ?? 0
				prev.defi += asset.defiActiveTvl?.total ?? 0
				assetClassTotals.set(assetClass, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') => {
			const rows: PieChartDatum[] = []
			for (const [name, totals] of assetClassTotals.entries()) {
				const value = totals[metric]
				if (value > 0) {
					rows.push({ name, value })
				}
			}
			rows.sort((a, b) => b.value - a.value)
			return rows
		}

		return {
			assetClassOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetClassActiveMcapPieChartData: toSortedChartData('active'),
			assetClassDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetClassPieChartStackColors
		}
	}, [assetClasses, assets, enabled, selectedAssetClasses])
}

export function useRwaAssetNamePieChartData({
	enabled,
	assets,
	selectedAssetNames
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	selectedAssetNames: string[]
}) {
	return useMemo(() => {
		const MAX_LABELS = 24

		const OTHERS = 'Others'

		if (!enabled) {
			return {
				assetNameOnChainMcapPieChartData: [] as PieChartDatum[],
				assetNameActiveMcapPieChartData: [] as PieChartDatum[],
				assetNameDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetNamePieChartStackColors: {}
			}
		}

		const selectedAssetNamesSet = new Set(selectedAssetNames)
		if (selectedAssetNamesSet.size === 0) {
			return {
				assetNameOnChainMcapPieChartData: [] as PieChartDatum[],
				assetNameActiveMcapPieChartData: [] as PieChartDatum[],
				assetNameDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetNamePieChartStackColors: {}
			}
		}

		const selectedAssets = assets.filter((asset) => {
			const name = asset.assetName || asset.ticker
			return selectedAssetNamesSet.has(name)
		})

		const discoveredNames = new Set<string>()
		for (const asset of selectedAssets) {
			discoveredNames.add(asset.assetName || asset.ticker)
		}

		const colorOrder = Array.from(discoveredNames)
		colorOrder.sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const assetNamePieChartStackColors = buildStackColors(colorOrder)

		const totals = new Map<string, { onChain: number; active: number; defi: number }>()
		for (const asset of selectedAssets) {
			const name = asset.assetName || asset.ticker
			const prev = totals.get(name) ?? { onChain: 0, active: 0, defi: 0 }
			prev.onChain += asset.onChainMcap?.total ?? 0
			prev.active += asset.activeMcap?.total ?? 0
			prev.defi += asset.defiActiveTvl?.total ?? 0
			totals.set(name, prev)
		}

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') => {
			const rows: PieChartDatum[] = []
			for (const [name, values] of totals.entries()) {
				const value = values[metric]
				if (value > 0) {
					rows.push({ name, value })
				}
			}
			rows.sort((a, b) => b.value - a.value)
			return limitChartData(rows)
		}

		return {
			assetNameOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetNameActiveMcapPieChartData: toSortedChartData('active'),
			assetNameDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetNamePieChartStackColors
		}
	}, [assets, enabled, selectedAssetNames])
}

export function useRwaAssetPlatformPieChartData({
	enabled,
	assets
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
}) {
	return useMemo(() => {
		const MAX_LABELS = 24
		const UNKNOWN = 'Unknown'
		const OTHERS = 'Others'

		if (!enabled || assets.length === 0) {
			return {
				assetPlatformOnChainMcapPieChartData: [] as PieChartDatum[],
				assetPlatformActiveMcapPieChartData: [] as PieChartDatum[],
				assetPlatformDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetPlatformPieChartStackColors: {}
			}
		}

		// Coalesce by slug to avoid casing/spacing duplicates in platform names.
		const totalsBySlug = new Map<string, { label: string; onChain: number; active: number; defi: number }>()
		for (const asset of assets) {
			const platformRaw = asset.parentPlatform as unknown
			const platformCandidates = Array.isArray(platformRaw) ? platformRaw : [platformRaw]
			const normalizedPlatforms = platformCandidates
				.map((platform) => (typeof platform === 'string' ? platform.trim() : ''))
				.filter((platform): platform is string => platform.length > 0)
			const platforms = normalizedPlatforms.length > 0 ? Array.from(new Set(normalizedPlatforms)) : [UNKNOWN]

			for (const platform of platforms) {
				const key = rwaSlug(platform)
				const prev = totalsBySlug.get(key) ?? { label: platform, onChain: 0, active: 0, defi: 0 }

				// Prefer a non-Unknown label if we previously only had Unknown.
				if (prev.label === UNKNOWN && platform !== UNKNOWN) prev.label = platform

				// Intentional full-count behavior for assets mapped to multiple platforms.
				// To migrate to split-even later, divide each metric by platforms.length here.
				prev.onChain += asset.onChainMcap?.total ?? 0
				prev.active += asset.activeMcap?.total ?? 0
				prev.defi += asset.defiActiveTvl?.total ?? 0
				totalsBySlug.set(key, prev)
			}
		}

		const colorOrder: string[] = []
		for (const value of totalsBySlug.values()) {
			if (value.label) {
				colorOrder.push(value.label)
			}
		}
		colorOrder.sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const assetPlatformPieChartStackColors = buildStackColors(colorOrder)

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') => {
			const rows: PieChartDatum[] = []
			for (const value of totalsBySlug.values()) {
				const metricValue = value[metric]
				if (metricValue > 0) {
					rows.push({ name: value.label || UNKNOWN, value: metricValue })
				}
			}
			rows.sort((a, b) => b.value - a.value)
			return limitChartData(rows)
		}

		return {
			assetPlatformOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetPlatformActiveMcapPieChartData: toSortedChartData('active'),
			assetPlatformDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetPlatformPieChartStackColors
		}
	}, [assets, enabled])
}

export function useRwaChainBreakdownPieChartData({
	enabled,
	assets
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
}) {
	return useMemo(() => {
		const MAX_LABELS = 10
		const UNKNOWN = 'Unknown'
		const OTHERS = 'Others'

		if (!enabled) {
			return {
				chainOnChainMcapPieChartData: [] as PieChartDatum[],
				chainActiveMcapPieChartData: [] as PieChartDatum[],
				chainDefiActiveTvlPieChartData: [] as PieChartDatum[],
				chainPieChartStackColors: {}
			}
		}

		if (assets.length === 0) {
			return {
				chainOnChainMcapPieChartData: [] as PieChartDatum[],
				chainActiveMcapPieChartData: [] as PieChartDatum[],
				chainDefiActiveTvlPieChartData: [] as PieChartDatum[],
				chainPieChartStackColors: {}
			}
		}

		// Aggregate using per-chain breakdowns (prevents "random" chain attribution on multi-chain assets).
		// We coalesce chains by slug to avoid casing/spacing duplicates.
		const totalsBySlug = new Map<string, { label: string; onChain: number; active: number; defi: number }>()
		const upsert = (
			chainRaw: string | null | undefined,
			metric: 'onChain' | 'active' | 'defi',
			valueRaw: number | null | undefined
		) => {
			const value = valueRaw ?? 0
			if (!Number.isFinite(value) || value <= 0) return

			const chain = (chainRaw ?? '').trim() || UNKNOWN
			const key = rwaSlug(chain)
			const prev = totalsBySlug.get(key) ?? { label: chain, onChain: 0, active: 0, defi: 0 }
			// Prefer a non-Unknown label if we previously only had Unknown.
			if (prev.label === UNKNOWN && chain !== UNKNOWN) prev.label = chain
			prev[metric] += value
			totalsBySlug.set(key, prev)
		}

		for (const asset of assets) {
			for (const [chain, value] of asset.onChainMcap?.breakdown ?? []) {
				upsert(chain, 'onChain', value)
			}
			for (const [chain, value] of asset.activeMcap?.breakdown ?? []) {
				upsert(chain, 'active', value)
			}
			// New: chain-level TVL breakdown (fallback: none if missing).
			for (const [chain, value] of asset.defiActiveTvlByChain?.breakdown ?? []) {
				upsert(chain, 'defi', value)
			}
		}

		const colorOrder: string[] = []
		for (const value of totalsBySlug.values()) {
			if (value.label) {
				colorOrder.push(value.label)
			}
		}
		colorOrder.sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const chainPieChartStackColors = buildStackColors(colorOrder)

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') => {
			const rows: PieChartDatum[] = []
			for (const value of totalsBySlug.values()) {
				const metricValue = value[metric]
				if (metricValue > 0) {
					rows.push({ name: value.label || UNKNOWN, value: metricValue })
				}
			}
			rows.sort((a, b) => b.value - a.value)
			return limitChartData(rows)
		}

		return {
			chainOnChainMcapPieChartData: toSortedChartData('onChain'),
			chainActiveMcapPieChartData: toSortedChartData('active'),
			chainDefiActiveTvlPieChartData: toSortedChartData('defi'),
			chainPieChartStackColors
		}
	}, [assets, enabled])
}

type RWAChartMetric = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'

type RWAChartRow = { timestamp: number } & Record<string, number>

type RWAChartDataset = { source: RWAChartRow[]; dimensions: string[] }

function emptyChartDataset(): RWAChartDataset {
	return { source: [], dimensions: ['timestamp'] }
}

function emptyChartDatasets(): Record<RWAChartMetric, RWAChartDataset> {
	return { onChainMcap: emptyChartDataset(), activeMcap: emptyChartDataset(), defiActiveTvl: emptyChartDataset() }
}

function sortKeysByLatestTimestampValue(rows: RWAChartRow[], keys: Iterable<string>): string[] {
	const arr = Array.from(keys).filter(Boolean)
	if (arr.length === 0) return arr

	let latestRow: RWAChartRow | null = null
	let latestTimestamp = Number.NEGATIVE_INFINITY
	for (const row of rows) {
		if (!Number.isFinite(row.timestamp)) continue
		if (row.timestamp >= latestTimestamp) {
			latestTimestamp = row.timestamp
			latestRow = row
		}
	}

	return arr.sort((a, b) => {
		if (a === 'Others') return 1
		if (b === 'Others') return -1

		const aValueRaw = latestRow?.[a]
		const bValueRaw = latestRow?.[b]
		const aValue = typeof aValueRaw === 'number' && Number.isFinite(aValueRaw) ? aValueRaw : 0
		const bValue = typeof bValueRaw === 'number' && Number.isFinite(bValueRaw) ? bValueRaw : 0
		if (aValue !== bValue) return bValue - aValue
		return a.localeCompare(b)
	})
}

export function useRwaChartDataByCategory({
	enabled,
	assets,
	chartDataByTicker
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	chartDataByTicker: IRWAAssetsOverview['chartData']
}): {
	chartDatasetByCategory: Record<RWAChartMetric, { source: RWAChartRow[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = { chartDatasetByCategory: emptyChartDatasets() }

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		// Build ticker -> categories lookup from filtered assets.
		// Use a Set per ticker to avoid both duplicate category labels and ticker-collision overwrites.
		const tickerToCategories = new Map<string, Set<string>>()
		for (const asset of assets) {
			const ticker = asset.ticker
			if (!ticker) continue
			const categories = toUniqueNonEmptyValues(asset.category)
			if (categories.length === 0) continue

			const tickerCategories = tickerToCategories.get(ticker) ?? new Set<string>()
			for (const category of categories) {
				tickerCategories.add(category)
			}
			tickerToCategories.set(ticker, tickerCategories)
		}

		const aggregate = (rows: RWAChartRow[], seenCategories: Set<string>): RWAChartRow[] => {
			const out: RWAChartRow[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRow = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const categories = tickerToCategories.get(ticker)
					if (!categories || categories.size === 0) continue

					for (const category of categories) {
						// Intentional full-count behavior across all category memberships.
						// To migrate to split-even later, add value / categories.length instead.
						seenCategories.add(category)
						outRow[category] = (outRow[category] ?? 0) + value
					}
				}

				out.push(outRow)
			}

			return out
		}

		const seenOnChain = new Set<string>()
		const seenActive = new Set<string>()
		const seenDefi = new Set<string>()

		const onChainMcap = aggregate(chartDataByTicker.onChainMcap, seenOnChain)
		const activeMcap = aggregate(chartDataByTicker.activeMcap, seenActive)
		const defiActiveTvl = aggregate(chartDataByTicker.defiActiveTvl, seenDefi)

		return {
			chartDatasetByCategory: {
				onChainMcap: {
					source: onChainMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(onChainMcap, seenOnChain)]
				},
				activeMcap: {
					source: activeMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(activeMcap, seenActive)]
				},
				defiActiveTvl: {
					source: defiActiveTvl,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(defiActiveTvl, seenDefi)]
				}
			}
		}
	}, [assets, chartDataByTicker, enabled])
}

export function useRwaChartDataByAssetClass({
	enabled,
	assets,
	chartDataByTicker
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	chartDataByTicker: IRWAAssetsOverview['chartData']
}): {
	chartDatasetByAssetClass: Record<RWAChartMetric, { source: RWAChartRow[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = { chartDatasetByAssetClass: emptyChartDatasets() }

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		// Build ticker -> asset classes lookup from filtered assets.
		// Use a Set per ticker to avoid both duplicate class labels and ticker-collision overwrites.
		const tickerToAssetClasses = new Map<string, Set<string>>()
		for (const asset of assets) {
			const ticker = asset.ticker
			if (!ticker) continue
			const assetClasses = toUniqueNonEmptyValues(asset.assetClass)
			if (assetClasses.length === 0) continue

			const tickerAssetClasses = tickerToAssetClasses.get(ticker) ?? new Set<string>()
			for (const assetClass of assetClasses) {
				tickerAssetClasses.add(assetClass)
			}
			tickerToAssetClasses.set(ticker, tickerAssetClasses)
		}

		const aggregate = (rows: RWAChartRow[], seenAssetClasses: Set<string>): RWAChartRow[] => {
			const out: RWAChartRow[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRow = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const assetClasses = tickerToAssetClasses.get(ticker)
					if (!assetClasses || assetClasses.size === 0) continue

					for (const assetClass of assetClasses) {
						// Intentional full-count behavior across all asset-class memberships.
						// To migrate to split-even later, add value / assetClasses.length instead.
						seenAssetClasses.add(assetClass)
						outRow[assetClass] = (outRow[assetClass] ?? 0) + value
					}
				}

				out.push(outRow)
			}

			return out
		}

		const seenOnChain = new Set<string>()
		const seenActive = new Set<string>()
		const seenDefi = new Set<string>()

		const onChainMcap = aggregate(chartDataByTicker.onChainMcap, seenOnChain)
		const activeMcap = aggregate(chartDataByTicker.activeMcap, seenActive)
		const defiActiveTvl = aggregate(chartDataByTicker.defiActiveTvl, seenDefi)

		return {
			chartDatasetByAssetClass: {
				onChainMcap: {
					source: onChainMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(onChainMcap, seenOnChain)]
				},
				activeMcap: {
					source: activeMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(activeMcap, seenActive)]
				},
				defiActiveTvl: {
					source: defiActiveTvl,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(defiActiveTvl, seenDefi)]
				}
			}
		}
	}, [assets, chartDataByTicker, enabled])
}

export function useRwaChartDataByAssetName({
	enabled,
	assets,
	chartDataByTicker
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	chartDataByTicker: IRWAAssetsOverview['chartData']
}): {
	chartDatasetByAssetName: Record<RWAChartMetric, { source: RWAChartRow[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = { chartDatasetByAssetName: emptyChartDatasets() }

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		// Build ticker -> asset names lookup from filtered assets.
		// Use a Set per ticker to avoid ticker-collision overwrites.
		const tickerToAssetNames = new Map<string, Set<string>>()
		for (const asset of assets) {
			const ticker = asset.ticker
			if (!ticker) continue
			const name = (asset.assetName || asset.ticker || '').trim()
			if (!name) continue
			const names = tickerToAssetNames.get(ticker) ?? new Set<string>()
			names.add(name)
			tickerToAssetNames.set(ticker, names)
		}

		const aggregate = (rows: RWAChartRow[], seenAssetNames: Set<string>): RWAChartRow[] => {
			const out: RWAChartRow[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRow = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const assetNames = tickerToAssetNames.get(ticker)
					if (!assetNames || assetNames.size === 0) continue

					// Intentional full-count behavior across all ticker->assetName mappings.
					// To migrate to split-even later, add value / assetNames.size instead.
					for (const assetName of assetNames) {
						seenAssetNames.add(assetName)
						outRow[assetName] = (outRow[assetName] ?? 0) + value
					}
				}

				out.push(outRow)
			}

			return out
		}

		const seenOnChain = new Set<string>()
		const seenActive = new Set<string>()
		const seenDefi = new Set<string>()

		const onChainMcap = aggregate(chartDataByTicker.onChainMcap, seenOnChain)
		const activeMcap = aggregate(chartDataByTicker.activeMcap, seenActive)
		const defiActiveTvl = aggregate(chartDataByTicker.defiActiveTvl, seenDefi)

		return {
			chartDatasetByAssetName: {
				onChainMcap: {
					source: onChainMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(onChainMcap, seenOnChain)]
				},
				activeMcap: {
					source: activeMcap,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(activeMcap, seenActive)]
				},
				defiActiveTvl: {
					source: defiActiveTvl,
					dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(defiActiveTvl, seenDefi)]
				}
			}
		}
	}, [assets, chartDataByTicker, enabled])
}
