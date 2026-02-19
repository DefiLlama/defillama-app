import { useCallback, useSyncExternalStore } from 'react'

export function useMedia(query: string) {
	const subscribe = useCallback(
		(callback: () => void) => {
			if (typeof window === 'undefined') return () => {}

			const mediaQueryList = window.matchMedia(query)
			mediaQueryList.addEventListener('change', callback)

			return () => mediaQueryList.removeEventListener('change', callback)
		},
		[query]
	)
	const getSnapshot = useCallback(() => {
		if (typeof window === 'undefined') return false
		return window.matchMedia(query).matches
	}, [query])

	return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
