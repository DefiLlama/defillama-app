export type RWAOverviewMode = 'chain' | 'category' | 'platform'

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])

export function isTypeIncludedByDefault(
	type: string | null | undefined,
	mode: RWAOverviewMode,
	categorySlug?: string | null
): boolean {
	if (mode === 'platform') return true
	if (mode === 'category' && categorySlug === 'rwa-yield-wrapper') return true
	return !DEFAULT_EXCLUDED_TYPES.has(type || 'Unknown')
}

export function getDefaultSelectedTypes(
	allTypes: string[],
	mode: RWAOverviewMode,
	categorySlug?: string | null
): string[] {
	return allTypes.filter((type) => isTypeIncludedByDefault(type, mode, categorySlug))
}
