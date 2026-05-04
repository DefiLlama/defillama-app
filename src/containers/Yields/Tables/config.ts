import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'

export type YieldsRendererKind = 'virtual' | 'paginated'
export type YieldsTableKind = 'pools' | 'borrow' | 'loop' | 'optimizer' | 'strategy' | 'strategyFr'

type MaybeFactory<T, TContext> = T | ((context: TContext) => T)

export interface YieldsTableConfig<TRow, TColumnId extends string, TContext = undefined> {
	kind: YieldsTableKind
	columnIds: readonly TColumnId[]
	columns: MaybeFactory<Array<ColumnDef<TRow, any>>, TContext>
	columnOrders: Record<number, readonly TColumnId[]>
	columnVisibility?: MaybeFactory<VisibilityState | undefined, TContext>
	defaultSorting?: SortingState
	rowSize?: number
}

export function getYieldsColumnId<TRow>(column: ColumnDef<TRow, any>) {
	if ('id' in column && typeof column.id === 'string') return column.id
	if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey
	return undefined
}

function resolveFactoryValue<T, TContext>(value: MaybeFactory<T, TContext>, context: TContext): T {
	return typeof value === 'function' ? (value as (context: TContext) => T)(context) : value
}

export function getResponsiveYieldsValue<T>(valuesByBreakpoint: Record<number, T>, width: number): T | undefined {
	const sortedBreakpoints = Object.keys(valuesByBreakpoint)
		.map(Number)
		.sort((left, right) => right - left)

	for (const breakpoint of sortedBreakpoints) {
		if (width >= breakpoint) {
			return valuesByBreakpoint[breakpoint]
		}
	}

	return undefined
}

export function preparePaginatedYieldsColumns<TRow, TColumnId extends string, TContext>(
	config: YieldsTableConfig<TRow, TColumnId, TContext>,
	context: TContext,
	width?: number
) {
	const columns = resolveFactoryValue(config.columns, context)
	const columnVisibility = config.columnVisibility ? resolveFactoryValue(config.columnVisibility, context) : undefined
	const responsiveOrder = width != null ? (getResponsiveYieldsValue(config.columnOrders, width) ?? []) : []
	const orderIndexes = new Map(responsiveOrder.map((columnId, index) => [columnId, index]))

	return columns
		.map((column, index) => ({ column, id: getYieldsColumnId(column), index }))
		.filter(({ id }) => (id ? columnVisibility?.[id] !== false : true))
		.sort((left, right) => {
			const leftOrder = left.id != null ? orderIndexes.get(left.id as TColumnId) : undefined
			const rightOrder = right.id != null ? orderIndexes.get(right.id as TColumnId) : undefined

			if (leftOrder != null && rightOrder != null) return leftOrder - rightOrder
			if (leftOrder != null) return -1
			if (rightOrder != null) return 1
			return left.index - right.index
		})
		.map(({ column }) => column)
}

export function resolveVirtualYieldsTableConfig<TRow, TColumnId extends string, TContext>(
	config: YieldsTableConfig<TRow, TColumnId, TContext>,
	context: TContext
): {
	columns: Array<ColumnDef<TRow, any>>
	columnVisibility?: VisibilityState
	columnOrders: ColumnOrdersByBreakpoint
	defaultSorting?: SortingState
	rowSize?: number
} {
	return {
		columns: resolveFactoryValue(config.columns, context),
		columnVisibility: config.columnVisibility ? resolveFactoryValue(config.columnVisibility, context) : undefined,
		columnOrders: config.columnOrders as unknown as ColumnOrdersByBreakpoint,
		defaultSorting: config.defaultSorting,
		rowSize: config.rowSize
	}
}

export function validateYieldsTableConfig<TRow, TColumnId extends string, TContext>(
	config: YieldsTableConfig<TRow, TColumnId, TContext>,
	context: TContext
) {
	const actualColumnIds = new Set(resolveFactoryValue(config.columns, context).map(getYieldsColumnId).filter(Boolean))
	const declaredColumnIds = new Set<string>(config.columnIds)

	for (const columnId of declaredColumnIds) {
		if (!actualColumnIds.has(columnId)) {
			throw new Error(`Missing column definition for "${columnId}" in yields table kind "${config.kind}"`)
		}
	}

	for (const columnId of actualColumnIds) {
		if (!declaredColumnIds.has(columnId)) {
			throw new Error(`Undeclared column id "${columnId}" in yields table kind "${config.kind}"`)
		}
	}

	for (const [breakpoint, order] of Object.entries(config.columnOrders)) {
		for (const columnId of order) {
			if (!declaredColumnIds.has(columnId)) {
				throw new Error(
					`Unknown column id "${columnId}" in column order for yields table kind "${config.kind}" at breakpoint ${breakpoint}`
				)
			}
		}
	}
}
