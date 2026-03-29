export type RWAOverviewMode = 'chain' | 'category' | 'platform' | 'assetGroup'

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])
export const RWA_YIELD_WRAPPER_SLUG = 'rwa-yield-wrapper'

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
