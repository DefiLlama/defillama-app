import { type RefObject, useLayoutEffect, useState } from 'react'

export interface UseScrollerHeightFromFirstItemOptions {
	/** Element whose descendants include the measured items (e.g. grid root). */
	containerRef: RefObject<HTMLElement | null>
	/** `querySelector` pattern for a representative item (e.g. `[data-collections-item]`). */
	itemSelector: string
	/** When this identity changes, measurement runs again (e.g. serialized item ids). */
	remeasureKey: unknown
	/** When false, skips measurement and returns `null`. */
	enabled?: boolean
}

/**
 * Returns the measured `offsetHeight` (px) of the first matching item under `containerRef`.
 * Use it with a CSS custom property and breakpoint-specific `calc(...)` in Tailwind (e.g. `md:h-[calc(...)]`).
 */
export function useScrollerHeightFromFirstItem({
	containerRef,
	itemSelector,
	remeasureKey,
	enabled = true
}: UseScrollerHeightFromFirstItemOptions): number | null {
	const [itemHeightPx, setItemHeightPx] = useState<number | null>(null)

	useLayoutEffect(() => {
		if (!enabled) {
			setItemHeightPx(null)
			return
		}

		const measure = () => {
			const root = containerRef.current
			if (!root) return
			const first = root.querySelector(itemSelector) as HTMLElement | null
			if (!first) return
			const h = first.offsetHeight
			if (!h || !Number.isFinite(h)) return
			setItemHeightPx(Math.round(h))
		}

		measure()

		const root = containerRef.current
		if (!root) return

		let ro: ResizeObserver | undefined
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(() => {
				measure()
			})
			ro.observe(root)
		}

		window.addEventListener('resize', measure)
		return () => {
			ro?.disconnect()
			window.removeEventListener('resize', measure)
		}
	}, [containerRef, enabled, itemSelector, remeasureKey])

	if (!enabled) return null

	return itemHeightPx
}
