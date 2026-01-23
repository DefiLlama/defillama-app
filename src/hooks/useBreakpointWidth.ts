import { useMedia } from './useMedia'

/**
 * Returns a width value that only changes when crossing breakpoint boundaries.
 *
 * Unlike useWindowSize which re-renders on every (debounced) pixel change,
 * this hook only triggers re-renders when the viewport crosses a breakpoint threshold.
 *
 * Returns the minimum width of the current breakpoint range:
 * - 1536 for 2xl (>= 1536px)
 * - 1280 for xl (>= 1280px)
 * - 1024 for lg (>= 1024px)
 * - 768 for md (>= 768px)
 * - 640 for sm (>= 640px)
 * - 480 for xs+ (>= 480px)
 * - 0 for xs (< 480px)
 *
 * @example
 * ```tsx
 * // Before (re-renders on every debounced resize)
 * const windowSize = useWindowSize()
 * const order = windowSize.width > 1024 ? desktopOrder : mobileOrder
 *
 * // After (re-renders only when crossing 1024px boundary)
 * const width = useBreakpointWidth()
 * const order = width > 1024 ? desktopOrder : mobileOrder
 * ```
 */
export function useBreakpointWidth(): number {
	const is2xl = useMedia('(min-width: 1536px)')
	const isXl = useMedia('(min-width: 1280px)')
	const isLg = useMedia('(min-width: 1024px)')
	const isMd = useMedia('(min-width: 768px)')
	const isSm = useMedia('(min-width: 640px)')
	const isXsPlus = useMedia('(min-width: 480px)')

	if (is2xl) return 1536
	if (isXl) return 1280
	if (isLg) return 1024
	if (isMd) return 768
	if (isSm) return 640
	if (isXsPlus) return 480
	return 0
}
