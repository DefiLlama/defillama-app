import { useEffect, useLayoutEffect, type DependencyList } from 'react'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Schedules a layout-touching effect inside requestAnimationFrame so that reads of
// offsetWidth / getBoundingClientRect / computed style happen after the browser has
// completed its layout pass for the same render, instead of forcing a synchronous one.
// Frequent triggers (mousemove, scroll) collapse to RAF cadence.
export function useDeferredLayoutEffect(effect: () => void, deps: DependencyList): void {
	useIsomorphicLayoutEffect(() => {
		const raf = requestAnimationFrame(effect)
		return () => cancelAnimationFrame(raf)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
