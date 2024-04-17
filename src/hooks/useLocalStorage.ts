import { useEffect, useState } from 'react'

export const useLocalStorage = (key, initialValue): [string, (val: string) => void] => {
	const [value, setValue] = useState(initialValue)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const storedValue = localStorage.getItem(key)

			if (storedValue) {
				try {
					const parsedValue = JSON.parse(storedValue)
					setValue(parsedValue)
				} catch (error) {
					console.error('Error parsing JSON from local storage:', error)
					localStorage.setItem(key, JSON.stringify(initialValue))
				}
			} else {
				localStorage.setItem(key, JSON.stringify(initialValue))
			}
		}
	}, [key, initialValue])

	const updateValue = (newValue) => {
		if (typeof window !== 'undefined') {
			setValue(newValue)
			localStorage.setItem(key, JSON.stringify(newValue))
		}
	}

	return [value, updateValue]
}
