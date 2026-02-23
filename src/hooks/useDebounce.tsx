import { useEffect, useEffectEvent, useState } from 'react'

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

	const flush = useEffectEvent(() => {
		if (pendingArgs != null) {
			onInvoke(pendingArgs)
			setPendingArgs(null)
		}
	})

	const debounced: DebouncedFunction<T> = Object.assign(
		((...args: Parameters<T>) => {
			setPendingArgs(args)
		}) as DebouncedFunction<T>,
		{
			cancel: () => {
				setPendingArgs(null)
			},
			flush
		}
	)

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
