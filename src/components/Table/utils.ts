import type { ColumnOrderState, ColumnSizingState, Table } from '@tanstack/react-table'
import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'

type BreakpointMap<T> = Record<number, T>
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
	let currentKeyCount = 0
	for (const key in current) {
		currentKeyCount++
		if (current[key] !== next[key]) return false
	}

	let nextKeyCount = 0
	for (const _key in next) {
		nextKeyCount++
	}

	if (currentKeyCount !== nextKeyCount) return false
	return true
}

const getSizingForKeys = (
	keysSource: ColumnSizingState,
	currentSizing?: ColumnSizingState,
	columns?: Array<{ id: string; getSize?: () => number }>
) => {
	const sizing: ColumnSizingState = {}
	for (const key in keysSource) {
		const value = currentSizing?.[key]
		if (value != null) {
			sizing[key] = value
		}
	}
	if (columns) {
		const columnsById = new Map(columns.map((col) => [col.id, col]))
		for (const key in keysSource) {
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

export function splitArrayByFalsyValues<T extends object, K extends keyof T>(data: T[], column: K) {
	return data.reduce(
		(acc, curr) => {
			const value = curr[column]
			if (!value && value !== 0) {
				acc[1].push(curr)
			} else acc[0].push(curr)
			return acc
		},
		[[], []] as [T[], T[]]
	)
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
		const effectiveSizing = size ? getSizingForKeys(size, currentSizing, columns) : currentSizing
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
	columnToSearch?: string
}): [string, (value: string) => void] {
	const [search, setSearch] = useState('')
	const deferredSearch = useDeferredValue(search)

	useEffect(() => {
		if (!columnToSearch) return
		const column = instance.getColumn(columnToSearch)
		if (!column) return

		const currentValue = column.getFilterValue()
		if (currentValue === deferredSearch) return

		startTransition(() => {
			column.setFilterValue(deferredSearch)
		})
	}, [deferredSearch, instance, columnToSearch])

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

function isCsvPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function prepareTableCsv<T>({ instance, filename }: { instance: Table<T>; filename: string }): {
	filename: string
	rows: Array<Array<string | number | boolean>>
} {
	const columns = instance.getVisibleLeafColumns().filter((column) => !column.columnDef.meta?.hidden)
	const tableRows = instance.getSortedRowModel().rows
	if (columns.length === 0 || tableRows.length === 0) return { filename, rows: [] }

	const headers = columns.map((column) => {
		const header = column.columnDef.header
		if (typeof header === 'string') return header
		if (typeof header === 'number') return String(header)
		return ''
	})

	const rows: Array<Array<string | number | boolean>> = tableRows.map((row) =>
		columns.map((column) => {
			const value = row.getValue(column.id)
			if (value == null) return ''
			if (isCsvPrimitive(value)) return value
			if (Array.isArray(value)) return value.filter(isCsvPrimitive).join(', ')
			return ''
		})
	)

	return { filename, rows: [headers, ...rows] }
}
