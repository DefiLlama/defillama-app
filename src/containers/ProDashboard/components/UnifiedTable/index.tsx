import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { downloadCSV } from '~/utils'
import { useProDashboard } from '../../ProDashboardAPIContext'
import type { UnifiedRowHeaderType, UnifiedTableConfig } from '../../types'
import { UNIFIED_TABLE_PRESETS, UNIFIED_TABLE_PRESETS_BY_ID } from './config/PresetRegistry'
import { DEFAULT_UNIFIED_TABLE_SORTING } from './constants'
import { TableControls } from './core/TableControls'
import { UnifiedTablePagination } from './core/TablePagination'
import { TableRenderer } from './core/TableRenderer'
import { UnifiedTableHeader } from './core/UnifiedTableHeader'
import { useUnifiedTable } from './core/useUnifiedTable'
import type { NormalizedRow, UnifiedTableProps } from './types'
import {
	applyPresetToConfig,
	getDefaultColumnOrder,
	getDefaultColumnVisibility,
	getDefaultRowHeaders,
	normalizeSorting
} from './utils/configHelpers'

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

const sortingEquals = (a: SortingState, b: SortingState) => {
	if (a.length !== b.length) return false
	return a.every((value, index) => {
		const other = b[index]
		if (!other) return false
		return value.id === other.id && Boolean(value.desc) === Boolean(other.desc)
	})
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
	'feesChange_7dover7d',
	'feesChange_30dover30d',
	'holdersRevenueChange_30dover30d',
	'revenueChange_1d',
	'revenueChange_7d',
	'revenueChange_1m',
	'revenueChange_7dover7d',
	'revenueChange_30dover30d',
	'perps_volume_change_1d',
	'perps_volume_change_7d',
	'perps_volume_change_1m',
	'perps_volume_dominance_24h',
	'earningsChange_1d',
	'earningsChange_7d',
	'earningsChange_1m',
	'aggregators_volume_change_1d',
	'aggregators_volume_change_7d',
	'aggregators_volume_dominance_24h',
	'aggregators_volume_marketShare7d',

	'bridge_aggregators_volume_change_1d',
	'bridge_aggregators_volume_change_7d',
	'bridge_aggregators_volume_dominance_24h',
	'options_volume_change_1d',
	'options_volume_change_7d',
	'options_volume_dominance_24h'
])

const ROW_HEADER_LABELS: Record<UnifiedRowHeaderType, string> = {
	chain: 'Chain',
	category: 'Category',
	'parent-protocol': 'Parent',
	protocol: 'Protocol'
}

const metricFromColumn = (columnId: string) => columnId

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

export function UnifiedTable({
	config,
	previewMode = false,
	columnOrderOverride,
	columnVisibilityOverride,
	sortingOverride,
	onPreviewColumnOrderChange,
	onPreviewColumnVisibilityChange,
	onPreviewSortingChange,
	onEdit,
	onOpenColumnModal,
	onPresetChange
}: UnifiedTableProps) {
	const { handleEditItem, isReadOnly } = useProDashboard()
	const [searchTerm, setSearchTerm] = useState('')
	const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>(getDefaultColumnOrder(config))
	const [columnVisibilityState, setColumnVisibilityState] = useState<VisibilityState>(
		getDefaultColumnVisibility(config)
	)
	const [sortingState, setSortingState] = useState<SortingState>(normalizeSorting(config.defaultSorting))
	const hydratingRef = useRef(false)

	const effectiveColumnOrder = previewMode ? (columnOrderOverride ?? getDefaultColumnOrder(config)) : columnOrderState
	const effectiveColumnVisibility = previewMode
		? (columnVisibilityOverride ?? getDefaultColumnVisibility(config))
		: columnVisibilityState
	const effectiveSorting = previewMode ? (sortingOverride ?? normalizeSorting(config.defaultSorting)) : sortingState

	useEffect(() => {
		if (previewMode) return
		hydratingRef.current = true
		const timer = setTimeout(() => {
			hydratingRef.current = false
		}, 0)
		return () => clearTimeout(timer)
	}, [config.columnOrder, config.columnVisibility, config.defaultSorting, previewMode])

	// Sync state when configuration changes externally
	useEffect(() => {
		if (!previewMode) {
			setColumnOrderState(getDefaultColumnOrder(config))
		}
	}, [config.strategyType, config.columnOrder, previewMode])

	useEffect(() => {
		if (!previewMode) {
			setColumnVisibilityState(getDefaultColumnVisibility(config))
		}
	}, [config.columnVisibility, previewMode])

	useEffect(() => {
		if (!previewMode) {
			const nextSorting = normalizeSorting(config.defaultSorting)
			if (!sortingEquals(sortingState, nextSorting)) {
				setSortingState(nextSorting)
			}
		}
	}, [config.defaultSorting, previewMode, sortingState])

	// Persist column settings when they change
	useEffect(() => {
		if (previewMode || isReadOnly) return
		if (hydratingRef.current) return
		const configOrder = config.columnOrder ?? []
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

	const unifiedTable = useUnifiedTable({
		config: {
			...config,
			rowHeaders: getDefaultRowHeaders(config)
		},
		searchTerm,
		columnOrder: effectiveColumnOrder,
		columnVisibility: effectiveColumnVisibility,
		sorting: effectiveSorting,
		onColumnOrderChange: (updater) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveColumnOrder) : (updater as ColumnOrderState)
				onPreviewColumnOrderChange?.(next)
				return
			}

			setColumnOrderState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		},
		onColumnVisibilityChange: (updater) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveColumnVisibility) : (updater as VisibilityState)
				onPreviewColumnVisibilityChange?.(next)
				return
			}

			setColumnVisibilityState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		},
		onSortingChange: (updater) => {
			if (previewMode) {
				const next = typeof updater === 'function' ? updater(effectiveSorting) : (updater as SortingState)
				onPreviewSortingChange?.(next)
				return
			}

			setSortingState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
		}
	})

	const handleExportClick = () => {
		const leafColumns = unifiedTable.table.getAllLeafColumns().filter((column) => column.getIsVisible())

		const headers = leafColumns.map((column) => {
			const header = column.columnDef.header
			return typeof header === 'string' ? header : column.id
		})

		const csvRows = unifiedTable.leafRows.map((row) => leafColumns.map((column) => toCsvValue(column.id, row)))

		downloadCSV(`unified-table-${config.strategyType}.csv`, [headers, ...csvRows])
	}

	const handleCsvClick = () => {
		if (!unifiedTable.leafRows.length) return
		handleExportClick()
	}
	const availablePresets = useMemo(
		() => UNIFIED_TABLE_PRESETS.filter((preset) => preset.strategyType === config.strategyType),
		[config.strategyType]
	)
	const activePreset = config.activePresetId ? (UNIFIED_TABLE_PRESETS_BY_ID.get(config.activePresetId) ?? null) : null
	const title = useMemo(
		() => (config.strategyType === 'chains' ? 'Chains overview' : 'Protocols overview'),
		[config.strategyType]
	)
	const scopeDescription = useMemo(() => {
		if (config.strategyType === 'protocols') {
			const selectedChains = (config.params?.chains ?? []).filter((value): value is string => Boolean(value))
			if (!selectedChains.length || selectedChains.includes('All')) {
				return 'Scope: All chains'
			}
			if (selectedChains.length <= 3) {
				return `Scope: ${selectedChains.join(', ')}`
			}
			return `Scope: ${selectedChains.length} chains`
		}
		const category = config.params?.category
		if (!category || category === 'All' || category === null) {
			return 'Scope: All categories'
		}
		return `Scope: ${category}`
	}, [config.params, config.strategyType])
	const rowHeadersSummary = useMemo(() => {
		const headers = config.rowHeaders && config.rowHeaders.length ? config.rowHeaders : getDefaultRowHeaders(config)
		if (!headers.length) return null
		return headers.map((header) => ROW_HEADER_LABELS[header] ?? header).join(' › ')
	}, [config])

	const handlePresetSelection = useCallback(
		(presetId: string) => {
			const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
			if (!preset) return

			if (previewMode) {
				onPresetChange?.(preset.id)
				return
			}

			if (isReadOnly) return

			const presetConfig = applyPresetToConfig({
				preset,
				includeRowHeaderRules: true,
				mergeWithDefaults: true,
				strategyType: config.strategyType
			})

			setColumnOrderState(presetConfig.columnOrder)
			setColumnVisibilityState(presetConfig.columnVisibility)
			setSortingState(presetConfig.sorting)

			handleEditItem(config.id, {
				...config,
				rowHeaders: presetConfig.rowHeaders,
				columnOrder: presetConfig.columnOrder,
				columnVisibility: presetConfig.columnVisibility,
				defaultSorting: presetConfig.sorting.map((item) => ({ ...item })),
				activePresetId: preset.id
			})
		},
		[config, handleEditItem, isReadOnly, onPresetChange, previewMode]
	)

	const handleCustomizeColumns = useCallback(() => {
		if (previewMode || isReadOnly) return
		if (onOpenColumnModal) {
			onOpenColumnModal()
			return
		}
		onEdit?.('columns')
	}, [isReadOnly, onEdit, onOpenColumnModal, previewMode])

	const canUsePresetSelector = previewMode ? Boolean(onPresetChange) : !isReadOnly
	const canCustomizeColumns = Boolean(!previewMode && !isReadOnly && (onOpenColumnModal || onEdit))

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-2 sm:p-4">
			<UnifiedTableHeader
				title={title}
				scopeDescription={scopeDescription}
				rowHeadersSummary={rowHeadersSummary}
				activePreset={activePreset}
				availablePresets={availablePresets}
				onPresetChange={canUsePresetSelector ? handlePresetSelection : undefined}
				onCustomizeColumns={canCustomizeColumns ? handleCustomizeColumns : undefined}
				onCsvExport={handleCsvClick}
				isExportDisabled={!unifiedTable.leafRows.length}
				isLoading={unifiedTable.isLoading}
			/>
			<TableControls searchTerm={searchTerm} onSearchChange={setSearchTerm} />
			<TableRenderer
				table={unifiedTable.table}
				isLoading={unifiedTable.isLoading}
				isEmpty={!unifiedTable.leafRows.length}
				emptyMessage="No rows match your scope or filters."
			/>
			<UnifiedTablePagination table={unifiedTable.table} />
		</div>
	)
}

export default UnifiedTable
