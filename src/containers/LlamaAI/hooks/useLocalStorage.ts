import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for syncing state with localStorage.
 * Handles SSR safely by returning initialValue on server.
 *
 * @param key - The localStorage key to use
 * @param initialValue - Default value when key doesn't exist
 * @returns Tuple of [storedValue, setValue] similar to useState
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
	// Get initial value from localStorage or use fallback
	const readValue = useCallback((): T => {
		if (typeof window === 'undefined') {
			return initialValue
		}

		try {
			const item = window.localStorage.getItem(key)
			return item ? (JSON.parse(item) as T) : initialValue
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error)
			return initialValue
		}
	}, [key, initialValue])

	const [storedValue, setStoredValue] = useState<T>(readValue)

	// Update localStorage and state
	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			try {
				const valueToStore = value instanceof Function ? value(storedValue) : value
				setStoredValue(valueToStore)

				if (typeof window !== 'undefined') {
					window.localStorage.setItem(key, JSON.stringify(valueToStore))

					// Dispatch event for cross-tab synchronization
					window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }))
				}
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error)
			}
		},
		[key, storedValue]
	)

	// Listen for changes in other tabs
	useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === key && event.newValue !== null) {
				try {
					setStoredValue(JSON.parse(event.newValue) as T)
				} catch {
					// Ignore parse errors from other sources
				}
			}
		}

		window.addEventListener('storage', handleStorageChange)
		return () => window.removeEventListener('storage', handleStorageChange)
	}, [key])

	// Sync with localStorage on mount (for SSR hydration)
	useEffect(() => {
		setStoredValue(readValue())
	}, [readValue])

	return [storedValue, setValue]
}
