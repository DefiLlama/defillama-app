'use no memo'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { downloadCSV } from '~/utils'
import { useProDashboardEditorActions, useProDashboardPermissions } from '../../ProDashboardAPIContext'
import type { CustomColumnDefinition, TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '../../types'
import { DEFAULT_ROW_HEADERS, DEFAULT_UNIFIED_TABLE_SORTING } from './constants'
import type { CsvExportLevel } from './core/CsvExportDropdown'
import { isGroupingColumnId } from './core/grouping'
import { UnifiedTablePagination } from './core/TablePagination'
import { TableRenderer } from './core/TableRenderer'
import { UnifiedTableHeader } from './core/UnifiedTableHeader'
import { useUnifiedTable } from './core/useUnifiedTable'
import type { NormalizedRow, UnifiedTableProps } from './types'
import {
	applyRowHeaderVisibilityRules,
	getDefaultColumnOrder,
	getDefaultColumnVisibility,
	normalizeSorting
} from './utils/configHelpers'
import { buildGroupedCsvData, getRowsAtGroupLevel } from './utils/csvExport'
import { evaluateExpression } from './utils/customColumns'
import { getActiveFilterChips } from './utils/filterChips'
import type { ActiveFilterChip } from './utils/filterChips'
import { sanitizeRowHeaders } from './utils/rowHeaders'

const arraysEqual = (a: string[], b: string[]) => {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

// Count keys in 'a' while comparing values, then verify 'b' has the same count
const recordsEqual = (a: Record<string, boolean>, b: Record<string, boolean>) => {
	let count = 0
	for (const key in a) {
		if (a[key] !== b[key]) return false
		count++
	}
	for (const _ in b) {
		if (--count < 0) return false
	}
	return count === 0
}

const sortingEquals = (a: SortingState, b: SortingState) => {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		const value = a[i]
		const other = b[i]
		if (!other || value.id !== other.id || Boolean(value.desc) !== Boolean(other.desc)) {
			return false
		}
	}
	return true
}

const CSV_PERCENT_COLUMNS = new Set([
	'change1d',
	'change7d',
	'change1m',
	'volumeChange_1d',
	'volumeChange_7d',
	'volumeChange_1m',
	'volumeDominance_24h',
	'volumeMarketShare7d',
	'feesChange_1d',
	'feesChange_7d',
	'feesChange_1m',
	'revenueChange_1d',
	'revenueChange_7d',
	'revenueChange_1m',
	'perps_volume_change_1d',
	'perps_volume_change_7d',
	'perps_volume_change_1m',
	'perps_volume_dominance_24h',
	'aggregators_volume_change_1d',
	'aggregators_volume_change_7d',
	'aggregators_volume_dominance_24h',
	'aggregators_volume_marketShare7d',
	'derivatives_aggregators_volume_change_1d',
	'derivatives_aggregators_volume_change_7d',
	'derivatives_aggregators_volume_change_1m',
	'options_volume_change_1d',
	'options_volume_change_7d',
	'options_volume_dominance_24h'
])

const ROW_HEADER_LABELS: Record<UnifiedRowHeaderType, string> = {
	chain: 'Chain',
	category: 'Category',
	'parent-protocol': 'Protocol',
	protocol: 'Protocol'
}

interface RowGroupingOption {
	id: string
	label: string
	headers: UnifiedRowHeaderType[]
}

const PROTOCOL_GROUPING_OPTIONS: RowGroupingOption[] = [
	{ id: 'parent-protocol', label: 'Protocol Group › Protocol', headers: ['parent-protocol', 'protocol'] },
	{ id: 'protocol-only', label: 'Protocol only', headers: ['protocol'] },
	{ id: 'category-protocol', label: 'Category › Protocol', headers: ['category', 'parent-protocol', 'protocol'] },
	{ id: 'chain-protocol', label: 'Chain › Protocol', headers: ['chain', 'parent-protocol', 'protocol'] },
	{
		id: 'chain-category-protocol',
		label: 'Chain › Category › Protocol',
		headers: ['chain', 'category', 'parent-protocol', 'protocol']
	}
]

const PROTOCOL_GROUPING_OPTION_MAP = new Map(PROTOCOL_GROUPING_OPTIONS.map((option) => [option.id, option]))
const PROTOCOL_GROUPING_HEADERS = PROTOCOL_GROUPING_OPTIONS.map(({ id, label }) => ({ id, label }))
const EMPTY_COLUMN_ORDER: string[] = []
const EMPTY_CHAINS: string[] = []

const rowHeadersMatch = (a: UnifiedRowHeaderType[], b: UnifiedRowHeaderType[]) => {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

const sanitizeFilters = (filters: TableFilters): TableFilters | undefined => {
	const result: Record<string, unknown> = {}
	let hasKeys = false
	for (const key in filters) {
		const value = filters[key]
		if (value == null) {
			continue
		}
		if (typeof value === 'boolean') {
			if (value === true) {
				result[key] = value
				hasKeys = true
			}
			continue
		}
		if (typeof value === 'string') {
			if (value.trim().length > 0) {
				result[key] = value
				hasKeys = true
			}
			continue
		}
		if (Array.isArray(value)) {
			if (value.length > 0) {
				result[key] = value
				hasKeys = true
			}
			continue
		}
		result[key] = value
		hasKeys = true
	}

	return hasKeys ? (result as TableFilters) : undefined
}

const metricFromColumn = (columnId: string) => columnId

const toCsvValue = (columnId: string, row: NormalizedRow, customColumns?: CustomColumnDefinition[]): string => {
	if (columnId === 'name') {
		return row.name
	}

	if (columnId === 'chain') {
		return row.chain ?? ''
	}

	if (columnId === 'category') {
		return row.category ?? ''
	}

	if (columnId.startsWith('custom_')) {
		const customCol = customColumns?.find((c) => c.id === columnId)
		if (customCol) {
			const value = evaluateExpression(customCol.expression, row.metrics)
			if (value === null) return ''
			if (customCol.format === 'percent') {
				return value.toFixed(2)
			}
			return String(value)
		}
		return ''
	}

	const metricKey = metricFromColumn(columnId)
	const value = row.metrics?.[metricKey as keyof typeof row.metrics]

	if (value == null) {
		return ''
	}

	if (CSV_PERCENT_COLUMNS.has(columnId) && typeof value === 'number') {
		return value.toFixed(2)
	}

	return typeof value === 'number' ? String(value) : ''
}

function UnifiedTable({
	config,
	previewMode = false,
	columnOrderOverride,
	columnVisibilityOverride,
	sortingOverride,
	onPreviewColumnOrderChange,
	onPreviewColumnVisibilityChange,
	onPreviewSortingChange,
	onEdit,
	onOpenColumnModal
}: UnifiedTableProps) {
	const { handleEditItem } = useProDashboardEditorActions()
	const { isReadOnly } = useProDashboardPermissions()
	const [searchTerm, setSearchTerm] = useState('')
	const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>(() => getDefaultColumnOrder(config))
	const [columnVisibilityState, setColumnVisibilityState] = useState<VisibilityState>(() =>
		getDefaultColumnVisibility(config)
	)
	const [sortingState, setSortingState] = useState<SortingState>(() => normalizeSorting(config.defaultSorting))
	const {
		columnOrder: configColumnOrder,
		columnVisibility: configColumnVisibility,
		customColumns: configCustomColumns
	} = config
	const hydratingRef = useRef(false)
	const canEditFilters = !previewMode && !isReadOnly
	const tableRowHeaders = useMemo(
		() => (config.rowHeaders && config.rowHeaders.length ? [...config.rowHeaders] : [...DEFAULT_ROW_HEADERS]),
		[config.rowHeaders]
	)
	const resolvedRowHeaders = useMemo(() => sanitizeRowHeaders(tableRowHeaders), [tableRowHeaders])
	const filterChips = useMemo(() => getActiveFilterChips(config.filters), [config.filters])
	const activeFilterCount = filterChips.length
	const canEditGrouping = !previewMode && !isReadOnly && PROTOCOL_GROUPING_OPTIONS.length > 0
	const selectedGroupingId = useMemo(() => {
		if (!PROTOCOL_GROUPING_OPTIONS.length) {
			return undefined
		}
		const match = PROTOCOL_GROUPING_OPTIONS.find((option) => rowHeadersMatch(option.headers, resolvedRowHeaders))
		return match?.id
	}, [resolvedRowHeaders])

	const effectiveColumnOrder = previewMode ? (columnOrderOverride ?? getDefaultColumnOrder(config)) : columnOrderState
	const effectiveColumnVisibility = previewMode
		? (columnVisibilityOverride ?? getDefaultColumnVisibility(config))
		: columnVisibilityState
	const effectiveSorting = previewMode ? (sortingOverride ?? normalizeSorting(config.defaultSorting)) : sortingState
	const effectiveColumnOrderRef = useRef(effectiveColumnOrder)
	const effectiveColumnVisibilityRef = useRef(effectiveColumnVisibility)
	const effectiveSortingRef = useRef(effectiveSorting)

	useLayoutEffect(() => {
		effectiveColumnOrderRef.current = effectiveColumnOrder
		effectiveColumnVisibilityRef.current = effectiveColumnVisibility
		effectiveSortingRef.current = effectiveSorting
	}, [effectiveColumnOrder, effectiveColumnVisibility, effectiveSorting])

	useEffect(() => {
		if (previewMode) return
		hydratingRef.current = true
		const timer = setTimeout(() => {
			hydratingRef.current = false
		}, 0)
		return () => clearTimeout(timer)
	}, [config.columnOrder, config.columnVisibility, config.defaultSorting, previewMode])

	useEffect(() => {
		if (!previewMode) {
			setColumnOrderState(() =>
				getDefaultColumnOrder({
					columnOrder: configColumnOrder,
					customColumns: configCustomColumns
				} as UnifiedTableConfig)
			)
		}
	}, [configColumnOrder, configCustomColumns, previewMode])

	useEffect(() => {
		if (!previewMode) {
			setColumnVisibilityState(() =>
				getDefaultColumnVisibility({
					columnVisibility: configColumnVisibility,
					customColumns: configCustomColumns
				} as UnifiedTableConfig)
			)
		}
	}, [configColumnVisibility, configCustomColumns, previewMode])

	useEffect(() => {
		if (!previewMode) {
			const nextSorting = normalizeSorting(config.defaultSorting)
			if (!sortingEquals(sortingState, nextSorting)) {
				setSortingState(() => nextSorting)
			}
		}
	}, [config.defaultSorting, previewMode, sortingState])

	useEffect(() => {
		if (previewMode || isReadOnly) return
		if (hydratingRef.current) return
		const configOrder = config.columnOrder ?? EMPTY_COLUMN_ORDER
		const configVisibility = config.columnVisibility ?? {}
		const configSorting =
			config.defaultSorting && config.defaultSorting.length ? config.defaultSorting : DEFAULT_UNIFIED_TABLE_SORTING

		const orderChanged = !arraysEqual(columnOrderState, configOrder)
		const visibilityChanged = !recordsEqual(columnVisibilityState, configVisibility)
		const sortingChanged = !sortingEquals(sortingState, configSorting)

		if (!orderChanged && !visibilityChanged && !sortingChanged) return

		handleEditItem(config.id, {
			...config,
			columnOrder: columnOrderState,
			columnVisibility: columnVisibilityState,
			defaultSorting: sortingState.map((item) => ({ ...item }))
		})
	}, [columnOrderState, columnVisibilityState, config, handleEditItem, isReadOnly, previewMode, sortingState])

	const handleColumnOrderChange = useCallback(
		(updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveColumnOrderRef.current) : updater
				onPreviewColumnOrderChange?.(next)
				return
			}
			setColumnOrderState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		},
		[onPreviewColumnOrderChange, previewMode]
	)

	const handleColumnVisibilityChange = useCallback(
		(updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveColumnVisibilityRef.current) : updater
				onPreviewColumnVisibilityChange?.(next)
				return
			}
			setColumnVisibilityState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		},
		[onPreviewColumnVisibilityChange, previewMode]
	)

	const handleSortingChange = useCallback(
		(updater: SortingState | ((prev: SortingState) => SortingState)) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveSortingRef.current) : updater
				onPreviewSortingChange?.(next)
				return
			}
			setSortingState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		},
		[onPreviewSortingChange, previewMode]
	)

	const memoizedConfig = useMemo<UnifiedTableConfig>(
		() => ({
			id: config.id,
			kind: config.kind,
			rowHeaders: tableRowHeaders,
			params: config.params,
			filters: config.filters,
			customColumns: config.customColumns
		}),
		[config.id, config.kind, config.params, config.filters, config.customColumns, tableRowHeaders]
	)

	const unifiedTable = useUnifiedTable({
		config: memoizedConfig,
		searchTerm,
		columnOrder: effectiveColumnOrder,
		columnVisibility: effectiveColumnVisibility,
		sorting: effectiveSorting,
		onColumnOrderChange: handleColumnOrderChange,
		onColumnVisibilityChange: handleColumnVisibilityChange,
		onSortingChange: handleSortingChange
	})
	const tableRef = useRef(unifiedTable.table)
	useEffect(() => {
		tableRef.current = unifiedTable.table
	}, [unifiedTable.table])
	const rowCount = unifiedTable.table.getRowModel().rows.length
	const expandedCount = Object.keys(unifiedTable.expanded).length
	const rowStateVersion = `${rowCount}:${expandedCount}`

	const persistConfigChanges = useCallback(
		(overrides: Partial<UnifiedTableConfig>) => {
			if (previewMode || isReadOnly) {
				return
			}
			handleEditItem(config.id, {
				...config,
				columnOrder: columnOrderState,
				columnVisibility: columnVisibilityState,
				defaultSorting: sortingState.map((item) => ({ ...item })),
				...overrides
			})
		},
		[columnOrderState, columnVisibilityState, config, handleEditItem, isReadOnly, previewMode, sortingState]
	)

	const handleFilterChipRemove = useCallback(
		(chip: ActiveFilterChip) => {
			if (!canEditFilters) {
				return
			}
			const currentFilters: TableFilters = { ...(config.filters ?? {}) }
			let changed = false
			for (const key of chip.clearKeys) {
				if (key in currentFilters) {
					delete currentFilters[key]
					changed = true
				}
			}
			if (!changed) {
				return
			}
			const nextFilters = sanitizeFilters(currentFilters)
			persistConfigChanges(nextFilters ? { filters: nextFilters } : { filters: undefined })
		},
		[canEditFilters, config.filters, persistConfigChanges]
	)

	const handleClearFilters = useCallback(() => {
		if (!canEditFilters) {
			return
		}
		if (!config.filters) {
			return
		}
		let hasFilters = false
		for (const _ in config.filters) {
			hasFilters = true
			break
		}
		if (!hasFilters) {
			return
		}
		persistConfigChanges({ filters: undefined })
	}, [canEditFilters, config.filters, persistConfigChanges])

	const handleGroupingChange = useCallback(
		(groupingId: string) => {
			const option = PROTOCOL_GROUPING_OPTION_MAP.get(groupingId)
			if (!option) {
				return
			}
			const normalizedHeaders = sanitizeRowHeaders(option.headers)
			const nextVisibility = applyRowHeaderVisibilityRules(normalizedHeaders, { ...columnVisibilityState })
			persistConfigChanges({ rowHeaders: normalizedHeaders, columnVisibility: nextVisibility })
		},
		[columnVisibilityState, persistConfigChanges]
	)

	const handleExportClick = useCallback(() => {
		const table = tableRef.current
		const leafColumns = table
			.getAllLeafColumns()
			.filter((column) => column.getIsVisible() && !isGroupingColumnId(column.id))

		const columnHeaders = leafColumns.map((column) => {
			const header = column.columnDef.header
			return typeof header === 'string' ? header : (column.id ?? '')
		})

		const sortedLeafRows: NormalizedRow[] = []
		const collectLeafRows = (rows: ReturnType<(typeof table)['getRowModel']>['rows']) => {
			for (const row of rows) {
				if (row.getIsGrouped() && row.subRows?.length) {
					collectLeafRows(row.subRows)
				} else if (row.original) {
					sortedLeafRows.push(row.original)
				}
			}
		}
		collectLeafRows(table.getRowModel().rows)

		const nameIndex = columnHeaders.findIndex((h) => h === 'Name' || h === 'name')
		const insertIndex = nameIndex >= 0 ? nameIndex + 1 : 0
		const headers = [...columnHeaders.slice(0, insertIndex), 'Chain', ...columnHeaders.slice(insertIndex)]
		const csvRows = sortedLeafRows.map((row) => {
			const rowData = leafColumns.map((column) => toCsvValue(column.id, row, config.customColumns))
			return [...rowData.slice(0, insertIndex), row.chain ?? '', ...rowData.slice(insertIndex)]
		})

		downloadCSV(`unified-table.csv`, [headers, ...csvRows])
	}, [config.customColumns])

	const handleCsvClick = useCallback(() => {
		if (!unifiedTable.leafRows.length) return
		handleExportClick()
	}, [handleExportClick, unifiedTable.leafRows.length])

	const handleExportAtLevel = useCallback(
		(level: CsvExportLevel) => {
			if (!unifiedTable.leafRows.length) return

			const table = tableRef.current
			const leafColumns = table
				.getAllLeafColumns()
				.filter((column) => column.getIsVisible() && !isGroupingColumnId(column.id))

			if (level === 'all') {
				handleExportClick()
				return
			}

			const groupedRows = getRowsAtGroupLevel(table, level)
			if (!groupedRows.length) {
				handleExportClick()
				return
			}

			const { headers, data } = buildGroupedCsvData(groupedRows, leafColumns, CSV_PERCENT_COLUMNS, level)
			downloadCSV(`unified-table-${level}.csv`, [headers, ...data])
		},
		[handleExportClick, unifiedTable.leafRows.length]
	)

	const title = 'Protocols overview'
	const scopeDescription = useMemo(() => {
		const selectedChains = (config.params?.chains ?? EMPTY_CHAINS).filter((value): value is string => Boolean(value))
		if (!selectedChains.length || selectedChains.includes('All')) {
			return 'Scope: All chains'
		}
		if (selectedChains.length <= 3) {
			return `Scope: ${selectedChains.join(', ')}`
		}
		return `Scope: ${selectedChains.length} chains`
	}, [config.params?.chains])
	const rowHeadersSummary = useMemo(() => {
		if (!resolvedRowHeaders.length) {
			return null
		}
		const labels = resolvedRowHeaders.map((header) => ROW_HEADER_LABELS[header] ?? header)
		const uniqueLabels = [...new Set(labels)]
		return uniqueLabels.join(' › ')
	}, [resolvedRowHeaders])

	const handleCustomizeColumns = useCallback(() => {
		if (previewMode || isReadOnly) return
		if (onOpenColumnModal) {
			onOpenColumnModal()
			return
		}
		onEdit?.('columns')
	}, [isReadOnly, onEdit, onOpenColumnModal, previewMode])

	const handleFiltersClick = useCallback(() => {
		onEdit?.('filters')
	}, [onEdit])

	const canCustomizeColumns = Boolean(!previewMode && !isReadOnly && (onOpenColumnModal || onEdit))

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-2 sm:p-4">
			<UnifiedTableHeader
				title={title}
				scopeDescription={scopeDescription}
				rowHeadersSummary={rowHeadersSummary}
				onCustomizeColumns={canCustomizeColumns ? handleCustomizeColumns : undefined}
				onCsvExport={handleCsvClick}
				onCsvExportLevel={handleExportAtLevel}
				rowHeaders={resolvedRowHeaders}
				isExportDisabled={!unifiedTable.leafRows.length}
				isLoading={unifiedTable.isLoading}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				filterChips={filterChips}
				onFilterRemove={canEditFilters ? handleFilterChipRemove : undefined}
				onClearFilters={canEditFilters ? handleClearFilters : undefined}
				filtersEditable={canEditFilters}
				activeFilterCount={activeFilterCount}
				onFiltersClick={canEditFilters && onEdit ? handleFiltersClick : undefined}
				groupingOptions={PROTOCOL_GROUPING_HEADERS}
				selectedGroupingId={selectedGroupingId}
				onGroupingChange={canEditGrouping ? handleGroupingChange : undefined}
			/>
			<TableRenderer
				table={unifiedTable.table}
				isLoading={unifiedTable.isLoading}
				isEmpty={!unifiedTable.leafRows.length}
				emptyMessage="No rows match your scope or filters."
				rowStateVersion={rowStateVersion}
			/>
			<UnifiedTablePagination table={unifiedTable.table} />
		</div>
	)
}

export default UnifiedTable
