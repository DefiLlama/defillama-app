import { rwaSlug } from './rwaSlug'

export type RWAOverviewMode = 'chain' | 'category' | 'platform' | 'assetGroup' | 'issuer'

export type RWAOverviewInclusionDefaults = {
	includeStablecoins: boolean
	includeGovernance: boolean
}

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
export const RWA_YIELD_WRAPPER_SLUG = 'rwa-yield-wrapper'
export const EXCLUDED_STANDARD_RWA_CATEGORY_SLUGS = new Set(['rwa-perps'])

export function isCategoryIncludedInStandardRwaOverview(category: string | null | undefined): boolean {
	if (!category) return false
	return !EXCLUDED_STANDARD_RWA_CATEGORY_SLUGS.has(rwaSlug(category))
}

export function filterCategoriesForStandardRwaOverview(categories: string[]): string[] {
	return categories.filter((category) => isCategoryIncludedInStandardRwaOverview(category))
}

export function getDefaultRWAOverviewInclusion(
	mode: RWAOverviewMode,
	categorySlug?: string | null
): RWAOverviewInclusionDefaults {
	// Issuer pages must surface every asset for that issuer by default — a stablecoin-only issuer
	// (Circle, Tether) or governance-only issuer (Lido) would otherwise render empty totals/charts
	// until the user toggled the corresponding inclusion flag.
	if (mode === 'issuer') return { includeStablecoins: true, includeGovernance: true }
	const isYieldWrapperCategory = mode === 'category' && categorySlug === RWA_YIELD_WRAPPER_SLUG
	return {
		includeStablecoins: isYieldWrapperCategory,
		includeGovernance: isYieldWrapperCategory
	}
}

export function isTypeIncludedByDefault(
	type: string | null | undefined,
	mode: RWAOverviewMode,
	categorySlug?: string | null
): boolean {
	if (mode === 'platform' || mode === 'assetGroup' || mode === 'issuer') return true
	if (mode === 'category' && categorySlug === RWA_YIELD_WRAPPER_SLUG) return true
	return !DEFAULT_EXCLUDED_TYPES.has(type || 'Unknown')
}

export function getDefaultSelectedTypes(
	allTypes: string[],
	mode: RWAOverviewMode,
	categorySlug?: string | null
): string[] {
	return allTypes.filter((type) => isTypeIncludedByDefault(type, mode, categorySlug))
}
