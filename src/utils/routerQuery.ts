import type { ParsedUrlQueryInput } from 'querystring'
import type { NextRouter } from 'next/router'

type QueryParamInput = string | string[] | undefined | null

export function readSingleQueryValue(value: QueryParamInput): string | undefined {
	if (Array.isArray(value)) return value[0]
	return value ?? undefined
}

function buildUpdatedQuery(
	currentQuery: Record<string, unknown>,
	updates: Record<string, string | undefined>
): ParsedUrlQueryInput {
	const nextQuery: ParsedUrlQueryInput = {}
	type AllowedType = 'string' | 'number' | 'boolean' | 'bigint'
	type AllowedValue = string | number | boolean | bigint
	const allowedPrimitiveTypes = new Set<AllowedType>(['string', 'number', 'boolean', 'bigint'])
	const isAllowedPrimitive = (value: unknown): value is AllowedValue =>
		allowedPrimitiveTypes.has(typeof value as AllowedType)

	for (const [key, value] of Object.entries(currentQuery)) {
		if (isAllowedPrimitive(value)) {
			nextQuery[key] = value
			continue
		}

		if (Array.isArray(value) && value.every((item) => isAllowedPrimitive(item))) {
			nextQuery[key] = value
		}
	}

	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) {
			delete nextQuery[key]
		} else {
			nextQuery[key] = value
		}
	}

	return nextQuery
}

export function pushShallowQuery(
	router: NextRouter,
	updates: Record<string, string | undefined>,
	pathname: string = router.pathname
) {
	const nextQuery = buildUpdatedQuery(router.query as Record<string, unknown>, updates)
	return router.push({ pathname, query: nextQuery }, undefined, { shallow: true })
}
