import type { DashboardArtifact } from '~/containers/LlamaAI/types'

export type DashboardPanelState = {
	isOpen: boolean
	mountedConfig: DashboardArtifact | null
	versions: DashboardArtifact[]
	versionIndex: number
}

export type DashboardPanelAction =
	| { type: 'APPEND'; value: DashboardArtifact }
	| { type: 'RESTORE'; value: DashboardArtifact[] }
	| { type: 'RESET' }
	| { type: 'TOGGLE' }
	| { type: 'SELECT_VERSION'; value: number }
	| { type: 'CLOSE' }
	| { type: 'UNMOUNT' }

export const INITIAL_DASHBOARD_PANEL_STATE: DashboardPanelState = {
	isOpen: false,
	mountedConfig: null,
	versions: [],
	versionIndex: 0
}

export function dashboardPanelReducer(state: DashboardPanelState, action: DashboardPanelAction): DashboardPanelState {
	switch (action.type) {
		case 'APPEND': {
			const versions = [...state.versions, action.value]
			return {
				isOpen: true,
				mountedConfig: action.value,
				versions,
				versionIndex: versions.length - 1
			}
		}
		case 'RESTORE':
			return {
				isOpen: false,
				mountedConfig: null,
				versions: action.value,
				versionIndex: action.value.length > 0 ? action.value.length - 1 : 0
			}
		case 'RESET':
			return INITIAL_DASHBOARD_PANEL_STATE
		case 'TOGGLE':
			return {
				...state,
				isOpen: !state.isOpen,
				mountedConfig: state.isOpen ? state.mountedConfig : (state.versions[state.versionIndex] ?? null)
			}
		case 'SELECT_VERSION':
			if (action.value < 0 || action.value >= state.versions.length) return state
			return {
				...state,
				mountedConfig: state.isOpen ? (state.versions[action.value] ?? null) : state.mountedConfig,
				versionIndex: action.value
			}
		case 'CLOSE':
			return { ...state, isOpen: false }
		case 'UNMOUNT':
			if (state.isOpen) return state
			return { ...state, mountedConfig: null }
		default:
			return state
	}
}
