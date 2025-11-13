import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ColumnOrderState,
	getCoreRowModel,
	getExpandedRowModel,
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
import { buildHierarchy } from '../grouping/GroupingEngine'
import { useChainsStrategy } from '../strategies/ChainsStrategy'
import type { PriorityMetric } from '../strategies/hooks/usePriorityChainDatasets'
import { useProtocolsStrategy } from '../strategies/ProtocolsStrategy'
import type { NormalizedRow, UnifiedRowNode } from '../types'
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
	table: Table<UnifiedRowNode>
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

	const hierarchy = useMemo(() => buildHierarchy(filteredRows, sanitizedHeaders), [filteredRows, sanitizedHeaders])

	const columns = useMemo(() => getUnifiedTableColumns(config.strategyType), [config.strategyType])
	const chainLoadingStates =
		(strategyResult as { chainLoadingStates?: Map<string, Set<PriorityMetric>> }).chainLoadingStates ??
		new Map<string, Set<PriorityMetric>>()
	const explodeByChain = sanitizedHeaders.includes('chain')

	const getSubRows = useCallback((row: UnifiedRowNode) => row.children ?? [], [])

	const table = useReactTable<UnifiedRowNode>({
		data: hierarchy,
		columns,
		getSubRows,
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
		paginateExpandedRows: false,
		meta: {
			chainLoadingStates,
			explodeByChain
		},
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetAll: false
	})

	const rowsSignature = useMemo(() => filteredRows.map((row) => row.id).join('|'), [filteredRows])

	const headerSignature = useMemo(() => sanitizedHeaders.join('|'), [sanitizedHeaders])
	const resetSignatureRef = useRef<string | null>(null)

	useEffect(() => {
		const compositeSignature = `${headerSignature}|${rowsSignature}`
		if (resetSignatureRef.current === compositeSignature) {
			return
		}
		resetSignatureRef.current = compositeSignature
		setExpanded({})
		setPagination((prev) => {
			if (prev.pageIndex === 0) return prev
			return { ...prev, pageIndex: 0 }
		})
	}, [headerSignature, rowsSignature])

	return {
		table,
		isLoading: strategyResult.isLoading,
		rowHeaders: sanitizedHeaders,
		leafRows: filteredRows,
		columns,
		chainLoadingStates
	}
}
