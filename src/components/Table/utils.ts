import type { ColumnOrderState, Table } from '@tanstack/react-table'
import {
	startTransition,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore
} from 'react'
import type { CsvCell } from '~/utils/csvCell'

type BreakpointMap<T> = Record<number, T>
export type ColumnOrdersByBreakpoint = BreakpointMap<ColumnOrderState>

type ColumnTableInstance = {
	setColumnOrder: (order: ColumnOrderState) => void
	getState: () => {
		columnOrder?: ColumnOrderState
	}
	getAllColumns?: () => Array<ColumnTableColumn>
	getAllLeafColumns?: () => Array<{ id: string }>
}

type ColumnTableColumn = {
	id: string
	columns?: ColumnTableColumn[]
	getLeafColumns?: () => Array<{ id: string }>
}

const isColumnOrderEqual = (current: ColumnOrderState, next: ColumnOrderState) => {
	if (current === next) return true
	if (current.length !== next.length) return false
	for (let i = 0; i < current.length; i++) {
		if (current[i] !== next[i]) return false
	}
	return true
}

const getColumnOrderEntries = (columnOrders: ColumnOrdersByBreakpoint) =>
	Object.entries(columnOrders)
		.map(([size, value]) => [Number(size), value] as const)
		.sort(([a], [b]) => a - b)

type ColumnOrderEntry = ReturnType<typeof getColumnOrderEntries>[number]

const getColumnOrderChangeBreakpoints = (entries: ColumnOrderEntry[]) => {
	const breakpoints: number[] = []
	let previousOrder: ColumnOrderState | null = null

	for (const [size, order] of entries) {
		if (size > 0 && (previousOrder == null || !isColumnOrderEqual(previousOrder, order))) {
			breakpoints.push(size)
		}
		previousOrder = order
	}

	return breakpoints
}

const getFixedColumnOrder = (entries: ColumnOrderEntry[]): ColumnOrderState | null => {
	if (entries.length === 0) return null

	const zeroBreakpointOrder = entries.find(([size]) => size === 0)?.[1]
	if (!zeroBreakpointOrder) return null

	for (const [, order] of entries) {
		if (!isColumnOrderEqual(order, zeroBreakpointOrder)) return null
	}

	return zeroBreakpointOrder
}

const getCurrentColumnOrderBreakpoint = (entries: ColumnOrderEntry[], defaultColumnOrder: ColumnOrderState | null) => {
	if (typeof window === 'undefined') return null

	for (let i = entries.length - 1; i >= 0; i--) {
		const [size, order] = entries[i]
		if (size <= 0 || window.matchMedia(`(min-width: ${size}px)`).matches) {
			return defaultColumnOrder != null && isColumnOrderEqual(order, defaultColumnOrder) ? null : size
		}
	}

	return null
}

const getOrderForBreakpoint = (entries: ColumnOrderEntry[], breakpoint: number | null) => {
	if (breakpoint == null) return null
	return entries.find(([size]) => size === breakpoint)?.[1] ?? null
}

const appendLeafColumnIds = (columns: ColumnTableColumn[], columnIds: ColumnOrderState) => {
	for (const column of columns) {
		if (column.columns && column.columns.length > 0) {
			appendLeafColumnIds(column.columns, columnIds)
		} else {
			const leafColumns = column.getLeafColumns?.()
			if (!leafColumns || leafColumns.length === 0) {
				columnIds.push(column.id)
				continue
			}
			for (const leafColumn of leafColumns) {
				columnIds.push(leafColumn.id)
			}
		}
	}
}

const getLeafColumnIds = (columns: ColumnTableColumn[]) => {
	const columnIds: ColumnOrderState = []
	appendLeafColumnIds(columns, columnIds)

	return columnIds
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

function applyColumnOrder({ instance, order }: { instance: ColumnTableInstance; order: ColumnOrderState | null }) {
	if (order == null) return

	const { columnOrder: currentOrder } = instance.getState()
	const columns = instance.getAllLeafColumns?.()

	const effectiveOrder =
		currentOrder && currentOrder.length > 0 ? currentOrder : (columns?.map((col) => col.id) ?? currentOrder)

	if (currentOrder != null && effectiveOrder != null && !isColumnOrderEqual(effectiveOrder, order)) {
		instance.setColumnOrder(order)
	}
}

function useColumnOrderBreakpoint(
	entries: ColumnOrderEntry[],
	defaultColumnOrder: ColumnOrderState | null,
	enabled: boolean
) {
	const breakpoints = useMemo(() => getColumnOrderChangeBreakpoints(entries), [entries])

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!enabled || breakpoints.length === 0 || typeof window === 'undefined') return () => {}

			const mediaQueries = breakpoints.map((size) => window.matchMedia(`(min-width: ${size}px)`))
			for (const mediaQuery of mediaQueries) {
				mediaQuery.addEventListener('change', onStoreChange)
			}

			return () => {
				for (const mediaQuery of mediaQueries) {
					mediaQuery.removeEventListener('change', onStoreChange)
				}
			}
		},
		[breakpoints, enabled]
	)

	const getSnapshot = useCallback(() => {
		if (!enabled) return null
		return getCurrentColumnOrderBreakpoint(entries, defaultColumnOrder)
	}, [entries, defaultColumnOrder, enabled])

	return useSyncExternalStore(subscribe, getSnapshot, () => null)
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
	const allColumns = instance.getAllColumns?.()
	const defaultColumnOrder = useMemo(
		() =>
			allColumns ? getLeafColumnIds(allColumns) : (instance.getAllLeafColumns?.().map((column) => column.id) ?? null),
		[allColumns, instance]
	)
	const columnOrderEntries = useMemo(() => (columnOrders ? getColumnOrderEntries(columnOrders) : []), [columnOrders])
	const fixedColumnOrder = useMemo(() => getFixedColumnOrder(columnOrderEntries), [columnOrderEntries])
	const onlyDefaultColumnOrders =
		defaultColumnOrder != null &&
		columnOrderEntries.length > 0 &&
		columnOrderEntries.every(([, order]) => isColumnOrderEqual(order, defaultColumnOrder))
	const shouldTrackWidth = columnOrders != null && fixedColumnOrder == null
	const breakpoint = useColumnOrderBreakpoint(
		columnOrderEntries,
		defaultColumnOrder,
		shouldTrackWidth && !onlyDefaultColumnOrders
	)
	const selectedColumnOrder =
		columnOrders == null
			? null
			: (fixedColumnOrder ?? getOrderForBreakpoint(columnOrderEntries, breakpoint) ?? defaultColumnOrder)

	useEffect(() => {
		applyColumnOrder({ instance, order: selectedColumnOrder })
	}, [instance, selectedColumnOrder])
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
