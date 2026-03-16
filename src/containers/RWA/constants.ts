export type RWAOverviewMode = 'chain' | 'category' | 'platform'

export const DEFAULT_EXCLUDED_TYPES = new Set(['Wrapper'])

export function getDefaultSelectedTypes(allTypes: string[], mode: RWAOverviewMode): string[] {
	if (mode === 'platform') return allTypes
	return allTypes.filter((t) => !DEFAULT_EXCLUDED_TYPES.has(t))
}
