import { useEffect } from 'react'

// adapted from https://usehooks.com/useKeyPress/
export default function useKeyPress(targetKey: string, handler: () => void) {
	// Add event listeners
	useEffect(() => {
		// If pressed key is our target key then set to true
		function downHandler({ key }): void {
			if (key === targetKey) {
				handler()
			}
		}

		window.addEventListener('keydown', downHandler)

		// Remove event listeners on cleanup
		return () => {
			window.removeEventListener('keydown', downHandler)
		}
	}, [targetKey, handler]) // Empty array ensures that effect is only run on mount and unmount
}
