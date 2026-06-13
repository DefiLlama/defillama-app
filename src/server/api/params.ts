import type { ApiQuery } from './types'

/** First value of a possibly-repeated query param. */
export function queryString(query: ApiQuery, name: string): string | undefined {
	const value = query[name]
	return Array.isArray(value) ? value[0] : value
}

/** Comma-separated list param: `?chains=a,b,c` → ['a','b','c']. */
export function queryList(query: ApiQuery, name: string): string[] {
	const value = queryString(query, name)
	return value ? value.split(',').filter(Boolean) : []
}

export function queryEnum<T extends string>(query: ApiQuery, name: string, allowed: readonly T[]): T | undefined {
	const value = queryString(query, name)
	return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

export function queryBoolean(query: ApiQuery, name: string): boolean {
	return queryString(query, name) === 'true'
}

export function queryIntClamped(query: ApiQuery, name: string, fallback: number, min: number, max: number): number {
	const raw = queryString(query, name)
	const parsed = raw === undefined ? NaN : parseInt(raw, 10)
	if (!Number.isFinite(parsed)) return fallback
	return Math.min(Math.max(parsed, min), max)
}

/**
 * include/exclude filter mode with an optional legacy fallback param, used by
 * the protocol split endpoints.
 */
export function queryFilterMode(query: ApiQuery, name: string, fallbackName?: string): 'include' | 'exclude' {
	return (
		queryEnum(query, name, ['include', 'exclude'] as const) ??
		(fallbackName ? queryEnum(query, fallbackName, ['include', 'exclude'] as const) : undefined) ??
		'include'
	)
}
