'use no memo'

import * as React from 'react'
import { buildColumnVisibilityMap } from './proTable.constants'
import type { ProTableAction, ProTableState, ProTableStateInit } from './proTable.types'

const cloneSorting = (sorting: ProTableState['sorting']): ProTableState['sorting'] => {
	return sorting.map((rule) => ({ ...rule }))
}

const hasOwnKeys = (record: Record<string, boolean> | undefined): boolean => {
	return Boolean(record) && Object.keys(record).length > 0
}

const createInitialState = ({
	options,
	defaultSorting,
	defaultPreset,
	initialKnownColumnIds
}: ProTableStateInit): ProTableState => {
	const initialCustomColumns = options?.initialCustomColumns ? [...options.initialCustomColumns] : []
	const hasInitialColumnOrder = (options?.initialColumnOrder?.length ?? 0) > 0
	const hasInitialColumnVisibility = hasOwnKeys(options?.initialColumnVisibility)
	const hasInitialView = typeof options?.initialActiveViewId === 'string'
	const shouldUsePresetAsDefault =
		!hasInitialColumnOrder && !hasInitialColumnVisibility && !hasInitialView && !!defaultPreset

	const initialColumnOrder = hasInitialColumnOrder
		? [...(options?.initialColumnOrder ?? [])]
		: shouldUsePresetAsDefault
			? [...(defaultPreset?.columns ?? [])]
			: []

	const initialColumnVisibility = hasInitialColumnVisibility
		? { ...(options?.initialColumnVisibility ?? {}) }
		: shouldUsePresetAsDefault
			? buildColumnVisibilityMap(initialKnownColumnIds, defaultPreset?.columns ?? [])
			: {}

	const initialSorting =
		shouldUsePresetAsDefault && defaultPreset?.sort && defaultPreset.sort.length > 0
			? cloneSorting(defaultPreset.sort)
			: cloneSorting(defaultSorting)

	const initialSelectedPreset =
		shouldUsePresetAsDefault && defaultPreset ? defaultPreset.id : (options?.initialActivePresetId ?? null)
	const initialActiveDatasetMetric =
		shouldUsePresetAsDefault &&
		defaultPreset?.group === 'dataset' &&
		defaultPreset.sort &&
		defaultPreset.sort.length > 0
			? defaultPreset.sort[0].id
			: null

	return {
		sorting: initialSorting,
		pagination: {
			pageIndex: 0,
			pageSize: 10
		},
		expanded: {},
		showColumnPanel: false,
		searchTerm: '',
		columnOrder: initialColumnOrder,
		columnVisibility: initialColumnVisibility,
		customColumns: initialCustomColumns,
		selectedPreset: hasInitialView ? null : initialSelectedPreset,
		activeCustomView: options?.initialActiveViewId ?? null,
		activeDatasetMetric: hasInitialView ? null : initialActiveDatasetMetric
	}
}

const reducer = (state: ProTableState, action: ProTableAction): ProTableState => {
	switch (action.type) {
		case 'setSorting':
			return { ...state, sorting: action.sorting }
		case 'setPagination':
			return { ...state, pagination: action.pagination }
		case 'setExpanded':
			return { ...state, expanded: action.expanded }
		case 'setShowColumnPanel':
			return { ...state, showColumnPanel: action.show }
		case 'setSearchTerm':
			return {
				...state,
				searchTerm: action.value,
				pagination: {
					...state.pagination,
					pageIndex: 0
				}
			}
		case 'setColumnOrder':
			return { ...state, columnOrder: action.columnOrder }
		case 'setColumnVisibility':
			return { ...state, columnVisibility: action.columnVisibility }
		case 'setCustomColumns':
			return { ...state, customColumns: action.customColumns }
		case 'setSelectedPreset':
			return { ...state, selectedPreset: action.selectedPreset }
		case 'setActiveCustomView':
			return { ...state, activeCustomView: action.activeCustomView }
		case 'setActiveDatasetMetric':
			return { ...state, activeDatasetMetric: action.activeDatasetMetric }
		case 'setColumnVisibilityAndOrder':
			return { ...state, columnVisibility: action.columnVisibility, columnOrder: action.columnOrder }
		case 'applyPreset':
			return {
				...state,
				columnVisibility: action.columnVisibility,
				columnOrder: [...action.presetColumns],
				sorting: cloneSorting(action.presetSorting),
				pagination: {
					...state.pagination,
					pageIndex: 0
				},
				showColumnPanel: false,
				selectedPreset: action.presetId,
				activeCustomView: null,
				activeDatasetMetric: action.activeDatasetMetric
			}
		case 'loadCustomView':
			return {
				...state,
				columnOrder: [...action.columnOrder],
				columnVisibility: action.columnVisibility,
				customColumns: [...action.customColumns],
				pagination: {
					...state.pagination,
					pageIndex: 0
				},
				activeCustomView: action.viewId,
				selectedPreset: null,
				activeDatasetMetric: null
			}
		case 'removeCustomColumn': {
			const nextCustomColumns = state.customColumns.filter((column) => column.id !== action.columnId)
			const nextColumnVisibility = { ...state.columnVisibility }
			delete nextColumnVisibility[action.columnId]
			const nextColumnOrder = state.columnOrder.filter((columnId) => columnId !== action.columnId)

			return {
				...state,
				customColumns: nextCustomColumns,
				columnVisibility: nextColumnVisibility,
				columnOrder: nextColumnOrder
			}
		}
		case 'addCustomColumn':
			return {
				...state,
				customColumns: [...state.customColumns, action.column],
				columnOrder: [...state.columnOrder, action.column.id],
				columnVisibility: { ...state.columnVisibility, [action.column.id]: true }
			}
		case 'updateCustomColumn':
			return {
				...state,
				customColumns: state.customColumns.map((column) =>
					column.id === action.columnId ? { ...column, ...action.updates } : column
				)
			}
		default:
			return state
	}
}

export function useProTableState(init: ProTableStateInit) {
	const [state, dispatch] = React.useReducer(reducer, init, createInitialState)

	const actions = React.useMemo(() => {
		return {
			setSorting: (sorting: ProTableState['sorting']) => dispatch({ type: 'setSorting', sorting }),
			setPagination: (pagination: ProTableState['pagination']) => dispatch({ type: 'setPagination', pagination }),
			setExpanded: (expanded: ProTableState['expanded']) => dispatch({ type: 'setExpanded', expanded }),
			setShowColumnPanel: (show: boolean) => dispatch({ type: 'setShowColumnPanel', show }),
			setSearchTerm: (value: string) => dispatch({ type: 'setSearchTerm', value }),
			setColumnOrder: (columnOrder: string[]) => dispatch({ type: 'setColumnOrder', columnOrder }),
			setColumnVisibility: (columnVisibility: Record<string, boolean>) =>
				dispatch({ type: 'setColumnVisibility', columnVisibility }),
			setCustomColumns: (customColumns: ProTableState['customColumns']) =>
				dispatch({ type: 'setCustomColumns', customColumns }),
			setSelectedPreset: (selectedPreset: string | null) => dispatch({ type: 'setSelectedPreset', selectedPreset }),
			setActiveCustomView: (activeCustomView: string | null) =>
				dispatch({ type: 'setActiveCustomView', activeCustomView }),
			setActiveDatasetMetric: (activeDatasetMetric: string | null) =>
				dispatch({ type: 'setActiveDatasetMetric', activeDatasetMetric }),
			setColumnVisibilityAndOrder: (columnVisibility: Record<string, boolean>, columnOrder: string[]) =>
				dispatch({ type: 'setColumnVisibilityAndOrder', columnVisibility, columnOrder }),
			applyPreset: (
				presetId: string,
				presetColumns: string[],
				presetSorting: ProTableState['sorting'],
				columnVisibility: Record<string, boolean>,
				activeDatasetMetric: string | null
			) =>
				dispatch({
					type: 'applyPreset',
					presetId,
					presetColumns,
					presetSorting,
					columnVisibility,
					activeDatasetMetric
				}),
			loadCustomView: (
				viewId: string,
				columnOrder: string[],
				columnVisibility: Record<string, boolean>,
				customColumns: ProTableState['customColumns']
			) =>
				dispatch({
					type: 'loadCustomView',
					viewId,
					columnOrder,
					columnVisibility,
					customColumns
				}),
			removeCustomColumn: (columnId: string) => dispatch({ type: 'removeCustomColumn', columnId }),
			addCustomColumn: (column: ProTableState['customColumns'][number]) =>
				dispatch({ type: 'addCustomColumn', column }),
			updateCustomColumn: (columnId: string, updates: Partial<ProTableState['customColumns'][number]>) =>
				dispatch({ type: 'updateCustomColumn', columnId, updates })
		}
	}, [])

	return { state, actions }
}
