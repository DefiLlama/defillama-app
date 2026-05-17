import { rwaSlug } from './rwaSlug'

export type RWAOverviewMode = 'chain' | 'category' | 'platform' | 'assetGroup'

export type RWAOverviewInclusionDefaults = {
	includeStablecoins: boolean
	includeGovernance: boolean
}

export type RWAOverviewInclusionContext = {
	mode: RWAOverviewMode
	chainSlug?: string | null
	categorySlug?: string | null
	platformSlug?: string | null
	assetGroupSlug?: string | null
}

type RWAOverviewPath = `/rwa${string}`

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
export const RWA_YIELD_WRAPPER_SLUG = 'rwa-yield-wrapper'
export const EXCLUDED_STANDARD_RWA_CATEGORY_SLUGS = new Set(['rwa-perps'])
const STABLECOINS_DEFAULT_RWA_PATHS = new Set<RWAOverviewPath>([
	'/rwa/category/rwa-yield-wrapper',
	'/rwa/platform/apyx'
])
const GOVERNANCE_DEFAULT_RWA_PATHS = new Set<RWAOverviewPath>(['/rwa/category/rwa-yield-wrapper'])

export function isCategoryIncludedInStandardRwaOverview(category: string | null | undefined): boolean {
	if (!category) return false
	return !EXCLUDED_STANDARD_RWA_CATEGORY_SLUGS.has(rwaSlug(category))
}

export function filterCategoriesForStandardRwaOverview(categories: string[]): string[] {
	return categories.filter((category) => isCategoryIncludedInStandardRwaOverview(category))
}

export function getDefaultRWAOverviewInclusion({
	mode,
	chainSlug,
	categorySlug,
	platformSlug,
	assetGroupSlug
}: RWAOverviewInclusionContext): RWAOverviewInclusionDefaults {
	const path = getRWAOverviewPath({ mode, chainSlug, categorySlug, platformSlug, assetGroupSlug })

	return {
		includeStablecoins: path ? STABLECOINS_DEFAULT_RWA_PATHS.has(path) : false,
		includeGovernance: path ? GOVERNANCE_DEFAULT_RWA_PATHS.has(path) : false
	}
}

function getRWAOverviewPath({
	mode,
	chainSlug,
	categorySlug,
	platformSlug,
	assetGroupSlug
}: RWAOverviewInclusionContext): RWAOverviewPath | null {
	switch (mode) {
		case 'chain':
			return chainSlug ? `/rwa/chain/${chainSlug}` : '/rwa'
		case 'category':
			return categorySlug ? `/rwa/category/${categorySlug}` : '/rwa/categories'
		case 'platform':
			return platformSlug ? `/rwa/platform/${platformSlug}` : '/rwa/platforms'
		case 'assetGroup':
			return assetGroupSlug ? `/rwa/asset-group/${assetGroupSlug}` : '/rwa/asset-groups'
		default:
			return null
	}
}

export function isTypeIncludedByDefault(
	type: string | null | undefined,
	mode: RWAOverviewMode,
	categorySlug?: string | null
): boolean {
	if (mode === 'platform' || mode === 'assetGroup') return true
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
