import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import {
	UNIFIED_TABLE_PRESETS,
	UNIFIED_TABLE_PRESETS_BY_ID
} from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import type { TableFilters, UnifiedRowHeaderType, UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { useProDashboard } from '../../../ProDashboardAPIContext'
import type { UnifiedTableFocusSection } from '../../UnifiedTable/types'
import { applyPresetToConfig, normalizeSorting } from '../../UnifiedTable/utils/configHelpers'
import type { FilterPill } from './components/ActiveFilterPills'
import { ActiveFilterPills } from './components/ActiveFilterPills'
import { CollapsibleSection } from './components/CollapsibleSection'
import { ColumnManager } from './components/ColumnManager'
import { FilterBuilder } from './components/FilterBuilder'
import { FiltersPanel } from './components/FiltersPanel'
import { GroupingOptions } from './components/GroupingOptions'
import { PresetPicker } from './components/PresetPicker'
import { PresetSelector } from './components/PresetSelector'
import { SortingSelector } from './components/SortingSelector'
import { usePresetRecommendations } from './hooks/usePresetRecommendations'
import type { FilterPreset } from './presets/filterPresets'
import { UnifiedTableWizardProvider, useUnifiedTableWizardContext } from './WizardContext'
import { getActiveFilterChips } from '../../UnifiedTable/utils/filterChips'

interface UnifiedTableTabProps {
	onClose: () => void
	chainOptions: Array<{ label: string; value: string }>
	editItem?: UnifiedTableConfig | null
	initialFocusSection?: UnifiedTableFocusSection
	focusedSectionOnly?: 'filters' | 'columns'
}

const PROTOCOL_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol']

type ArrayFilterKey = 'categories' | 'excludedCategories' | 'protocols' | 'oracles'

type TabKey = 'setup' | 'columns' | 'filters'

const countActiveFilters = (filters: TableFilters | undefined): number => {
	if (!filters) return 0
	let count = 0
	for (const value of Object.values(filters)) {
		if (value === undefined || value === null) continue
		if (Array.isArray(value)) {
			if (value.length) count++
			continue
		}
		if (typeof value === 'boolean') {
			if (value) count++
			continue
		}
		if (typeof value === 'number' && !Number.isNaN(value)) {
			count++
		}
	}
	return count
}

const TabContent = ({
	onClose,
	chainOptions,
	editItem,
	initialFocusSection,
	focusedSectionOnly
}: UnifiedTableTabProps) => {
	const { handleAddUnifiedTable, handleEditItem } = useProDashboard()
	const {
		state: { chains, rowHeaders, filters, activePresetId, columnOrder, columnVisibility, sorting },
		actions: { setChains, setRowHeaders, setFilters, setPreset, setColumns, setSorting },
		derived: { draftConfig }
	} = useUnifiedTableWizardContext()
	const isEditing = Boolean(editItem)

	const [localOrder, setLocalOrder] = useState<ColumnOrderState>(columnOrder)
	const [localVisibility, setLocalVisibility] = useState<VisibilityState>({ ...columnVisibility })
	const [localSorting, setLocalSorting] = useState<SortingState>(sorting)
	const initialTab = useMemo<TabKey>(() => {
		if (focusedSectionOnly === 'filters') return 'filters'
		if (focusedSectionOnly === 'columns') return 'columns'
		if (initialFocusSection === 'filters') return 'filters'
		if (initialFocusSection === 'columns') return 'columns'
		if (initialFocusSection === 'strategy') return 'setup'
		return 'setup'
	}, [focusedSectionOnly, initialFocusSection])
	const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

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
		setActiveTab((current) => (current === initialTab ? current : initialTab))
	}, [initialTab])

	const activePreset = useMemo(() => UNIFIED_TABLE_PRESETS_BY_ID.get(activePresetId), [activePresetId])

	const allColumns = useMemo(() => {
		return [
			'name',
			...UNIFIED_TABLE_COLUMN_DICTIONARY.filter((column) => column.id !== 'name').map((column) => column.id)
		]
	}, [])

	const presetDefaults = useMemo(() => {
		if (activePreset) {
			const presetConfig = applyPresetToConfig({
				preset: activePreset,
				includeRowHeaderRules: true,
				mergeWithDefaults: true
			})
			return {
				order: presetConfig.columnOrder,
				visibility: presetConfig.columnVisibility,
				sorting: presetConfig.sorting
			}
		}
		const baseOrder = [allColumns[0], ...allColumns.slice(1)]
		const baseVisibility = allColumns.reduce<VisibilityState>((acc, id) => {
			acc[id] = id === 'name'
			return acc
		}, {})
		return {
			order: baseOrder,
			visibility: baseVisibility,
			sorting: [] as SortingState
		}
	}, [activePreset, allColumns])

	const presetSortingFallback = useMemo<SortingState>(() => {
		return normalizeSorting(activePreset?.defaultSorting)
	}, [activePreset])

	const recommendedPresetIds = usePresetRecommendations({
		filters,
		chains
	})

	const recommendedPresetSet = useMemo(() => new Set(recommendedPresetIds), [recommendedPresetIds])

	const recommendedPresets = useMemo(
		() => UNIFIED_TABLE_PRESETS.filter((preset) => recommendedPresetSet.has(preset.id)),
		[recommendedPresetSet]
	)

	const otherPresets = useMemo(
		() => UNIFIED_TABLE_PRESETS.filter((preset) => !recommendedPresetSet.has(preset.id)),
		[recommendedPresetSet]
	)

	const chainLabelMap = useMemo(() => {
		const map = new Map<string, string>()
		for (const option of chainOptions) {
			map.set(option.value, option.label)
		}
		return map
	}, [chainOptions])

	const handleToggleRowHeader = (header: UnifiedRowHeaderType) => {
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

	const handlePresetSelect = (presetId: string) => {
		setPreset(presetId)
		const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
		if (preset) {
			const presetConfig = applyPresetToConfig({
				preset,
				includeRowHeaderRules: true,
				mergeWithDefaults: true
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
		const nextVisibility = allColumns.reduce<VisibilityState>((acc, id) => {
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

	const handleClearFilters = () => {
		setFilters({})
		setChains(['All'])
	}

	const handlePanelFiltersChange = useCallback((nextFilters: TableFilters) => {
		setFilters(nextFilters ?? {})
	}, [])

	const handleRemoveArrayFilterValue = useCallback(
		(key: ArrayFilterKey, value: string) => {
			setFilters((prev) => {
				const next: TableFilters = { ...(prev ?? {}) }
				const current = Array.isArray(next[key]) ? [...(next[key] as string[])] : []
				const updated = current.filter((item) => item !== value)
				if (updated.length > 0) {
					next[key] = updated
				} else {
					delete next[key]
				}
				return next
			})
		},
		[]
	)

	const handleRemoveChainValue = useCallback(
		(chainValue: string) => {
			const nextChains = chains.filter((chain) => chain !== chainValue)
			setChains(nextChains.length === 0 ? ['All'] : nextChains)
		},
		[chains, setChains]
	)

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

	const handleApplyPreset = (preset: FilterPreset) => {
		setFilters(preset.filters ?? {})
		if (preset.filters?.categories && preset.filters.categories.length) {
			setChains(['All'])
		}
		if (preset.sortBy) {
			setSorting([
				{
					id: preset.sortBy.field,
					desc: preset.sortBy.direction === 'desc'
				}
			])
			setLocalSorting([
				{
					id: preset.sortBy.field,
					desc: preset.sortBy.direction === 'desc'
				}
			])
		}
	}

	const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters])

	const activeFilterPills: FilterPill[] = useMemo(() => {
		const pills: FilterPill[] = []

		chains
			.filter((chain) => chain !== 'All')
			.forEach((chain) => {
				pills.push({
					id: `chain-${chain}`,
					label: chainLabelMap.get(chain) ?? chain,
					onRemove: () => handleRemoveChainValue(chain)
				})
			})

		for (const chip of activeFilterChips) {
			pills.push({
				id: chip.id,
				label: chip.value ? `${chip.label}: ${chip.value}` : chip.label,
				onRemove: () => {
					const newFilters = { ...filters }
					for (const key of chip.clearKeys) {
						delete newFilters[key]
					}
					handlePanelFiltersChange(newFilters)
				}
			})
		}

		return pills
	}, [chains, chainLabelMap, activeFilterChips, filters, handleRemoveChainValue, handlePanelFiltersChange])

	const activeFilterCount = activeFilterPills.length

	const scopeCount = useMemo(() => {
		return chains.includes('All') ? 0 : 1
	}, [chains])

	const filterCount = countActiveFilters(filters)
	const totalFilterCount = scopeCount + filterCount

	const headerTitle =
		focusedSectionOnly === 'filters'
			? 'Configure Filters'
			: focusedSectionOnly === 'columns'
				? 'Customize Columns'
				: 'Build ProTable'
	const headerDescription =
		focusedSectionOnly === 'filters'
			? 'Adjust filters to refine the data shown in your table.'
			: focusedSectionOnly === 'columns'
				? 'Select and arrange columns to customize your table view.'
				: 'Pick a tab to configure setup, columns, or filters.'

	const setupBadge = useMemo(() => {
		if (activePreset?.name) return `Protocols · ${activePreset.name}`
		return 'Protocols'
	}, [activePreset])

	const tabOptions = useMemo(
		() => [
			{
				key: 'setup' as const,
				label: 'Grouping & Views',
				badge: setupBadge
			},
			{
				key: 'columns' as const,
				label: `Columns (${visibleColumnsCount})`
			},
			{
				key: 'filters' as const,
				label: `Filters (${totalFilterCount})`
			}
		],
		[setupBadge, visibleColumnsCount, totalFilterCount]
	)

	const availableTabs = useMemo(() => {
		if (focusedSectionOnly === 'filters') {
			return tabOptions.filter((tab) => tab.key === 'filters')
		}
		if (focusedSectionOnly === 'columns') {
			return tabOptions.filter((tab) => tab.key === 'columns')
		}
		return tabOptions
	}, [tabOptions, focusedSectionOnly])

	useEffect(() => {
		if (availableTabs.length === 0) return
		if (!availableTabs.some((tab) => tab.key === activeTab)) {
			setActiveTab(availableTabs[0].key)
		}
	}, [availableTabs, activeTab])

	const tabContent: Record<TabKey, React.ReactNode> = {
		setup: (
			<div className="flex flex-col gap-3">
				<CollapsibleSection title="Grouping" isDefaultExpanded badge="Protocols" className="shadow-sm">
					<div className="flex flex-col gap-3">
						<div>
							<h4 className="mb-2 text-xs font-semibold text-(--text-secondary)">Configure Grouping</h4>
							<GroupingOptions rowHeaders={rowHeaders} onToggleRowHeader={handleToggleRowHeader} />
						</div>
					</div>
				</CollapsibleSection>

				<CollapsibleSection title="Data Views" isDefaultExpanded badge={activePreset?.name} className="shadow-sm">
					<div className="flex flex-col gap-3">
						{recommendedPresets.length > 0 && (
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<h4 className="text-xs font-semibold text-(--text-secondary)">Recommended Data Views</h4>
									<p className="text-[10px] text-(--text-tertiary)">Based on your filters</p>
								</div>
								<PresetPicker
									activePresetId={activePresetId}
									onSelect={handlePresetSelect}
									presets={recommendedPresets}
								/>
							</div>
						)}
						<div className="flex flex-col gap-2">
							<h4 className="text-xs font-semibold text-(--text-secondary)">All Data Views</h4>
							{otherPresets.length > 0 ? (
								<PresetPicker activePresetId={activePresetId} onSelect={handlePresetSelect} presets={otherPresets} />
							) : (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-tertiary)">
									All available data views are shown above.
								</div>
							)}
						</div>
					</div>
				</CollapsibleSection>
			</div>
		),
		columns: (
			<CollapsibleSection
				title="Columns & Sorting"
				isDefaultExpanded
				badge={`${visibleColumnsCount} visible`}
				className="shadow-sm"
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
							columnOrder={localOrder}
							columnVisibility={localVisibility}
							onChange={handleColumnChange}
						/>
					</div>
				</div>
			</CollapsibleSection>
		),
		filters: (
			<CollapsibleSection title="Filters" isDefaultExpanded badge={totalFilterCount || undefined} className="shadow-sm">
				<div className="flex flex-col gap-5">
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<h5 className="text-xs font-semibold tracking-wide text-(--text-secondary) uppercase">Active filters</h5>
							<span className="text-[11px] text-(--text-tertiary)">
								{activeFilterCount > 0 ? `${activeFilterCount} applied` : 'None'}
							</span>
						</div>
						<ActiveFilterPills pills={activeFilterPills} />
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="text-xs font-semibold text-(--text-secondary)">Filter presets</h5>
							<p className="text-[11px] text-(--text-tertiary)">Start from curated combinations.</p>
						</div>
						<PresetSelector currentFilters={filters ?? {}} onApplyPreset={handleApplyPreset} />
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="text-xs font-semibold text-(--text-secondary)">Scope</h5>
							<p className="text-[11px] text-(--text-tertiary)">
								Choose which chains, categories, protocols, or oracles to focus on.
							</p>
						</div>
						<FiltersPanel
							chains={chains}
							filters={filters ?? {}}
							availableChains={chainOptions}
							onChainsChange={setChains}
							onFiltersChange={handlePanelFiltersChange}
						/>
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="text-xs font-semibold text-(--text-secondary)">Metric & flag filters</h5>
							<p className="text-[11px] text-(--text-tertiary)">
								Add filters for TVL, volume, fees, revenue, and other metrics.
							</p>
						</div>
						<FilterBuilder filters={filters} onFiltersChange={handlePanelFiltersChange} />
					</div>
				</div>
			</CollapsibleSection>
		)
	}

	return (
		<div className="flex flex-col">
			<header className="flex flex-shrink-0 flex-col gap-1 pb-3">
				<h2 className="text-base font-semibold text-(--text-primary)">{headerTitle}</h2>
				<p className="text-xs text-(--text-secondary)">{headerDescription}</p>
			</header>

			{availableTabs.length > 0 && (
				<div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt) p-1 shadow-sm">
					{availableTabs.map((tab) => {
						const isActive = tab.key === activeTab
						return (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key)}
								className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
									isActive
										? 'bg-(--primary)/10 text-(--text-primary) shadow-sm ring-1 ring-(--primary)/60'
										: 'text-(--text-secondary) hover:bg-(--cards-bg) hover:text-(--text-primary)'
								}`}
							>
								<span className="truncate" title={tab.label}>
									{tab.label}
								</span>
								{tab.badge ? (
									<span
										className={`max-w-[160px] truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${
											isActive ? 'bg-(--primary)/20 text-(--primary)' : 'bg-(--cards-border) text-(--text-tertiary)'
										}`}
										title={tab.badge?.toString()}
									>
										{tab.badge}
									</span>
								) : null}
							</button>
						)
					})}
				</div>
			)}

			<div
				className="thin-scrollbar flex-1 overflow-y-auto pr-1"
				style={{ height: 'clamp(420px, 65vh, 720px)' }}
				data-unified-table-scroll="true"
			>
				<div className="flex h-full flex-col gap-3">{tabContent[activeTab]}</div>
			</div>

			<div className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-3 border-t border-(--cards-border) bg-(--cards-bg) pt-3 pb-2 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.25)]">
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
	const { editItem, focusedSectionOnly, ...rest } = props
	return (
		<UnifiedTableWizardProvider initialConfig={editItem}>
			<TabContent {...rest} editItem={editItem} focusedSectionOnly={focusedSectionOnly} />
		</UnifiedTableWizardProvider>
	)
}
