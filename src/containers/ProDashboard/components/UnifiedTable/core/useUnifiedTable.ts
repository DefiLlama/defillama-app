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
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { getUnifiedTableColumns } from '../config/ColumnRegistry'
import { getGroupingColumnIdsForHeaders } from './grouping'
import { useChainsStrategy } from '../strategies/ChainsStrategy'
import type { PriorityMetric } from '../strategies/hooks/usePriorityChainDatasets'
import { useProtocolsStrategy } from '../strategies/ProtocolsStrategy'
import type { NormalizedRow } from '../types'
import { filterRowsByConfig, filterRowsBySearch } from '../utils/dataFilters'
import { sanitizeRowHeaders } from '../utils/rowHeaders'

interface UseUnifiedTableArgs {
	config: UnifiedTableConfig
	searchTerm: string
	chainPriorityHints?: string[]
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
	chainLoadingStates: Map<string, Set<PriorityMetric>>
}

export function useUnifiedTable({
	config,
	searchTerm,
	chainPriorityHints,
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

	const protocolsResult = useProtocolsStrategy(config.params ?? null, sanitizedHeaders, chainPriorityHints)
	const chainsResult = useChainsStrategy(config.params ?? null, sanitizedHeaders)

	const strategyResult = config.strategyType === 'protocols' ? protocolsResult : chainsResult

	const filteredRows = useMemo(() => {
		const withFilters = filterRowsByConfig(strategyResult.rows, config.filters)
		return filterRowsBySearch(withFilters, searchTerm)
	}, [strategyResult.rows, config.filters, searchTerm])

	const columns = useMemo(() => getUnifiedTableColumns(config.strategyType), [config.strategyType])
	const chainLoadingStates =
		(strategyResult as { chainLoadingStates?: Map<string, Set<PriorityMetric>> }).chainLoadingStates ??
		new Map<string, Set<PriorityMetric>>()
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
		meta: {
			chainLoadingStates
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
		isLoading: strategyResult.isLoading,
		rowHeaders: sanitizedHeaders,
		leafRows: filteredRows,
		columns,
		chainLoadingStates
	}
}
