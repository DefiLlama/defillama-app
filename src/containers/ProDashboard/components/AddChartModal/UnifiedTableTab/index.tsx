import { useEffect, useMemo, useState } from 'react'
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
import { FiltersPanel } from './components/FiltersPanel'
import { FormattedNumberInput } from './components/FormattedNumberInput'
import { GroupingOptions } from './components/GroupingOptions'
import { PresetPicker } from './components/PresetPicker'
import { PresetSelector } from './components/PresetSelector'
import { SortingSelector } from './components/SortingSelector'
import { StrategySelector } from './components/StrategySelector'
import { usePresetRecommendations } from './hooks/usePresetRecommendations'
import type { FilterPreset } from './presets/filterPresets'
import { UnifiedTableWizardProvider, useUnifiedTableWizardContext } from './WizardContext'

interface UnifiedTableTabProps {
	onClose: () => void
	chainOptions: Array<{ label: string; value: string }>
	editItem?: UnifiedTableConfig | null
	initialFocusSection?: UnifiedTableFocusSection
	focusedSectionOnly?: 'filters' | 'columns'
}

const PROTOCOL_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain', 'category', 'parent-protocol']
const CHAIN_ROW_HEADER_ORDER: UnifiedRowHeaderType[] = ['chain']

type StrategyType = UnifiedTableConfig['strategyType']

type NumericFilterKey =
	| 'tvlMin'
	| 'tvlMax'
	| 'mcapMin'
	| 'mcapMax'
	| 'volumeDex24hMin'
	| 'volumeDex24hMax'
	| 'fees24hMin'
	| 'fees24hMax'
	| 'revenue24hMin'
	| 'revenue24hMax'
	| 'protocolCountMin'
	| 'protocolCountMax'

type ArrayFilterKey = 'categories' | 'excludedCategories' | 'protocols' | 'oracles'

type BooleanFilterKey =
	| 'hasPerps'
	| 'hasOptions'
	| 'hasOpenInterest'
	| 'multiChainOnly'
	| 'parentProtocolsOnly'
	| 'subProtocolsOnly'

type TabKey = 'setup' | 'columns' | 'filters'

const BOOLEAN_FILTER_LABELS: Record<BooleanFilterKey, string> = {
	hasPerps: 'Has perps volume',
	hasOptions: 'Has options volume',
	hasOpenInterest: 'Has open interest',
	multiChainOnly: 'Multi-chain protocols only',
	parentProtocolsOnly: 'Parent protocols only',
	subProtocolsOnly: 'Sub-protocols only'
}

const RANGE_FIELDS: Array<{
	label: string
	description?: string
	minKey: NumericFilterKey
	maxKey: NumericFilterKey
	strategies?: StrategyType[]
}> = [
	{ label: 'TVL', minKey: 'tvlMin', maxKey: 'tvlMax', strategies: ['protocols'] },
	{ label: 'Market Cap', minKey: 'mcapMin', maxKey: 'mcapMax', strategies: ['protocols'] },
	{
		label: 'DEX Volume (24h)',
		minKey: 'volumeDex24hMin',
		maxKey: 'volumeDex24hMax',
		strategies: ['protocols', 'chains']
	},
	{ label: 'Fees (24h)', minKey: 'fees24hMin', maxKey: 'fees24hMax', strategies: ['protocols', 'chains'] },
	{ label: 'Revenue (24h)', minKey: 'revenue24hMin', maxKey: 'revenue24hMax', strategies: ['protocols'] },
	{ label: 'Protocol Count', minKey: 'protocolCountMin', maxKey: 'protocolCountMax', strategies: ['chains'] }
]

const BOOLEAN_FIELDS: Array<{ key: BooleanFilterKey; label: string; description?: string }> = [
	{ key: 'hasPerps', label: BOOLEAN_FILTER_LABELS.hasPerps },
	{ key: 'hasOptions', label: BOOLEAN_FILTER_LABELS.hasOptions },
	{ key: 'hasOpenInterest', label: BOOLEAN_FILTER_LABELS.hasOpenInterest },
	{ key: 'multiChainOnly', label: BOOLEAN_FILTER_LABELS.multiChainOnly }
]

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

	const [localOrder, setLocalOrder] = useState<ColumnOrderState>(columnOrder)
	const [localVisibility, setLocalVisibility] = useState<VisibilityState>({ ...columnVisibility })
	const [localSorting, setLocalSorting] = useState<SortingState>(sorting)
	const [filterErrors, setFilterErrors] = useState<Partial<Record<NumericFilterKey, string>>>({})
	const initialTab = useMemo<TabKey>(() => {
		if (focusedSectionOnly === 'filters') return 'filters'
		if (focusedSectionOnly === 'columns') return 'columns'
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
		setFilterErrors({})
	}, [strategyType])

	useEffect(() => {
		setActiveTab((current) => (current === initialTab ? current : initialTab))
	}, [initialTab])

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
		filters,
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

	const chainLabelMap = useMemo(() => {
		const map = new Map<string, string>()
		for (const option of chainOptions) {
			map.set(option.value, option.label)
		}
		return map
	}, [chainOptions])

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

	const handleClearFilters = () => {
		setFilters({})
		if (strategyType === 'protocols') {
			setChains(['All'])
		} else {
			setChains([])
		}
		setCategory(null)
		setFilterErrors({})
	}

	const handlePanelFiltersChange = (nextFilters: TableFilters) => {
		setFilters(nextFilters ?? {})
	}

	const clearNumericFilterValues = (...keys: NumericFilterKey[]) => {
		const next: TableFilters = { ...(filters ?? {}) }
		const nextErrors: Partial<Record<NumericFilterKey, string>> = { ...filterErrors }
		keys.forEach((filterKey) => {
			delete next[filterKey]
			delete nextErrors[filterKey]
		})
		setFilters(next)
		setFilterErrors(nextErrors)
	}

	const handleNumericFilterChange = (key: NumericFilterKey, value: number | undefined) => {
		const next = { ...(filters ?? {}) }

		if (value === undefined) {
			clearNumericFilterValues(key)
			return
		}

		const isMinKey = key.endsWith('Min')
		const isMaxKey = key.endsWith('Max')

		if (isMinKey) {
			const maxKey = key.replace('Min', 'Max') as NumericFilterKey
			const maxValue = next[maxKey] as number | undefined
			if (maxValue !== undefined && value > maxValue) {
				setFilterErrors((prev) => ({
					...prev,
					[key]: `Min cannot exceed ${maxValue.toLocaleString()}`
				}))
				return
			}
		}

		if (isMaxKey) {
			const minKey = key.replace('Max', 'Min') as NumericFilterKey
			const minValue = next[minKey] as number | undefined
			if (minValue !== undefined && value < minValue) {
				setFilterErrors((prev) => ({
					...prev,
					[key]: `Max cannot be less than ${minValue.toLocaleString()}`
				}))
				return
			}
		}

		setFilterErrors((prev) => {
			const updated = { ...prev }
			delete updated[key]
			if (isMinKey) {
				const maxKey = key.replace('Min', 'Max') as NumericFilterKey
				delete updated[maxKey]
			}
			if (isMaxKey) {
				const minKey = key.replace('Max', 'Min') as NumericFilterKey
				delete updated[minKey]
			}
			return updated
		})

		next[key] = value
		setFilters(next)
	}

	const handleBooleanFilterChange = (key: BooleanFilterKey, checked: boolean) => {
		const next = { ...(filters ?? {}) }
		if (checked) {
			next[key] = true
			if (key === 'parentProtocolsOnly') {
				delete next.subProtocolsOnly
			}
			if (key === 'subProtocolsOnly') {
				delete next.parentProtocolsOnly
			}
		} else {
			delete next[key]
		}
		setFilters(next)
	}

	const handleRemoveArrayFilterValue = (key: ArrayFilterKey, value: string) => {
		const next: TableFilters = { ...(filters ?? {}) }
		const current = Array.isArray(next[key]) ? [...(next[key] as string[])] : []
		const updated = current.filter((item) => item !== value)
		if (updated.length > 0) {
			next[key] = updated
		} else {
			delete next[key]
		}
		setFilters(next)
	}

	const handleRemoveChainValue = (chainValue: string) => {
		const nextChains = chains.filter((chain) => chain !== chainValue)
		if (nextChains.length === 0) {
			setChains(['All'])
			return
		}
		setChains(nextChains)
	}

	const formatMetricValue = (fieldLabel: string, value: number) => {
		if (fieldLabel === 'Protocol Count') {
			return value.toLocaleString()
		}
		return `$${value.toLocaleString()}`
	}

	const buildRangeLabel = (fieldLabel: string, minValue?: number, maxValue?: number) => {
		if (minValue !== undefined && maxValue !== undefined) {
			return `${fieldLabel}: ${formatMetricValue(fieldLabel, minValue)} - ${formatMetricValue(fieldLabel, maxValue)}`
		}
		if (minValue !== undefined) {
			return `${fieldLabel} ≥ ${formatMetricValue(fieldLabel, minValue)}`
		}
		if (maxValue !== undefined) {
			return `${fieldLabel} ≤ ${formatMetricValue(fieldLabel, maxValue)}`
		}
		return fieldLabel
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
		if (preset.filters?.categories && preset.filters.categories.length && strategyType === 'protocols') {
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
		setFilterErrors({})
	}

	const currentFilters = (filters ?? {}) as TableFilters
	const includeCategories = (currentFilters.categories as string[]) ?? []
	const excludedCategories = (currentFilters.excludedCategories as string[]) ?? []
	const protocolFilters = (currentFilters.protocols as string[]) ?? []
	const oracleFilters = (currentFilters.oracles as string[]) ?? []

	const activeFilterPills: FilterPill[] = []

	const addArrayFilterPills = (key: ArrayFilterKey, values: string[], formatter?: (value: string) => string) => {
		values.forEach((value) => {
			activeFilterPills.push({
				id: `${key}-${value}`,
				label: formatter ? formatter(value) : value,
				onRemove: () => handleRemoveArrayFilterValue(key, value)
			})
		})
	}

	if (strategyType === 'protocols') {
		chains
			.filter((chain) => chain !== 'All')
			.forEach((chain) => {
				activeFilterPills.push({
					id: `chain-${chain}`,
					label: chainLabelMap.get(chain) ?? chain,
					onRemove: () => handleRemoveChainValue(chain)
				})
			})
	} else if (category) {
		activeFilterPills.push({
			id: `category-${category}`,
			label: `Category: ${category}`,
			onRemove: () => setCategory(null)
		})
	}

	addArrayFilterPills('categories', includeCategories)
	addArrayFilterPills('excludedCategories', excludedCategories, (value) => `Exclude ${value}`)
	addArrayFilterPills('protocols', protocolFilters)
	addArrayFilterPills('oracles', oracleFilters)

	RANGE_FIELDS.forEach((field) => {
		if (field.strategies && !field.strategies.includes(strategyType)) return
		const minValue = currentFilters[field.minKey] as number | undefined
		const maxValue = currentFilters[field.maxKey] as number | undefined
		if (minValue === undefined && maxValue === undefined) return
		const keysToClear: NumericFilterKey[] = []
		if (minValue !== undefined) {
			keysToClear.push(field.minKey)
		}
		if (maxValue !== undefined) {
			keysToClear.push(field.maxKey)
		}
		activeFilterPills.push({
			id: `${field.minKey}-${field.maxKey}`,
			label: buildRangeLabel(field.label, minValue, maxValue),
			onRemove: () => clearNumericFilterValues(...keysToClear)
		})
	})

	const booleanEntries = Object.entries(BOOLEAN_FILTER_LABELS) as Array<[BooleanFilterKey, string]>
	booleanEntries.forEach(([key, label]) => {
		if (currentFilters[key]) {
			activeFilterPills.push({
				id: `boolean-${key}`,
				label,
				onRemove: () => handleBooleanFilterChange(key, false)
			})
		}
	})

	const activeFilterCount = activeFilterPills.length

	const scopeCount = useMemo(() => {
		if (strategyType === 'protocols') {
			return chains.includes('All') ? 0 : 1
		}
		return category ? 1 : 0
	}, [strategyType, chains, category])

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
		const strategyLabel = strategyType === 'protocols' ? 'Protocols' : 'Chains'
		if (activePreset?.name) return `${strategyLabel} · ${activePreset.name}`
		return strategyLabel
	}, [strategyType, activePreset])

	const tabOptions = useMemo(
		() => [
			{
				key: 'setup' as const,
				label: 'Strategy & Views',
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
				<CollapsibleSection
					title="Strategy & Grouping"
					isDefaultExpanded
					badge={strategyType === 'protocols' ? 'Protocols' : 'Chains'}
					className="shadow-sm"
				>
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

				<CollapsibleSection title="Data Views" isDefaultExpanded badge={activePreset?.name} className="shadow-sm">
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
							strategyType={strategyType}
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
							<p className="text-[11px] text-(--text-tertiary)">
								Start from curated combinations tailored for each strategy.
							</p>
						</div>
						<PresetSelector
							currentFilters={filters ?? {}}
							strategyType={strategyType}
							onApplyPreset={handleApplyPreset}
						/>
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="text-xs font-semibold text-(--text-secondary)">Scope</h5>
							<p className="text-[11px] text-(--text-tertiary)">
								Choose which chains, categories, protocols, or oracles to focus on.
							</p>
						</div>
						<FiltersPanel
							strategyType={strategyType}
							chains={chains}
							category={category}
							filters={filters ?? {}}
							availableChains={chainOptions}
							onChainsChange={setChains}
							onCategoryChange={setCategory}
							onFiltersChange={handlePanelFiltersChange}
						/>
					</div>

					<div className="space-y-2">
						<div>
							<h5 className="text-xs font-semibold text-(--text-secondary)">Metric thresholds</h5>
							<p className="text-[11px] text-(--text-tertiary)">
								Filter rows by TVL, market cap, fees, revenue, and more.
							</p>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							{RANGE_FIELDS.filter((field) => !field.strategies || field.strategies.includes(strategyType)).map(
								(field) => (
									<div key={field.label} className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
										<div className="mb-2 space-y-0.5">
											<p className="text-sm font-semibold text-(--text-primary)">{field.label}</p>
											{field.description ? (
												<p className="text-xs text-(--text-secondary)">{field.description}</p>
											) : null}
										</div>
										<div className="flex gap-2">
											<FormattedNumberInput
												value={filters?.[field.minKey] as number | undefined}
												onChange={(val) => handleNumericFilterChange(field.minKey, val)}
												placeholder="Min"
												prefix={field.label === 'Protocol Count' ? '' : '$'}
												min={0}
												error={filterErrors[field.minKey]}
											/>
											<FormattedNumberInput
												value={filters?.[field.maxKey] as number | undefined}
												onChange={(val) => handleNumericFilterChange(field.maxKey, val)}
												placeholder="Max"
												prefix={field.label === 'Protocol Count' ? '' : '$'}
												min={0}
												error={filterErrors[field.maxKey]}
											/>
										</div>
									</div>
								)
							)}
						</div>
					</div>
					{strategyType === 'protocols' && (
						<div className="space-y-2">
							<div>
								<h5 className="text-xs font-semibold text-(--text-secondary)">Protocol flags</h5>
								<p className="text-[11px] text-(--text-tertiary)">
									Quick toggles for perps, options, multi-chain, and hierarchy filters.
								</p>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								{BOOLEAN_FIELDS.map((field) => (
									<label
										key={field.key}
										className="flex cursor-pointer items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2"
									>
										<input
											type="checkbox"
											checked={Boolean(filters?.[field.key])}
											onChange={(event) => handleBooleanFilterChange(field.key, event.target.checked)}
											className="h-4 w-4 accent-(--primary)"
										/>
										<div>
											<p className="text-sm font-medium text-(--text-primary)">{field.label}</p>
											{field.description ? (
												<p className="text-xs text-(--text-secondary)">{field.description}</p>
											) : null}
										</div>
									</label>
								))}
							</div>
						</div>
					)}
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleClearFilters}
							className="pro-text2 hover:pro-text1 rounded-md border border-(--cards-border) px-3 py-1.5 text-xs transition"
						>
							Clear filters
						</button>
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
		<UnifiedTableWizardProvider
			initialStrategy={editItem?.strategyType}
			initialPresetId={editItem?.activePresetId}
			initialConfig={editItem}
		>
			<TabContent {...rest} editItem={editItem} focusedSectionOnly={focusedSectionOnly} />
		</UnifiedTableWizardProvider>
	)
}
