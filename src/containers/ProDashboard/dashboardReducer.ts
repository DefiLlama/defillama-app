import { SetStateAction } from 'react'
import { Dashboard } from './services/DashboardAPI'
import { DashboardItemConfig } from './types'

export type TimePeriod = '30d' | '90d' | '365d' | 'ytd' | '3y' | 'all' | 'custom'

export interface CustomTimePeriod {
	type: 'relative' | 'absolute'
	relativeDays?: number
	startDate?: number
	endDate?: number
}

export interface DashboardState {
	items: DashboardItemConfig[]
	timePeriod: TimePeriod
	customTimePeriod: CustomTimePeriod | null
	dashboardName: string
	dashboardId: string | null
	currentDashboard: Dashboard | null
	dashboardVisibility: 'private' | 'public'
	dashboardTags: string[]
	dashboardDescription: string
	showGenerateDashboardModal: boolean
	showIterateDashboardModal: boolean
}

export type DashboardAction =
	| { type: 'SET_ITEMS'; payload: DashboardItemConfig[] }
	| { type: 'SET_TIME_PERIOD'; payload: TimePeriod }
	| { type: 'SET_CUSTOM_TIME_PERIOD'; payload: CustomTimePeriod | null }
	| { type: 'SET_DASHBOARD_NAME'; payload: string }
	| { type: 'SET_DASHBOARD_ID'; payload: string | null }
	| { type: 'SET_CURRENT_DASHBOARD'; payload: SetStateAction<Dashboard | null> }
	| { type: 'SET_DASHBOARD_VISIBILITY'; payload: 'private' | 'public' }
	| { type: 'SET_DASHBOARD_TAGS'; payload: string[] }
	| { type: 'SET_DASHBOARD_DESCRIPTION'; payload: string }
	| { type: 'SET_SHOW_GENERATE_DASHBOARD_MODAL'; payload: boolean }
	| { type: 'SET_SHOW_ITERATE_DASHBOARD_MODAL'; payload: boolean }
	| { type: 'APPLY_DASHBOARD'; payload: Dashboard }

export const INITIAL_DASHBOARD_STATE: DashboardState = {
	items: [],
	timePeriod: '365d',
	customTimePeriod: null,
	dashboardName: 'My Dashboard',
	dashboardId: null,
	currentDashboard: null,
	dashboardVisibility: 'private',
	dashboardTags: [],
	dashboardDescription: '',
	showGenerateDashboardModal: false,
	showIterateDashboardModal: false
}

export function initDashboardState(initialDashboardId?: string): DashboardState {
	return {
		...INITIAL_DASHBOARD_STATE,
		dashboardId: initialDashboardId || null
	}
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
	switch (action.type) {
		case 'SET_ITEMS':
			return {
				...state,
				items: action.payload
			}

		case 'SET_TIME_PERIOD':
			return {
				...state,
				timePeriod: action.payload,
				customTimePeriod: action.payload !== 'custom' ? null : state.customTimePeriod
			}

		case 'SET_CUSTOM_TIME_PERIOD':
			return {
				...state,
				customTimePeriod: action.payload,
				timePeriod: action.payload ? 'custom' : state.timePeriod
			}

		case 'SET_DASHBOARD_NAME':
			return { ...state, dashboardName: action.payload }

		case 'SET_DASHBOARD_ID':
			return { ...state, dashboardId: action.payload }

		case 'SET_CURRENT_DASHBOARD':
			return {
				...state,
				currentDashboard:
					typeof action.payload === 'function' ? action.payload(state.currentDashboard) : action.payload
			}

		case 'SET_DASHBOARD_VISIBILITY':
			return { ...state, dashboardVisibility: action.payload }

		case 'SET_DASHBOARD_TAGS':
			return { ...state, dashboardTags: action.payload }

		case 'SET_DASHBOARD_DESCRIPTION':
			return { ...state, dashboardDescription: action.payload }

		case 'SET_SHOW_GENERATE_DASHBOARD_MODAL':
			return { ...state, showGenerateDashboardModal: action.payload }

		case 'SET_SHOW_ITERATE_DASHBOARD_MODAL':
			return { ...state, showIterateDashboardModal: action.payload }

		case 'APPLY_DASHBOARD': {
			const dashboard = action.payload
			if (!dashboard?.data?.items || !Array.isArray(dashboard.data.items)) {
				return state
			}
			return {
				...state,
				dashboardId: dashboard.id,
				dashboardName: dashboard.data.dashboardName || 'My Dashboard',
				items: dashboard.data.items,
				timePeriod: dashboard.data.timePeriod || '365d',
				customTimePeriod: dashboard.data.customTimePeriod || null,
				currentDashboard: dashboard,
				dashboardVisibility: dashboard.visibility || 'private',
				dashboardTags: dashboard.tags || [],
				dashboardDescription: dashboard.description || ''
			}
		}

		default:
			return state
	}
}
