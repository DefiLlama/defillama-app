// adadpted from https://github.com/ariakit/ariakit
import { useCallback, useEffect, useState } from 'react'

export function useMedia(query: string) {
	const [matches, setMatches] = useState(false)

	const handleChange = useCallback((event: MediaQueryListEvent) => setMatches(event.matches), [])

	useEffect(() => {
		const result = matchMedia(query)
		result.addEventListener('change', handleChange)

		setMatches(result.matches)

		return () => result.removeEventListener('change', handleChange)
	}, [query, handleChange])

	return matches
}
