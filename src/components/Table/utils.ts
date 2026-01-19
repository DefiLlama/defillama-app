import type { ColumnOrderState, ColumnSizingState } from '@tanstack/react-table'

export type BreakpointMap<T> = Record<number, T>
export type ColumnSizesByBreakpoint = BreakpointMap<ColumnSizingState>
export type ColumnOrdersByBreakpoint = BreakpointMap<ColumnOrderState>

type ColumnTableInstance = {
	setColumnSizing: (sizing: ColumnSizingState) => void
	setColumnOrder: (order: ColumnOrderState) => void
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
export function sortColumnSizesAndOrders({
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

	const getBreakpointValue = <T>(sizes: BreakpointMap<T>) => {
		return Object.entries(sizes)
			.map(([size, value]) => [Number(size), value] as const)
			.sort(([a], [b]) => b - a)
			.find(([size]) => width >= size)?.[1]
	}

	if (columnSizes) {
		const size = getBreakpointValue(columnSizes)
		if (size !== undefined) {
			instance.setColumnSizing(size)
		}
	}

	if (columnOrders) {
		const order = getBreakpointValue(columnOrders)
		if (order !== undefined) {
			instance.setColumnOrder(order)
		}
	}
}
