import { PopoverStateRenderCallbackProps } from 'ariakit'
import { useCallback } from 'react'
import { useMedia } from '~/hooks/useMedia'

export function assignStyle(element: HTMLElement | null | undefined, style: Partial<CSSStyleDeclaration>) {
	if (!element) return () => {}

	const previousStyle = element.style.cssText

	Object.assign(element.style, style)

	const restorePreviousStyle = () => {
		element.style.cssText = previousStyle
	}
	return restorePreviousStyle
}

export function applyMobileStyles(popover: HTMLElement, arrow?: HTMLElement | null) {
	const restorePopoverStyle = assignStyle(popover, {
		position: 'fixed',
		bottom: '0',
		width: '100%',
		top: 'unset'
	})
	const restoreArrowStyle = assignStyle(arrow, { display: 'none' })
	const restoreDesktopStyles = () => {
		restorePopoverStyle()
		restoreArrowStyle()
	}
	return restoreDesktopStyles
}

export function useSetPopoverStyles(): [boolean, (props: PopoverStateRenderCallbackProps) => () => void] {
	const isLarge = useMedia('(min-width: 640px)', true)

	const renderCallback = useCallback(
		(props: PopoverStateRenderCallbackProps) => {
			const { popover, defaultRenderCallback } = props
			if (isLarge) return defaultRenderCallback()
			return applyMobileStyles(popover)
		},
		[isLarge]
	)

	return [isLarge, renderCallback]
}
