import { useCallback, useMemo, useReducer } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { sanitizeConfigColumns } from '~/containers/ProDashboard/components/UnifiedTable/config/metricCapabilities'
import { UNIFIED_TABLE_PRESETS_BY_ID } from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import {
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_UNIFIED_TABLE_COLUMN_ORDER_BY_STRATEGY
} from '~/containers/ProDashboard/components/UnifiedTable/constants'
import {
	applyRowHeaderVisibilityRules,
	getDefaultColumnOrder,
	getDefaultColumnVisibility,
	getDefaultRowHeaders,
	normalizeSorting
} from '~/containers/ProDashboard/components/UnifiedTable/utils/configHelpers'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'

type StrategyType = UnifiedTableConfig['strategyType']

type WizardAction =
	| { type: 'SET_STRATEGY'; strategy: StrategyType }
	| { type: 'SET_CHAINS'; chains: string[] }
	| { type: 'SET_CATEGORY'; category: string | null }
	| { type: 'SET_ROW_HEADERS'; rowHeaders: UnifiedRowHeaderType[] }
	| { type: 'SET_FILTERS'; filters: TableFilters }
	| { type: 'SET_PRESET'; presetId: string }
	| { type: 'SET_COLUMNS'; columnOrder: ColumnOrderState; columnVisibility: VisibilityState }
	| { type: 'SET_SORTING'; sorting: SortingState }

interface WizardState {
	strategyType: StrategyType
	chains: string[]
	category: string | null
	rowHeaders: UnifiedRowHeaderType[]
	filters: TableFilters
	activePresetId: string
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	sorting: SortingState
}

const derivePreset = (presetId: string | undefined, strategyType: StrategyType) => {
	const fallbackId = strategyType === 'chains' ? 'chains-essential' : 'essential-protocols'
	const preset = presetId ? UNIFIED_TABLE_PRESETS_BY_ID.get(presetId) : UNIFIED_TABLE_PRESETS_BY_ID.get(fallbackId)
	return preset ?? UNIFIED_TABLE_PRESETS_BY_ID.get(fallbackId)!
}

const createStateFromConfig = (config: UnifiedTableConfig, fallbackPresetId?: string): WizardState => {
	const strategy = config.strategyType ?? 'protocols'
	const preset = derivePreset(config.activePresetId ?? fallbackPresetId, strategy)

	const rowHeaders = getDefaultRowHeaders(config, preset)
	const columnOrder = getDefaultColumnOrder(config, preset)
	const baseVisibility = getDefaultColumnVisibility(config, preset, true)

	const sanitized = sanitizeConfigColumns({
		order: columnOrder,
		visibility: baseVisibility,
		sorting: normalizeSorting(config.defaultSorting),
		strategy
	})

	const chains =
		strategy === 'protocols'
			? config.params?.chains && config.params.chains.length
				? [...config.params.chains]
				: ['All']
			: []

	const category = strategy === 'chains' ? (config.params?.category ?? null) : null

	return {
		strategyType: strategy,
		chains,
		category,
		rowHeaders,
		filters: { ...(config.filters ?? {}) },
		activePresetId: config.activePresetId ?? preset.id,
		columnOrder: sanitized.order,
		columnVisibility: applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
		sorting: sanitized.sorting
	}
}

const defaultState = (
	initialStrategy: StrategyType,
	presetId?: string,
	existingConfig?: UnifiedTableConfig
): WizardState => {
	if (existingConfig) {
		return createStateFromConfig(existingConfig, presetId)
	}

	const preset = derivePreset(presetId, initialStrategy)
	const rowHeaders = [...(preset.rowHeaders as UnifiedRowHeaderType[])]
	const baseVisibility = { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }

	const sanitized = sanitizeConfigColumns({
		order: [...preset.columnOrder],
		visibility: baseVisibility,
		sorting: normalizeSorting(preset.defaultSorting),
		strategy: initialStrategy
	})

	return {
		strategyType: initialStrategy,
		chains: initialStrategy === 'protocols' ? ['All'] : [],
		category: null,
		rowHeaders,
		filters: {},
		activePresetId: preset.id,
		columnOrder: sanitized.order,
		columnVisibility: applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
		sorting: sanitized.sorting
	}
}

const reducer = (state: WizardState, action: WizardAction): WizardState => {
	switch (action.type) {
		case 'SET_STRATEGY': {
			const preset = derivePreset(undefined, action.strategy)
			const rowHeaders = preset.rowHeaders as UnifiedRowHeaderType[]
			const baseVisibility = { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }
			const sanitized = sanitizeConfigColumns({
				order: [...preset.columnOrder],
				visibility: baseVisibility,
				sorting: normalizeSorting(preset.defaultSorting),
				strategy: action.strategy
			})
			return {
				...state,
				strategyType: action.strategy,
				chains: action.strategy === 'protocols' ? ['All'] : [],
				category: null,
				rowHeaders,
				filters: {},
				activePresetId: preset.id,
				columnOrder: sanitized.order,
				columnVisibility: applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
				sorting: sanitized.sorting
			}
		}
		case 'SET_CHAINS':
			return { ...state, chains: action.chains }
		case 'SET_CATEGORY':
			return { ...state, category: action.category }
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
			const preset = derivePreset(action.presetId, state.strategyType)
			const rowHeaders = preset.rowHeaders as UnifiedRowHeaderType[]
			const baseVisibility = { ...DEFAULT_COLUMN_VISIBILITY, ...preset.columnVisibility }
			const sanitized = sanitizeConfigColumns({
				order: [...preset.columnOrder],
				visibility: baseVisibility,
				sorting: normalizeSorting(preset.defaultSorting),
				strategy: state.strategyType
			})
			return {
				...state,
				activePresetId: preset.id,
				rowHeaders,
				columnOrder: sanitized.order,
				columnVisibility: applyRowHeaderVisibilityRules(rowHeaders, sanitized.visibility),
				sorting: sanitized.sorting
			}
		}
		case 'SET_COLUMNS':
			return { ...state, columnOrder: action.columnOrder, columnVisibility: action.columnVisibility }
		case 'SET_SORTING':
			return { ...state, sorting: action.sorting }
		default:
			return state
	}
}

export const useUnifiedTableWizard = (
	initialStrategy: StrategyType = 'protocols',
	presetId?: string,
	existingConfig?: UnifiedTableConfig
) => {
	const [state, dispatch] = useReducer(reducer, defaultState(initialStrategy, presetId, existingConfig))

	const setStrategy = useCallback((strategy: StrategyType) => dispatch({ type: 'SET_STRATEGY', strategy }), [])
	const setChains = useCallback((chains: string[]) => dispatch({ type: 'SET_CHAINS', chains }), [])
	const setCategory = useCallback((category: string | null) => dispatch({ type: 'SET_CATEGORY', category }), [])
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

	const draftConfig = useMemo<Partial<UnifiedTableConfig>>(() => {
		const params =
			state.strategyType === 'protocols'
				? {
						chains: state.chains.length ? state.chains : ['All']
					}
				: {
						category: state.category ?? null
					}

		const base: Partial<UnifiedTableConfig> = {
			strategyType: state.strategyType,
			rowHeaders: state.rowHeaders,
			params,
			filters: state.filters,
			columnOrder: state.columnOrder.length
				? state.columnOrder
				: DEFAULT_UNIFIED_TABLE_COLUMN_ORDER_BY_STRATEGY[state.strategyType],
			columnVisibility: state.columnVisibility,
			activePresetId: state.activePresetId,
			defaultSorting: state.sorting.map((item) => ({ ...item }))
		}

		return base
	}, [state])

	return {
		state,
		actions: {
			setStrategy,
			setChains,
			setCategory,
			setRowHeaders,
			setFilters,
			setPreset,
			setColumns,
			setSorting
		},
		derived: {
			draftConfig
		}
	}
}
