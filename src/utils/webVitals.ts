import type { NextWebVitalsMetric } from 'next/app'

type WebVitalRating = 'good' | 'needs-improvement' | 'poor' | 'unknown'

const VITAL_EVENT_NAME = 'web-vital'
const MAX_RETRY_ATTEMPTS = 5
const RETRY_DELAY = 500

const isBrowser = typeof window !== 'undefined'

const getRoundedValue = (metric: NextWebVitalsMetric) => {
	return metric.name === 'CLS' ? Number(metric.value.toFixed(3)) : Math.round(metric.value)
}

const getRating = (metric: NextWebVitalsMetric): WebVitalRating => {
	const value = metric.value

	switch (metric.name) {
		case 'CLS':
			if (value <= 0.1) return 'good'
			if (value <= 0.25) return 'needs-improvement'
			return 'poor'
		case 'LCP':
			if (value <= 2500) return 'good'
			if (value <= 4000) return 'needs-improvement'
			return 'poor'
		case 'FCP':
			if (value <= 1800) return 'good'
			if (value <= 3000) return 'needs-improvement'
			return 'poor'
		case 'FID':
			if (value <= 100) return 'good'
			if (value <= 300) return 'needs-improvement'
			return 'poor'
		case 'INP':
			if (value <= 200) return 'good'
			if (value <= 500) return 'needs-improvement'
			return 'poor'
		case 'TTFB':
			if (value <= 800) return 'good'
			if (value <= 1800) return 'needs-improvement'
			return 'poor'
		default:
			return 'unknown'
	}
}

const getBucket = (metric: NextWebVitalsMetric) => {
	const value = metric.value

	switch (metric.name) {
		case 'CLS':
			if (value <= 0.1) return '<=0.10'
			if (value <= 0.25) return '0.11-0.25'
			return '>0.25'
		case 'INP':
		case 'FID':
			if (value <= 200) return '<=200ms'
			if (value <= 500) return '201-500ms'
			return '>500ms'
		case 'LCP':
			if (value <= 2500) return '<=2500ms'
			if (value <= 4000) return '2501-4000ms'
			return '>4000ms'
		case 'FCP':
			if (value <= 1800) return '<=1800ms'
			if (value <= 3000) return '1801-3000ms'
			return '>3000ms'
		case 'TTFB':
			if (value <= 800) return '<=800ms'
			if (value <= 1800) return '801-1800ms'
			return '>1800ms'
		default:
			return 'n/a'
	}
}

const getPath = () => {
	const { pathname, search } = window.location
	return `${pathname}${search}`
}

const getConnectionInfo = () => {
	if (typeof navigator === 'undefined') return undefined
	const connection = (navigator as Navigator & { connection?: any }).connection
	if (!connection) return undefined
	const { effectiveType, saveData } = connection
	return {
		effectiveType,
		saveData: Boolean(saveData)
	}
}

const getNavigationType = () => {
	if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return undefined
	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
	return navigation?.type
}

const sendWithRetry = (payload: Record<string, unknown>, attempt = 0) => {
	if (!isBrowser) return

	const tracker = window.umami?.track
	if (typeof tracker === 'function') {
		try {
			tracker(VITAL_EVENT_NAME, payload)
		} catch (error) {
			// silently fail
		}
		return
	}

	if (attempt >= MAX_RETRY_ATTEMPTS) {
		return
	}

	window.setTimeout(() => sendWithRetry(payload, attempt + 1), RETRY_DELAY)
}

export const reportWebVitalMetric = (metric: NextWebVitalsMetric) => {
	if (!isBrowser) return

	const payload: Record<string, unknown> = {
		metric: metric.name,
		value: getRoundedValue(metric),
		rating: getRating(metric),
		bucket: getBucket(metric),
		label: metric.label,
		path: getPath(),
		navigationType: getNavigationType()
	}

	const connection = getConnectionInfo()
	if (connection) {
		payload.connectionType = connection.effectiveType
		payload.saveData = connection.saveData
	}

	const deviceMemory =
		typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined
	if (typeof deviceMemory === 'number') {
		payload.deviceMemory = deviceMemory
	}

	sendWithRetry(payload)
}
