import type { ColumnOrderState, ColumnSizingState, Table } from '@tanstack/react-table'
import { startTransition, useEffect, useState } from 'react'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { useDebounce } from '~/hooks/useDebounce'

export type BreakpointMap<T> = Record<number, T>
export type ColumnSizesByBreakpoint = BreakpointMap<ColumnSizingState>
export type ColumnOrdersByBreakpoint = BreakpointMap<ColumnOrderState>

type ColumnTableInstance = {
	setColumnSizing: (sizing: ColumnSizingState) => void
	setColumnOrder: (order: ColumnOrderState) => void
	getState: () => {
		columnSizing?: ColumnSizingState
		columnOrder?: ColumnOrderState
	}
	getAllLeafColumns?: () => Array<{ id: string; getSize?: () => number }>
}

const isColumnOrderEqual = (current: ColumnOrderState, next: ColumnOrderState) => {
	if (current === next) return true
	if (current.length !== next.length) return false
	for (let i = 0; i < current.length; i++) {
		if (current[i] !== next[i]) return false
	}
	return true
}

const isColumnSizingEqual = (current: ColumnSizingState, next: ColumnSizingState) => {
	if (current === next) return true
	const currentKeys = Object.keys(current)
	const nextKeys = Object.keys(next)
	if (currentKeys.length !== nextKeys.length) return false
	for (const key of currentKeys) {
		if (current[key] !== next[key]) return false
	}
	return true
}

const getSizingForKeys = (
	keys: string[],
	currentSizing?: ColumnSizingState,
	columns?: Array<{ id: string; getSize?: () => number }>
) => {
	const sizing: ColumnSizingState = {}
	for (const key of keys) {
		const value = currentSizing?.[key]
		if (value != null) {
			sizing[key] = value
		}
	}
	if (columns) {
		const columnsById = new Map(columns.map((col) => [col.id, col]))
		for (const key of keys) {
			if (sizing[key] == null) {
				const size = columnsById.get(key)?.getSize?.()
				if (size != null) {
					sizing[key] = size
				}
			}
		}
	}
	return sizing
}

export function splitArrayByFalsyValues(data, column) {
	return data.reduce(
		(acc, curr) => {
			if (!curr[column] && curr[column] !== 0) {
				acc[1].push(curr)
			} else acc[0].push(curr)
			return acc
		},
		[[], []]
	)
}

export function alphanumericFalsyLast(rowA, rowB, columnId, sorting) {
	const desc = sorting.length ? sorting[0].desc : true

	let a = (rowA.getValue(columnId) ?? null) as any
	let b = (rowB.getValue(columnId) ?? null) as any

	/**
	 * These first 3 conditions keep our null values at the bottom.
	 */
	if (a === null && b !== null) {
		return desc ? -1 : 1
	}

	if (a !== null && b === null) {
		return desc ? 1 : -1
	}

	if (a === null && b === null) {
		return 0
	}

	// at this point, you have non-null values and you should do whatever is required to sort those values correctly
	return a - b
}

// Utility function to sort column sizes and orders based on width
function sortColumnSizesAndOrders({
	instance,
	columnSizes,
	columnOrders,
	width
}: {
	instance: ColumnTableInstance
	columnSizes?: ColumnSizesByBreakpoint | null
	columnOrders?: ColumnOrdersByBreakpoint | null
	width?: number | null
}) {
	if (!width) {
		return
	}

	const { columnSizing: currentSizing, columnOrder: currentOrder } = instance.getState()
	const columns = instance.getAllLeafColumns?.()

	const effectiveOrder =
		currentOrder && currentOrder.length > 0 ? currentOrder : (columns?.map((col) => col.id) ?? currentOrder)

	const getBreakpointValue = <T>(sizes: BreakpointMap<T>) => {
		return Object.entries(sizes)
			.map(([size, value]) => [Number(size), value] as const)
			.sort(([a], [b]) => b - a)
			.find(([size]) => width >= size)?.[1]
	}

	if (columnSizes && currentSizing != null) {
		const size = getBreakpointValue(columnSizes)
		const effectiveSizing = size ? getSizingForKeys(Object.keys(size), currentSizing, columns) : currentSizing
		if (size !== undefined && effectiveSizing != null && !isColumnSizingEqual(effectiveSizing, size)) {
			instance.setColumnSizing(size)
		}
	}

	if (columnOrders && currentOrder != null) {
		const order = getBreakpointValue(columnOrders)
		if (order !== undefined && effectiveOrder != null && !isColumnOrderEqual(effectiveOrder, order)) {
			instance.setColumnOrder(order)
		}
	}
}

export function useTableSearch<T>({
	instance,
	columnToSearch
}: {
	instance: Table<T>
	columnToSearch: string
}): [string, (value: string) => void] {
	const [search, setSearch] = useState('')
	const debouncedSearch = useDebounce(search, 200)

	useEffect(() => {
		const column = instance.getColumn(columnToSearch)
		if (!column) return

		const currentValue = column.getFilterValue()
		if (currentValue === debouncedSearch) return

		startTransition(() => {
			column.setFilterValue(debouncedSearch)
		})
	}, [debouncedSearch, instance, columnToSearch])

	return [search, setSearch]
}

export function useSortColumnSizesAndOrders({
	instance,
	columnSizes,
	columnOrders
}: {
	instance: ColumnTableInstance
	columnSizes?: ColumnSizesByBreakpoint | null
	columnOrders?: ColumnOrdersByBreakpoint | null
}) {
	const width = useBreakpointWidth()

	useEffect(() => {
		sortColumnSizesAndOrders({ instance, columnSizes, columnOrders, width })
	}, [instance, columnSizes, columnOrders, width])
}
