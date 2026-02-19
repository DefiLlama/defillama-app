import type { SortingState, VisibilityState } from '@tanstack/react-table'
import type { CustomColumnDefinition, UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '../config/ColumnDictionary'
import { sanitizeConfigColumns } from '../config/metricCapabilities'
import type { UnifiedTablePreset } from '../config/PresetRegistry'
import {
	DEFAULT_COLUMN_ORDER,
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_ROW_HEADERS,
	DEFAULT_UNIFIED_TABLE_SORTING
} from '../constants'
import { sanitizeRowHeaders } from '../utils/rowHeaders'

const ALL_COLUMNS_HIDDEN: Record<string, boolean> = UNIFIED_TABLE_COLUMN_DICTIONARY.reduce<Record<string, boolean>>(
	(acc, column) => {
		acc[column.id] = false
		return acc
	},
	{ name: false }
)

export function getDefaultColumnOrder(config: UnifiedTableConfig, fallbackPreset?: UnifiedTablePreset): string[] {
	let order: string[]

	if (config.columnOrder && config.columnOrder.length) {
		order = [...config.columnOrder]
	} else if (fallbackPreset) {
		order = [...fallbackPreset.columnOrder]
	} else {
		order = [...DEFAULT_COLUMN_ORDER]
	}

	const sanitized = sanitizeConfigColumns({
		order,
		visibility: {},
		sorting: [],
		customColumns: config.customColumns
	})

	return sanitized.order
}

export function getDefaultColumnVisibility(
	config: UnifiedTableConfig,
	fallbackPreset?: UnifiedTablePreset,
	includeDefaults: boolean = false
): VisibilityState {
	let visibility: VisibilityState

	if (includeDefaults) {
		visibility = {
			...DEFAULT_COLUMN_VISIBILITY,
			...(fallbackPreset?.columnVisibility ?? {}),
			...(config.columnVisibility ?? {})
		}
	} else {
		const hasColumnVisibility = Boolean(config.columnVisibility && Object.keys(config.columnVisibility).length > 0)
		if (hasColumnVisibility) {
			visibility = {
				...ALL_COLUMNS_HIDDEN,
				...config.columnVisibility
			}
		} else {
			visibility = {}
		}
	}

	const sanitized = sanitizeConfigColumns({
		order: [],
		visibility,
		sorting: [],
		customColumns: config.customColumns
	})

	return sanitized.visibility
}

export function getDefaultRowHeaders(
	config: UnifiedTableConfig,
	fallbackPreset?: UnifiedTablePreset
): UnifiedRowHeaderType[] {
	if (config.rowHeaders && config.rowHeaders.length) {
		return [...config.rowHeaders]
	}

	if (fallbackPreset) {
		return [...(fallbackPreset.rowHeaders as UnifiedRowHeaderType[])]
	}

	return [...DEFAULT_ROW_HEADERS]
}

export function normalizeSorting(sorting?: Array<{ id: string; desc?: boolean }>): SortingState {
	const base = sorting && sorting.length ? sorting : DEFAULT_UNIFIED_TABLE_SORTING

	return base.map((item) => ({
		id: item.id,
		desc: item.desc ?? false
	}))
}

export function applyRowHeaderVisibilityRules(
	rowHeaders: UnifiedRowHeaderType[],
	baseVisibility: VisibilityState
): VisibilityState {
	const nextVisibility = { ...baseVisibility }

	if (rowHeaders.includes('chain')) {
		nextVisibility.chains = false
		nextVisibility.category = false
	}

	if (rowHeaders.includes('category')) {
		nextVisibility.category = false
	}

	return nextVisibility
}

interface ApplyPresetOptions {
	preset: UnifiedTablePreset
	includeRowHeaderRules?: boolean
	mergeWithDefaults?: boolean
	customColumns?: CustomColumnDefinition[]
}

export function applyPresetToConfig(options: ApplyPresetOptions): {
	columnOrder: string[]
	columnVisibility: VisibilityState
	sorting: SortingState
	rowHeaders: UnifiedRowHeaderType[]
} {
	const { preset, includeRowHeaderRules = true, mergeWithDefaults = true, customColumns } = options

	const rowHeaders = sanitizeRowHeaders([...(preset.rowHeaders as UnifiedRowHeaderType[])])

	let columnVisibility = mergeWithDefaults
		? { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }
		: { ...preset.columnVisibility }

	const sanitized = sanitizeConfigColumns({
		order: [...preset.columnOrder],
		visibility: columnVisibility,
		sorting: normalizeSorting(preset.defaultSorting),
		customColumns
	})

	if (includeRowHeaderRules) {
		sanitized.visibility = applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility)
	}

	return {
		columnOrder: sanitized.order,
		columnVisibility: sanitized.visibility,
		sorting: sanitized.sorting,
		rowHeaders
	}
}
