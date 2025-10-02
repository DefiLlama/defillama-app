// Throttle utility function
export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
	let timeoutId: number | null = null
	let lastRan: number = 0

	return ((...args: Parameters<T>) => {
		const now = Date.now()

		if (!lastRan) {
			func(...args)
			lastRan = now
		} else {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
			timeoutId = window.setTimeout(
				() => {
					if (now - lastRan >= delay) {
						func(...args)
						lastRan = now
					}
				},
				delay - (now - lastRan)
			)
		}
	}) as T
}

// Debounce utility function
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
	let timeoutId: number | null = null

	return ((...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = window.setTimeout(() => {
			func(...args)
		}, delay)
	}) as T
}
