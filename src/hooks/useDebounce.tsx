import { useEffect, useMemo, useRef, useState } from 'react'

export type DebouncedFunction<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
	cancel: () => void
	flush: () => void
}

const createDebounced = <T extends (...args: any[]) => void>(fn: T, delay: number): DebouncedFunction<T> => {
	const wait = Number.isFinite(delay) && delay > 0 ? delay : 0
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	let lastArgs: Parameters<T> | null = null

	const debounced = ((...args: Parameters<T>) => {
		lastArgs = args
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => {
			timeoutId = null
			if (lastArgs) {
				fn(...lastArgs)
				lastArgs = null
			}
		}, wait)
	}) as DebouncedFunction<T>

	debounced.cancel = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}
		timeoutId = null
		lastArgs = null
	}

	debounced.flush = () => {
		if (timeoutId === null) return
		clearTimeout(timeoutId)
		timeoutId = null
		if (lastArgs) {
			fn(...lastArgs)
			lastArgs = null
		}
	}

	return debounced
}

export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): DebouncedFunction<T>
export function useDebounce<T>(value: T, delay: number): T
export function useDebounce<T>(valueOrCallback: T, delay: number) {
	const isCallback = typeof valueOrCallback === 'function'
	const [debouncedValue, setDebouncedValue] = useState(valueOrCallback)
	const handlerRef = useRef<(...args: any[]) => void>(() => {})
	handlerRef.current = isCallback
		? (valueOrCallback as (...args: any[]) => void)
		: (nextValue: T) => {
				setDebouncedValue(nextValue)
			}

	const debounced = useMemo(() => createDebounced((...args: any[]) => handlerRef.current(...args), delay), [delay])

	useEffect(() => {
		return () => {
			debounced.cancel()
		}
	}, [debounced])

	useEffect(() => {
		if (!isCallback) {
			debounced(valueOrCallback)
		}
	}, [valueOrCallback, isCallback, debounced])

	return (isCallback ? debounced : debouncedValue) as typeof valueOrCallback
}
