import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from './ColumnDictionary'
import type { CustomColumnDefinition } from '../../../types'
import { validateCustomColumnOnLoad } from '../utils/customColumns'

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

function isCustomColumnId(id: string): boolean {
	return id.startsWith('custom_')
}

export function isColumnSupported(id: string, validCustomColumnIds?: Set<string>): boolean {
	if (isCustomColumnId(id)) {
		if (!validCustomColumnIds) return false
		return validCustomColumnIds.has(id)
	}
	return getCapabilitiesFromDictionary().has(id)
}

export function filterByCapabilities(ids: string[], validCustomColumnIds?: Set<string>): string[] {
	return ids.filter((id) => isColumnSupported(id, validCustomColumnIds))
}

export function pruneVisibility(visibility: VisibilityState | undefined, validCustomColumnIds?: Set<string>): VisibilityState {
	if (!visibility) return {}
	return Object.fromEntries(Object.entries(visibility).filter(([key]) => isColumnSupported(key, validCustomColumnIds)))
}

export function sanitizeSorting(sorting: SortingState | undefined, validCustomColumnIds?: Set<string>): SortingState {
	if (!sorting) return []
	return sorting.filter((sort) => isColumnSupported(sort.id, validCustomColumnIds))
}

export function getValidCustomColumnIds(customColumns?: CustomColumnDefinition[]): Set<string> {
	if (!customColumns || customColumns.length === 0) return new Set()
	return new Set(
		customColumns
			.filter((col) => isValidCustomColumnId(col.id) && validateCustomColumnOnLoad(col).isValid)
			.map((col) => col.id)
	)
}

function isValidCustomColumnId(id: string): boolean {
	return typeof id === 'string' && id.startsWith('custom_')
}

export function sanitizeConfigColumns({
	order,
	visibility,
	sorting,
	customColumns
}: {
	order: string[]
	visibility?: VisibilityState
	sorting?: SortingState
	customColumns?: CustomColumnDefinition[]
}): {
	order: string[]
	visibility: VisibilityState
	sorting: SortingState
} {
	const validCustomColumnIds = getValidCustomColumnIds(customColumns)
	return {
		order: filterByCapabilities(order, validCustomColumnIds),
		visibility: pruneVisibility(visibility, validCustomColumnIds),
		sorting: sanitizeSorting(sorting, validCustomColumnIds)
	}
}
