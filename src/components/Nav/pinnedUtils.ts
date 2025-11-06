export const PINNED_METRICS_KEY = 'pinned-metrics'

const getStoredPinnedMetrics = () => {
	if (typeof window === 'undefined') return []

	try {
		const storedValue = window.localStorage.getItem(PINNED_METRICS_KEY)
		const parsed = storedValue ? JSON.parse(storedValue) : []
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export const mutatePinnedMetrics = (mutator: (currentRoutes: string[]) => string[]) => {
	if (typeof window === 'undefined') return

	const currentRoutes = getStoredPinnedMetrics()
	const nextRoutes = mutator([...currentRoutes])

	window.localStorage.setItem(PINNED_METRICS_KEY, JSON.stringify(nextRoutes))
	window.dispatchEvent(new Event('pinnedMetricsChange'))
}
