import { useEffect, useMemo, useState } from 'react'
import {
	ColumnOrderState,
	PaginationState,
	SortingState,
	VisibilityState,
	getCoreRowModel,
	getExpandedRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type Table
} from '@tanstack/react-table'
import type { UnifiedTableConfig, UnifiedRowHeaderType } from '../../../types'
import type { NormalizedRow, UnifiedRowNode } from '../types'
import { sanitizeRowHeaders } from '../utils/rowHeaders'
import { filterRowsByConfig, filterRowsBySearch } from '../utils/dataFilters'
import { buildHierarchy } from '../grouping/GroupingEngine'
import { useProtocolsStrategy } from '../strategies/ProtocolsStrategy'
import { useChainsStrategy } from '../strategies/ChainsStrategy'
import { getUnifiedTableColumns } from '../config/ColumnRegistry'

interface UseUnifiedTableArgs {
	config: UnifiedTableConfig
	searchTerm: string
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	sorting: SortingState
	onColumnOrderChange: (stateUpdater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => void
	onColumnVisibilityChange: (
		stateUpdater: VisibilityState | ((prev: VisibilityState) => VisibilityState)
	) => void
	onSortingChange: (updater: SortingState | ((prev: SortingState) => SortingState)) => void
}

interface UseUnifiedTableResult {
	table: Table<UnifiedRowNode>
	isLoading: boolean
	rowHeaders: UnifiedRowHeaderType[]
	leafRows: NormalizedRow[]
	columns: ReturnType<typeof getUnifiedTableColumns>
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
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })

	const sanitizedHeaders = useMemo(
		() => sanitizeRowHeaders(config.rowHeaders, config.strategyType),
		[config.rowHeaders, config.strategyType]
	)

	const strategyResult =
		config.strategyType === 'protocols'
			? useProtocolsStrategy(config.params ?? null, sanitizedHeaders)
			: useChainsStrategy(config.params ?? null, sanitizedHeaders)

	const filteredRows = useMemo(() => {
		const withFilters = filterRowsByConfig(strategyResult.rows, config.filters)
		return filterRowsBySearch(withFilters, searchTerm)
	}, [strategyResult.rows, config.filters, searchTerm])

	const hierarchy = useMemo(
		() => buildHierarchy(filteredRows, sanitizedHeaders),
		[filteredRows, sanitizedHeaders]
	)

	const columns = useMemo(() => getUnifiedTableColumns(config.strategyType), [config.strategyType])

	const table = useReactTable<UnifiedRowNode>({
		data: hierarchy,
		columns,
		getSubRows: (row) => row.children ?? [],
		getRowId: (row) => row.id,
		state: {
			columnOrder,
			columnVisibility,
			sorting,
			expanded,
			pagination
		},
		onColumnOrderChange,
		onColumnVisibilityChange,
		onSortingChange,
		onExpandedChange: setExpanded,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	useEffect(() => {
		setExpanded({})
		setPagination((prev) => ({ ...prev, pageIndex: 0 }))
	}, [filteredRows])

	return {
		table,
		isLoading: strategyResult.isLoading,
		rowHeaders: sanitizedHeaders,
		leafRows: filteredRows,
		columns
	}
}
