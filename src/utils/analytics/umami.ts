export function trackUmamiEvent(eventName: string, data?: Record<string, unknown>): void {
	if (typeof window === 'undefined') return
	const maybeUmami = Reflect.get(window, 'umami')
	if (typeof maybeUmami !== 'object' || maybeUmami === null) return
	const maybeTrack = Reflect.get(maybeUmami, 'track')
	if (typeof maybeTrack !== 'function') return
	Reflect.apply(maybeTrack, maybeUmami, [eventName, data])
}
