// adadpted from https://github.com/ariakit/ariakit
import { useEffect, useState } from 'react'

export function useMedia(query: string) {
	const [matches, setMatches] = useState(false)

	useEffect(() => {
		const result = matchMedia(query)
		// Handler is defined inline - no need for useCallback since it's stable within this effect
		const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches)

		result.addEventListener('change', handleChange)
		setMatches(() => result.matches)

		return () => result.removeEventListener('change', handleChange)
	}, [query])

	return matches
}
