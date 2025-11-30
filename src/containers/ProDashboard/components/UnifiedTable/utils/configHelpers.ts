import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { sanitizeConfigColumns } from '../config/metricCapabilities'
import type { UnifiedTablePreset } from '../config/PresetRegistry'
import { UNIFIED_TABLE_PRESETS_BY_ID } from '../config/PresetRegistry'
import { DEFAULT_COLUMN_ORDER, DEFAULT_COLUMN_VISIBILITY, DEFAULT_ROW_HEADERS, DEFAULT_UNIFIED_TABLE_SORTING } from '../constants'
import { sanitizeRowHeaders } from '../utils/rowHeaders'

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
		sorting: []
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
		visibility = config.columnVisibility ? { ...config.columnVisibility } : {}
	}

	const sanitized = sanitizeConfigColumns({
		order: [],
		visibility,
		sorting: []
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

export interface ApplyPresetOptions {
	preset: UnifiedTablePreset
	includeRowHeaderRules?: boolean
	mergeWithDefaults?: boolean
}

export function applyPresetToConfig(options: ApplyPresetOptions): {
	columnOrder: string[]
	columnVisibility: VisibilityState
	sorting: SortingState
	rowHeaders: UnifiedRowHeaderType[]
} {
	const { preset, includeRowHeaderRules = true, mergeWithDefaults = true } = options

	const rowHeaders = sanitizeRowHeaders([...(preset.rowHeaders as UnifiedRowHeaderType[])])

	let columnVisibility = mergeWithDefaults
		? { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }
		: { ...preset.columnVisibility }

	const sanitized = sanitizeConfigColumns({
		order: [...preset.columnOrder],
		visibility: columnVisibility,
		sorting: normalizeSorting(preset.defaultSorting)
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

export interface InitializeConfigOptions {
	existingConfig?: Partial<UnifiedTableConfig>
	presetId?: string
	includeDefaults?: boolean
}

export function initializeUnifiedTableConfig(options: InitializeConfigOptions): {
	columnOrder: string[]
	columnVisibility: VisibilityState
	sorting: SortingState
	rowHeaders: UnifiedRowHeaderType[]
	activePresetId: string
} {
	const { existingConfig, presetId, includeDefaults = true } = options

	const fallbackPresetId = 'essential-protocols'
	const resolvedPresetId = presetId || existingConfig?.activePresetId || fallbackPresetId
	const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(resolvedPresetId) || UNIFIED_TABLE_PRESETS_BY_ID.get(fallbackPresetId)!

	const config: UnifiedTableConfig = {
		id: existingConfig?.id || '',
		kind: 'unified-table',
		...existingConfig,
		rowHeaders: existingConfig?.rowHeaders || []
	}

	const rowHeaders = getDefaultRowHeaders(config, preset)
	const columnOrder = getDefaultColumnOrder(config, preset)

	const baseVisibility = includeDefaults
		? {
				...DEFAULT_COLUMN_VISIBILITY,
				...(preset.columnVisibility ?? {}),
				...(existingConfig?.columnVisibility ?? {})
			}
		: (existingConfig?.columnVisibility ?? {})

	const sorting = normalizeSorting(existingConfig?.defaultSorting || preset.defaultSorting)

	const sanitized = sanitizeConfigColumns({
		order: columnOrder,
		visibility: baseVisibility,
		sorting
	})

	const columnVisibility = applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility)

	return {
		columnOrder: sanitized.order,
		columnVisibility,
		sorting: sanitized.sorting,
		rowHeaders,
		activePresetId: resolvedPresetId
	}
}
