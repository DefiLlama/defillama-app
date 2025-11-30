import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from './ColumnDictionary'

const ALWAYS_INCLUDE = new Set(['name'])
let CAPABILITIES_CACHE: Set<string> | null = null

export function getCapabilitiesFromDictionary(): Set<string> {
	if (CAPABILITIES_CACHE) return CAPABILITIES_CACHE

	const ids = UNIFIED_TABLE_COLUMN_DICTIONARY.map((column) => column.id)
	const capabilities = new Set<string>([...ALWAYS_INCLUDE, ...ids])
	CAPABILITIES_CACHE = capabilities
	return capabilities
}

export function getCapabilities(): Set<string> {
	return new Set(getCapabilitiesFromDictionary())
}

export function isColumnSupported(id: string): boolean {
	return getCapabilitiesFromDictionary().has(id)
}

export function filterByCapabilities(ids: string[]): string[] {
	return ids.filter((id) => isColumnSupported(id))
}

export function pruneVisibility(visibility: VisibilityState | undefined): VisibilityState {
	if (!visibility) return {}
	return Object.fromEntries(Object.entries(visibility).filter(([key]) => isColumnSupported(key)))
}

export function sanitizeSorting(sorting: SortingState | undefined): SortingState {
	if (!sorting) return []
	return sorting.filter((sort) => isColumnSupported(sort.id))
}

export function sanitizeConfigColumns({
	order,
	visibility,
	sorting
}: {
	order: string[]
	visibility?: VisibilityState
	sorting?: SortingState
}): {
	order: string[]
	visibility: VisibilityState
	sorting: SortingState
} {
	return {
		order: filterByCapabilities(order),
		visibility: pruneVisibility(visibility),
		sorting: sanitizeSorting(sorting)
	}
}
