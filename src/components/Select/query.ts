import type { NextRouter } from 'next/router'
import type { ExcludeQueryKey } from './types'

// URL update helpers - used when includeQueryKey/excludeQueryKey is provided
// Encoding:
// - missing include+exclude => "all selected" (default)
// - include="None" => "none selected"
// - include=[...] or include="..." => explicit include selection(s)
// - exclude=[...] or exclude="..." => start from all, then remove excludes
export const updateQueryFromSelected = (
	router: NextRouter,
	includeKey: string,
	excludeKey: ExcludeQueryKey,
	allKeys: string[],
	values: string[] | string | 'None' | null,
	defaultSelectedValues?: string[]
) => {
	const nextQuery: Record<string, any> = { ...router.query }

	const setOrDelete = (key: string, value: string | string[] | null) => {
		if (value === null) delete nextQuery[key]
		else nextQuery[key] = value
	}

	const validSet = new Set(allKeys)
	const defaultSelected = defaultSelectedValues ? defaultSelectedValues.filter((value) => validSet.has(value)) : null
	const defaultIsAll = !defaultSelected || defaultSelected.length === allKeys.length

	let nextValues = values

	// Select all => default (no params)
	if (nextValues === null) {
		if (defaultIsAll) {
			setOrDelete(includeKey, null)
			setOrDelete(excludeKey, null)
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
			return
		}
		nextValues = allKeys
	}

	// None selected => explicit sentinel (and clear excludes)
	if (nextValues === 'None' || (Array.isArray(nextValues) && nextValues.length === 0)) {
		setOrDelete(includeKey, 'None')
		setOrDelete(excludeKey, null)
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	// Single-select value: always write include="..."
	if (typeof nextValues === 'string') {
		if (defaultSelected?.length === 1 && defaultSelected[0] === nextValues) {
			setOrDelete(includeKey, null)
			setOrDelete(excludeKey, null)
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
			return
		}
		setOrDelete(includeKey, nextValues)
		setOrDelete(excludeKey, null)
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	const selected = nextValues.filter((v) => validSet.has(v))
	const selectedSet = new Set(selected)

	// Default selection => no params
	const defaultSelection = defaultSelected ?? allKeys
	const defaultSelectionSet = new Set(defaultSelection)
	const isDefaultSelection =
		selected.length === defaultSelection.length && selected.every((value) => defaultSelectionSet.has(value))
	if (isDefaultSelection) {
		setOrDelete(includeKey, null)
		setOrDelete(excludeKey, null)
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		return
	}

	const excluded = allKeys.filter((k) => !selectedSet.has(k))

	// Prefer whichever is shorter; if user deselects only a few from mostly-all, this flips to excludeKey
	const useExclude = excluded.length > 0 && excluded.length < selected.length

	if (useExclude) {
		setOrDelete(includeKey, null) // completely remove includeKey when using excludeKey
		setOrDelete(excludeKey, excluded.length === 1 ? excluded[0] : excluded)
	} else {
		setOrDelete(excludeKey, null)
		setOrDelete(includeKey, selected.length === 1 ? selected[0] : selected)
	}

	router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
}
