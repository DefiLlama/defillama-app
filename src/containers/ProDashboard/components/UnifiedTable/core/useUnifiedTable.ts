import { useCallback, useMemo, useState } from 'react'
import {
	ColumnOrderState,
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	PaginationState,
	SortingState,
	useReactTable,
	VisibilityState,
	type Table
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { getUnifiedTableColumns } from '../config/ColumnRegistry'
import { getGroupingColumnIdsForHeaders } from './grouping'
import type { NormalizedRow } from '../types'
import { filterRowsByConfig, filterRowsBySearch } from '../utils/dataFilters'
import { sanitizeRowHeaders } from '../utils/rowHeaders'

interface UseUnifiedTableArgs {
	config: UnifiedTableConfig
	searchTerm: string
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	sorting: SortingState
	onColumnOrderChange: (stateUpdater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => void
	onColumnVisibilityChange: (stateUpdater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void
	onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void
}

interface UseUnifiedTableResult {
	table: Table<NormalizedRow>
	isLoading: boolean
	rowHeaders: UnifiedRowHeaderType[]
	leafRows: NormalizedRow[]
	columns: ReturnType<typeof getUnifiedTableColumns>
}

type UnifiedTableApiResponse = {
	rows: NormalizedRow[]
}

const createFiltersKey = (filters: TableFilters | undefined): string => {
	if (!filters) return 'no-filters'
	const entries = Object.entries(filters).filter(([, value]) => {
		if (value === undefined || value === null) return false
		if (Array.isArray(value)) {
			return value.length > 0
		}
		return true
	})
	if (entries.length === 0) return 'no-filters'
	const normalized = entries
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				return [key, [...value].sort()]
			}
			return [key, value]
		})
		.sort((a, b) => a[0].localeCompare(b[0]))
	return JSON.stringify(normalized)
}

const fetchUnifiedTableRows = async (
	strategyType: UnifiedTableConfig['strategyType'],
	config: UnifiedTableConfig,
	rowHeaders: UnifiedRowHeaderType[]
) => {
	const response = await fetch(`/api/unified-table/${strategyType}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			config,
			rowHeaders
		})
	})

	if (!response.ok) {
		throw new Error('Failed to load unified table data')
	}

	return (await response.json()) as UnifiedTableApiResponse
}

export function useUnifiedTable({
	config,
	searchTerm,
	columnOrder,
	columnVisibility,
	sorting,
	onColumnOrderChange,
	onColumnVisibilityChange,
	onSortingChange
}: UseUnifiedTableArgs): UseUnifiedTableResult {
	const [expanded, setExpandedInternal] = useState<Record<string, boolean>>({})
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

	const setExpanded = (
		updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
	) => {
		setExpandedInternal((prevExpanded) => {
			const next = typeof updater === 'function' ? updater(prevExpanded) : updater
			return next
		})
	}

	const sanitizedHeaders = useMemo(
		() => sanitizeRowHeaders(config.rowHeaders, config.strategyType),
		[config.rowHeaders, config.strategyType]
	)

	const paramsKey = useMemo(() => JSON.stringify(config.params ?? {}), [config.params])
	const headersKey = useMemo(() => sanitizedHeaders.join('|'), [sanitizedHeaders])
	const filtersKey = useMemo(() => createFiltersKey(config.filters), [config.filters])

	const { data, isLoading } = useQuery({
		queryKey: ['unified-table', config.strategyType, paramsKey, headersKey, filtersKey],
		queryFn: () => fetchUnifiedTableRows(config.strategyType, config, sanitizedHeaders),
		staleTime: 60 * 1000
	})

	const rows = data?.rows ?? []

	const filteredRows = useMemo(() => {
		const withFilters = filterRowsByConfig(rows, config.filters)
		return filterRowsBySearch(withFilters, searchTerm)
	}, [rows, config.filters, searchTerm])

	const columns = useMemo(() => getUnifiedTableColumns(config.strategyType), [config.strategyType])
	const groupingColumnIds = useMemo(
		() => getGroupingColumnIdsForHeaders(sanitizedHeaders),
		[sanitizedHeaders]
	)

	const groupingColumnSet = useMemo(() => new Set(groupingColumnIds), [groupingColumnIds])

	const mergeColumnOrder = useCallback(
		(order: ColumnOrderState): ColumnOrderState => {
			const withoutGrouping = order.filter((columnId) => !groupingColumnSet.has(columnId))
			return [...groupingColumnIds, ...withoutGrouping]
		},
		[groupingColumnIds, groupingColumnSet]
	)

	const stripGroupingFromOrder = useCallback(
		(order: ColumnOrderState): ColumnOrderState => order.filter((columnId) => !groupingColumnSet.has(columnId)),
		[groupingColumnSet]
	)

	const tableColumnOrder = useMemo(() => mergeColumnOrder(columnOrder), [columnOrder, mergeColumnOrder])

	const handleColumnOrderChange = useCallback(
		(updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
			if (typeof updater === 'function') {
				onColumnOrderChange((prev) => stripGroupingFromOrder(updater(mergeColumnOrder(prev))))
				return
			}
			onColumnOrderChange(stripGroupingFromOrder(updater))
		},
		[mergeColumnOrder, onColumnOrderChange, stripGroupingFromOrder]
	)

	const groupingColumnVisibilityDefaults = useMemo(() => {
		return groupingColumnIds.reduce<Record<string, boolean>>((acc, columnId) => {
			acc[columnId] = false
			return acc
		}, {})
	}, [groupingColumnIds])

	const mergeColumnVisibility = useCallback(
		(visibility: VisibilityState): VisibilityState => ({
			...visibility,
			...groupingColumnVisibilityDefaults
		}),
		[groupingColumnVisibilityDefaults]
	)

	const stripGroupingFromVisibility = useCallback(
		(visibility: VisibilityState): VisibilityState => {
			const next: VisibilityState = { ...visibility }
			for (const columnId of groupingColumnIds) {
				delete next[columnId]
			}
			return next
		},
		[groupingColumnIds]
	)

	const tableColumnVisibility = useMemo(
		() => mergeColumnVisibility(columnVisibility),
		[columnVisibility, mergeColumnVisibility]
	)

	const handleColumnVisibilityChange = useCallback(
		(updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
			if (typeof updater === 'function') {
				onColumnVisibilityChange((prev) => stripGroupingFromVisibility(updater(mergeColumnVisibility(prev))))
				return
			}
			onColumnVisibilityChange(stripGroupingFromVisibility(updater))
		},
		[mergeColumnVisibility, onColumnVisibilityChange, stripGroupingFromVisibility]
	)

	const table = useReactTable<NormalizedRow>({
		data: filteredRows,
		columns,
		getRowId: (row) => row.id,
		state: {
			columnOrder: tableColumnOrder,
			columnVisibility: tableColumnVisibility,
			sorting,
			grouping: groupingColumnIds,
			expanded,
			pagination
		},
		onColumnOrderChange: handleColumnOrderChange,
		onColumnVisibilityChange: handleColumnVisibilityChange,
		onSortingChange,
		onExpandedChange: setExpanded,
		onPaginationChange: setPagination,
		paginateExpandedRows: false,
		getRowCanExpand: (row) => {
			if (!row.getIsGrouped()) {
				return false
			}
			return row.subRows.length > 1
		},
		getCoreRowModel: getCoreRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		groupedColumnMode: 'remove',
		autoResetExpanded: false,
		autoResetPageIndex: false
	})

	return {
		table,
		isLoading,
		rowHeaders: sanitizedHeaders,
		leafRows: filteredRows,
		columns
	}
}
