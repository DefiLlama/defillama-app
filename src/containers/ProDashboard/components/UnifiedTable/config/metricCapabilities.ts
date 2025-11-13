import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from './ColumnDictionary'

const ALWAYS_INCLUDE = new Set(['name'])
const CAPABILITIES_CACHE = new Map<'protocols' | 'chains', Set<string>>()

export function getCapabilitiesFromDictionary(strategy: 'protocols' | 'chains'): Set<string> {
	const cached = CAPABILITIES_CACHE.get(strategy)
	if (cached) return cached

	const ids = UNIFIED_TABLE_COLUMN_DICTIONARY
		.filter((column) => !column.strategies || column.strategies.includes(strategy))
		.map((column) => column.id)

	const capabilities = new Set<string>([...ALWAYS_INCLUDE, ...ids])
	CAPABILITIES_CACHE.set(strategy, capabilities)
	return capabilities
}

export function getCapabilities(strategy: 'protocols' | 'chains'): Set<string> {
	return new Set(getCapabilitiesFromDictionary(strategy))
}

export function isColumnSupported(id: string, strategy: 'protocols' | 'chains'): boolean {
	return getCapabilitiesFromDictionary(strategy).has(id)
}

export function filterByCapabilities(ids: string[], strategy: 'protocols' | 'chains'): string[] {
	return ids.filter((id) => isColumnSupported(id, strategy))
}

export function pruneVisibility(
	visibility: VisibilityState | undefined,
	strategy: 'protocols' | 'chains'
): VisibilityState {
	if (!visibility) return {}
	return Object.fromEntries(Object.entries(visibility).filter(([key]) => isColumnSupported(key, strategy)))
}

export function sanitizeSorting(sorting: SortingState | undefined, strategy: 'protocols' | 'chains'): SortingState {
	if (!sorting) return []
	return sorting.filter((sort) => isColumnSupported(sort.id, strategy))
}

export function sanitizeConfigColumns({
	order,
	visibility,
	sorting,
	strategy
}: {
	order: string[]
	visibility?: VisibilityState
	sorting?: SortingState
	strategy: 'protocols' | 'chains'
}): {
	order: string[]
	visibility: VisibilityState
	sorting: SortingState
} {
	return {
		order: filterByCapabilities(order, strategy),
		visibility: pruneVisibility(visibility, strategy),
		sorting: sanitizeSorting(sorting, strategy)
	}
}
