import { useCallback, useSyncExternalStore } from 'react'

export function useMedia(query: string, enabled = true) {
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!enabled) return () => {}
			if (typeof window === 'undefined') return () => {}

			const mediaQueryList = window.matchMedia(query)
			const legacyMediaQueryList = mediaQueryList as MediaQueryList & {
				addListener?: (listener: (event: MediaQueryListEvent) => void) => void
				removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
			}

			if ('addEventListener' in mediaQueryList) {
				mediaQueryList.addEventListener('change', onStoreChange)

				return () => {
					mediaQueryList.removeEventListener('change', onStoreChange)
				}
			}

			legacyMediaQueryList.addListener?.(onStoreChange)

			return () => {
				legacyMediaQueryList.removeListener?.(onStoreChange)
			}
		},
		[query, enabled]
	)

	const getSnapshot = useCallback(() => {
		if (!enabled) return false
		if (typeof window === 'undefined') return false

		return window.matchMedia(query).matches
	}, [query, enabled])

	return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
