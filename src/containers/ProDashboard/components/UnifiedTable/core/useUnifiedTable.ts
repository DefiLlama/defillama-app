import { useCallback, useMemo, useState } from 'react'
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
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '../../../types'
import { getUnifiedTableColumns } from '../config/ColumnRegistry'
import type { NormalizedRow } from '../types'
import { filterRowsByConfig, filterRowsBySearch } from '../utils/dataFilters'
import { sanitizeRowHeaders } from '../utils/rowHeaders'
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

const buildQueryString = (
	strategyType: UnifiedTableConfig['strategyType'],
	config: UnifiedTableConfig,
	rowHeaders: UnifiedRowHeaderType[]
): string => {
	const params = new URLSearchParams()

	params.set('strategy', strategyType)

	rowHeaders.forEach((header) => params.append('rowHeaders[]', header))

	if (config.params?.chains) {
		config.params.chains.forEach((chain) => params.append('chains[]', chain))
	}

	if (config.params?.category) {
		params.set('category', config.params.category)
	}

	if (config.filters) {
		const filters = config.filters

		if (filters.protocols) filters.protocols.forEach((p) => params.append('protocols[]', p))
		if (filters.categories) filters.categories.forEach((c) => params.append('categories[]', c))
		if (filters.excludedCategories) filters.excludedCategories.forEach((c) => params.append('excludedCategories[]', c))
		if (filters.oracles) filters.oracles.forEach((o) => params.append('oracles[]', o))
		if (filters.chains) filters.chains.forEach((c) => params.append('chains[]', c))
		if (filters.poolTypes) filters.poolTypes.forEach((p) => params.append('poolTypes[]', p))

		const setNumericParam = (key: keyof TableFilters, paramKey: string) => {
			const value = filters[key]
			if (value !== undefined) {
				params.set(paramKey, String(value))
			}
		}

		const numericParams: Array<[keyof TableFilters, string]> = [
			['apyMin', 'apyMin'],
			['apyMax', 'apyMax'],
			['baseApyMin', 'baseApyMin'],
			['baseApyMax', 'baseApyMax'],
			['tvlMin', 'tvlMin'],
			['tvlMax', 'tvlMax'],
			['mcapMin', 'mcapMin'],
			['mcapMax', 'mcapMax'],
			['volumeDex24hMin', 'volumeDex24hMin'],
			['volumeDex24hMax', 'volumeDex24hMax'],
			['volume7dMin', 'volume7dMin'],
			['volume7dMax', 'volume7dMax'],
			['volume30dMin', 'volume30dMin'],
			['volume30dMax', 'volume30dMax'],
			['volumeChange1dMin', 'volumeChange1dMin'],
			['volumeChange1dMax', 'volumeChange1dMax'],
			['volumeChange7dMin', 'volumeChange7dMin'],
			['volumeChange7dMax', 'volumeChange7dMax'],
			['volumeChange1mMin', 'volumeChange1mMin'],
			['volumeChange1mMax', 'volumeChange1mMax'],
			['fees24hMin', 'fees24hMin'],
			['fees24hMax', 'fees24hMax'],
			['fees7dMin', 'fees7dMin'],
			['fees7dMax', 'fees7dMax'],
			['fees30dMin', 'fees30dMin'],
			['fees30dMax', 'fees30dMax'],
			['fees1yMin', 'fees1yMin'],
			['fees1yMax', 'fees1yMax'],
			['feesChange1dMin', 'feesChange1dMin'],
			['feesChange1dMax', 'feesChange1dMax'],
			['feesChange7dMin', 'feesChange7dMin'],
			['feesChange7dMax', 'feesChange7dMax'],
			['feesChange1mMin', 'feesChange1mMin'],
			['feesChange1mMax', 'feesChange1mMax'],
			['revenue24hMin', 'revenue24hMin'],
			['revenue24hMax', 'revenue24hMax'],
			['revenue7dMin', 'revenue7dMin'],
			['revenue7dMax', 'revenue7dMax'],
			['revenue30dMin', 'revenue30dMin'],
			['revenue30dMax', 'revenue30dMax'],
			['revenue1yMin', 'revenue1yMin'],
			['revenue1yMax', 'revenue1yMax'],
			['revenueChange1dMin', 'revenueChange1dMin'],
			['revenueChange1dMax', 'revenueChange1dMax'],
			['revenueChange7dMin', 'revenueChange7dMin'],
			['revenueChange7dMax', 'revenueChange7dMax'],
			['revenueChange1mMin', 'revenueChange1mMin'],
			['revenueChange1mMax', 'revenueChange1mMax'],
			['change1dMin', 'change1dMin'],
			['change1dMax', 'change1dMax'],
			['change7dMin', 'change7dMin'],
			['change7dMax', 'change7dMax'],
			['change1mMin', 'change1mMin'],
			['change1mMax', 'change1mMax'],
			['pfRatioMin', 'pfRatioMin'],
			['pfRatioMax', 'pfRatioMax'],
			['protocolCountMin', 'protocolCountMin'],
			['protocolCountMax', 'protocolCountMax'],
			['volumeDominance24hMin', 'volumeDominance24hMin'],
			['volumeDominance24hMax', 'volumeDominance24hMax'],
			['volumeMarketShare7dMin', 'volumeMarketShare7dMin'],
			['volumeMarketShare7dMax', 'volumeMarketShare7dMax'],
			['tvlShareMin', 'tvlShareMin'],
			['tvlShareMax', 'tvlShareMax'],
			['perpsVolumeDominance24hMin', 'perpsVolumeDominance24hMin'],
			['perpsVolumeDominance24hMax', 'perpsVolumeDominance24hMax'],
			['optionsVolumeDominance24hMin', 'optionsVolumeDominance24hMin'],
			['optionsVolumeDominance24hMax', 'optionsVolumeDominance24hMax'],
			['holderRevenue24hMin', 'holderRevenue24hMin'],
			['holderRevenue24hMax', 'holderRevenue24hMax'],
			['treasuryRevenue24hMin', 'treasuryRevenue24hMin'],
			['treasuryRevenue24hMax', 'treasuryRevenue24hMax'],
			['stablesMcapMin', 'stablesMcapMin'],
			['stablesMcapMax', 'stablesMcapMax'],
			['bridgedTvlMin', 'bridgedTvlMin'],
			['bridgedTvlMax', 'bridgedTvlMax'],
			['aggregatorsVolume24hMin', 'aggregatorsVolume24hMin'],
			['aggregatorsVolume24hMax', 'aggregatorsVolume24hMax'],
			['aggregatorsVolume7dMin', 'aggregatorsVolume7dMin'],
			['aggregatorsVolume7dMax', 'aggregatorsVolume7dMax'],
			['aggregatorsVolume30dMin', 'aggregatorsVolume30dMin'],
			['aggregatorsVolume30dMax', 'aggregatorsVolume30dMax'],
			['derivativesAggregatorsVolume24hMin', 'derivativesAggregatorsVolume24hMin'],
			['derivativesAggregatorsVolume24hMax', 'derivativesAggregatorsVolume24hMax'],
			['derivativesAggregatorsVolume7dMin', 'derivativesAggregatorsVolume7dMin'],
			['derivativesAggregatorsVolume7dMax', 'derivativesAggregatorsVolume7dMax'],
			['derivativesAggregatorsVolume30dMin', 'derivativesAggregatorsVolume30dMin'],
			['derivativesAggregatorsVolume30dMax', 'derivativesAggregatorsVolume30dMax']
		]

		numericParams.forEach(([key, paramKey]) => setNumericParam(key, paramKey))

		if (filters.hasRewards !== undefined) params.set('hasRewards', String(filters.hasRewards))
		if (filters.stablesOnly !== undefined) params.set('stablesOnly', String(filters.stablesOnly))
		if (filters.activeLending !== undefined) params.set('activeLending', String(filters.activeLending))
		if (filters.hasPerps !== undefined) params.set('hasPerps', String(filters.hasPerps))
		if (filters.hasOptions !== undefined) params.set('hasOptions', String(filters.hasOptions))
		if (filters.hasOpenInterest !== undefined) params.set('hasOpenInterest', String(filters.hasOpenInterest))
		if (filters.multiChainOnly !== undefined) params.set('multiChainOnly', String(filters.multiChainOnly))
		if (filters.parentProtocolsOnly !== undefined)
			params.set('parentProtocolsOnly', String(filters.parentProtocolsOnly))
		if (filters.subProtocolsOnly !== undefined) params.set('subProtocolsOnly', String(filters.subProtocolsOnly))
		if (filters.hasVolume !== undefined) params.set('hasVolume', String(filters.hasVolume))
		if (filters.hasFees !== undefined) params.set('hasFees', String(filters.hasFees))
		if (filters.hasRevenue !== undefined) params.set('hasRevenue', String(filters.hasRevenue))
		if (filters.hasMarketCap !== undefined) params.set('hasMarketCap', String(filters.hasMarketCap))
		if (filters.hasAggregators !== undefined) params.set('hasAggregators', String(filters.hasAggregators))
		if (filters.hasDerivativesAggregators !== undefined)
			params.set('hasDerivativesAggregators', String(filters.hasDerivativesAggregators))
		if (filters.hasBridgedTVL !== undefined) params.set('hasBridgedTVL', String(filters.hasBridgedTVL))
		if (filters.hasStables !== undefined) params.set('hasStables', String(filters.hasStables))
		if (filters.hasHolderRevenue !== undefined) params.set('hasHolderRevenue', String(filters.hasHolderRevenue))
		if (filters.hasTreasuryRevenue !== undefined) params.set('hasTreasuryRevenue', String(filters.hasTreasuryRevenue))
		if (filters.hasMcapTVLRatio !== undefined) params.set('hasMcapTVLRatio', String(filters.hasMcapTVLRatio))
		if (filters.isVolumeGrowing !== undefined) params.set('isVolumeGrowing', String(filters.isVolumeGrowing))
		if (filters.isRevenueGrowing !== undefined) params.set('isRevenueGrowing', String(filters.isRevenueGrowing))
	}

	return params.toString()
}

const fetchUnifiedTableRows = async (
	strategyType: UnifiedTableConfig['strategyType'],
	config: UnifiedTableConfig,
	rowHeaders: UnifiedRowHeaderType[]
) => {
	const queryString = buildQueryString(strategyType, config, rowHeaders)
	const response = await fetch(`/api/unified-table/${strategyType}?${queryString}`)

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
