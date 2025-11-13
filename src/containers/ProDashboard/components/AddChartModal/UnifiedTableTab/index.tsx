import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import {
	UNIFIED_TABLE_PRESETS,
	UNIFIED_TABLE_PRESETS_BY_ID
} from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import {
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_UNIFIED_TABLE_SORTING
} from '~/containers/ProDashboard/components/UnifiedTable/constants'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import type { UnifiedTableFocusSection } from '../../UnifiedTable/types'
import { applyPresetToConfig, normalizeSorting } from '../../UnifiedTable/utils/configHelpers'
import { CollapsibleSection } from './components/CollapsibleSection'
import { ColumnManager } from './components/ColumnManager'
import { FiltersPanel } from './components/FiltersPanel'
import { GroupingOptions } from './components/GroupingOptions'
import { PresetPicker } from './components/PresetPicker'
import { SortingSelector } from './components/SortingSelector'
import { StrategySelector } from './components/StrategySelector'
import { usePresetRecommendations } from './hooks/usePresetRecommendations'
import { UnifiedTableWizardProvider, useUnifiedTableWizardContext } from './WizardContext'

interface UnifiedTableTabProps {
	onClose: () => void
	chainOptions: Array<{ label: string; value: string }>
	editItem?: UnifiedTableConfig | null
	initialFocusSection?: UnifiedTableFocusSection
}

const PROTOCOL_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol']
const CHAIN_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain']

const TabContent = ({ onClose, chainOptions, editItem, initialFocusSection }: UnifiedTableTabProps) => {
	const { handleAddUnifiedTable, handleEditItem } = useProDashboard()
	const {
		state: {
			strategyType,
			chains,
			category,
			rowHeaders,
			filters,
			activePresetId,
			columnOrder,
			columnVisibility,
			sorting
		},
		actions: { setStrategy, setChains, setCategory, setRowHeaders, setFilters, setPreset, setColumns, setSorting },
		derived: { draftConfig }
	} = useUnifiedTableWizardContext()
	const isEditing = Boolean(editItem)

	const [localFilters, setLocalFilters] = useState<TableFilters>(() => {
		const next = { ...filters }
		delete next.tvlMin
		delete next.tvlMax
		return next
	})

	const [localOrder, setLocalOrder] = useState<ColumnOrderState>(columnOrder)
	const [localVisibility, setLocalVisibility] = useState<VisibilityState>({ ...columnVisibility })
	const [localSorting, setLocalSorting] = useState<SortingState>(sorting)
	const columnsSectionRef = useRef<HTMLDivElement | null>(null)
	const hasScrolledToColumnsRef = useRef(false)

	useEffect(() => {
		const next = { ...filters }
		delete next.tvlMin
		delete next.tvlMax
		setLocalFilters(next)
	}, [filters])

	useEffect(() => {
		setLocalOrder(columnOrder)
	}, [columnOrder])

	useEffect(() => {
		setLocalVisibility({ ...columnVisibility })
	}, [columnVisibility])

	useEffect(() => {
		setLocalSorting(sorting)
	}, [sorting])

	useEffect(() => {
		if (initialFocusSection !== 'columns') return
		if (hasScrolledToColumnsRef.current) return
		const target = columnsSectionRef.current
		if (!target) return
		hasScrolledToColumnsRef.current = true
		const scroll = () => {
			const scrollParent = target.closest('[data-unified-table-scroll="true"]') as HTMLElement | null
			const nodeToScroll = scrollParent ?? target
			nodeToScroll.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
		const timeoutId = window.setTimeout(scroll, 200)
		return () => window.clearTimeout(timeoutId)
	}, [initialFocusSection])

	const activePreset = useMemo(() => UNIFIED_TABLE_PRESETS_BY_ID.get(activePresetId), [activePresetId])

	const allColumnsForStrategy = useMemo(() => {
		return [
			'name',
			...UNIFIED_TABLE_COLUMN_DICTIONARY.filter((column) => {
				if (column.strategies && !column.strategies.includes(strategyType)) return false
				return column.id !== 'name'
			}).map((column) => column.id)
		]
	}, [strategyType])

	const presetDefaults = useMemo(() => {
		if (activePreset) {
			const presetConfig = applyPresetToConfig({
				preset: activePreset,
				includeRowHeaderRules: true,
				mergeWithDefaults: true,
				strategyType
			})
			return {
				order: presetConfig.columnOrder,
				visibility: presetConfig.columnVisibility,
				sorting: presetConfig.sorting
			}
		}
		const baseOrder = [allColumnsForStrategy[0], ...allColumnsForStrategy.slice(1)]
		const baseVisibility = allColumnsForStrategy.reduce<VisibilityState>((acc, id) => {
			acc[id] = id === 'name'
			return acc
		}, {})
		return {
			order: baseOrder,
			visibility: baseVisibility,
			sorting: [] as SortingState
		}
	}, [activePreset, allColumnsForStrategy, strategyType])

	const presetSortingFallback = useMemo<SortingState>(() => {
		return normalizeSorting(activePreset?.defaultSorting)
	}, [activePreset])

	const recommendedPresetIds = usePresetRecommendations({
		strategyType,
		filters: localFilters,
		chains,
		category
	})

	const recommendedPresetSet = useMemo(() => new Set(recommendedPresetIds), [recommendedPresetIds])

	const recommendedPresets = useMemo(
		() => UNIFIED_TABLE_PRESETS.filter((preset) => recommendedPresetSet.has(preset.id)),
		[recommendedPresetSet]
	)

	const otherPresets = useMemo(
		() =>
			UNIFIED_TABLE_PRESETS.filter(
				(preset) => preset.strategyType === strategyType && !recommendedPresetSet.has(preset.id)
			),
		[strategyType, recommendedPresetSet]
	)

	const handleToggleRowHeader = (header: UnifiedRowHeaderType) => {
		if (strategyType === 'chains') {
			setRowHeaders([...CHAIN_ROW_HEADER_ORDER])
			return
		}

		const currentlySelected = new Set(rowHeaders)

		if (currentlySelected.has(header)) {
			if (currentlySelected.size === 1) {
				return
			}

			currentlySelected.delete(header)
		} else {
			currentlySelected.add(header)
		}

		const next = PROTOCOL_ROW_HEADER_ORDER.filter((item) => currentlySelected.has(item))

		setRowHeaders(next)
	}

	const handleFiltersChange = (newFilters: TableFilters) => {
		setLocalFilters(newFilters)
		const nextFilters = { ...newFilters }
		delete nextFilters.tvlMin
		delete nextFilters.tvlMax
		setFilters(nextFilters)
	}

	const handlePresetSelect = (presetId: string) => {
		setPreset(presetId)
		const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
		if (preset) {
			const presetConfig = applyPresetToConfig({
				preset,
				includeRowHeaderRules: true,
				mergeWithDefaults: true,
				strategyType
			})
			setLocalOrder(presetConfig.columnOrder)
			setLocalVisibility(presetConfig.columnVisibility)
			setLocalSorting(presetConfig.sorting)
		}
	}

	const handleResetToPreset = () => {
		if (!activePreset) return
		handlePresetSelect(activePreset.id)
		setColumns(presetDefaults.order, presetDefaults.visibility)
		setSorting(presetDefaults.sorting)
	}

	const handleClearColumns = () => {
		const nextVisibility = allColumnsForStrategy.reduce<VisibilityState>((acc, id) => {
			acc[id] = id === 'name'
			return acc
		}, {})

		const nextOrder: ColumnOrderState = ['name']

		setLocalOrder(nextOrder)
		setLocalVisibility(nextVisibility)
		setLocalSorting([])
		setColumns(nextOrder, nextVisibility)
		setSorting([])
	}

	const handleColumnChange = (order: ColumnOrderState, visibility: VisibilityState) => {
		setLocalOrder(order)
		setLocalVisibility(visibility)
		setColumns(order, visibility)
	}

	const handleSortingChange = (newSorting: SortingState) => {
		setLocalSorting(newSorting)
		setSorting(newSorting)
	}

	const arraysEqual = (a: string[], b: string[]) => {
		if (a.length !== b.length) return false
		return a.every((value, index) => value === b[index])
	}

	const visibilityEqual = (a: VisibilityState, b: VisibilityState) => {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)])
		for (const key of keys) {
			const aValue = key in a ? a[key] : true
			const bValue = key in b ? b[key] : true
			if (Boolean(aValue) !== Boolean(bValue)) return false
		}
		return true
	}

	const sortingEqual = (a: SortingState, b: SortingState) => {
		if (a.length !== b.length) return false
		return a.every((item, index) => {
			const other = b[index]
			if (!other) return false
			return item.id === other.id && Boolean(item.desc) === Boolean(other.desc)
		})
	}

	const isModified =
		!arraysEqual(localOrder, presetDefaults.order) ||
		!visibilityEqual(localVisibility, presetDefaults.visibility) ||
		!sortingEqual(localSorting, presetDefaults.sorting)

	const visibleColumnsCount = useMemo(
		() => localOrder.filter((id) => id !== 'name' && (localVisibility[id] ?? true)).length,
		[localOrder, localVisibility]
	)

	const categoriesCount = (localFilters.categories as string[] | undefined)?.length ?? 0
	const excludedCategoriesCount = (localFilters.excludedCategories as string[] | undefined)?.length ?? 0
	const protocolsCount = (localFilters.protocols as string[] | undefined)?.length ?? 0
	const oraclesCount = (localFilters.oracles as string[] | undefined)?.length ?? 0
	const scopeCount = useMemo(() => {
		if (strategyType === 'protocols') {
			return chains.includes('All') ? 0 : 1
		}
		return category && category !== 'All' ? 1 : 0
	}, [strategyType, chains, category])

	const totalFilterCount = scopeCount + categoriesCount + excludedCategoriesCount + protocolsCount + oraclesCount

	const handleAdd = () => {
		if (editItem) {
			const updatedConfig: UnifiedTableConfig = {
				...editItem,
				...draftConfig
			} as UnifiedTableConfig
			handleEditItem(editItem.id, updatedConfig)
		} else {
			handleAddUnifiedTable(draftConfig)
		}
		onClose()
	}

	return (
		<div className="flex flex-col">
			<header className="flex flex-shrink-0 flex-col gap-1 pb-3">
				<h2 className="text-base font-semibold text-(--text-primary)">Build Unified Table</h2>
				<p className="text-xs text-(--text-secondary)">Configure your table using the sections below.</p>
			</header>

			<div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pr-1" data-unified-table-scroll="true">
				<div className="flex flex-col gap-3">
					<CollapsibleSection title="Strategy & Grouping" isDefaultExpanded={initialFocusSection !== 'columns'}>
						<div className="flex flex-col gap-3">
							<div>
								<h4 className="mb-2 text-xs font-semibold text-(--text-secondary)">Select Strategy</h4>
								<StrategySelector strategyType={strategyType} onStrategyChange={setStrategy} />
							</div>
							<div>
								<h4 className="mb-2 text-xs font-semibold text-(--text-secondary)">Configure Grouping</h4>
								<GroupingOptions
									strategyType={strategyType}
									rowHeaders={rowHeaders}
									onToggleRowHeader={handleToggleRowHeader}
								/>
							</div>
						</div>
					</CollapsibleSection>

					<CollapsibleSection
						title="Data Views"
						isDefaultExpanded={initialFocusSection !== 'columns'}
						badge={activePreset?.name}
					>
						<div className="flex flex-col gap-3">
							{recommendedPresets.length > 0 && (
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<h4 className="text-xs font-semibold text-(--text-secondary)">Recommended Data Views</h4>
										<p className="text-[10px] text-(--text-tertiary)">Based on your filters</p>
									</div>
									<PresetPicker
										strategyType={strategyType}
										activePresetId={activePresetId}
										onSelect={handlePresetSelect}
										presets={recommendedPresets}
									/>
								</div>
							)}
							<div className="flex flex-col gap-2">
								<h4 className="text-xs font-semibold text-(--text-secondary)">All Data Views</h4>
								{otherPresets.length > 0 ? (
									<PresetPicker
										strategyType={strategyType}
										activePresetId={activePresetId}
										onSelect={handlePresetSelect}
										presets={otherPresets}
									/>
								) : (
									<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-tertiary)">
										All available data views are shown above.
									</div>
								)}
							</div>
						</div>
					</CollapsibleSection>

					<div ref={columnsSectionRef}>
						<CollapsibleSection
							title="Columns & Sorting"
							isDefaultExpanded={initialFocusSection === 'columns'}
							badge={`${visibleColumnsCount} visible`}
						>
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-2">
									<h4 className="text-xs font-semibold text-(--text-secondary)">Sorting</h4>
									<SortingSelector
										columnOrder={localOrder}
										columnVisibility={localVisibility}
										sorting={localSorting}
										onChange={handleSortingChange}
										onReset={() => handleSortingChange(presetSortingFallback)}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h4 className="text-xs font-semibold text-(--text-secondary)">Columns</h4>
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<button
												type="button"
												onClick={handleResetToPreset}
												disabled={!isModified}
												className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
													isModified
														? 'border-(--primary) text-(--primary) hover:bg-(--primary)/10'
														: 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
												}`}
											>
												Reset to preset
											</button>
											<button
												type="button"
												onClick={handleClearColumns}
												disabled={visibleColumnsCount === 0}
												className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
													visibleColumnsCount === 0
														? 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
														: 'border-red-500/60 text-red-500 hover:bg-red-500/10'
												}`}
											>
												Clear all
											</button>
										</div>
									</div>
									<ColumnManager
										strategyType={strategyType}
										columnOrder={localOrder}
										columnVisibility={localVisibility}
										onChange={handleColumnChange}
									/>
								</div>
							</div>
						</CollapsibleSection>
					</div>

					<CollapsibleSection title="Advanced Filters" isDefaultExpanded={false} badge={totalFilterCount || undefined}>
						<FiltersPanel
							strategyType={strategyType}
							chains={chains}
							category={category}
							filters={localFilters}
							availableChains={chainOptions}
							onChainsChange={setChains}
							onCategoryChange={setCategory}
							onFiltersChange={handleFiltersChange}
						/>
					</CollapsibleSection>
				</div>
			</div>

			<div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-(--cards-border) bg-(--cards-bg) pt-3">
				<button
					type="button"
					onClick={onClose}
					className="pro-border pro-text2 hover:pro-text1 pro-hover-bg rounded-md border px-4 py-2 text-sm transition"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleAdd}
					className="pro-btn-blue flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
				>
					{isEditing ? 'Save Changes' : 'Add Table'}
					<Icon name={isEditing ? 'check' : 'plus'} height={14} width={14} />
				</button>
			</div>
		</div>
	)
}

export function UnifiedTableTab(props: UnifiedTableTabProps) {
	const { editItem, ...rest } = props
	return (
		<UnifiedTableWizardProvider
			initialStrategy={editItem?.strategyType}
			initialPresetId={editItem?.activePresetId}
			initialConfig={editItem}
		>
			<TabContent {...rest} editItem={editItem} />
		</UnifiedTableWizardProvider>
	)
}
