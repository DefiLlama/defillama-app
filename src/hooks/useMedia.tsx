import { useEffect, useState } from 'react'

export function useMedia(query: string) {
	const [matches, setMatches] = useState(() => {
		if (typeof window === 'undefined') return false
		return window.matchMedia(query).matches
	})

	useEffect(() => {
		if (typeof window === 'undefined') return

		const mediaQueryList = window.matchMedia(query)
		const updateMatches = () => setMatches(mediaQueryList.matches)

		updateMatches()

		if ('addEventListener' in mediaQueryList) {
			mediaQueryList.addEventListener('change', updateMatches)
			window.addEventListener('resize', updateMatches)

			return () => {
				mediaQueryList.removeEventListener('change', updateMatches)
				window.removeEventListener('resize', updateMatches)
			}
		}

		window.addEventListener('resize', updateMatches)

		return () => {
			window.removeEventListener('resize', updateMatches)
		}
	}, [query])

	return matches
}
