export function trackUmamiEvent(eventName: string, data?: Record<string, unknown>): void {
	if (typeof window === 'undefined') return
	window.umami?.track(eventName, data)
}
