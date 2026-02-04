import Router, { useRouter } from 'next/router'
import { useMemo } from 'react'
import { CHART_COLORS } from '~/constants/colors'
import type { IRWAAssetsOverview } from './queries'

type PieChartDatum = { name: string; value: number }

const buildStackColors = (order: string[]) => {
	const stackColors: Record<string, string> = {}
	for (const [idx, key] of order.entries()) {
		stackColors[key] = CHART_COLORS[idx % CHART_COLORS.length]
	}
	return stackColors
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
	types,
	categories,
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
		const excludeTypesSet = parseExcludeParam(excludeTypesQ)
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

		const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
		const baseTypes =
			typesQ != null
				? parseArrayParam(typesQ, types)
				: excludeTypesSet.size > 0
					? types
					: types.filter((t) => !DEFAULT_EXCLUDED_TYPES.has(t))
		const selectedTypes = excludeTypesSet.size > 0 ? baseTypes.filter((t) => !excludeTypesSet.has(t)) : baseTypes

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
		types,
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
	selectedTypes,
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
	selectedTypes: string[]
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
		const filteredAssets: RWAAsset[] = []

		let totalOnChainMcap = 0
		let totalActiveMcap = 0
		let totalOnChainStablecoinMcap = 0
		let totalOnChainDeFiActiveTvl = 0
		const totalIssuersSet = new Set<string>()

		// In platform mode, allow selecting "None" to show no assets.
		if (isPlatformMode && selectedAssetNames.length === 0)
			return {
				filteredAssets,
				totalOnChainMcap,
				totalActiveMcap,
				totalOnChainStablecoinMcap,
				totalOnChainDeFiActiveTvl,
				totalIssuersCount: totalIssuersSet.size
			}

		// Create Sets for O(1) lookups
		const selectedAssetNamesSet = isPlatformMode ? new Set(selectedAssetNames) : null
		const selectedTypesSet = new Set(selectedTypes)
		const selectedCategoriesSet = new Set(selectedCategories)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const selectedRwaClassificationsSet = new Set(selectedRwaClassifications)
		const selectedAccessModelsSet = new Set(selectedAccessModels)
		const selectedIssuersSet = new Set(selectedIssuers)

		for (const asset of assets) {
			// Only filter by asset name in platform mode.
			if (selectedAssetNamesSet) {
				// Keep the name mapping consistent with the pie chart logic.
				const name = asset.name?.trim() || asset.ticker?.trim() || 'Unknown'
				if (!selectedAssetNamesSet.has(name)) continue
			}

			// By default, stablecoins & governance-token assets are excluded unless explicitly enabled.
			if (!includeStablecoins && asset.stablecoin) {
				continue
			}
			if (!includeGovernance && asset.governance) {
				continue
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
				continue
			}
			if (
				!meetsRatioPercent(
					asset.activeMcap.total,
					onChainMcap,
					minActiveMcapToOnChainMcapPct,
					maxActiveMcapToOnChainMcapPct
				)
			) {
				continue
			}
			if (
				!meetsRatioPercent(
					asset.defiActiveTvl.total,
					asset.activeMcap.total,
					minDefiActiveTvlToActiveMcapPct,
					maxDefiActiveTvlToActiveMcapPct
				)
			) {
				continue
			}

			const assetType = asset.type?.trim() || 'Unknown'
			const toFilter =
				(asset.category?.length ? asset.category.some((category) => selectedCategoriesSet.has(category)) : true) &&
				(asset.assetClass?.length
					? asset.assetClass.some((assetClass) => selectedAssetClassesSet.has(assetClass))
					: true) &&
				(asset.rwaClassification ? selectedRwaClassificationsSet.has(asset.rwaClassification) : true) &&
				(asset.accessModel ? selectedAccessModelsSet.has(asset.accessModel) : true) &&
				(asset.issuer ? selectedIssuersSet.has(asset.issuer) : true) &&
				selectedTypesSet.has(assetType)

			if (toFilter) {
				filteredAssets.push(asset)

				totalOnChainMcap += asset.onChainMcap.total
				totalActiveMcap += asset.activeMcap.total
				if (asset.stablecoin) {
					totalOnChainStablecoinMcap += asset.onChainMcap.total
				}
				totalOnChainDeFiActiveTvl += asset.defiActiveTvl.total
				if (asset.issuer) {
					totalIssuersSet.add(asset.issuer)
				}
			}
		}

		return {
			filteredAssets,
			totalOnChainMcap,
			totalActiveMcap,
			totalOnChainStablecoinMcap,
			totalOnChainDeFiActiveTvl,
			totalIssuersCount: totalIssuersSet.size
		}
	}, [
		assets,
		isPlatformMode,
		selectedAssetNames,
		selectedTypes,
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
			for (const category of asset.category ?? []) {
				if (!category || !selectedCategoriesSet.has(category)) continue

				const prev = categoryTotals.get(category) ?? { onChain: 0, active: 0, defi: 0 }
				prev.onChain += asset.onChainMcap.total
				prev.active += asset.activeMcap.total
				prev.defi += asset.defiActiveTvl.total
				categoryTotals.set(category, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			Array.from(categoryTotals.entries())
				.map(([name, totals]) => ({ name, value: totals[metric] }))
				.filter((x) => x.value > 0)
				.sort((a, b) => b.value - a.value)

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
			for (const assetClass of asset.assetClass ?? []) {
				if (!assetClass || !selectedAssetClassesSet.has(assetClass)) continue

				const prev = assetClassTotals.get(assetClass) ?? { onChain: 0, active: 0, defi: 0 }
				prev.onChain += asset.onChainMcap.total
				prev.active += asset.activeMcap.total
				prev.defi += asset.defiActiveTvl.total
				assetClassTotals.set(assetClass, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			Array.from(assetClassTotals.entries())
				.map(([name, totals]) => ({ name, value: totals[metric] }))
				.filter((x) => x.value > 0)
				.sort((a, b) => b.value - a.value)

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
		const UNKNOWN = 'Unknown'
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
			const name = asset.name?.trim() || asset.ticker?.trim() || UNKNOWN
			return selectedAssetNamesSet.has(name)
		})

		const discoveredNames = new Set<string>()
		for (const asset of selectedAssets) {
			discoveredNames.add(asset.name?.trim() || asset.ticker?.trim() || UNKNOWN)
		}

		const colorOrder = Array.from(discoveredNames).sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const assetNamePieChartStackColors = buildStackColors(colorOrder)

		const totals = new Map<string, { onChain: number; active: number; defi: number }>()
		for (const asset of selectedAssets) {
			const name = asset.name?.trim() || asset.ticker?.trim() || UNKNOWN
			const prev = totals.get(name) ?? { onChain: 0, active: 0, defi: 0 }
			prev.onChain += asset.onChainMcap.total
			prev.active += asset.activeMcap.total
			prev.defi += asset.defiActiveTvl.total
			totals.set(name, prev)
		}

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			limitChartData(
				Array.from(totals.entries())
					.map(([name, v]) => ({ name, value: v[metric] }))
					.filter((x) => x.value > 0)
					.sort((a, b) => b.value - a.value)
			)

		return {
			assetNameOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetNameActiveMcapPieChartData: toSortedChartData('active'),
			assetNameDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetNamePieChartStackColors
		}
	}, [assets, enabled, selectedAssetNames])
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

		// Attribute each asset to a single chain (primary chain preferred) to avoid double counting
		// across multi-chain assets.
		const getAssetChain = (asset: IRWAAssetsOverview['assets'][number]) =>
			asset.primaryChain?.trim() || asset.chain?.find((c) => c && c.trim())?.trim() || UNKNOWN

		const totals = new Map<string, { onChain: number; active: number; defi: number }>()
		const discoveredChains = new Set<string>()

		for (const asset of assets) {
			const chain = getAssetChain(asset)
			discoveredChains.add(chain)

			const prev = totals.get(chain) ?? { onChain: 0, active: 0, defi: 0 }
			prev.onChain += asset.onChainMcap.total
			prev.active += asset.activeMcap.total
			prev.defi += asset.defiActiveTvl.total
			totals.set(chain, prev)
		}

		const colorOrder = Array.from(discoveredChains).sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const chainPieChartStackColors = buildStackColors(colorOrder)

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			limitChartData(
				Array.from(totals.entries())
					.map(([name, v]) => ({ name, value: v[metric] }))
					.filter((x) => x.value > 0)
					.sort((a, b) => b.value - a.value)
			)

		return {
			chainOnChainMcapPieChartData: toSortedChartData('onChain'),
			chainActiveMcapPieChartData: toSortedChartData('active'),
			chainDefiActiveTvlPieChartData: toSortedChartData('defi'),
			chainPieChartStackColors
		}
	}, [assets, enabled])
}

type RWAChartMetric = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'

type RWAChartRowByTicker = { timestamp: number } & Record<string, number>

type RWAChartRowByCategory = { timestamp: number } & Record<string, number>

type RWAChartRowByAssetClass = { timestamp: number } & Record<string, number>

type RWAChartRowByAssetName = { timestamp: number } & Record<string, number>

function sortKeysWithOthersLast(keys: Iterable<string>): string[] {
	const arr = Array.from(keys).filter(Boolean)
	return arr.sort((a, b) => {
		if (a === 'Others') return 1
		if (b === 'Others') return -1
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
	chartDatasetByCategory: Record<RWAChartMetric, { source: RWAChartRowByCategory[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = {
			chartDatasetByCategory: {
				onChainMcap: { source: [] as RWAChartRowByCategory[], dimensions: ['timestamp'] },
				activeMcap: { source: [] as RWAChartRowByCategory[], dimensions: ['timestamp'] },
				defiActiveTvl: { source: [] as RWAChartRowByCategory[], dimensions: ['timestamp'] }
			}
		}

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		// Build ticker -> categories lookup from filtered assets.
		const tickerToCategories = new Map<string, string[]>()
		for (const asset of assets) {
			const ticker = asset.ticker?.trim()
			if (!ticker) continue
			const categories = (asset.category ?? []).map((c) => c?.trim()).filter(Boolean) as string[]
			if (categories.length === 0) continue
			tickerToCategories.set(ticker, categories)
		}

		const aggregate = (rows: RWAChartRowByTicker[], seenCategories: Set<string>): RWAChartRowByCategory[] => {
			const out: RWAChartRowByCategory[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRowByCategory = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const categories = tickerToCategories.get(ticker)
					if (!categories) continue

					for (const category of categories) {
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
				onChainMcap: { source: onChainMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenOnChain)] },
				activeMcap: { source: activeMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenActive)] },
				defiActiveTvl: { source: defiActiveTvl, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenDefi)] }
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
	chartDatasetByAssetClass: Record<RWAChartMetric, { source: RWAChartRowByAssetClass[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = {
			chartDatasetByAssetClass: {
				onChainMcap: { source: [] as RWAChartRowByAssetClass[], dimensions: ['timestamp'] },
				activeMcap: { source: [] as RWAChartRowByAssetClass[], dimensions: ['timestamp'] },
				defiActiveTvl: { source: [] as RWAChartRowByAssetClass[], dimensions: ['timestamp'] }
			}
		}

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		// Build ticker -> asset classes lookup from filtered assets.
		const tickerToAssetClasses = new Map<string, string[]>()
		for (const asset of assets) {
			const ticker = asset.ticker?.trim()
			if (!ticker) continue
			const assetClasses = (asset.assetClass ?? []).map((c) => c?.trim()).filter(Boolean) as string[]
			if (assetClasses.length === 0) continue
			tickerToAssetClasses.set(ticker, assetClasses)
		}

		const aggregate = (rows: RWAChartRowByTicker[], seenAssetClasses: Set<string>): RWAChartRowByAssetClass[] => {
			const out: RWAChartRowByAssetClass[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRowByAssetClass = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const assetClasses = tickerToAssetClasses.get(ticker)
					if (!assetClasses) continue

					for (const assetClass of assetClasses) {
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
				onChainMcap: { source: onChainMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenOnChain)] },
				activeMcap: { source: activeMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenActive)] },
				defiActiveTvl: { source: defiActiveTvl, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenDefi)] }
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
	chartDatasetByAssetName: Record<RWAChartMetric, { source: RWAChartRowByAssetName[]; dimensions: string[] }>
} {
	return useMemo(() => {
		const empty = {
			chartDatasetByAssetName: {
				onChainMcap: { source: [] as RWAChartRowByAssetName[], dimensions: ['timestamp'] },
				activeMcap: { source: [] as RWAChartRowByAssetName[], dimensions: ['timestamp'] },
				defiActiveTvl: { source: [] as RWAChartRowByAssetName[], dimensions: ['timestamp'] }
			}
		}

		if (!enabled) return empty
		if (!chartDataByTicker) return empty

		const UNKNOWN = 'Unknown'

		// Build ticker -> asset name lookup from filtered assets.
		const tickerToAssetName = new Map<string, string>()
		for (const asset of assets) {
			const ticker = asset.ticker?.trim()
			if (!ticker) continue
			const name = asset.name?.trim() || asset.ticker?.trim() || UNKNOWN
			tickerToAssetName.set(ticker, name)
		}

		const aggregate = (rows: RWAChartRowByTicker[], seenAssetNames: Set<string>): RWAChartRowByAssetName[] => {
			const out: RWAChartRowByAssetName[] = []

			for (const row of rows ?? []) {
				const outRow: RWAChartRowByAssetName = { timestamp: row.timestamp }

				for (const [ticker, value] of Object.entries(row)) {
					if (ticker === 'timestamp') continue
					if (!Number.isFinite(value) || value === 0) continue

					const assetName = tickerToAssetName.get(ticker)
					if (!assetName) continue

					seenAssetNames.add(assetName)
					outRow[assetName] = (outRow[assetName] ?? 0) + value
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
				onChainMcap: { source: onChainMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenOnChain)] },
				activeMcap: { source: activeMcap, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenActive)] },
				defiActiveTvl: { source: defiActiveTvl, dimensions: ['timestamp', ...sortKeysWithOthersLast(seenDefi)] }
			}
		}
	}, [assets, chartDataByTicker, enabled])
}
