import { useEffect, useMemo, useState } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { downloadCSV } from '~/utils'
import { useProDashboard } from '../../ProDashboardAPIContext'
import type { UnifiedTableConfig } from '../../types'
import {
	DEFAULT_UNIFIED_TABLE_COLUMN_ORDER_BY_STRATEGY,
	DEFAULT_CHAINS_ROW_HEADERS,
	DEFAULT_PROTOCOLS_ROW_HEADERS
} from './constants'
import { useUnifiedTable } from './core/useUnifiedTable'
import { TableControls } from './core/TableControls'
import { TableRenderer } from './core/TableRenderer'
import { UnifiedTablePagination } from './core/TablePagination'
import type { NormalizedRow } from './types'

const DEFAULT_SORTING: SortingState = [{ id: 'tvl', desc: true }]

const arraysEqual = (a: string[], b: string[]) => {
	if (a.length !== b.length) return false
	return a.every((value, index) => value === b[index])
}

const recordsEqual = (a: Record<string, boolean>, b: Record<string, boolean>) => {
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every((key) => a[key] === b[key])
}

const getDefaultColumnOrder = (config: UnifiedTableConfig): string[] => {
	const defaults = DEFAULT_UNIFIED_TABLE_COLUMN_ORDER_BY_STRATEGY[config.strategyType]
	return config.columnOrder && config.columnOrder.length ? config.columnOrder : [...defaults]
}

const getDefaultColumnVisibility = (config: UnifiedTableConfig): VisibilityState =>
	config.columnVisibility ? { ...config.columnVisibility } : {}

const getDefaultRowHeaders = (config: UnifiedTableConfig) => {
	if (config.rowHeaders && config.rowHeaders.length) {
		return config.rowHeaders
	}
	return config.strategyType === 'chains' ? DEFAULT_CHAINS_ROW_HEADERS : DEFAULT_PROTOCOLS_ROW_HEADERS
}

const CSV_PERCENT_COLUMNS = new Set(['change1d', 'change7d', 'change1m'])

const metricFromColumn = (columnId: string) => {
	switch (columnId) {
		case 'tvl':
			return 'tvl'
		case 'fees24h':
			return 'fees24h'
		case 'revenue24h':
			return 'revenue24h'
		case 'volume24h':
			return 'volume24h'
		case 'perpsVolume24h':
			return 'perpsVolume24h'
		case 'openInterest':
			return 'openInterest'
		case 'mcap':
			return 'mcap'
		default:
			return columnId
	}
}

const toCsvValue = (columnId: string, row: NormalizedRow): string => {
	if (columnId === 'name') {
		return row.name
	}

	const metricKey = metricFromColumn(columnId)
	const value = row.metrics?.[metricKey as keyof typeof row.metrics]

	if (value === null || value === undefined) {
		return ''
	}

	if (CSV_PERCENT_COLUMNS.has(columnId) && typeof value === 'number') {
		return value.toFixed(2)
	}

	return typeof value === 'number' ? String(value) : ''
}

export function UnifiedTable({ config }: { config: UnifiedTableConfig }) {
	const { handleEditItem, isReadOnly } = useProDashboard()
	const [searchTerm, setSearchTerm] = useState('')
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(getDefaultColumnOrder(config))
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getDefaultColumnVisibility(config))
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)

	// Sync state when configuration changes externally
	useEffect(() => {
		setColumnOrder(getDefaultColumnOrder(config))
	}, [config.strategyType, config.columnOrder])

	useEffect(() => {
		setColumnVisibility(getDefaultColumnVisibility(config))
	}, [config.columnVisibility])

	// Persist column settings when they change
	useEffect(() => {
		if (isReadOnly) return
		const configOrder = config.columnOrder ?? []
		const configVisibility = config.columnVisibility ?? {}

		const orderChanged = !arraysEqual(columnOrder, configOrder)
		const visibilityChanged = !recordsEqual(columnVisibility, configVisibility)

		if (!orderChanged && !visibilityChanged) return

		handleEditItem(config.id, {
			...config,
			columnOrder,
			columnVisibility
		})
	}, [columnOrder, columnVisibility, config, handleEditItem, isReadOnly])

	const unifiedTable = useUnifiedTable({
		config: {
			...config,
			rowHeaders: getDefaultRowHeaders(config)
		},
		searchTerm,
		columnOrder,
		columnVisibility,
		sorting,
	onColumnOrderChange: (updater) =>
		setColumnOrder((prev) => (typeof updater === 'function' ? updater(prev) : updater)),
	onColumnVisibilityChange: (updater) =>
		setColumnVisibility((prev) => (typeof updater === 'function' ? updater(prev) : updater)),
	onSortingChange: (updater) => setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater))
	})

	const handleExportClick = () => {
		const leafColumns = unifiedTable.table.getAllLeafColumns().filter((column) => column.getIsVisible())

		const headers = leafColumns.map((column) => {
			const header = column.columnDef.header
			return typeof header === 'string' ? header : column.id
		})

		const csvRows = unifiedTable.leafRows.map((row) =>
			leafColumns.map((column) => toCsvValue(column.id, row))
		)

		downloadCSV(`unified-table-${config.strategyType}.csv`, [headers, ...csvRows])
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-2 sm:p-4">
			<TableControls
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				onExportClick={handleExportClick}
				isExportDisabled={!unifiedTable.leafRows.length}
			/>
			<TableRenderer table={unifiedTable.table} isLoading={unifiedTable.isLoading} />
			<UnifiedTablePagination table={unifiedTable.table} />
		</div>
	)
}
