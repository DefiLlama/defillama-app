import { useEffect, useState } from 'react'

/**
 * Detects whether the user's primary input mechanism is a coarse pointer (touch).
 * Useful for adapting UI elements based on touch vs mouse interaction capabilities.
 *
 * @returns {boolean} Boolean indicating if the primary pointer is coarse (touch device)
 */
export function useIsCoarsePointer() {
	const [isCoarsePointer, setIsCoarsePointer] = useState(false)

	useEffect(() => {
		const mq = window.matchMedia('(pointer: coarse)')
		setIsCoarsePointer(mq.matches)

		const handleChange = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches)
		mq.addEventListener('change', handleChange)
		return () => mq.removeEventListener('change', handleChange)
	}, [])

	return isCoarsePointer
}
