export type ComparisonType = 'chains' | 'protocols'
export type WizardStep = 'select-type' | 'select-items' | 'select-metrics' | 'preview'

export type GroupingInterval = 'day' | 'week' | 'month' | 'quarter'
export type DisplayMode = 'default' | 'stacked' | 'cumulative' | 'percentage'

export interface ComparisonWizardState {
	step: WizardStep
	comparisonType: ComparisonType | null
	selectedItems: string[]
	selectedMetrics: string[]
	dashboardName: string
	visibility: 'private' | 'public'
	tags: string[]
	description: string
	grouping: GroupingInterval
	displayMode: DisplayMode
}

export interface MetricWithAvailability {
	metric: string
	title: string
	chartType: string
	color: string
	availableCount: number
	totalCount: number
	isValid: boolean
}

export type WizardAction =
	| { type: 'SET_STEP'; step: WizardStep }
	| { type: 'SET_COMPARISON_TYPE'; comparisonType: ComparisonType }
	| { type: 'SET_SELECTED_ITEMS'; items: string[] }
	| { type: 'TOGGLE_METRIC'; metric: string }
	| { type: 'CLEAR_METRICS' }
	| { type: 'SELECT_ALL_METRICS'; metrics: string[] }
	| { type: 'SET_DASHBOARD_NAME'; name: string }
	| { type: 'SET_VISIBILITY'; visibility: 'private' | 'public' }
	| { type: 'SET_TAGS'; tags: string[] }
	| { type: 'SET_DESCRIPTION'; description: string }
	| { type: 'SET_GROUPING'; grouping: GroupingInterval }
	| { type: 'SET_DISPLAY_MODE'; displayMode: DisplayMode }
	| { type: 'RESET' }

export const WIZARD_STEPS: WizardStep[] = ['select-type', 'select-items', 'select-metrics', 'preview']

export const getStepIndex = (step: WizardStep): number => WIZARD_STEPS.indexOf(step)

export const getNextStep = (step: WizardStep): WizardStep | null => {
	const index = getStepIndex(step)
	return index < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[index + 1] : null
}

export const getPrevStep = (step: WizardStep): WizardStep | null => {
	const index = getStepIndex(step)
	return index > 0 ? WIZARD_STEPS[index - 1] : null
}
