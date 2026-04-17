import type { RWAPerpsChartMetricKey } from './types'

export function parseChartMetricKey(value: string | string[] | undefined): RWAPerpsChartMetricKey | null {
	if (Array.isArray(value) || value == null) return null
	if (value === 'openInterest' || value === 'volume24h' || value === 'markets') return value
	return null
}

export function parseOptionalTarget(value: string | string[] | undefined): string | null | undefined {
	if (value == null) return undefined
	if (Array.isArray(value)) return null
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}
