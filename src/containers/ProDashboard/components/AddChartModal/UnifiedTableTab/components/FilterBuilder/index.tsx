import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { TableFilters } from '~/containers/ProDashboard/types'
import {
	FILTER_CATEGORIES,
	FILTER_CONFIGS,
	formatFilterValue,
	getFiltersByCategory,
	getFiltersForProtocols,
	type FilterCategory,
	type FilterConfig,
	type NumericOperator
} from './filterConfig'

interface FilterBuilderProps {
	filters: TableFilters | undefined
	onFiltersChange: (filters: TableFilters) => void
}

interface ActiveFilter {
	config: FilterConfig
	operator?: NumericOperator
	value?: number
	minValue?: number
	maxValue?: number
	enabled?: boolean
}

const OPERATORS: Array<{ value: NumericOperator; label: string }> = [
	{ value: '>=', label: '>=' },
	{ value: '>', label: '>' },
	{ value: '<=', label: '<=' },
	{ value: '<', label: '<' },
	{ value: 'between', label: 'between' }
]

function parseNumberWithAbbreviation(input: string): number | undefined {
	const cleaned = input.trim().toLowerCase()
	if (!cleaned) return undefined
	const match = cleaned.match(/^(-?\d+\.?\d*)\s*([kmb])?$/)
	if (!match) return undefined

	const [, numStr, suffix] = match
	const base = parseFloat(numStr)
	if (Number.isNaN(base)) return undefined

	const multipliers: Record<string, number> = {
		k: 1_000,
		m: 1_000_000,
		b: 1_000_000_000
	}

	return suffix ? base * multipliers[suffix] : base
}

function filtersToActiveFilters(filters: TableFilters | undefined): ActiveFilter[] {
	if (!filters) return []

	const result: ActiveFilter[] = []
	const relevantConfigs = getFiltersForProtocols()

	for (const config of relevantConfigs) {
		if (config.type === 'boolean' && config.booleanKey) {
			if (filters[config.booleanKey]) {
				result.push({ config, enabled: true })
			}
		} else if (config.type === 'numeric-single' && config.minKey) {
			const value = filters[config.minKey] as number | undefined
			if (value !== undefined) {
				result.push({ config, value })
			}
		} else if (config.type === 'numeric-range' && config.minKey) {
			const minValue = filters[config.minKey] as number | undefined
			const maxValue = config.maxKey ? (filters[config.maxKey] as number | undefined) : undefined

			if (minValue !== undefined || maxValue !== undefined) {
				let operator: NumericOperator = '>'
				if (minValue !== undefined && maxValue !== undefined) {
					operator = 'between'
				} else if (maxValue !== undefined) {
					operator = '<='
				} else {
					operator = '>='
				}
				result.push({ config, operator, minValue, maxValue })
			}
		}
	}

	return result
}

function activeFilterToTableFilters(
	activeFilters: ActiveFilter[],
	existingFilters: TableFilters | undefined
): TableFilters {
	const result: TableFilters = { ...existingFilters }

	for (const config of FILTER_CONFIGS) {
		if (config.booleanKey) {
			delete result[config.booleanKey]
		}
		if (config.minKey) {
			delete result[config.minKey]
		}
		if (config.maxKey) {
			delete result[config.maxKey]
		}
	}

	for (const filter of activeFilters) {
		const { config, operator, value, minValue, maxValue, enabled } = filter

		if (config.type === 'boolean' && config.booleanKey && enabled) {
			result[config.booleanKey] = true
		} else if (config.type === 'numeric-single' && config.minKey && value !== undefined) {
			result[config.minKey] = value
		} else if (config.type === 'numeric-range' && config.minKey) {
			if (operator === 'between') {
				if (minValue !== undefined) result[config.minKey] = minValue
				if (maxValue !== undefined && config.maxKey) result[config.maxKey] = maxValue
			} else if (operator === '>' || operator === '>=') {
				if (value !== undefined) result[config.minKey] = value
				else if (minValue !== undefined) result[config.minKey] = minValue
			} else if (operator === '<' || operator === '<=') {
				if (config.maxKey) {
					if (value !== undefined) result[config.maxKey] = value
					else if (maxValue !== undefined) result[config.maxKey] = maxValue
				}
			}
		}
	}

	return result
}

const CATEGORY_COLORS: Record<FilterCategory, string> = {
	metrics: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
	volume: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
	fees: 'bg-green-500/15 text-green-400 border-green-500/30',
	revenue: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
	changes: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
	dominance: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
	aggregators: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
	'chain-metrics': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
	flags: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
}

const CATEGORY_BADGE_COLORS: Record<FilterCategory, string> = {
	metrics: 'bg-blue-500/20 text-blue-400',
	volume: 'bg-purple-500/20 text-purple-400',
	fees: 'bg-green-500/20 text-green-400',
	revenue: 'bg-emerald-500/20 text-emerald-400',
	changes: 'bg-orange-500/20 text-orange-400',
	dominance: 'bg-pink-500/20 text-pink-400',
	aggregators: 'bg-cyan-500/20 text-cyan-400',
	'chain-metrics': 'bg-indigo-500/20 text-indigo-400',
	flags: 'bg-amber-500/20 text-amber-400'
}

const CATEGORY_LABELS: Record<FilterCategory, string> = FILTER_CATEGORIES.reduce(
	(acc, { key, label }) => {
		acc[key] = label
		return acc
	},
	{} as Record<FilterCategory, string>
)

function buildDisplayValue(filter: ActiveFilter): string {
	const { config, operator, value, minValue, maxValue } = filter
	const format = config.format || 'currency'

	if (config.type === 'boolean') {
		return 'Enabled'
	}

	if (config.type === 'numeric-single' && value !== undefined) {
		return `= ${formatFilterValue(value, format)}`
	}

	if (operator === 'between' && minValue !== undefined && maxValue !== undefined) {
		return `${formatFilterValue(minValue, format)} - ${formatFilterValue(maxValue, format)}`
	}

	if (minValue !== undefined && maxValue === undefined) {
		return `${operator || '>='} ${formatFilterValue(minValue, format)}`
	}

	if (maxValue !== undefined && minValue === undefined) {
		return `${operator || '<='} ${formatFilterValue(maxValue, format)}`
	}

	if (value !== undefined) {
		return `${operator || '>='} ${formatFilterValue(value, format)}`
	}

	return 'Not set'
}

interface FilterItemEditorProps {
	filter: ActiveFilter
	onUpdate: (filter: ActiveFilter) => void
	onRemove: () => void
	isEditing: boolean
	onStartEdit: () => void
	onEndEdit: () => void
}

function FilterItemEditor({ filter, onUpdate, onRemove, isEditing, onStartEdit, onEndEdit }: FilterItemEditorProps) {
	const { config } = filter
	const [localValue, setLocalValue] = useState(
		filter.value?.toString() || filter.minValue?.toString() || filter.maxValue?.toString() || ''
	)
	const [localMinValue, setLocalMinValue] = useState(filter.minValue?.toString() || '')
	const [localMaxValue, setLocalMaxValue] = useState(filter.maxValue?.toString() || '')

	useEffect(() => {
		setLocalValue(filter.value?.toString() || filter.minValue?.toString() || filter.maxValue?.toString() || '')
		setLocalMinValue(filter.minValue?.toString() || '')
		setLocalMaxValue(filter.maxValue?.toString() || '')
	}, [filter.value, filter.minValue, filter.maxValue])

	const minAllowed = config.min ?? 0
	const prefix = config.format === 'currency' ? '$' : ''
	const suffix = config.format === 'percent' ? '%' : ''

	const handleValueChange = (input: string) => {
		setLocalValue(input)
		const parsed = parseNumberWithAbbreviation(input)
		if (parsed !== undefined && parsed >= minAllowed) {
			if (filter.operator === '>' || filter.operator === '>=' || !filter.operator) {
				onUpdate({ ...filter, value: parsed, minValue: parsed })
			} else {
				onUpdate({ ...filter, value: parsed, maxValue: parsed })
			}
		} else if (input === '') {
			onUpdate({ ...filter, value: undefined, minValue: undefined, maxValue: undefined })
		}
	}

	const handleMinValueChange = (input: string) => {
		setLocalMinValue(input)
		const parsed = parseNumberWithAbbreviation(input)
		if (parsed !== undefined && parsed >= minAllowed) {
			if (filter.maxValue !== undefined && parsed > filter.maxValue) {
				onUpdate({ ...filter, minValue: filter.maxValue, maxValue: parsed })
				setLocalMinValue(filter.maxValue.toString())
				setLocalMaxValue(parsed.toString())
			} else {
				onUpdate({ ...filter, minValue: parsed })
			}
		} else if (input === '') {
			onUpdate({ ...filter, minValue: undefined })
		}
	}

	const handleMaxValueChange = (input: string) => {
		setLocalMaxValue(input)
		const parsed = parseNumberWithAbbreviation(input)
		if (parsed !== undefined && parsed >= minAllowed) {
			if (filter.minValue !== undefined && parsed < filter.minValue) {
				onUpdate({ ...filter, minValue: parsed, maxValue: filter.minValue })
				setLocalMinValue(parsed.toString())
				setLocalMaxValue(filter.minValue.toString())
			} else {
				onUpdate({ ...filter, maxValue: parsed })
			}
		} else if (input === '') {
			onUpdate({ ...filter, maxValue: undefined })
		}
	}

	const handleOperatorChange = (operator: NumericOperator) => {
		const currentValue = filter.value ?? filter.minValue ?? filter.maxValue
		if (operator === 'between') {
			onUpdate({
				...filter,
				operator,
				value: undefined,
				minValue: filter.minValue ?? currentValue,
				maxValue: filter.maxValue ?? currentValue
			})
			return
		}

		if (operator === '>' || operator === '>=') {
			onUpdate({
				...filter,
				operator,
				value: currentValue,
				minValue: currentValue,
				maxValue: undefined
			})
			return
		}

		onUpdate({
			...filter,
			operator,
			value: currentValue,
			maxValue: currentValue,
			minValue: undefined
		})
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === 'Escape') {
			onEndEdit()
		}
	}

	const colorClass = CATEGORY_COLORS[config.category]
	const isBetween = filter.operator === 'between'
	const displayValue = buildDisplayValue(filter)
	const hasValue = filter.value !== undefined || filter.minValue !== undefined || filter.maxValue !== undefined
	const categoryLabel = CATEGORY_LABELS[config.category]
	const categoryBadge = (
		<span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-(--text-tertiary) uppercase">
			{categoryLabel}
		</span>
	)
	const editingEmphasis = isEditing ? 'ring-1 ring-(--primary)/60 shadow-sm' : ''

	if (config.type === 'boolean') {
		return (
			<div
				className={`group flex items-start justify-between rounded-md border px-2.5 py-2 ${colorClass} ${editingEmphasis}`}
			>
				<div className="flex min-w-0 flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<Icon name="check" className="h-3 w-3" />
						<span className="truncate text-xs font-semibold">{config.label}</span>
						{config.description && (
							<Tooltip content={config.description} placement="top">
								<Icon name="circle-help" className="h-3 w-3 opacity-50" />
							</Tooltip>
						)}
						{categoryBadge}
					</div>
					<span className="truncate text-[11px] opacity-80">{displayValue}</span>
				</div>
				<button
					type="button"
					onClick={onRemove}
					className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
				>
					<Icon name="x" className="h-3 w-3" />
				</button>
			</div>
		)
	}

	if (!isEditing && hasValue) {
		return (
			<div
				className={`group flex items-start justify-between rounded-md border px-2.5 py-2 ${colorClass} ${editingEmphasis}`}
			>
				<button type="button" onClick={onStartEdit} className="flex min-w-0 flex-1 items-start gap-1.5 text-left">
					<div className="flex min-w-0 flex-col gap-0.5">
						<div className="flex items-center gap-1.5">
							<span className="truncate text-xs font-semibold">{config.label}</span>
							{config.description && (
								<Tooltip content={config.description} placement="top">
									<Icon name="circle-help" className="h-3 w-3 opacity-50" />
								</Tooltip>
							)}
							{categoryBadge}
						</div>
						<span className="truncate text-[11px] opacity-80">{displayValue}</span>
					</div>
				</button>
				<button
					type="button"
					onClick={onRemove}
					className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
				>
					<Icon name="x" className="h-3 w-3" />
				</button>
			</div>
		)
	}

	if (config.type === 'numeric-single') {
		return (
			<div className={`flex flex-col gap-1.5 rounded-md border p-2 ${colorClass} ${editingEmphasis}`}>
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-1.5">
						<span className="truncate text-xs font-semibold">{config.label}</span>
						{config.description && (
							<Tooltip content={config.description} placement="top">
								<Icon name="circle-help" className="h-3 w-3 opacity-50" />
							</Tooltip>
						)}
						{categoryBadge}
					</div>
					<button type="button" onClick={onRemove} className="rounded p-0.5 opacity-60 hover:opacity-100">
						<Icon name="x" className="h-3 w-3" />
					</button>
				</div>
				<div className="flex items-center gap-1.5">
					{prefix && <span className="text-[10px] opacity-70">{prefix}</span>}
					<input
						type="text"
						inputMode="decimal"
						value={localValue}
						onChange={(e) => handleValueChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g. 10, 1k, 1m"
						autoFocus
						className="h-6 flex-1 rounded border border-current/20 bg-black/30 px-2 text-[11px] outline-none placeholder:opacity-50 focus:border-current/50"
					/>
					{suffix && <span className="text-[10px] opacity-70">{suffix}</span>}
				</div>
				<button
					type="button"
					onClick={onEndEdit}
					className="h-6 rounded border border-current/20 bg-black/30 px-2 text-[10px] opacity-70 transition-opacity hover:opacity-100"
				>
					Done
				</button>
			</div>
		)
	}

	return (
		<div className={`flex flex-col gap-1.5 rounded-md border p-2 ${colorClass} ${editingEmphasis}`}>
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="truncate text-xs font-semibold">{config.label}</span>
					{categoryBadge}
				</div>
				<button type="button" onClick={onRemove} className="rounded p-0.5 opacity-60 hover:opacity-100">
					<Icon name="x" className="h-3 w-3" />
				</button>
			</div>
			<Ariakit.SelectProvider
				value={filter.operator || '>='}
				setValue={(val) => handleOperatorChange(val as NumericOperator)}
			>
				<Ariakit.Select className="flex h-6 w-full cursor-pointer items-center justify-between rounded border border-current/20 bg-black/30 px-2 text-[11px] outline-none focus:border-current/50">
					<Ariakit.SelectValue />
					<Ariakit.SelectArrow />
				</Ariakit.Select>
				<Ariakit.SelectPopover
					portal
					gutter={4}
					sameWidth
					className="z-[100] rounded border border-(--cards-border) bg-(--cards-bg) py-1 shadow-lg"
				>
					{OPERATORS.map((op) => (
						<Ariakit.SelectItem
							key={op.value}
							value={op.value}
							className="cursor-pointer px-2.5 py-1 text-xs text-(--text-primary) hover:bg-(--cards-bg2) data-active-item:bg-(--cards-bg2)"
						>
							{op.label}
						</Ariakit.SelectItem>
					))}
				</Ariakit.SelectPopover>
			</Ariakit.SelectProvider>
			{isBetween ? (
				<div className="flex items-center gap-1.5">
					{prefix && <span className="text-[10px] opacity-70">{prefix}</span>}
					<input
						type="text"
						inputMode="decimal"
						value={localMinValue}
						onChange={(e) => handleMinValueChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Min"
						autoFocus
						className="h-6 flex-1 rounded border border-current/20 bg-black/30 px-2 text-[11px] outline-none placeholder:opacity-50 focus:border-current/50"
					/>
					<span className="text-[10px] opacity-70">-</span>
					<input
						type="text"
						inputMode="decimal"
						value={localMaxValue}
						onChange={(e) => handleMaxValueChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Max"
						className="h-6 flex-1 rounded border border-current/20 bg-black/30 px-2 text-[11px] outline-none placeholder:opacity-50 focus:border-current/50"
					/>
					{suffix && <span className="text-[10px] opacity-70">{suffix}</span>}
				</div>
			) : (
				<div className="flex items-center gap-1.5">
					{prefix && <span className="text-[10px] opacity-70">{prefix}</span>}
					<input
						type="text"
						inputMode="decimal"
						value={localValue}
						onChange={(e) => handleValueChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g. 10, 1k, 1m"
						autoFocus
						className="h-6 flex-1 rounded border border-current/20 bg-black/30 px-2 text-[11px] outline-none placeholder:opacity-50 focus:border-current/50"
					/>
					{suffix && <span className="text-[10px] opacity-70">{suffix}</span>}
				</div>
			)}
			<button
				type="button"
				onClick={onEndEdit}
				className="h-6 rounded border border-current/20 bg-black/30 px-2 text-[10px] opacity-70 transition-opacity hover:opacity-100"
			>
				Done
			</button>
		</div>
	)
}

export function FilterBuilder({ filters, onFiltersChange }: FilterBuilderProps) {
	const [search, setSearch] = useState('')
	const [expandedCategories, setExpandedCategories] = useState<Set<FilterCategory>>(new Set(['metrics', 'flags']))
	const [pendingFilters, setPendingFilters] = useState<ActiveFilter[]>([])
	const [editingFilterId, setEditingFilterId] = useState<string | null>(null)

	const savedFilters = useMemo(() => filtersToActiveFilters(filters), [filters])

	const allActiveFilters = useMemo(() => {
		const savedIds = new Set(savedFilters.map((f) => f.config.id))
		const uniquePending = pendingFilters.filter((f) => !savedIds.has(f.config.id))
		return [...savedFilters, ...uniquePending]
	}, [savedFilters, pendingFilters])

	const activeFilterIds = useMemo(() => new Set(allActiveFilters.map((f) => f.config.id)), [allActiveFilters])
	const filtersByCategory = useMemo(() => getFiltersByCategory(), [])

	const filteredCategories = useMemo(() => {
		const searchLower = search.toLowerCase()
		const result: Array<{ category: FilterCategory; label: string; filters: FilterConfig[] }> = []

		for (const { key, label } of FILTER_CATEGORIES) {
			const categoryFilters = filtersByCategory.get(key) || []
			const matchingFilters = categoryFilters.filter((f) => f.label.toLowerCase().includes(searchLower))

			if (matchingFilters.length > 0) {
				result.push({ category: key, label, filters: matchingFilters })
			}
		}

		return result
	}, [filtersByCategory, search])

	const totalFiltersAvailable = useMemo(() => {
		let total = 0
		filtersByCategory.forEach((categoryFilters) => {
			total += categoryFilters.length
		})
		return total
	}, [filtersByCategory])

	const inactiveFiltersCount = Math.max(totalFiltersAvailable - activeFilterIds.size, 0)

	const visibleAvailableCount = useMemo(
		() =>
			filteredCategories.reduce(
				(sum, { filters: categoryFilters }) => sum + categoryFilters.filter((f) => !activeFilterIds.has(f.id)).length,
				0
			),
		[filteredCategories, activeFilterIds]
	)

	const handleAddFilter = useCallback(
		(config: FilterConfig) => {
			if (activeFilterIds.has(config.id)) return

			if (config.type === 'boolean') {
				const newFilter: ActiveFilter = { config, enabled: true }
				let filtersToUse = savedFilters
				if (config.booleanKey === 'parentProtocolsOnly') {
					filtersToUse = savedFilters.filter((f) => f.config.booleanKey !== 'subProtocolsOnly')
				} else if (config.booleanKey === 'subProtocolsOnly') {
					filtersToUse = savedFilters.filter((f) => f.config.booleanKey !== 'parentProtocolsOnly')
				}
				const newFilters = activeFilterToTableFilters([...filtersToUse, newFilter], filters)
				onFiltersChange(newFilters)
			} else {
				const newFilter: ActiveFilter = {
					config,
					operator: '>=' as NumericOperator,
					value: undefined,
					minValue: undefined,
					maxValue: undefined
				}
				setPendingFilters((prev) => [...prev, newFilter])
				setEditingFilterId(config.id)
			}
		},
		[activeFilterIds, savedFilters, filters, onFiltersChange]
	)

	const handleUpdateFilter = useCallback(
		(updatedFilter: ActiveFilter) => {
			const isPending = pendingFilters.some((f) => f.config.id === updatedFilter.config.id)

			if (isPending) {
				const hasValue =
					updatedFilter.value !== undefined ||
					updatedFilter.minValue !== undefined ||
					updatedFilter.maxValue !== undefined

				if (hasValue) {
					setPendingFilters((prev) => prev.filter((f) => f.config.id !== updatedFilter.config.id))
					const newFilters = activeFilterToTableFilters([...savedFilters, updatedFilter], filters)
					onFiltersChange(newFilters)
				} else {
					setPendingFilters((prev) => prev.map((f) => (f.config.id === updatedFilter.config.id ? updatedFilter : f)))
				}
			} else {
				const newActiveFilters = savedFilters.map((f) => (f.config.id === updatedFilter.config.id ? updatedFilter : f))
				const newFilters = activeFilterToTableFilters(newActiveFilters, filters)
				onFiltersChange(newFilters)
			}
		},
		[pendingFilters, savedFilters, filters, onFiltersChange]
	)

	const handleRemoveFilter = useCallback(
		(filterId: string) => {
			const isPending = pendingFilters.some((f) => f.config.id === filterId)

			if (isPending) {
				setPendingFilters((prev) => prev.filter((f) => f.config.id !== filterId))
			} else {
				const newActiveFilters = savedFilters.filter((f) => f.config.id !== filterId)
				const newFilters = activeFilterToTableFilters(newActiveFilters, filters)
				onFiltersChange(newFilters)
			}
			if (editingFilterId === filterId) {
				setEditingFilterId(null)
			}
		},
		[pendingFilters, savedFilters, filters, onFiltersChange, editingFilterId]
	)

	const handleClearAll = useCallback(() => {
		setPendingFilters([])
		setEditingFilterId(null)
		const clearedFilters = activeFilterToTableFilters([], filters)
		onFiltersChange(clearedFilters)
	}, [filters, onFiltersChange])

	const toggleCategory = (category: FilterCategory) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev)
			if (next.has(category)) {
				next.delete(category)
			} else {
				next.add(category)
			}
			return next
		})
	}

	const expandAllCategories = useCallback(() => {
		setExpandedCategories(new Set(filtersByCategory.keys()))
	}, [filtersByCategory])

	const collapseAllCategories = useCallback(() => {
		setExpandedCategories(new Set())
	}, [])

	return (
		<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-semibold tracking-wide text-(--text-secondary) uppercase">
							Browse filters
						</span>
						<span className="rounded-full bg-(--cards-bg2) px-2 py-0.5 text-[10px] text-(--text-tertiary)">
							{search
								? `${visibleAvailableCount} match${visibleAvailableCount === 1 ? '' : 'es'}`
								: `${inactiveFiltersCount} available`}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={expandAllCategories}
							className="rounded-md border border-(--cards-border) px-2 py-1 text-[10px] text-(--text-tertiary) transition hover:text-(--text-primary)"
						>
							Expand all
						</button>
						<button
							type="button"
							onClick={collapseAllCategories}
							className="rounded-md border border-(--cards-border) px-2 py-1 text-[10px] text-(--text-tertiary) transition hover:text-(--text-primary)"
						>
							Collapse
						</button>
					</div>
				</div>
				<div className="relative">
					<Icon
						name="search"
						className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)"
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search filters..."
						aria-label="Search filters"
						className="h-8 w-full rounded-md border border-(--cards-border) bg-(--cards-bg2) pr-8 pl-8 text-xs text-(--text-primary) transition-colors outline-none focus:border-(--primary)"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch('')}
							className="absolute top-1/2 right-2.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded hover:bg-(--cards-bg)"
						>
							<Icon name="x" className="h-3 w-3 text-(--text-tertiary)" />
						</button>
					)}
				</div>
				<div className="thin-scrollbar flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
					{filteredCategories.map(({ category, label, filters: categoryFilters }) => {
						const isExpanded = expandedCategories.has(category) || search.length > 0
						const availableFilters = categoryFilters.filter((f) => !activeFilterIds.has(f.id))
						const badgeColor = CATEGORY_BADGE_COLORS[category]

						if (availableFilters.length === 0 && !isExpanded) return null

						return (
							<div key={category} className="rounded-md border border-(--cards-border) bg-(--cards-bg2)">
								<button
									type="button"
									onClick={() => toggleCategory(category)}
									className="flex w-full cursor-pointer items-center justify-between px-2.5 py-1.5 text-left transition-colors hover:bg-(--cards-border)/30"
								>
									<div className="flex items-center gap-2">
										<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}>{label}</span>
										<span className="text-[10px] text-(--text-tertiary)">{availableFilters.length}</span>
									</div>
									<Icon
										name="chevron-down"
										className={`h-3.5 w-3.5 text-(--text-tertiary) transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
									/>
								</button>
								{isExpanded && availableFilters.length > 0 && (
									<div className="border-t border-(--cards-border) bg-(--cards-bg) p-1">
										{availableFilters.map((filter) => (
											<button
												key={filter.id}
												type="button"
												onClick={() => handleAddFilter(filter)}
												className="group flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-left transition-all hover:bg-(--cards-bg2)"
											>
												<div className="flex items-center gap-1.5">
													<span className="truncate text-xs text-(--text-primary)">{filter.label}</span>
													{filter.description && (
														<Tooltip content={filter.description} placement="right">
															<Icon name="circle-help" className="h-3 w-3 text-(--text-tertiary) opacity-50" />
														</Tooltip>
													)}
												</div>
												<Icon
													name="plus"
													className="h-3 w-3 shrink-0 text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100"
												/>
											</button>
										))}
									</div>
								)}
							</div>
						)
					})}
					{filteredCategories.length === 0 && (
						<div className="flex items-center justify-between rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg2) px-3 py-3 text-[11px] text-(--text-tertiary)">
							<span>No filters match "{search}".</span>
							<button
								type="button"
								onClick={() => setSearch('')}
								className="rounded-md border border-(--cards-border) px-2 py-1 text-[10px] text-(--text-tertiary) transition hover:text-(--text-primary)"
							>
								Clear search
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xs font-medium text-(--text-secondary)">Active ({allActiveFilters.length})</span>
					</div>
					{allActiveFilters.length > 0 && (
						<button
							type="button"
							onClick={handleClearAll}
							className="cursor-pointer text-[10px] text-(--text-tertiary) transition-colors hover:text-red-400"
						>
							Clear all
						</button>
					)}
				</div>
				<div className="thin-scrollbar grid max-h-[260px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-1.5 overflow-y-auto pr-1">
					{allActiveFilters.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-md border border-dashed border-(--cards-border) py-6 text-center">
							<Icon name="settings" className="mb-2 h-5 w-5 text-(--text-tertiary)" />
							<p className="text-xs text-(--text-tertiary)">
								No filters applied. Add from the left to start narrowing results.
							</p>
						</div>
					) : (
						allActiveFilters.map((filter) => {
							const isPending = pendingFilters.some((f) => f.config.id === filter.config.id)
							const isEditing = editingFilterId === filter.config.id || isPending
							return (
								<FilterItemEditor
									key={filter.config.id}
									filter={filter}
									onUpdate={handleUpdateFilter}
									onRemove={() => handleRemoveFilter(filter.config.id)}
									isEditing={isEditing}
									onStartEdit={() => setEditingFilterId(filter.config.id)}
									onEndEdit={() => setEditingFilterId(null)}
								/>
							)
						})
					)}
				</div>
			</div>
		</div>
	)
}
