import type { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring'
import type { NextRouter } from 'next/router'

type QueryParamInput = string | string[] | undefined | null
type QueryPrimitive = string | number | boolean
type QueryUpdateValue = QueryPrimitive | QueryPrimitive[] | undefined

// ============================================================================
// Array Parsing
// ============================================================================

/**
 * Converts a query parameter to an array of non-empty strings.
 * Handles string, string array, undefined, and null inputs.
 * Filters out falsy/empty values.
 *
 * @example
 * toNonEmptyArrayParam('foo') // ['foo']
 * toNonEmptyArrayParam(['foo', '', 'bar']) // ['foo', 'bar']
 * toNonEmptyArrayParam(undefined) // []
 */
export function toNonEmptyArrayParam(param: QueryParamInput): string[] {
	if (!param) return []
	return Array.isArray(param) ? param.filter(Boolean) : [param].filter(Boolean)
}

/**
 * Converts a query parameter to an array without filtering empty values.
 *
 * @example
 * toRawArrayParam('foo') // ['foo']
 * toRawArrayParam(['foo', 'bar']) // ['foo', 'bar']
 * toRawArrayParam(undefined) // []
 */
export function toRawArrayParam(param: QueryParamInput): string[] {
	if (!param) return []
	return Array.isArray(param) ? param : [param]
}

// ============================================================================
// Single Value Parsing
// ============================================================================

/**
 * Extracts a single string value from a query parameter.
 * If the parameter is an array, returns the first element.
 *
 * @example
 * readSingleQueryValue('foo') // 'foo'
 * readSingleQueryValue(['foo', 'bar']) // 'foo'
 * readSingleQueryValue(undefined) // undefined
 */
export function readSingleQueryValue(value: QueryParamInput): string | undefined {
	if (Array.isArray(value)) return value[0]
	return value ?? undefined
}

/**
 * Gets a query value from a ParsedUrlQuery object by key.
 * Returns the first value if it's an array.
 *
 * @example
 * getQueryValue({ foo: 'bar' }, 'foo') // 'bar'
 * getQueryValue({ foo: ['bar', 'baz'] }, 'foo') // 'bar'
 */
export function getQueryValue(query: ParsedUrlQuery, key: string): string | null {
	const value = query[key]
	if (!value) return null
	if (Array.isArray(value)) return value[0] ?? null
	return value as string
}

// ============================================================================
// Number Parsing
// ============================================================================

/**
 * Parses a value into a finite number or null.
 * Handles string, number, null, and undefined inputs.
 *
 * @example
 * parseNumberInput('42') // 42
 * parseNumberInput(42) // 42
 * parseNumberInput('invalid') // null
 * parseNumberInput(null) // null
 */
export function parseNumberInput(value: string | number | null | undefined): number | null {
	if (value == null) return null
	if (typeof value === 'number') return Number.isFinite(value) ? value : null
	const trimmedValue = value.trim()
	if (trimmedValue === '') return null
	const n = Number(trimmedValue)
	return Number.isFinite(n) ? n : null
}

/**
 * Converts a query parameter to a number or null.
 * If the parameter is an array, uses the first element.
 *
 * @example
 * toNumberParam('42') // 42
 * toNumberParam(['42', '99']) // 42
 * toNumberParam('invalid') // null
 */
function toNumberParam(param: QueryParamInput): number | null {
	if (Array.isArray(param)) {
		return parseNumberInput(param[0])
	}
	return parseNumberInput(param)
}

/**
 * Converts a query parameter to a number or null.
 *
 * @example
 * parseNumberQueryParam('42') // 42
 * parseNumberQueryParam(['42']) // 42
 * parseNumberQueryParam(null) // null
 */
export function parseNumberQueryParam(param: QueryParamInput): number | null {
	return toNumberParam(param)
}

// ============================================================================
// Boolean Parsing
// ============================================================================

/**
 * Converts a query parameter to a strict boolean.
 * Returns true only if the first value normalizes to 'true'.
 * String normalization is trim + lowercase.
 * For arrays, only the first value is considered.
 *
 * @example
 * isTrueQueryParam('true') // true
 * isTrueQueryParam(['true', 'false']) // true
 * isTrueQueryParam('false') // false
 * isTrueQueryParam(undefined) // false
 */
const normalizeBooleanQueryValue = (param: QueryParamInput): string | undefined => {
	const value = Array.isArray(param) ? param[0] : param
	if (typeof value !== 'string') return undefined
	return value.trim().toLowerCase()
}

export function isTrueQueryParam(param: QueryParamInput): boolean {
	return normalizeBooleanQueryValue(param) === 'true'
}

/**
 * Parses a boolean query parameter with multiple truthy values.
 * Accepts 'true', '1', or 'yes' (case-insensitive) as truthy.
 * For arrays, only the first value is considered.
 *
 * @example
 * isTruthyQueryParam('true') // true
 * isTruthyQueryParam('1') // true
 * isTruthyQueryParam('yes') // true
 * isTruthyQueryParam(['true', 'false']) // true
 * isTruthyQueryParam('no') // false
 */
export function isTruthyQueryParam(param: QueryParamInput): boolean {
	const normalized = normalizeBooleanQueryValue(param)
	if (!normalized) return false
	return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

// ============================================================================
// Set Parsing (Exclude Params)
// ============================================================================

/**
 * Parses an exclude query parameter into a Set of strings.
 * Commonly used for filtering out excluded items.
 *
 * @example
 * parseExcludeParam('foo') // Set(['foo'])
 * parseExcludeParam(['foo', 'bar']) // Set(['foo', 'bar'])
 * parseExcludeParam(undefined) // Set()
 */
export function parseExcludeParam(param: QueryParamInput): Set<string> {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

// ============================================================================
// Special Value Checks
// ============================================================================

/**
 * Checks if a query parameter represents 'None' (empty selection).
 * Handles both single values and arrays.
 *
 * @example
 * isParamNone('None') // true
 * isParamNone(['None', 'foo']) // true
 * isParamNone(undefined) // false
 */
export function isParamNone(param: QueryParamInput): boolean {
	if (param === 'None') return true
	if (Array.isArray(param) && param.includes('None')) return true
	return false
}

// ============================================================================
// Filter Array Parsing
// ============================================================================

/**
 * Parses an array query parameter with 'None' support and validation.
 * Returns all valid values if no param, empty array if 'None',
 * or filtered valid values otherwise.
 *
 * If validSet is not provided, creates one from allValues.
 *
 * @example
 * parseArrayParam('foo', ['foo', 'bar'], new Set(['foo', 'bar'])) // ['foo']
 * parseArrayParam('None', ['foo', 'bar']) // []
 * parseArrayParam(undefined, ['foo', 'bar']) // ['foo', 'bar']
 */
export function parseArrayParam(param: QueryParamInput, allValues: string[], validSet?: Set<string>): string[] {
	if (param === 'None') return []
	if (!param) return allValues
	const arr = toNonEmptyArrayParam(param).filter((v) => v !== 'None')
	const valid = validSet ?? new Set(allValues)
	return arr.filter((value) => valid.has(value))
}

/**
 * Parses an include query parameter with 'None' support.
 * Returns all keys if no param, empty array if 'None',
 * or only valid keys otherwise.
 *
 * @example
 * parseIncludeParam('foo', ['foo', 'bar']) // ['foo']
 * parseIncludeParam('None', ['foo', 'bar']) // []
 * parseIncludeParam(undefined, ['foo', 'bar']) // ['foo', 'bar']
 */
export function parseIncludeParam(param: QueryParamInput, allKeys: string[]): string[] {
	const validSet = new Set(allKeys)
	if (!param) return allKeys
	if (typeof param === 'string') {
		if (param === 'None') return []
		return validSet.has(param) ? [param] : []
	}
	return toNonEmptyArrayParam(param).filter((value) => validSet.has(value))
}

/**
 * Resolves selected chain filters from a query param.
 * Handles special 'All' and 'None' values.
 *
 * @example
 * getSelectedChainFilters('All', ['eth', 'btc']) // ['eth', 'btc']
 * getSelectedChainFilters('None', ['eth', 'btc']) // []
 * getSelectedChainFilters('eth', ['eth', 'btc']) // ['eth']
 */
export function getSelectedChainFilters(chainQueryParam: QueryParamInput, allChains: string[]): string[] {
	if (!chainQueryParam) return allChains

	const validChains = new Set(allChains)

	if (typeof chainQueryParam === 'string') {
		if (chainQueryParam === 'All') return allChains
		if (chainQueryParam === 'None') return []
		return validChains.has(chainQueryParam) ? [chainQueryParam] : []
	}

	return toNonEmptyArrayParam(chainQueryParam).filter((chain) => validChains.has(chain))
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Converts a query record to a URL query string.
 * Handles arrays by appending multiple values with the same key.
 * Skips null, undefined, and empty values.
 *
 * @example
 * toQueryString({ foo: 'bar', baz: ['a', 'b'] }) // '?foo=bar&baz=a&baz=b'
 * toQueryString({ empty: undefined }) // ''
 */
export function toQueryString(query: Record<string, string | string[] | undefined>): string {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(query)) {
		if (value == null) continue
		if (Array.isArray(value)) {
			for (const v of value) {
				if (!v) continue
				params.append(key, String(v))
			}
		} else if (value) {
			params.set(key, String(value))
		}
	}
	const qs = params.toString()
	return qs ? `?${qs}` : ''
}

// ============================================================================
// Query Updates
// ============================================================================

function buildUpdatedQuery(
	currentQuery: Record<string, unknown>,
	updates: Record<string, QueryUpdateValue>
): ParsedUrlQueryInput {
	const nextQuery: ParsedUrlQueryInput = {}
	type AllowedType = 'string' | 'number' | 'boolean'
	const allowedPrimitiveTypes = new Set<AllowedType>(['string', 'number', 'boolean'])
	const isAllowedPrimitive = (value: unknown): value is QueryPrimitive =>
		allowedPrimitiveTypes.has(typeof value as AllowedType)

	for (const [key, value] of Object.entries(currentQuery)) {
		if (isAllowedPrimitive(value)) {
			nextQuery[key] = value
			continue
		}

		if (Array.isArray(value) && value.length > 0 && value.every((item) => isAllowedPrimitive(item))) {
			nextQuery[key] = value
		}
	}

	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) {
			delete nextQuery[key]
		} else if (isAllowedPrimitive(value)) {
			nextQuery[key] = value
		} else if (Array.isArray(value) && value.length > 0 && value.every((item) => isAllowedPrimitive(item))) {
			nextQuery[key] = value
		} else if (Array.isArray(value)) {
			// Empty array means "remove param" for this key.
			delete nextQuery[key]
		}
	}

	return nextQuery
}

/**
 * Pushes a shallow, patch-style query update.
 * Merges `updates` into the current query and removes keys set to `undefined` or an empty array.
 *
 * Intended use:
 * - simple URL filter/state updates
 * - shallow routing only
 * - primitive or primitive-array query values
 *
 * Use direct `router.push` / `router.replace` when you need custom navigation behavior
 * (e.g. `scroll: false`, history replacement semantics, non-shallow transitions, or
 * intentionally replacing the full query object).
 */
export function pushShallowQuery(
	router: NextRouter,
	updates: Record<string, QueryUpdateValue>,
	pathname: string = router.pathname
) {
	const nextQuery = buildUpdatedQuery(router.query as Record<string, unknown>, updates)
	return router.push({ pathname, query: nextQuery }, undefined, { shallow: true })
}

// ============================================================================
// Safe URL Helpers
// ============================================================================

/**
 * Safely parses an internal path from an unknown value.
 * Returns undefined if the value is not a valid internal path.
 * Only allows paths starting with a single '/'.
 *
 * @example
 * safeInternalPath('/foo/bar') // '/foo/bar'
 * safeInternalPath('https://example.com') // undefined
 * safeInternalPath('//foo') // undefined
 */
export function safeInternalPath(raw: unknown): string | undefined {
	if (typeof raw !== 'string') return undefined
	try {
		const decoded = decodeURIComponent(raw)
		if (!/^\/(?!\/)/.test(decoded)) return undefined

		const hasPathTraversalSegment = decoded.split('/').some((segment) => segment === '.' || segment === '..')
		if (hasPathTraversalSegment) return undefined

		return decoded
	} catch (e) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[routerQuery] Failed to decode path in safeInternalPath', e)
		}
	}
	return undefined
}
