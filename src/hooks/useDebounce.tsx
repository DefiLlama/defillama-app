import { useEffect, useEffectEvent, useMemo, useState } from 'react'

type DebouncedFunction<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
	cancel: () => void
	flush: () => void
}

const normalizeDelay = (delay: number) => (Number.isFinite(delay) && delay > 0 ? delay : 0)

export function useDebouncedCallback<T extends (...args: any[]) => void>(
	callback: T,
	delay: number
): DebouncedFunction<T> {
	const [pendingArgs, setPendingArgs] = useState<Parameters<T> | null>(null)
	const normalizedDelay = normalizeDelay(delay)

	const onInvoke = useEffectEvent((args: Parameters<T>) => {
		callback(...args)
	})

	const debounced = useMemo(() => {
		const fn = ((...args: Parameters<T>) => {
			setPendingArgs(args)
		}) as DebouncedFunction<T>

		fn.cancel = () => {
			setPendingArgs(null)
		}

		fn.flush = () => {
			setPendingArgs((current) => {
				if (current) {
					onInvoke(current)
				}
				return null
			})
		}

		return fn
	}, [])

	useEffect(() => {
		return () => {
			debounced.cancel()
		}
	}, [debounced])

	useEffect(() => {
		if (pendingArgs === null) return
		const timeoutId = setTimeout(() => {
			onInvoke(pendingArgs)
			setPendingArgs(null)
		}, normalizedDelay)

		return () => {
			clearTimeout(timeoutId)
		}
	}, [normalizedDelay, pendingArgs])

	useEffect(() => {
		setPendingArgs(null)
	}, [normalizedDelay])

	return debounced
}

export function useDebouncedValue<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(() => value)
	const normalizedDelay = normalizeDelay(delay)

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedValue(value)
		}, normalizedDelay)

		return () => {
			clearTimeout(timeoutId)
		}
	}, [value, normalizedDelay])

	return debouncedValue
}

export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): DebouncedFunction<T>
export function useDebounce<T>(value: T, delay: number): T
export function useDebounce<T>(valueOrCallback: T, delay: number) {
	const isCallback = typeof valueOrCallback === 'function'
	const debounced = useDebouncedCallback(valueOrCallback as unknown as (...args: any[]) => void, delay)
	const debouncedValue = useDebouncedValue(valueOrCallback, delay)

	return (isCallback ? debounced : debouncedValue) as typeof valueOrCallback
}
