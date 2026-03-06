export {}

declare global {
	interface Window {
		umami?: {
			track: {
				(): void
				(eventName: string, data?: Record<string, unknown>): void
				(mutator: (payload: Record<string, unknown>) => Record<string, unknown>): void
			}
			identify: {
				(uniqueId: string): void
				(sessionData: Record<string, unknown>): void
				(uniqueId: string, sessionData: Record<string, unknown>): void
			}
		}
	}
}
