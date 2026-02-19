'use no memo'

import {
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type Updater,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useUserConfig } from '~/hooks/useUserConfig'
import { downloadCSV } from '~/utils'
import type { CustomView, TableFilters } from '../../types'
import {
	buildColumnVisibilityMap,
	COLUMN_PRESETS,
	DEFAULT_SORTING,
	SHARE_METRIC_DEFINITIONS
} from './proTable.constants'
import type { CustomColumn, UseProTableOptions } from './proTable.types'
import { protocolsByChainTableColumns, useProTableColumns } from './useProTableColumns'
import { useProTableData } from './useProTableData'
import { useProTableState } from './useProTableState'

const isUpdaterFunction = <T,>(updater: Updater<T>): updater is (old: T) => T => {
	return typeof updater === 'function'
}

const resolveUpdater = <T,>(updater: Updater<T>, previousValue: T): T => {
	return isUpdaterFunction(updater) ? updater(previousValue) : updater
}

const hasOwnKeys = (record: Record<string, boolean>): boolean => {
	return Object.keys(record).length > 0
}

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) return false
	for (let index = 0; index < a.length; index += 1) {
		if (a[index] !== b[index]) return false
	}
	return true
}

const areVisibilityEqual = (a: Record<string, boolean>, b: Record<string, boolean>): boolean => {
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	for (const key of aKeys) {
		if (a[key] !== b[key]) return false
	}
	return true
}

const isCustomColumn = (value: unknown): value is CustomColumn => {
	if (typeof value !== 'object' || value === null) return false
	const id = Reflect.get(value, 'id')
	const name = Reflect.get(value, 'name')
	const expression = Reflect.get(value, 'expression')
	const isValid = Reflect.get(value, 'isValid')
	return (
		typeof id === 'string' && typeof name === 'string' && typeof expression === 'string' && typeof isValid === 'boolean'
	)
}

const normalizeSearchValue = (value: unknown): string => {
	return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

const isStringArray = (value: unknown): value is string[] => {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

const isBooleanRecord = (value: unknown): value is Record<string, boolean> => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
	for (const [, entry] of Object.entries(value)) {
		if (typeof entry !== 'boolean') return false
	}
	return true
}

const isCustomView = (value: unknown): value is CustomView => {
	if (typeof value !== 'object' || value === null) return false
	const id = Reflect.get(value, 'id')
	const name = Reflect.get(value, 'name')
	const columnOrder = Reflect.get(value, 'columnOrder')
	const columnVisibility = Reflect.get(value, 'columnVisibility')
	const createdAt = Reflect.get(value, 'createdAt')
	const customColumns = Reflect.get(value, 'customColumns')

	const validCustomColumns =
		customColumns === undefined ||
		(Array.isArray(customColumns) && customColumns.every((column) => isCustomColumn(column)))

	return (
		typeof id === 'string' &&
		typeof name === 'string' &&
		isStringArray(columnOrder) &&
		isBooleanRecord(columnVisibility) &&
		typeof createdAt === 'number' &&
		validCustomColumns
	)
}

const areCustomColumnsEqual = (a: CustomColumn[], b: CustomColumn[]): boolean => {
	if (a.length !== b.length) return false
	for (let index = 0; index < a.length; index += 1) {
		const left = a[index]
		const right = b[index]
		if (
			left.id !== right.id ||
			left.name !== right.name ||
			left.expression !== right.expression ||
			left.isValid !== right.isValid ||
			left.errorMessage !== right.errorMessage
		) {
			return false
		}
	}
	return true
}

type ColumnsSnapshot = {
	columnOrder: string[]
	columnVisibility: Record<string, boolean>
	customColumns: CustomColumn[]
	activeViewId: string | null
	activePresetId: string | null
}

export function useProTable(
	chains: string[],
	filters?: TableFilters,
	onFilterClick?: () => void,
	options?: UseProTableOptions
) {
	const { finalProtocolsList, isLoading, isEmptyProtocols, categories, availableProtocols, parentProtocols } = useProTableData({
		chains,
		filters
	})
	const onColumnsChange = options?.onColumnsChange

	const initialKnownColumnIds = React.useMemo(() => {
		const baseColumnIds = protocolsByChainTableColumns.map((column) => column.key)
		const shareColumnIds = SHARE_METRIC_DEFINITIONS.map((metric) => `${metric.key}_share`)
		const initialCustomColumnIds = (options?.initialCustomColumns ?? []).map((column) => column.id)
		return Array.from(new Set([...baseColumnIds, ...shareColumnIds, ...initialCustomColumnIds]))
	}, [options?.initialCustomColumns])

	const preferredPreset = React.useMemo(() => {
		if (options?.initialActivePresetId) {
			const initialPreset = COLUMN_PRESETS.find((preset) => preset.id === options.initialActivePresetId)
			if (initialPreset) return initialPreset
		}
		return COLUMN_PRESETS.find((preset) => preset.id === 'essential')
	}, [options?.initialActivePresetId])

	const { state, actions } = useProTableState({
		options,
		defaultSorting: DEFAULT_SORTING,
		defaultPreset: preferredPreset,
		initialKnownColumnIds
	})

	const filteredProtocolsList = React.useMemo(() => {
		if (!state.activeDatasetMetric) return finalProtocolsList

		return finalProtocolsList.filter((protocol) => {
			const value = Reflect.get(protocol, state.activeDatasetMetric)
			return typeof value === 'number' && value > 0
		})
	}, [finalProtocolsList, state.activeDatasetMetric])

	const { allColumns, allLeafColumnIds } = useProTableColumns({
		customColumns: state.customColumns,
		protocols: finalProtocolsList,
		filters,
		onFilterClick
	})

	const resolvedColumnVisibility = React.useMemo(() => {
		if (allLeafColumnIds.length === 0) return state.columnVisibility

		const nextVisibility: Record<string, boolean> = {}
		const columnOrderSet = new Set(state.columnOrder)
		for (const columnId of allLeafColumnIds) {
			if (Object.prototype.hasOwnProperty.call(state.columnVisibility, columnId)) {
				nextVisibility[columnId] = state.columnVisibility[columnId]
			} else if (state.columnOrder.length > 0) {
				nextVisibility[columnId] = columnOrderSet.has(columnId)
			} else {
				nextVisibility[columnId] = true
			}
		}
		return nextVisibility
	}, [allLeafColumnIds, state.columnOrder, state.columnVisibility])

	const table = useReactTable({
		data: filteredProtocolsList,
		columns: allColumns,
		state: {
			sorting: state.sorting,
			pagination: state.pagination,
			expanded: state.expanded,
			globalFilter: state.searchTerm,
			columnVisibility: resolvedColumnVisibility,
			columnOrder: state.columnOrder
		},
		globalFilterFn: (row, _columnId, filterValue) => {
			const query = normalizeSearchValue(filterValue)
			if (!query) return true

			const protocolName = normalizeSearchValue(row.original.name)
			const protocolCategory = normalizeSearchValue(row.original.category)
			const protocolSymbol = normalizeSearchValue(row.original.symbol)
			const protocolChains = Array.isArray(row.original.chains)
				? row.original.chains.map((chain) => normalizeSearchValue(chain)).join(' ')
				: ''
			const protocolOracles = Array.isArray(row.original.oracles)
				? row.original.oracles.map((oracle) => normalizeSearchValue(oracle)).join(' ')
				: ''

			return (
				protocolName.includes(query) ||
				protocolCategory.includes(query) ||
				protocolSymbol.includes(query) ||
				protocolChains.includes(query) ||
				protocolOracles.includes(query)
			)
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const isDesc = state.sorting.length > 0 ? state.sorting[0].desc : true
				const valueA = rowA.getValue(columnId)
				const valueB = rowB.getValue(columnId)
				const numberA = typeof valueA === 'number' ? valueA : null
				const numberB = typeof valueB === 'number' ? valueB : null

				if (numberA === null && numberB !== null) return isDesc ? -1 : 1
				if (numberA !== null && numberB === null) return isDesc ? 1 : -1
				if (numberA === null && numberB === null) return 0
				return numberA - numberB
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSubRows: (row) => (Array.isArray(row.subRows) ? row.subRows : []),
		onSortingChange: (updater) => actions.setSorting(resolveUpdater(updater, state.sorting)),
		onPaginationChange: (updater) => actions.setPagination(resolveUpdater(updater, state.pagination)),
		onExpandedChange: (updater) => actions.setExpanded(resolveUpdater(updater, state.expanded)),
		onColumnVisibilityChange: (updater) => {
			actions.setColumnVisibility(resolveUpdater(updater, resolvedColumnVisibility))
		},
		onColumnOrderChange: (updater) => {
			actions.setColumnOrder(resolveUpdater(updater, state.columnOrder))
		},
		filterFromLeafRows: true,
		autoResetPageIndex: false
	})

	const currentColumns = React.useMemo(() => {
		if (allLeafColumnIds.length === 0) return resolvedColumnVisibility

		const normalizedVisibility: Record<string, boolean> = {}
		for (const columnId of allLeafColumnIds) {
			normalizedVisibility[columnId] = resolvedColumnVisibility[columnId] ?? false
		}
		return normalizedVisibility
	}, [allLeafColumnIds, resolvedColumnVisibility])

	const clearPresetAndViewSelection = React.useCallback(() => {
		actions.setSelectedPreset(null)
		actions.setActiveCustomView(null)
		actions.setActiveDatasetMetric(null)
	}, [actions])

	const addOption = React.useCallback(
		(newOptions: string[], _setLocalStorage?: boolean) => {
			const dedupedOptions = Array.from(new Set(newOptions))
			const nextVisibility = buildColumnVisibilityMap(allLeafColumnIds, dedupedOptions)

			const nextColumnOrder = state.columnOrder.filter((columnId) => dedupedOptions.includes(columnId))
			for (const columnId of dedupedOptions) {
				if (!nextColumnOrder.includes(columnId)) {
					nextColumnOrder.push(columnId)
				}
			}

			actions.setColumnVisibilityAndOrder(nextVisibility, nextColumnOrder)
			clearPresetAndViewSelection()
		},
		[actions, allLeafColumnIds, clearPresetAndViewSelection, state.columnOrder]
	)

	const toggleColumnVisibility = React.useCallback(
		(columnKey: string, isVisible: boolean) => {
			const visibleColumns = Object.entries(currentColumns)
				.filter(([, visible]) => visible)
				.map(([columnId]) => columnId)

			const nextVisibleColumnsSet = new Set(visibleColumns)
			if (isVisible) nextVisibleColumnsSet.add(columnKey)
			if (!isVisible) nextVisibleColumnsSet.delete(columnKey)

			const nextVisibleColumns = Array.from(nextVisibleColumnsSet)
			const nextVisibility = buildColumnVisibilityMap(allLeafColumnIds, nextVisibleColumns)
			const nextColumnOrder = isVisible
				? [...state.columnOrder.filter((columnId) => columnId !== columnKey), columnKey]
				: state.columnOrder.filter((columnId) => columnId !== columnKey)

			actions.setColumnVisibilityAndOrder(nextVisibility, nextColumnOrder)
			clearPresetAndViewSelection()
		},
		[actions, allLeafColumnIds, clearPresetAndViewSelection, currentColumns, state.columnOrder]
	)

	const moveColumnUp = React.useCallback(
		(columnKey: string) => {
			const currentIndex = state.columnOrder.indexOf(columnKey)
			if (currentIndex <= 0) return

			const nextColumnOrder = [...state.columnOrder]
			const previousColumn = nextColumnOrder[currentIndex - 1]
			nextColumnOrder[currentIndex - 1] = columnKey
			nextColumnOrder[currentIndex] = previousColumn

			actions.setColumnOrder(nextColumnOrder)
			clearPresetAndViewSelection()
		},
		[actions, clearPresetAndViewSelection, state.columnOrder]
	)

	const moveColumnDown = React.useCallback(
		(columnKey: string) => {
			const currentIndex = state.columnOrder.indexOf(columnKey)
			if (currentIndex < 0 || currentIndex >= state.columnOrder.length - 1) return

			const nextColumnOrder = [...state.columnOrder]
			const nextColumn = nextColumnOrder[currentIndex + 1]
			nextColumnOrder[currentIndex + 1] = columnKey
			nextColumnOrder[currentIndex] = nextColumn

			actions.setColumnOrder(nextColumnOrder)
			clearPresetAndViewSelection()
		},
		[actions, clearPresetAndViewSelection, state.columnOrder]
	)

	const applyPreset = React.useCallback(
		(presetId: string) => {
			const preset = COLUMN_PRESETS.find((item) => item.id === presetId)
			if (!preset) return

			const presetSorting =
				preset.sort && preset.sort.length > 0
					? preset.sort.map((rule) => ({ ...rule }))
					: DEFAULT_SORTING.map((rule) => ({ ...rule }))
			const presetVisibility = buildColumnVisibilityMap(allLeafColumnIds, preset.columns)
			const activeDatasetMetric =
				preset.group === 'dataset' && preset.sort && preset.sort.length > 0 ? preset.sort[0].id : null

			actions.applyPreset(presetId, preset.columns, presetSorting, presetVisibility, activeDatasetMetric)
		},
		[actions, allLeafColumnIds]
	)

	const handleDownloadCSV = React.useCallback(() => {
		const visibleColumns = table.getAllLeafColumns().filter((column) => column.getIsVisible() && column.id !== 'expand')
		const orderedColumns =
			state.columnOrder.length > 0
				? [...visibleColumns].sort((left, right) => {
						const leftIndex = state.columnOrder.indexOf(left.id)
						const rightIndex = state.columnOrder.indexOf(right.id)
						if (leftIndex === -1 && rightIndex === -1) return 0
						if (leftIndex === -1) return 1
						if (rightIndex === -1) return -1
						return leftIndex - rightIndex
					})
				: visibleColumns

		const headers = orderedColumns.map((column) => {
			const headerValue = column.columnDef.header
			return typeof headerValue === 'string' ? headerValue : column.id
		})

		const rows = table.getSortedRowModel().rows.map((row) => {
			return orderedColumns.map((column) => {
				const value = row.getValue(column.id)
				if (value === null || value === undefined) return ''
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
				if (Array.isArray(value)) return value.join(', ')
				return ''
			})
		})

		const filename =
			chains.length === 1
				? `${chains[0]}_protocols.csv`
				: chains.length <= 3
					? `${chains.join('_')}_protocols.csv`
					: `multi_chain_${chains.length}_protocols.csv`

		downloadCSV(filename, [headers, ...rows], { addTimestamp: true })
	}, [chains, state.columnOrder, table])

	const addCustomColumn = React.useCallback(
		(column: CustomColumn) => {
			actions.addCustomColumn(column)
			clearPresetAndViewSelection()
		},
		[actions, clearPresetAndViewSelection]
	)

	const removeCustomColumn = React.useCallback(
		(columnId: string) => {
			actions.removeCustomColumn(columnId)
			clearPresetAndViewSelection()
		},
		[actions, clearPresetAndViewSelection]
	)

	const updateCustomColumn = React.useCallback(
		(columnId: string, updates: Partial<CustomColumn>) => {
			actions.updateCustomColumn(columnId, updates)
			clearPresetAndViewSelection()
		},
		[actions, clearPresetAndViewSelection]
	)

	const { userConfig, saveUserConfig } = useUserConfig()

	const customViews = React.useMemo(() => {
		const tableViews = userConfig && typeof userConfig === 'object' ? Reflect.get(userConfig, 'tableViews') : null
		if (!Array.isArray(tableViews)) return []
		return tableViews.filter((view): view is CustomView => isCustomView(view))
	}, [userConfig])
	const hydratedCustomViewRef = React.useRef<string | null>(null)
	const columnOrderLengthRef = React.useRef(state.columnOrder.length)
	const columnVisibilityRef = React.useRef(state.columnVisibility)

	React.useEffect(() => {
		columnOrderLengthRef.current = state.columnOrder.length
	}, [state.columnOrder.length])

	React.useEffect(() => {
		columnVisibilityRef.current = state.columnVisibility
	}, [state.columnVisibility])

	React.useEffect(() => {
		if (!state.activeCustomView) {
			hydratedCustomViewRef.current = null
			return
		}

		if (hydratedCustomViewRef.current === state.activeCustomView) return

		if (columnOrderLengthRef.current > 0 || hasOwnKeys(columnVisibilityRef.current)) {
			hydratedCustomViewRef.current = state.activeCustomView
			return
		}

		const matchingView = customViews.find((view) => view.id === state.activeCustomView)
		if (!matchingView) return

		actions.loadCustomView(
			matchingView.id,
			[...matchingView.columnOrder],
			{ ...matchingView.columnVisibility },
			matchingView.customColumns ? [...matchingView.customColumns] : []
		)
		hydratedCustomViewRef.current = state.activeCustomView
	}, [actions, customViews, state.activeCustomView])

	const saveCustomView = React.useCallback(
		async (name: string) => {
			const newView: CustomView = {
				id: `custom_view_${Date.now()}`,
				name,
				columnOrder: [...state.columnOrder],
				columnVisibility: { ...resolvedColumnVisibility },
				customColumns: [...state.customColumns],
				createdAt: Date.now()
			}
			const updatedViews = [...customViews, newView]

			if (saveUserConfig) {
				const baseConfig = userConfig && typeof userConfig === 'object' ? userConfig : {}
				await saveUserConfig({ ...baseConfig, tableViews: updatedViews })
			}

			clearPresetAndViewSelection()
			actions.setActiveCustomView(newView.id)
			return newView
		},
		[
			actions,
			clearPresetAndViewSelection,
			customViews,
			resolvedColumnVisibility,
			saveUserConfig,
			state.columnOrder,
			state.customColumns,
			userConfig
		]
	)

	const deleteCustomView = React.useCallback(
		async (viewId: string) => {
			const updatedViews = customViews.filter((view) => view.id !== viewId)

			if (saveUserConfig) {
				const baseConfig = userConfig && typeof userConfig === 'object' ? userConfig : {}
				await saveUserConfig({ ...baseConfig, tableViews: updatedViews })
			}

			if (state.activeCustomView === viewId) {
				actions.setActiveCustomView(null)
			}
		},
		[actions, customViews, saveUserConfig, state.activeCustomView, userConfig]
	)

	const loadCustomView = React.useCallback(
		(viewId: string) => {
			const view = customViews.find((item) => item.id === viewId)
			if (!view) return
			actions.loadCustomView(
				view.id,
				[...view.columnOrder],
				{ ...view.columnVisibility },
				view.customColumns ? [...view.customColumns] : []
			)
		},
		[actions, customViews]
	)

	const previousColumnsSnapshotRef = React.useRef<ColumnsSnapshot | null>(null)

	React.useEffect(() => {
		if (!onColumnsChange) return

		const snapshot: ColumnsSnapshot = {
			columnOrder: state.columnOrder,
			columnVisibility: resolvedColumnVisibility,
			customColumns: state.customColumns,
			activeViewId: state.activeCustomView,
			activePresetId: state.selectedPreset
		}

		if (previousColumnsSnapshotRef.current === null) {
			previousColumnsSnapshotRef.current = snapshot
			return
		}

		const previous = previousColumnsSnapshotRef.current
		const hasChanged =
			!areStringArraysEqual(previous.columnOrder, snapshot.columnOrder) ||
			!areVisibilityEqual(previous.columnVisibility, snapshot.columnVisibility) ||
			!areCustomColumnsEqual(previous.customColumns, snapshot.customColumns) ||
			previous.activeViewId !== snapshot.activeViewId ||
			previous.activePresetId !== snapshot.activePresetId

		if (!hasChanged) return

		previousColumnsSnapshotRef.current = snapshot
		onColumnsChange(
			snapshot.columnOrder,
			snapshot.columnVisibility,
			snapshot.customColumns,
			snapshot.activeViewId ?? undefined,
			snapshot.activePresetId ?? undefined
		)
	}, [
		onColumnsChange,
		resolvedColumnVisibility,
		state.activeCustomView,
		state.columnOrder,
		state.customColumns,
		state.selectedPreset
	])

	return {
		table,
		isLoading,
		isEmptyProtocols,
		showColumnPanel: state.showColumnPanel,
		setShowColumnPanel: actions.setShowColumnPanel,
		searchTerm: state.searchTerm,
		setSearchTerm: actions.setSearchTerm,
		currentColumns,
		columnOrder: state.columnOrder,
		addOption,
		toggleColumnVisibility,
		moveColumnUp,
		moveColumnDown,
		columnPresets: COLUMN_PRESETS,
		applyPreset,
		// Used by table controls for either a preset id or active custom view id.
		activePreset: state.selectedPreset ?? state.activeCustomView,
		downloadCSV: handleDownloadCSV,
		customColumns: state.customColumns,
		addCustomColumn,
		removeCustomColumn,
		updateCustomColumn,
		categories,
		availableProtocols,
		parentProtocols,
		customViews,
		saveCustomView,
		deleteCustomView,
		loadCustomView
	}
}
