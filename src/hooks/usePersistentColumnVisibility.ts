import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'

type ColumnVisibilityMap = Record<string, boolean>

export interface UsePersistentColumnVisibilityOptions {
	storageKey: string
	columnKeys: string[]
	getDefaultVisibility?: (columnKeys: string[]) => ColumnVisibilityMap
	alwaysVisible?: string[]
}

const serializeVisibility = (visibility: ColumnVisibilityMap, columnKeys: string[]) => {
	const entries = columnKeys.map((key) => [key, visibility[key] ?? false] as const)
	return JSON.stringify(Object.fromEntries(entries))
}

const ensureBooleanRecord = (value: unknown): ColumnVisibilityMap => {
	if (typeof value !== 'object' || value === null) {
		return {}
	}

	return Object.entries(value).reduce<ColumnVisibilityMap>((acc, [key, rawValue]) => {
		acc[key] = Boolean(rawValue)
		return acc
	}, {})
}

export const usePersistentColumnVisibility = ({
	storageKey,
	columnKeys,
	getDefaultVisibility,
	alwaysVisible = []
}: UsePersistentColumnVisibilityOptions) => {
	const orderedColumnKeys = useMemo(() => Array.from(new Set(columnKeys)), [columnKeys])

	const defaultVisibility = useMemo<ColumnVisibilityMap>(() => {
		if (getDefaultVisibility) {
			return getDefaultVisibility(orderedColumnKeys)
		}

		return Object.fromEntries(orderedColumnKeys.map((key) => [key, true]))
	}, [getDefaultVisibility, orderedColumnKeys])

	const defaultString = useMemo(() => serializeVisibility(defaultVisibility, orderedColumnKeys), [
		defaultVisibility,
		orderedColumnKeys
	])

	const storedValue = useSyncExternalStore(
		subscribeToLocalStorage,
		() => {
			if (typeof window === 'undefined') {
				return defaultString
			}
			return window.localStorage.getItem(storageKey) ?? defaultString
		},
		() => defaultString
	)

	const normalizedVisibility = useMemo<ColumnVisibilityMap>(() => {
		let parsed: ColumnVisibilityMap = {}

		try {
			parsed = ensureBooleanRecord(JSON.parse(storedValue))
		} catch {
			parsed = {}
		}

		const allowedKeys = new Set(orderedColumnKeys)

		const merged = { ...defaultVisibility }
		for (const [key, value] of Object.entries(parsed)) {
			if (!allowedKeys.has(key)) continue
			merged[key] = value
		}

		for (const key of alwaysVisible) {
			if (allowedKeys.has(key)) {
				merged[key] = true
			}
		}

		return merged
	}, [alwaysVisible, defaultVisibility, orderedColumnKeys, storedValue])

	const normalizedStorageString = useMemo(() => serializeVisibility(normalizedVisibility, orderedColumnKeys), [
		normalizedVisibility,
		orderedColumnKeys
	])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (storedValue === normalizedStorageString) return

		window.localStorage.setItem(storageKey, normalizedStorageString)
		window.dispatchEvent(new Event('storage'))
	}, [normalizedStorageString, storageKey, storedValue])

	const persistVisibility = useCallback(
		(next: ColumnVisibilityMap | ((prev: ColumnVisibilityMap) => ColumnVisibilityMap)) => {
			if (typeof window === 'undefined') return

			const nextVisibility =
				typeof next === 'function' ? next(normalizedVisibility) : { ...normalizedVisibility, ...next }

			const allowedKeys = new Set(orderedColumnKeys)
			const result: ColumnVisibilityMap = {}

			for (const key of orderedColumnKeys) {
				result[key] =
					key in nextVisibility ? Boolean(nextVisibility[key]) : Boolean(defaultVisibility[key] ?? false)
			}

			for (const key of alwaysVisible) {
				if (allowedKeys.has(key)) {
					result[key] = true
				}
			}

			const serialized = serializeVisibility(result, orderedColumnKeys)
			window.localStorage.setItem(storageKey, serialized)
			window.dispatchEvent(new Event('storage'))
		},
		[alwaysVisible, defaultVisibility, normalizedVisibility, orderedColumnKeys, storageKey]
	)

	const setVisibleColumns = useCallback(
		(keys: string[]) => {
			const keysSet = new Set(keys)
			persistVisibility(
				Object.fromEntries(orderedColumnKeys.map((key) => [key, keysSet.has(key)])) as ColumnVisibilityMap
			)
		},
		[orderedColumnKeys, persistVisibility]
	)

	const setOnlyColumnVisible = useCallback(
		(key: string) => {
			setVisibleColumns([key])
		},
		[setVisibleColumns]
	)

	const selectAllColumns = useCallback(() => {
		setVisibleColumns(orderedColumnKeys)
	}, [orderedColumnKeys, setVisibleColumns])

	const clearAllColumns = useCallback(() => {
		setVisibleColumns([])
	}, [setVisibleColumns])

	const selectedColumns = useMemo(
		() => orderedColumnKeys.filter((key) => normalizedVisibility[key]),
		[normalizedVisibility, orderedColumnKeys]
	)

	return {
		columnVisibility: normalizedVisibility,
		clearAllColumns,
		selectAllColumns,
		selectedColumns,
		setVisibleColumns,
		setOnlyColumnVisible,
		persistVisibility
	}
}

