// adadpted from https://github.com/uidotdev/usehooks/blob/master/src/pages/useWindowSize.md
import { useEffect, useState } from 'react'
import { useDebounce } from './useDebounce'

interface Size {
	width: number | undefined
	height: number | undefined
}

export default function useWindowSize(): Size {
	// Initialize state with undefined width/height so server and client renders match
	// Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
	const [debouncedWindowSize, setDebouncedWindowSize] = useState<Size>({
		width: undefined,
		height: undefined
	})
	const updateDebouncedWindowSize = useDebounce((nextValue: Size) => {
		setDebouncedWindowSize(nextValue)
	}, 1000)

	useEffect(() => {
		// Handler to call on window resize
		function handleResize() {
			updateDebouncedWindowSize({
				width: window.innerWidth,
				height: window.innerHeight
			})
		}

		// Add event listener
		window.addEventListener('resize', handleResize)

		// Call handler right away so state gets updated with initial window size
		handleResize()

		// Remove event listener on cleanup
		return () => window.removeEventListener('resize', handleResize)
	}, [updateDebouncedWindowSize]) // Keep handler in sync with debounced updater

	return debouncedWindowSize
}
