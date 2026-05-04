import type { ColumnOrderState, Table } from '@tanstack/react-table'
import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import type { CsvCell } from '~/utils/csvCell'

type BreakpointMap<T> = Record<number, T>
export type ColumnOrdersByBreakpoint = BreakpointMap<ColumnOrderState>

type ColumnTableInstance = {
	setColumnOrder: (order: ColumnOrderState) => void
	getState: () => {
		columnOrder?: ColumnOrderState
	}
	getAllLeafColumns?: () => Array<{ id: string }>
}

const isColumnOrderEqual = (current: ColumnOrderState, next: ColumnOrderState) => {
	if (current === next) return true
	if (current.length !== next.length) return false
	for (let i = 0; i < current.length; i++) {
		if (current[i] !== next[i]) return false
	}
	return true
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

function sortColumnOrders({
	instance,
	columnOrders,
	width
}: {
	instance: ColumnTableInstance
	columnOrders?: ColumnOrdersByBreakpoint | null
	width?: number | null
}) {
	if (!width) {
		return
	}

	const { columnOrder: currentOrder } = instance.getState()
	const columns = instance.getAllLeafColumns?.()

	const effectiveOrder =
		currentOrder && currentOrder.length > 0 ? currentOrder : (columns?.map((col) => col.id) ?? currentOrder)

	const getBreakpointValue = <T>(sizes: BreakpointMap<T>) => {
		return Object.entries(sizes)
			.map(([size, value]) => [Number(size), value] as const)
			.sort(([a], [b]) => b - a)
			.find(([size]) => width >= size)?.[1]
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

export function useSortColumnOrders({
	instance,
	columnOrders
}: {
	instance: ColumnTableInstance
	columnOrders?: ColumnOrdersByBreakpoint | null
}) {
	const width = useBreakpointWidth()

	useEffect(() => {
		sortColumnOrders({ instance, columnOrders, width })
	}, [instance, columnOrders, width])
}

export function prepareTableCsv<T>({ instance, filename }: { instance: Table<T>; filename: string }): {
	filename: string
	rows: Array<Array<CsvCell>>
} {
	const columns = instance.getVisibleLeafColumns().filter((column) => !column.columnDef.meta?.hidden)
	const tableRows = instance.getRowModel().rows
	if (columns.length === 0) return { filename, rows: [] }

	const headers = columns.map((column) => {
		const csvHeader = (column.columnDef.meta as { csvHeader?: unknown } | undefined)?.csvHeader
		if (typeof csvHeader === 'string' && csvHeader.length > 0) return csvHeader
		const header = column.columnDef.header
		if (typeof header === 'string') return header
		if (typeof header === 'number') return String(header)
		return column.columnDef.id ?? column.id
	})

	const rows: Array<Array<CsvCell>> = tableRows.map((row) =>
		columns.map((column) => {
			const value = row.getValue(column.id)
			if (value == null) return ''
			if (typeof value === 'number') return Number.isFinite(value) ? value : ''
			if (typeof value === 'string' || typeof value === 'boolean') return value
			if (Array.isArray(value)) {
				return value
					.filter(
						(item): item is CsvCell =>
							(typeof item === 'number' && Number.isFinite(item)) ||
							typeof item === 'string' ||
							typeof item === 'boolean'
					)
					.join(', ')
			}
			return ''
		})
	)

	return { filename, rows: [headers, ...rows] }
}
