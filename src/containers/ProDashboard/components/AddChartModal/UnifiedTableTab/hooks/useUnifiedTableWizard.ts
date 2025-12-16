import { useCallback, useMemo, useReducer } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { sanitizeConfigColumns } from '~/containers/ProDashboard/components/UnifiedTable/config/metricCapabilities'
import { UNIFIED_TABLE_PRESETS_BY_ID } from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import {
	DEFAULT_COLUMN_ORDER,
	DEFAULT_COLUMN_VISIBILITY
} from '~/containers/ProDashboard/components/UnifiedTable/constants'
import {
	applyRowHeaderVisibilityRules,
	getDefaultColumnOrder,
	getDefaultColumnVisibility,
	getDefaultRowHeaders,
	normalizeSorting
} from '~/containers/ProDashboard/components/UnifiedTable/utils/configHelpers'
import { getOrderedCustomColumnIds } from '~/containers/ProDashboard/components/UnifiedTable/utils/customColumns'
import type {
	CustomColumnDefinition,
	TableFilters,
	UnifiedRowHeaderType,
	UnifiedTableConfig
} from '~/containers/ProDashboard/types'

type WizardAction =
	| { type: 'SET_CHAINS'; chains: string[] }
	| { type: 'SET_ROW_HEADERS'; rowHeaders: UnifiedRowHeaderType[] }
	| { type: 'SET_FILTERS'; filters: TableFilters }
	| { type: 'SET_PRESET'; presetId: string }
	| { type: 'SET_COLUMNS'; columnOrder: ColumnOrderState; columnVisibility: VisibilityState }
	| { type: 'SET_SORTING'; sorting: SortingState }
	| { type: 'ADD_CUSTOM_COLUMN'; column: CustomColumnDefinition }
	| { type: 'UPDATE_CUSTOM_COLUMN'; id: string; updates: Partial<CustomColumnDefinition> }
	| { type: 'REMOVE_CUSTOM_COLUMN'; id: string }

interface WizardState {
	chains: string[]
	rowHeaders: UnifiedRowHeaderType[]
	filters: TableFilters
	activePresetId: string
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	sorting: SortingState
	customColumns: CustomColumnDefinition[]
}

const derivePreset = (presetId: string | undefined) => {
	const fallbackId = 'essential-protocols'
	const preset = presetId ? UNIFIED_TABLE_PRESETS_BY_ID.get(presetId) : UNIFIED_TABLE_PRESETS_BY_ID.get(fallbackId)
	return preset ?? UNIFIED_TABLE_PRESETS_BY_ID.get(fallbackId)!
}

const createStateFromConfig = (config: UnifiedTableConfig, fallbackPresetId?: string): WizardState => {
	const preset = derivePreset(config.activePresetId ?? fallbackPresetId)

	const rowHeaders = getDefaultRowHeaders(config, preset)
	const columnOrder = getDefaultColumnOrder(config, preset)
	const baseVisibility = getDefaultColumnVisibility(config, preset, true)

	const customColumns = config.customColumns ? [...config.customColumns] : []

	const sanitized = sanitizeConfigColumns({
		order: columnOrder,
		visibility: baseVisibility,
		sorting: normalizeSorting(config.defaultSorting),
		customColumns
	})

	const chains = config.params?.chains && config.params.chains.length ? [...config.params.chains] : ['All']
	const orderedCustomIds = getOrderedCustomColumnIds(sanitized.order, customColumns)
	const orderSet = new Set(sanitized.order)
	const mergedOrder = [...sanitized.order, ...orderedCustomIds.filter((id) => !orderSet.has(id))]
	const mergedVisibility = applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility)
	for (const id of orderedCustomIds) {
		if (!(id in mergedVisibility)) {
			mergedVisibility[id] = true
		}
	}

	return {
		chains,
		rowHeaders,
		filters: { ...(config.filters ?? {}) },
		activePresetId: config.activePresetId ?? preset.id,
		columnOrder: mergedOrder,
		columnVisibility: mergedVisibility,
		sorting: sanitized.sorting,
		customColumns
	}
}

const defaultState = (presetId?: string, existingConfig?: UnifiedTableConfig): WizardState => {
	if (existingConfig) {
		return createStateFromConfig(existingConfig, presetId)
	}

	const preset = derivePreset(presetId)
	const rowHeaders = [...(preset.rowHeaders as UnifiedRowHeaderType[])]
	const baseVisibility = { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }

	const sanitized = sanitizeConfigColumns({
		order: [...preset.columnOrder],
		visibility: baseVisibility,
		sorting: normalizeSorting(preset.defaultSorting)
	})

	return {
		chains: ['All'],
		rowHeaders,
		filters: {},
		activePresetId: preset.id,
		columnOrder: sanitized.order,
		columnVisibility: applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
		sorting: sanitized.sorting,
		customColumns: []
	}
}

const reducer = (state: WizardState, action: WizardAction): WizardState => {
	switch (action.type) {
		case 'SET_CHAINS':
			return { ...state, chains: action.chains }
		case 'SET_ROW_HEADERS': {
			return {
				...state,
				rowHeaders: action.rowHeaders,
				columnVisibility: applyRowHeaderVisibilityRules(action.rowHeaders, state.columnVisibility)
			}
		}
		case 'SET_FILTERS':
			return { ...state, filters: action.filters }
		case 'SET_PRESET': {
			const preset = derivePreset(action.presetId)
			const rowHeaders = preset.rowHeaders as UnifiedRowHeaderType[]
			const baseVisibility = { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }
			const sanitized = sanitizeConfigColumns({
				order: [...preset.columnOrder],
				visibility: baseVisibility,
				sorting: normalizeSorting(preset.defaultSorting),
				customColumns: state.customColumns
			})
			const customColumnIds = getOrderedCustomColumnIds(state.columnOrder, state.customColumns)
			const customColumnVisibility = Object.fromEntries(
				customColumnIds.map((id) => [id, state.columnVisibility[id] ?? true])
			)
			const nextOrderSet = new Set(sanitized.order)
			return {
				...state,
				activePresetId: preset.id,
				rowHeaders,
				columnOrder: [...sanitized.order, ...customColumnIds.filter((id) => !nextOrderSet.has(id))],
				columnVisibility: {
					...applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
					...customColumnVisibility
				},
				sorting: sanitized.sorting
			}
		}
		case 'SET_COLUMNS':
			return { ...state, columnOrder: action.columnOrder, columnVisibility: action.columnVisibility }
		case 'SET_SORTING':
			return { ...state, sorting: action.sorting }
		case 'ADD_CUSTOM_COLUMN': {
			const newOrder = [...state.columnOrder, action.column.id]
			const newVisibility = { ...state.columnVisibility, [action.column.id]: true }
			return {
				...state,
				customColumns: [...state.customColumns, action.column],
				columnOrder: newOrder,
				columnVisibility: newVisibility
			}
		}
		case 'UPDATE_CUSTOM_COLUMN':
			return {
				...state,
				customColumns: state.customColumns.map((col) => (col.id === action.id ? { ...col, ...action.updates } : col))
			}
		case 'REMOVE_CUSTOM_COLUMN': {
			const newOrder = state.columnOrder.filter((id) => id !== action.id)
			const { [action.id]: _, ...newVisibility } = state.columnVisibility
			const newSorting = state.sorting.filter((sort) => sort.id !== action.id)
			return {
				...state,
				customColumns: state.customColumns.filter((col) => col.id !== action.id),
				columnOrder: newOrder,
				columnVisibility: newVisibility,
				sorting: newSorting
			}
		}
		default:
			return state
	}
}

export const useUnifiedTableWizard = (presetId?: string, existingConfig?: UnifiedTableConfig) => {
	const [state, dispatch] = useReducer(reducer, defaultState(presetId, existingConfig))

	const setChains = useCallback((chains: string[]) => dispatch({ type: 'SET_CHAINS', chains }), [])
	const setRowHeaders = useCallback(
		(rowHeaders: UnifiedRowHeaderType[]) => dispatch({ type: 'SET_ROW_HEADERS', rowHeaders }),
		[]
	)
	const setFilters = useCallback((filters: TableFilters) => dispatch({ type: 'SET_FILTERS', filters }), [])
	const setPreset = useCallback((presetId: string) => dispatch({ type: 'SET_PRESET', presetId }), [])
	const setColumns = useCallback(
		(columnOrder: ColumnOrderState, columnVisibility: VisibilityState) =>
			dispatch({ type: 'SET_COLUMNS', columnOrder, columnVisibility }),
		[]
	)
	const setSorting = useCallback((sorting: SortingState) => dispatch({ type: 'SET_SORTING', sorting }), [])
	const addCustomColumn = useCallback(
		(column: CustomColumnDefinition) => dispatch({ type: 'ADD_CUSTOM_COLUMN', column }),
		[]
	)
	const updateCustomColumn = useCallback(
		(id: string, updates: Partial<CustomColumnDefinition>) => dispatch({ type: 'UPDATE_CUSTOM_COLUMN', id, updates }),
		[]
	)
	const removeCustomColumn = useCallback((id: string) => dispatch({ type: 'REMOVE_CUSTOM_COLUMN', id }), [])

	const draftConfig = useMemo<Partial<UnifiedTableConfig>>(() => {
		const params = {
			chains: state.chains.length ? state.chains : ['All']
		}

		const base: Partial<UnifiedTableConfig> = {
			rowHeaders: state.rowHeaders,
			params,
			filters: state.filters,
			columnOrder: state.columnOrder.length ? state.columnOrder : DEFAULT_COLUMN_ORDER,
			columnVisibility: state.columnVisibility,
			activePresetId: state.activePresetId,
			defaultSorting: state.sorting.map((item) => ({ ...item })),
			customColumns: state.customColumns.length ? state.customColumns : undefined
		}

		return base
	}, [state])

	return {
		state,
		actions: {
			setChains,
			setRowHeaders,
			setFilters,
			setPreset,
			setColumns,
			setSorting,
			addCustomColumn,
			updateCustomColumn,
			removeCustomColumn
		},
		derived: {
			draftConfig
		}
	}
}
