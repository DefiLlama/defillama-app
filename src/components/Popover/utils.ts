export function assignStyle(element: HTMLElement | null | undefined, style: Partial<CSSStyleDeclaration>) {
	if (!element) return () => {}

	const previousStyle = element.style.cssText

	Object.assign(element.style, style)

	const restorePreviousStyle = () => {
		element.style.cssText = previousStyle
	}
	return restorePreviousStyle
}

export function applyMobileStyles(popover: HTMLElement) {
	const restorePopoverStyle = assignStyle(popover, {
		position: 'fixed',
		bottom: '0',
		left: '0',
		right: '0',
		width: '100%'
	})

	const restoreDesktopStyles = () => {
		restorePopoverStyle()
	}
	return restoreDesktopStyles
}
