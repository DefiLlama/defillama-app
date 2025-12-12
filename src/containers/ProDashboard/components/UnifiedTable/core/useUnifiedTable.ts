import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import type { ChainMetrics } from '~/server/unifiedTable/protocols'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { getUnifiedTableColumns } from '../config/ColumnRegistry'
import type { NormalizedRow } from '../types'
import { filterRowsByConfig, filterRowsBySearch } from '../utils/dataFilters'
import { sanitizeRowHeaders } from '../utils/rowHeaders'
import { setChainMetrics } from './chainMetricsStore'
import { getGroupingColumnIdsForHeaders } from './grouping'
import { getRowHeaderFromGroupingColumn, isSelfGroupingValue } from './groupingUtils'

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
	chainMetrics?: Record<string, ChainMetrics>
}

const buildQueryString = (config: UnifiedTableConfig, rowHeaders: UnifiedRowHeaderType[]): string => {
	const params = new URLSearchParams()

	rowHeaders.forEach((header) => params.append('rowHeaders[]', header))

	if (config.params?.chains) {
		config.params.chains.forEach((chain) => params.append('chains[]', chain))
	}

	return params.toString()
}

const fetchUnifiedTableRows = async (config: UnifiedTableConfig, rowHeaders: UnifiedRowHeaderType[]) => {
	const queryString = buildQueryString(config, rowHeaders)
	const response = await fetch(`/api/unified-table/protocols?${queryString}`)

	if (!response.ok) {
		throw new Error('Failed to load ProTable data')
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
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })

	const setExpanded = (
		updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
	) => {
		setExpandedInternal((prevExpanded) => {
			const next = typeof updater === 'function' ? updater(prevExpanded) : updater
			return next
		})
	}

	const sanitizedHeaders = useMemo(() => sanitizeRowHeaders(config.rowHeaders), [config.rowHeaders])

	const paramsKey = useMemo(
		() => JSON.stringify({ chains: config.params?.chains ?? [] }),
		[config.params?.chains]
	)
	const headersKey = useMemo(() => sanitizedHeaders.join('|'), [sanitizedHeaders])

	const { data, isLoading } = useQuery({
		queryKey: ['unified-table', paramsKey, headersKey],
		queryFn: () => fetchUnifiedTableRows(config, sanitizedHeaders),
		staleTime: 60 * 1000
	})

	useEffect(() => {
		setChainMetrics(data?.chainMetrics)
	}, [data?.chainMetrics])

	const rows = data?.rows ?? []

	const filteredRows = useMemo(() => {
		const withFilters = filterRowsByConfig(rows, config.filters)
		return filterRowsBySearch(withFilters, searchTerm)
	}, [rows, config.filters, searchTerm])

	const columns = useMemo(() => getUnifiedTableColumns(config.customColumns), [config.customColumns])
	const groupingColumnIds = useMemo(() => getGroupingColumnIdsForHeaders(sanitizedHeaders), [sanitizedHeaders])

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

	const mergeColumnVisibility = useCallback(
		(visibility: VisibilityState): VisibilityState => {
			const merged = { ...visibility }
			for (const columnId of groupingColumnIds) {
				merged[columnId] = false
			}
			return merged
		},
		[groupingColumnIds]
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
		paginateExpandedRows: true,
		getRowCanExpand: (row) => {
			if (!row.getIsGrouped()) {
				return false
			}
			const header = getRowHeaderFromGroupingColumn(row.groupingColumnId)
			if (!header) {
				return false
			}
			if (header === 'protocol') {
				return row.subRows.length > 1
			}
			if (header === 'parent-protocol') {
				const isSelfParentGroup = isSelfGroupingValue(row.groupingValue as string | undefined)
				if (isSelfParentGroup) {
					return row.subRows.length > 1
				}
				return row.subRows.length > 0
			}
			return row.subRows.length > 0
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
