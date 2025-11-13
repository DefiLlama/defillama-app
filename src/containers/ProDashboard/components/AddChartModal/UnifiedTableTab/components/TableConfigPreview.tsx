import { useMemo } from 'react'
import type { ColumnOrderState, VisibilityState } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { useProDashboard } from '~/containers/ProDashboard/ProDashboardAPIContext'

interface TableConfigPreviewProps {
	strategyType: UnifiedTableConfig['strategyType']
	rowHeaders: UnifiedRowHeaderType[]
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	filters: TableFilters
	chains: string[]
	category: string | null
}

export function TableConfigPreview({
	strategyType,
	rowHeaders,
	columnOrder,
	columnVisibility,
	filters,
	chains,
	category
}: TableConfigPreviewProps) {
	const { protocols } = useProDashboard()

	const formatGroupingLabel = (header: UnifiedRowHeaderType) => {
		if (header === 'parent-protocol') {
			return 'Protocol'
		}
		return header
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	}

	const groupingHierarchy = useMemo(() => {
		return rowHeaders.map((header) => formatGroupingLabel(header)).join(' → ')
	}, [rowHeaders])

	const visibleColumns = useMemo(() => {
		return columnOrder.filter((id) => columnVisibility[id] ?? true)
	}, [columnOrder, columnVisibility])

	const visibleColumnNames = useMemo(() => {
		return visibleColumns
			.map((id) => {
				const col = UNIFIED_TABLE_COLUMN_DICTIONARY.find((c) => c.id === id)
				return col?.header || id
			})
			.join(', ')
	}, [visibleColumns])

	const activeFiltersCount = useMemo(() => {
		let count = 0
		if (strategyType === 'protocols' && !chains.includes('All')) count++
		if (strategyType === 'chains' && category && category !== 'All') count++
		if (filters.categories && (filters.categories as string[]).length > 0) count++
		if (filters.excludedCategories && (filters.excludedCategories as string[]).length > 0) count++
		if (filters.protocols && (filters.protocols as string[]).length > 0) count++
		if (filters.oracles && (filters.oracles as string[]).length > 0) count++
		return count
	}, [strategyType, chains, category, filters])

	const filtersSummary = useMemo(() => {
		const parts: string[] = []

		if (strategyType === 'protocols') {
			if (!chains.includes('All')) {
				parts.push(`${chains.length} chain${chains.length > 1 ? 's' : ''}`)
			}
		} else {
			if (category && category !== 'All') {
				parts.push(`Category: ${category}`)
			}
		}

		if (filters.categories && (filters.categories as string[]).length > 0) {
			parts.push(`${(filters.categories as string[]).length} included categor${(filters.categories as string[]).length > 1 ? 'ies' : 'y'}`)
		}
		if (filters.excludedCategories && (filters.excludedCategories as string[]).length > 0) {
			parts.push(`${(filters.excludedCategories as string[]).length} excluded categor${(filters.excludedCategories as string[]).length > 1 ? 'ies' : 'y'}`)
		}
		if (filters.protocols && (filters.protocols as string[]).length > 0) {
			parts.push(`${(filters.protocols as string[]).length} protocol${(filters.protocols as string[]).length > 1 ? 's' : ''}`)
		}
		if (filters.oracles && (filters.oracles as string[]).length > 0) {
			parts.push(`${(filters.oracles as string[]).length} oracle${(filters.oracles as string[]).length > 1 ? 's' : ''}`)
		}

		return parts.length > 0 ? parts.join(', ') : 'No filters applied'
	}, [strategyType, chains, category, filters])

	const estimatedRows = useMemo(() => {
		if (strategyType === 'protocols') {
			if (!protocols || protocols.length === 0) return '~0'

			let filteredCount = protocols.length

			if (!chains.includes('All')) {
				const chainSet = new Set(chains)
				filteredCount = protocols.filter((p: any) => {
					const protocolChains = p.chains || []
					return protocolChains.some((c: string) => chainSet.has(c))
				}).length
			}

			if (filters.categories && (filters.categories as string[]).length > 0) {
				const categorySet = new Set(filters.categories as string[])
				filteredCount = Math.floor(filteredCount * 0.7)
			}

			if (filters.protocols && (filters.protocols as string[]).length > 0) {
				filteredCount = (filters.protocols as string[]).length
			}

			return `~${filteredCount}`
		} else {
			const chainCount = category && category !== 'All' ? 20 : 50
			return `~${chainCount}`
		}
	}, [strategyType, protocols, chains, category, filters])

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="mb-2 flex items-center gap-2">
				<Icon name="eye" height={14} width={14} className="text-(--text-tertiary)" />
				<h3 className="text-xs font-semibold text-(--text-secondary)">Configuration Summary</h3>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				<div className="flex gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 p-2">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--primary)/10">
						<Icon name={strategyType === 'protocols' ? 'protocol' : 'chain'} height={14} width={14} className="text-(--primary)" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[10px] font-medium text-(--text-tertiary)">Strategy & Grouping</div>
						<div className="text-xs font-semibold text-(--text-primary)">
							{strategyType === 'protocols' ? 'Protocols' : 'Chains'}
						</div>
						<div className="truncate text-[10px] text-(--text-secondary)">{groupingHierarchy}</div>
					</div>
				</div>

				<div className="flex gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 p-2">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--primary)/10">
						<Icon name="layout-grid" height={14} width={14} className="text-(--primary)" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[10px] font-medium text-(--text-tertiary)">Columns</div>
						<div className="text-xs font-semibold text-(--text-primary)">{visibleColumns.length} visible</div>
						<div className="truncate text-[10px] text-(--text-secondary)" title={visibleColumnNames}>
							{visibleColumnNames}
						</div>
					</div>
				</div>

				<div className="flex gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 p-2">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--primary)/10">
						<Icon name="layers" height={14} width={14} className="text-(--primary)" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[10px] font-medium text-(--text-tertiary)">Filters</div>
						<div className="text-xs font-semibold text-(--text-primary)">
							{activeFiltersCount > 0 ? `${activeFiltersCount} active` : 'None'}
						</div>
						<div className="truncate text-[10px] text-(--text-secondary)" title={filtersSummary}>
							{filtersSummary}
						</div>
					</div>
				</div>

				<div className="flex gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 p-2">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--primary)/10">
						<Icon name="bar-chart-2" height={14} width={14} className="text-(--primary)" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[10px] font-medium text-(--text-tertiary)">Estimated Rows</div>
						<div className="text-xs font-semibold text-(--text-primary)">{estimatedRows}</div>
						<div className="text-[10px] text-(--text-secondary)">Approximate count</div>
					</div>
				</div>
			</div>
		</div>
	)
}
