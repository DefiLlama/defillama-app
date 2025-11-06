declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, unknown>) => void
			identify?: (id: string | Record<string, unknown>, data?: Record<string, unknown>) => void
		}
	}
}

export {}
