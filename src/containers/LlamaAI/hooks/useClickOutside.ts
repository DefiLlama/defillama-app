import { useEffect, type RefObject } from 'react'

/**
 * Hook that detects clicks outside of the referenced element.
 * Useful for closing dropdowns, modals, and popovers when clicking outside.
 *
 * @param ref - Reference to the element to detect outside clicks for
 * @param handler - Callback function to call when clicking outside
 * @param enabled - Whether the hook is active (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
	ref: RefObject<T>,
	handler: (event: MouseEvent | TouchEvent) => void,
	enabled: boolean = true
) {
	useEffect(() => {
		if (!enabled) return

		const handleClickOutside = (event: MouseEvent | TouchEvent) => {
			const target = event.target as Node
			if (ref.current && !ref.current.contains(target)) {
				handler(event)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('touchstart', handleClickOutside, { passive: true })

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('touchstart', handleClickOutside)
		}
	}, [ref, handler, enabled])
}
