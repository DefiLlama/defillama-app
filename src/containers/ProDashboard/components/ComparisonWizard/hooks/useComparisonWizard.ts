import { useCallback, useMemo, useReducer } from 'react'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import type {
	ComparisonType,
	ComparisonWizardState,
	DisplayMode,
	GroupingInterval,
	WizardAction,
	WizardStep
} from '../types'
import { getNextStep, getPrevStep } from '../types'

const initialState: ComparisonWizardState = {
	step: 'select-type',
	comparisonType: null,
	selectedItems: [],
	selectedMetrics: [],
	dashboardName: '',
	visibility: 'public',
	tags: [],
	description: '',
	grouping: 'day',
	displayMode: 'default'
}

function reducer(state: ComparisonWizardState, action: WizardAction): ComparisonWizardState {
	switch (action.type) {
		case 'SET_STEP':
			return { ...state, step: action.step }
		case 'SET_COMPARISON_TYPE':
			return {
				...state,
				comparisonType: action.comparisonType,
				selectedItems: [],
				selectedMetrics: []
			}
		case 'SET_SELECTED_ITEMS':
			return {
				...state,
				selectedItems: action.items,
				selectedMetrics: []
			}
		case 'TOGGLE_METRIC': {
			const metrics = state.selectedMetrics.includes(action.metric)
				? state.selectedMetrics.filter((m) => m !== action.metric)
				: [...state.selectedMetrics, action.metric]
			return { ...state, selectedMetrics: metrics }
		}
		case 'CLEAR_METRICS':
			return { ...state, selectedMetrics: [] }
		case 'SELECT_ALL_METRICS':
			return { ...state, selectedMetrics: action.metrics }
		case 'SET_DASHBOARD_NAME':
			return { ...state, dashboardName: action.name }
		case 'SET_VISIBILITY':
			return { ...state, visibility: action.visibility }
		case 'SET_TAGS':
			return { ...state, tags: action.tags }
		case 'SET_DESCRIPTION':
			return { ...state, description: action.description }
		case 'SET_GROUPING':
			return { ...state, grouping: action.grouping }
		case 'SET_DISPLAY_MODE':
			return { ...state, displayMode: action.displayMode }
		case 'RESET':
			return initialState
		default:
			return state
	}
}

export function useComparisonWizard() {
	const [state, dispatch] = useReducer(reducer, initialState)
	const { getProtocolInfo } = useProDashboard()

	const setStep = useCallback((step: WizardStep) => dispatch({ type: 'SET_STEP', step }), [])

	const setComparisonType = useCallback(
		(comparisonType: ComparisonType) => dispatch({ type: 'SET_COMPARISON_TYPE', comparisonType }),
		[]
	)

	const setSelectedItems = useCallback((items: string[]) => dispatch({ type: 'SET_SELECTED_ITEMS', items }), [])

	const toggleMetric = useCallback((metric: string) => dispatch({ type: 'TOGGLE_METRIC', metric }), [])

	const clearMetrics = useCallback(() => dispatch({ type: 'CLEAR_METRICS' }), [])

	const selectAllMetrics = useCallback((metrics: string[]) => dispatch({ type: 'SELECT_ALL_METRICS', metrics }), [])

	const setDashboardName = useCallback((name: string) => dispatch({ type: 'SET_DASHBOARD_NAME', name }), [])

	const setVisibility = useCallback(
		(visibility: 'private' | 'public') => dispatch({ type: 'SET_VISIBILITY', visibility }),
		[]
	)

	const setTags = useCallback((tags: string[]) => dispatch({ type: 'SET_TAGS', tags }), [])

	const setDescription = useCallback((description: string) => dispatch({ type: 'SET_DESCRIPTION', description }), [])

	const setGrouping = useCallback((grouping: GroupingInterval) => dispatch({ type: 'SET_GROUPING', grouping }), [])

	const setDisplayMode = useCallback(
		(displayMode: DisplayMode) => dispatch({ type: 'SET_DISPLAY_MODE', displayMode }),
		[]
	)

	const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

	const goToNextStep = useCallback(() => {
		const next = getNextStep(state.step)
		if (next) {
			if (next === 'preview') {
				const displayNames = state.selectedItems.map((item) => {
					if (state.comparisonType === 'chains') return item
					return getProtocolInfo(item)?.name || item
				})
				if (!state.dashboardName) {
					const defaultName = displayNames.length === 1 ? displayNames[0] : `Comparison of ${displayNames.join(', ')}`
					setDashboardName(defaultName)
				}
				if (state.tags.length === 0) {
					setTags(displayNames)
				}
			}
			setStep(next)
		}
	}, [
		state.step,
		state.dashboardName,
		state.selectedItems,
		state.comparisonType,
		state.tags.length,
		getProtocolInfo,
		setStep,
		setDashboardName,
		setTags
	])

	const goToPrevStep = useCallback(() => {
		const prev = getPrevStep(state.step)
		if (prev) setStep(prev)
	}, [state.step, setStep])

	const canProceed = useMemo(() => {
		switch (state.step) {
			case 'select-type':
				return state.comparisonType !== null
			case 'select-items':
				return state.selectedItems.length >= 1
			case 'select-metrics':
				return state.selectedMetrics.length >= 1
			case 'preview':
				return state.dashboardName.trim().length > 0
			default:
				return false
		}
	}, [state])

	const canGoBack = useMemo(() => getPrevStep(state.step) !== null, [state.step])

	return {
		state,
		actions: {
			setStep,
			setComparisonType,
			setSelectedItems,
			toggleMetric,
			clearMetrics,
			selectAllMetrics,
			setDashboardName,
			setVisibility,
			setTags,
			setDescription,
			setGrouping,
			setDisplayMode,
			reset,
			goToNextStep,
			goToPrevStep
		},
		derived: {
			canProceed,
			canGoBack
		}
	}
}

export type UseComparisonWizardReturn = ReturnType<typeof useComparisonWizard>
