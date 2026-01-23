import { getSearchValue, getTrigger, getTriggerOffset } from '../utils/entitySuggestions'

export interface TriggerState {
	isActive: boolean
	isTriggerOnly: boolean
	trigger: '@' | '$' | null
	searchValue: string
	searchValueWithTrigger: string
	triggerOffset: number
}

/**
 * Detects @/$ entity triggers in a textarea based on current cursor position.
 * Pure function that returns the current trigger state without side effects.
 */
export function detectTrigger(textarea: HTMLTextAreaElement): TriggerState {
	const trigger = getTrigger(textarea)
	const searchValue = getSearchValue(textarea)
	const triggerOffset = getTriggerOffset(textarea)
	const actualTrigger = triggerOffset !== -1 ? (textarea.value[triggerOffset] as '@' | '$') : null

	const searchValueWithTrigger =
		actualTrigger === '$' ? `$${searchValue}` : actualTrigger === '@' ? `@${searchValue}` : searchValue

	// Has trigger and search value
	if (triggerOffset !== -1 && searchValue.length > 0) {
		return {
			isActive: true,
			isTriggerOnly: false,
			trigger: actualTrigger,
			searchValue,
			searchValueWithTrigger,
			triggerOffset
		}
	}

	// Just the trigger character, no search value yet
	if (trigger && searchValue.length === 0) {
		return {
			isActive: true,
			isTriggerOnly: true,
			trigger: actualTrigger,
			searchValue: '',
			searchValueWithTrigger: actualTrigger === '$' ? '$' : '@',
			triggerOffset
		}
	}

	// No active trigger
	return {
		isActive: false,
		isTriggerOnly: false,
		trigger: null,
		searchValue: '',
		searchValueWithTrigger: '',
		triggerOffset: -1
	}
}

/**
 * Calculate optimal placement for the combobox popover based on available space.
 * Returns 'top-start' if there's more space above, 'bottom-start' otherwise.
 */
export function calculateComboboxPlacement(
	textarea: HTMLTextAreaElement,
	getAnchorRect: (textarea: HTMLTextAreaElement) => { y: number; height: number }
): 'top-start' | 'bottom-start' {
	if (typeof window === 'undefined') return 'bottom-start'

	const anchor = getAnchorRect(textarea)
	const spaceBelow = window.innerHeight - (anchor.y + anchor.height)
	const spaceAbove = anchor.y

	return spaceBelow < 220 && spaceAbove > spaceBelow ? 'top-start' : 'bottom-start'
}
