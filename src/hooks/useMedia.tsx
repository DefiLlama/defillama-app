import { useCallback, useSyncExternalStore } from 'react'

export function useMedia(query: string) {
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
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
		[query]
	)

	const getSnapshot = useCallback(() => {
		if (typeof window === 'undefined') return false

		return window.matchMedia(query).matches
	}, [query])

	return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
