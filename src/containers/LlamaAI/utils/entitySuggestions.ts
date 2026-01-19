import getCaretCoordinates from 'textarea-caret'

export const defaultTriggers = ['@', '$']

export function getTriggerOffset(element: HTMLTextAreaElement, triggers = defaultTriggers) {
	const { value, selectionStart } = element

	// Only consider triggers within the "current token" (since the last whitespace).
	// This prevents normal text like "total $ value ..." from opening suggestions because of an older "$".
	for (let i = Math.max(0, selectionStart - 1); i >= 0; i--) {
		const char = value[i]

		// If we've crossed a word boundary, there can't be an active trigger for the caret position.
		if (char && /\s/.test(char)) return -1

		if (char && triggers.includes(char)) {
			// Match the same isolation rules as `getTrigger`: trigger must be at the start or preceded by whitespace
			const prev = value[i - 1]
			const isIsolated = !prev || /\s/.test(prev)
			return isIsolated ? i : -1
		}
	}

	return -1
}

export function getTrigger(element: HTMLTextAreaElement, triggers = defaultTriggers) {
	const { value, selectionStart } = element
	const previousChar = value[selectionStart - 1]
	if (!previousChar) return null
	const secondPreviousChar = value[selectionStart - 2]
	const isIsolated = !secondPreviousChar || /\s/.test(secondPreviousChar)
	if (!isIsolated) return null
	if (triggers.includes(previousChar)) return previousChar
	return null
}

export function getSearchValue(element: HTMLTextAreaElement, triggers = defaultTriggers) {
	const offset = getTriggerOffset(element, triggers)
	if (offset === -1) return ''
	return element.value.slice(offset + 1, element.selectionStart)
}

export function getAnchorRect(element: HTMLTextAreaElement, triggers = defaultTriggers) {
	const offset = getTriggerOffset(element, triggers)
	const { left, top, height } = getCaretCoordinates(element, offset + 1)
	const { x, y } = element.getBoundingClientRect()
	return {
		x: left + x - element.scrollLeft,
		y: top + y - element.scrollTop,
		height
	}
}

export function replaceValue(offset: number, searchValue: string, displayValue: string) {
	return (prevValue: string) => {
		const nextValue = `${prevValue.slice(0, offset) + displayValue} ${prevValue.slice(offset + searchValue.length + 1)}`
		return nextValue
	}
}
