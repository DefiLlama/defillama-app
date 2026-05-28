import type { ChartConfiguration } from '~/containers/LlamaAI/types'

/**
 * Compare two string arrays for equality.
 * Used for memoization comparisons in chart rendering.
 */
export function areStringArraysEqual(a?: string[], b?: string[]): boolean {
	if (a === b) return true
	if (!a || !b) return false
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

/**
 * Compare two chart configuration arrays for equality.
 * Compares by id, type, and title - chart objects are fairly large but stable.
 */
export function areChartsEqual(a: ChartConfiguration[] | undefined, b: ChartConfiguration[] | undefined): boolean {
	if (a === b) return true
	if (!a || !b) return false
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i]?.id !== b[i]?.id) return false
		if (a[i]?.type !== b[i]?.type) return false
		if (a[i]?.title !== b[i]?.title) return false
	}
	return true
}

function areRowsEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
	const aRecord = a as Record<string, unknown>
	const bRecord = b as Record<string, unknown>
	const aKeys = Object.keys(aRecord)
	const bKeys = Object.keys(bRecord)
	if (aKeys.length !== bKeys.length) return false
	for (const key of aKeys) {
		if (aRecord[key] !== bRecord[key]) return false
	}
	return true
}

function areSeriesEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (!Array.isArray(a) || !Array.isArray(b)) return false
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (!areRowsEqual(a[i], b[i])) return false
	}
	return true
}

/**
 * Compare chart data for equality.
 * Treats empty arrays, null, undefined, and false as equivalent.
 */
export function areChartDataEqual(a: any, b: any): boolean {
	if (a === b) return true
	// Treat "new []" as equal to "[]"
	if (Array.isArray(a) && Array.isArray(b)) return areSeriesEqual(a, b)
	// Treat undefined/null/false similarly
	if ((a == null || a === false) && (b == null || b === false)) return true
	if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return false
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	for (const key of aKeys) {
		if (!areSeriesEqual(a[key], b[key])) return false
	}
	return true
}
