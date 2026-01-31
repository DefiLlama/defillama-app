import Router, { useRouter } from 'next/router'
import { useMemo } from 'react'
import type { IRWAAssetsOverview } from './queries'

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

export const useRWATableQueryParams = ({
	assetNames,
	categories,
	assetClasses,
	rwaClassifications,
	accessModels,
	issuers,
	defaultIncludeStablecoins,
	defaultIncludeGovernance
}: {
	assetNames: string[]
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
		assetNames: assetNamesQ,
		excludeAssetNames: excludeAssetNamesQ,
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
		minDefiActiveTvlToOnChainMcapPct: minDefiActiveTvlToOnChainMcapPctQ,
		maxDefiActiveTvlToOnChainMcapPct: maxDefiActiveTvlToOnChainMcapPctQ,
		minActiveMcapToOnChainMcapPct: minActiveMcapToOnChainMcapPctQ,
		maxActiveMcapToOnChainMcapPct: maxActiveMcapToOnChainMcapPctQ,
		minDefiActiveTvlToActiveMcapPct: minDefiActiveTvlToActiveMcapPctQ,
		maxDefiActiveTvlToActiveMcapPct: maxDefiActiveTvlToActiveMcapPctQ,
		includeStablecoins: stablecoinsQ,
		includeGovernance: governanceQ
	} = router.query

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
		const excludeAssetNamesSet = parseExcludeParam(excludeAssetNamesQ)
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
		const baseAssetNames =
			assetNamesQ != null
				? parseArrayParam(assetNamesQ, assetNames)
				: excludeAssetNamesSet.size > 0
					? assetNames
					: assetNames
		const selectedAssetNames =
			excludeAssetNamesSet.size > 0 ? baseAssetNames.filter((a) => !excludeAssetNamesSet.has(a)) : baseAssetNames

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

		const minDefiActiveTvlToOnChainMcapPct = toNumberParam(minDefiActiveTvlToOnChainMcapPctQ)
		const maxDefiActiveTvlToOnChainMcapPct = toNumberParam(maxDefiActiveTvlToOnChainMcapPctQ)
		const minActiveMcapToOnChainMcapPct = toNumberParam(minActiveMcapToOnChainMcapPctQ)
		const maxActiveMcapToOnChainMcapPct = toNumberParam(maxActiveMcapToOnChainMcapPctQ)
		const minDefiActiveTvlToActiveMcapPct = toNumberParam(minDefiActiveTvlToActiveMcapPctQ)
		const maxDefiActiveTvlToActiveMcapPct = toNumberParam(maxDefiActiveTvlToActiveMcapPctQ)

		return {
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
			includeGovernance
		}
	}, [
		assetNamesQ,
		excludeAssetNamesQ,
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
		categories,
		assetClasses,
		rwaClassifications,
		accessModels,
		issuers
	])

	const setDefiActiveTvlToOnChainMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minDefiActiveTvlToOnChainMcapPct', 'maxDefiActiveTvlToOnChainMcapPct', minValue, maxValue)
	const setActiveMcapToOnChainMcapPctRange = (minValue: string | number | null, maxValue: string | number | null) =>
		updateNumberRangeQuery('minActiveMcapToOnChainMcapPct', 'maxActiveMcapToOnChainMcapPct', minValue, maxValue)
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

export const useFilteredRwaAssets = ({
	assets,
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
}: {
	assets: RWAAsset[]
	isPlatformMode: boolean
	selectedAssetNames: string[]
	selectedCategories: string[]
	selectedAssetClasses: string[]
	selectedRwaClassifications: string[]
	selectedAccessModels: string[]
	selectedIssuers: string[]
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
		// In platform mode, allow selecting "None" to show no assets.
		if (isPlatformMode && selectedAssetNames.length === 0) return []

		// Create Sets for O(1) lookups
		const selectedAssetNamesSet = isPlatformMode ? new Set(selectedAssetNames) : null
		const selectedCategoriesSet = new Set(selectedCategories)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const selectedRwaClassificationsSet = new Set(selectedRwaClassifications)
		const selectedAccessModelsSet = new Set(selectedAccessModels)
		const selectedIssuersSet = new Set(selectedIssuers)

		return assets.filter((asset) => {
			// Only filter by asset name in platform mode.
			if (selectedAssetNamesSet) {
				// Keep the name mapping consistent with the pie chart logic.
				const name = asset.name?.trim() || asset.ticker?.trim() || 'Unknown'
				if (!selectedAssetNamesSet.has(name)) return false
			}

			// By default, stablecoins & governance-token assets are excluded unless explicitly enabled.
			if (!includeStablecoins && asset.stablecoin) {
				return false
			}
			if (!includeGovernance && asset.governance) {
				return false
			}

			const onChainMcap = asset.onChainMcap.total
			if (
				!meetsRatioPercent(
					asset.defiActiveTvl.total,
					onChainMcap,
					minDefiActiveTvlToOnChainMcapPct,
					maxDefiActiveTvlToOnChainMcapPct
				)
			) {
				return false
			}
			if (
				!meetsRatioPercent(
					asset.activeMcap.total,
					onChainMcap,
					minActiveMcapToOnChainMcapPct,
					maxActiveMcapToOnChainMcapPct
				)
			) {
				return false
			}
			if (
				!meetsRatioPercent(
					asset.defiActiveTvl.total,
					asset.activeMcap.total,
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
		assets,
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
	])
}

export const useRwaAssetsSummary = (filteredAssets: RWAAsset[]) => {
	return useMemo(() => {
		let onChainMcap = 0
		let activeMcap = 0
		let stablecoinMcap = 0
		let defiTvl = 0
		const issuersSet = new Set<string>()

		for (const asset of filteredAssets) {
			onChainMcap += asset.onChainMcap.total
			activeMcap += asset.activeMcap.total
			if (asset.stablecoin) {
				stablecoinMcap += asset.onChainMcap.total
			}
			defiTvl += asset.defiActiveTvl.total
			if (asset.issuer) {
				issuersSet.add(asset.issuer)
			}
		}

		return {
			totalOnChainMcap: onChainMcap,
			totalActiveMcap: activeMcap,
			totalOnChainStablecoinMcap: stablecoinMcap,
			totalOnChainDeFiActiveTvl: defiTvl,
			issuersCount: issuersSet.size
		}
	}, [filteredAssets])
}
