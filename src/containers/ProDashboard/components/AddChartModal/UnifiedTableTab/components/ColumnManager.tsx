import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
	type UniqueIdentifier
} from '@dnd-kit/core'
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Popover, PopoverDisclosure, usePopoverStore } from '@ariakit/react'
import type { ColumnOrderState, SortingState, VisibilityState } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import {
	COLUMN_DICTIONARY_BY_ID,
	UNIFIED_TABLE_COLUMN_DICTIONARY
} from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import { isColumnSupported } from '~/containers/ProDashboard/components/UnifiedTable/config/metricCapabilities'
import type { MetricGroup } from '~/containers/ProDashboard/components/UnifiedTable/types'
import {
	evaluateExpression,
	formatPreviewNumber,
	generateCustomColumnId,
	getAvailableVariables,
	getDefaultAggregation,
	getExpressionVariables,
	SAMPLE_METRICS,
	validateExpression
} from '~/containers/ProDashboard/components/UnifiedTable/utils/customColumns'
import type { CustomColumnDefinition } from '~/containers/ProDashboard/types'

interface ColumnManagerProps {
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	onChange: (columnOrder: ColumnOrderState, columnVisibility: VisibilityState) => void
	customColumns?: CustomColumnDefinition[]
	onAddCustomColumn?: (column: CustomColumnDefinition) => void
	onUpdateCustomColumn?: (id: string, updates: Partial<CustomColumnDefinition>) => void
	onRemoveCustomColumn?: (id: string) => void
	sorting?: SortingState
	onSortingChange?: (sorting: SortingState) => void
	onSortingReset?: () => void
}

type ColumnGroupId = MetricGroup | 'meta' | 'custom'
type ColumnFormat = CustomColumnDefinition['format']
type ColumnAggregation = CustomColumnDefinition['aggregation']

interface ColumnMeta {
	id: string
	header: string
	group: ColumnGroupId
}

const GROUP_FILTERS: Array<{ id: ColumnGroupId | 'all'; label: string }> = [
	{ id: 'all', label: 'All' },
	{ id: 'meta', label: 'Meta' },
	{ id: 'tvl', label: 'TVL' },
	{ id: 'fees', label: 'Fees' },
	{ id: 'volume', label: 'Volume' },
	{ id: 'revenue', label: 'Revenue' },
	{ id: 'ratios', label: 'Valuation' },
	{ id: 'perps', label: 'Perps' },
	{ id: 'custom', label: 'Custom' }
]

const GROUP_LABELS: Record<ColumnGroupId | 'all', string> = GROUP_FILTERS.reduce(
	(acc, filter) => {
		acc[filter.id as ColumnGroupId | 'all'] = filter.label
		return acc
	},
	{} as Record<ColumnGroupId | 'all', string>
)

const FORMAT_OPTIONS: Array<{ id: ColumnFormat; label: string; description: string }> = [
	{ id: 'usd', label: '$', description: 'Currency' },
	{ id: 'percent', label: '%', description: 'Percent' },
	{ id: 'ratio', label: 'x', description: 'Ratio' },
	{ id: 'number', label: '#', description: 'Number' }
]

const AGGREGATION_OPTIONS: Array<{ id: ColumnAggregation; label: string; description: string }> = [
	{ id: 'recalculate', label: 'Recalc', description: 'Re-evaluate expression on aggregated metrics (best for ratios)' },
	{ id: 'sum', label: 'Sum', description: 'Sum individual row values (best for totals like fees * 365)' },
	{ id: 'first', label: 'First', description: 'Use first row value only' },
	{ id: 'none', label: 'None', description: 'Show dash (-) for grouped rows' }
]

const EXAMPLE_PRESETS = [
	{ name: 'TVL/MCap', expression: 'tvl / mcap', format: 'ratio' as ColumnFormat },
	{ name: 'Annualized Fees', expression: 'fees24h * 365', format: 'usd' as ColumnFormat },
	{ name: 'Fee Yield', expression: '(fees24h * 365) / tvl * 100', format: 'percent' as ColumnFormat },
	{ name: 'P/F Ratio', expression: 'mcap / (fees24h * 365)', format: 'ratio' as ColumnFormat },
	{ name: 'Revenue Margin', expression: 'revenue24h / fees24h * 100', format: 'percent' as ColumnFormat }
]

interface AutocompleteSuggestion {
	type: 'variable' | 'operator' | 'function'
	value: string
	display: string
	description: string
	category: string
}

const NAME_COLUMN: ColumnMeta = { id: 'name', header: 'Name', group: 'meta' }

const getColumnMeta = (id: string, customColumns?: CustomColumnDefinition[]): ColumnMeta | null => {
	if (id === 'name') return NAME_COLUMN
	if (id.startsWith('custom_')) {
		const customCol = customColumns?.find((c) => c.id === id)
		if (customCol) {
			return { id: customCol.id, header: customCol.name, group: 'custom' }
		}
		return null
	}
	const dictionaryEntry = COLUMN_DICTIONARY_BY_ID.get(id)
	if (!dictionaryEntry) return null
	return {
		id: dictionaryEntry.id,
		header: dictionaryEntry.header,
		group: (dictionaryEntry.group as ColumnGroupId) ?? 'meta'
	}
}

const buildAllColumns = (customColumns?: CustomColumnDefinition[]): ColumnMeta[] => {
	const dictionaryMetas = UNIFIED_TABLE_COLUMN_DICTIONARY.filter((column) => isColumnSupported(column.id))
		.map(({ id }) => getColumnMeta(id))
		.filter((meta): meta is ColumnMeta => Boolean(meta))

	const customMetas: ColumnMeta[] = (customColumns ?? []).map((col) => ({
		id: col.id,
		header: col.name,
		group: 'custom' as const
	}))

	return [NAME_COLUMN, ...dictionaryMetas, ...customMetas]
}

export function ColumnManager({
	columnOrder,
	columnVisibility,
	onChange,
	customColumns,
	onAddCustomColumn,
	onUpdateCustomColumn,
	onRemoveCustomColumn,
	sorting,
	onSortingChange,
	onSortingReset
}: ColumnManagerProps) {
	const [search, setSearch] = useState('')
	const [groupFilter, setGroupFilter] = useState<ColumnGroupId | 'all'>('all')
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
	const [customColumnExpanded, setCustomColumnExpanded] = useState(false)

	const [customName, setCustomName] = useState('')
	const [customExpression, setCustomExpression] = useState('')
	const [customFormat, setCustomFormat] = useState<ColumnFormat>('number')
	const [customAggregation, setCustomAggregation] = useState<ColumnAggregation>('recalculate')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [showAutocomplete, setShowAutocomplete] = useState(false)
	const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
	const [autocompleteFilter, setAutocompleteFilter] = useState('')
	const expressionInputRef = useRef<HTMLInputElement>(null)
	const aggregationTouchedRef = useRef(false)

	const allColumns = useMemo(() => buildAllColumns(customColumns), [customColumns])
	const allColumnIds = useMemo(() => new Set(allColumns.map((c) => c.id)), [allColumns])

	const visibleSet = useMemo(() => {
		const set = new Set<string>(['name'])
		for (const column of allColumns) {
			if (column.id === 'name') continue
			const isVisible = columnVisibility[column.id] !== false
			if (isVisible) set.add(column.id)
		}
		return set
	}, [allColumns, columnVisibility])

	const selectedColumns = useMemo(() => {
		const selected: string[] = []
		for (const id of columnOrder) {
			if (id === 'name') continue
			if (!allColumnIds.has(id)) continue
			if (visibleSet.has(id)) selected.push(id)
		}
		for (const meta of allColumns) {
			if (meta.id === 'name') continue
			if (selected.includes(meta.id)) continue
			if (visibleSet.has(meta.id)) selected.push(meta.id)
		}
		return selected
	}, [allColumns, allColumnIds, columnOrder, visibleSet])

	const filteredColumns = useMemo(() => {
		const term = search.trim().toLowerCase()
		return allColumns.filter((column) => {
			if (column.id === 'name') return false
			if (groupFilter !== 'all' && column.group !== groupFilter) return false
			if (term && !column.header.toLowerCase().includes(term)) return false
			return true
		})
	}, [allColumns, groupFilter, search])

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	const applyChanges = useCallback(
		(nextSelected: string[]) => {
			const remaining = allColumns.map((c) => c.id).filter((id) => id !== 'name' && !nextSelected.includes(id))
			const nextOrder: ColumnOrderState = ['name', ...nextSelected, ...remaining]
			const nextVisibility: VisibilityState = { name: true }
			for (const column of allColumns) {
				if (column.id === 'name') continue
				nextVisibility[column.id] = nextSelected.includes(column.id)
			}
			onChange(nextOrder, nextVisibility)
		},
		[allColumns, onChange]
	)

	const handleToggleColumn = useCallback(
		(id: string) => {
			if (id === 'name') return
			const isSelected = selectedColumns.includes(id)
			if (isSelected) {
				applyChanges(selectedColumns.filter((c) => c !== id))
			} else {
				applyChanges([...selectedColumns, id])
			}
		},
		[selectedColumns, applyChanges]
	)

	const handleRemoveColumn = useCallback(
		(id: string) => {
			applyChanges(selectedColumns.filter((c) => c !== id))
		},
		[selectedColumns, applyChanges]
	)

	const handleClearAll = useCallback(() => {
		applyChanges([])
	}, [applyChanges])

	const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id)
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (over && active.id !== over.id) {
			const oldIndex = selectedColumns.indexOf(String(active.id))
			const newIndex = selectedColumns.indexOf(String(over.id))
			if (oldIndex !== -1 && newIndex !== -1) {
				applyChanges(arrayMove(selectedColumns, oldIndex, newIndex))
			}
		}
		setActiveId(null)
	}
	const handleDragCancel = () => setActiveId(null)

	const availableVariables = useMemo(() => getAvailableVariables(), [])

	const autocompleteSuggestions = useMemo<AutocompleteSuggestion[]>(() => {
		return [
			...availableVariables.map((v) => ({
				type: 'variable' as const,
				value: v.key,
				display: v.key,
				description: v.name,
				category: v.group
			})),
			{ type: 'operator', value: ' + ', display: '+', description: 'Addition', category: 'Operators' },
			{ type: 'operator', value: ' - ', display: '-', description: 'Subtraction', category: 'Operators' },
			{ type: 'operator', value: ' * ', display: '*', description: 'Multiplication', category: 'Operators' },
			{ type: 'operator', value: ' / ', display: '/', description: 'Division', category: 'Operators' },
			{ type: 'function', value: 'abs(', display: 'abs()', description: 'Absolute value', category: 'Functions' },
			{ type: 'function', value: 'sqrt(', display: 'sqrt()', description: 'Square root', category: 'Functions' },
			{ type: 'function', value: 'max(', display: 'max(a,b)', description: 'Maximum', category: 'Functions' },
			{ type: 'function', value: 'min(', display: 'min(a,b)', description: 'Minimum', category: 'Functions' }
		]
	}, [availableVariables])

	const filteredSuggestions = useMemo(() => {
		if (!autocompleteFilter.trim()) return autocompleteSuggestions.slice(0, 15)
		const filter = autocompleteFilter.toLowerCase()
		return autocompleteSuggestions
			.filter((s) => s.display.toLowerCase().includes(filter) || s.description.toLowerCase().includes(filter))
			.slice(0, 10)
	}, [autocompleteSuggestions, autocompleteFilter])

	const expressionValidation = useMemo(() => {
		if (!customExpression.trim()) return { isValid: false, error: 'Expression is required' }
		return validateExpression(customExpression)
	}, [customExpression])

	const validation = useMemo(() => {
		if (!customName.trim()) return { isValid: false, error: 'Name is required' }
		const isDuplicate = (customColumns ?? []).some(
			(col) => col.name.toLowerCase() === customName.toLowerCase() && col.id !== editingId
		)
		if (isDuplicate) return { isValid: false, error: 'Column name already exists' }
		return expressionValidation
	}, [customName, expressionValidation, customColumns, editingId])

	const preview = useMemo(() => {
		if (!customExpression.trim() || !expressionValidation.isValid) return null
		const result = evaluateExpression(customExpression, SAMPLE_METRICS)
		if (result === null) return null
		return formatPreviewNumber(result, customFormat)
	}, [customExpression, expressionValidation.isValid, customFormat])

	const usedVariables = useMemo(() => {
		if (!customExpression.trim() || !expressionValidation.isValid) return []
		const vars = getExpressionVariables(customExpression)
		const availableVarsMap = new Map(availableVariables.map((v) => [v.key, v]))
		return vars
			.filter((v) => v in SAMPLE_METRICS)
			.map((v) => {
				const meta = availableVarsMap.get(v)
				const value = SAMPLE_METRICS[v as keyof typeof SAMPLE_METRICS]
				return {
					key: v,
					name: meta?.name ?? v,
					value,
					formatted: formatPreviewNumber(value, meta?.format ?? 'number')
				}
			})
	}, [customExpression, expressionValidation.isValid, availableVariables])

	useEffect(() => {
		if (customExpression && expressionValidation.isValid && !editingId && !aggregationTouchedRef.current) {
			setCustomAggregation(getDefaultAggregation(customExpression))
		}
	}, [customExpression, expressionValidation.isValid, editingId])

	const insertSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
		if (!expressionInputRef.current) return
		const input = expressionInputRef.current
		const start = input.selectionStart || 0
		const end = input.selectionEnd || 0
		const value = input.value

		let wordStart = start
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(value[wordStart - 1])) wordStart--

		const newValue = value.slice(0, wordStart) + suggestion.value + value.slice(end)
		setCustomExpression(newValue)

		setTimeout(() => {
			const newPosition = wordStart + suggestion.value.length
			input.setSelectionRange(newPosition, newPosition)
			input.focus()
		}, 0)

		setShowAutocomplete(false)
		setAutocompleteIndex(-1)
		setAutocompleteFilter('')
	}, [])

	const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		const cursorPos = e.target.selectionStart || 0
		setCustomExpression(newValue)

		let wordStart = cursorPos
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(newValue[wordStart - 1])) wordStart--
		const currentWord = newValue.slice(wordStart, cursorPos)

		if (currentWord.length >= 1) {
			setAutocompleteFilter(currentWord)
			setShowAutocomplete(true)
			setAutocompleteIndex(-1)
		} else {
			setShowAutocomplete(false)
			setAutocompleteFilter('')
		}
	}

	const handleExpressionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showAutocomplete || filteredSuggestions.length === 0) {
			if (e.ctrlKey && e.code === 'Space') {
				e.preventDefault()
				setShowAutocomplete(true)
				setAutocompleteFilter('')
				setAutocompleteIndex(-1)
			}
			return
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setAutocompleteIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0))
				break
			case 'ArrowUp':
				e.preventDefault()
				setAutocompleteIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1))
				break
			case 'Enter':
			case 'Tab':
				if (autocompleteIndex >= 0) {
					e.preventDefault()
					insertSuggestion(filteredSuggestions[autocompleteIndex])
				}
				break
			case 'Escape':
				e.preventDefault()
				setShowAutocomplete(false)
				setAutocompleteIndex(-1)
				break
		}
	}

	const handleAddOrUpdateCustomColumn = useCallback(() => {
		if (!validation.isValid) return
		const column: CustomColumnDefinition = {
			id: editingId ?? generateCustomColumnId(),
			name: customName.trim(),
			expression: customExpression.trim(),
			format: customFormat,
			aggregation: customAggregation
		}
		if (editingId && onUpdateCustomColumn) {
			onUpdateCustomColumn(editingId, {
				name: column.name,
				expression: column.expression,
				format: column.format,
				aggregation: column.aggregation
			})
			setEditingId(null)
		} else if (onAddCustomColumn) {
			onAddCustomColumn(column)
		}
		aggregationTouchedRef.current = false
		setCustomName('')
		setCustomExpression('')
		setCustomFormat('number')
		setCustomAggregation('recalculate')
		setCustomColumnExpanded(false)
	}, [
		validation.isValid,
		customName,
		customExpression,
		customFormat,
		customAggregation,
		editingId,
		onAddCustomColumn,
		onUpdateCustomColumn
	])

	const handleApplyPreset = (preset: (typeof EXAMPLE_PRESETS)[0]) => {
		aggregationTouchedRef.current = false
		setCustomName(preset.name)
		setCustomExpression(preset.expression)
		setCustomFormat(preset.format)
		setCustomAggregation(getDefaultAggregation(preset.expression))
		setCustomColumnExpanded(true)
	}

	const handleEditCustomColumn = (col: CustomColumnDefinition) => {
		setCustomName(col.name)
		setCustomExpression(col.expression)
		setCustomFormat(col.format)
		setCustomAggregation(col.aggregation)
		setEditingId(col.id)
		setCustomColumnExpanded(true)
	}

	const handleCancelEdit = () => {
		aggregationTouchedRef.current = false
		setCustomName('')
		setCustomExpression('')
		setCustomFormat('number')
		setCustomAggregation('recalculate')
		setEditingId(null)
	}

	useEffect(() => {
		const handleClickOutside = () => setShowAutocomplete(false)
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	}, [])

	const activeColumn = activeId ? getColumnMeta(String(activeId), customColumns) : null

	const currentSorting = sorting?.[0]
	const currentSortColumn = currentSorting?.id ?? ''
	const isDescending = currentSorting?.desc ?? true

	const selectableColumnsForSort = useMemo(() => {
		return columnOrder
			.filter((id) => columnVisibility[id] ?? true)
			.map((id) => getColumnMeta(id, customColumns))
			.filter((meta): meta is ColumnMeta => Boolean(meta))
	}, [columnOrder, columnVisibility, customColumns])

	const handleSortColumnChange = (value: string) => {
		if (!onSortingChange) return
		if (!value) {
			onSortingChange([])
			return
		}
		const nextDesc = currentSortColumn === value ? isDescending : true
		onSortingChange([{ id: value, desc: nextDesc }])
	}

	const handleSortDirectionChange = (desc: boolean) => {
		if (!onSortingChange || !currentSortColumn) return
		onSortingChange([{ id: currentSortColumn, desc }])
	}

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="mb-2 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<h4 className="text-xs font-semibold text-(--text-primary) uppercase">Selected</h4>
						<span className="rounded bg-(--primary)/10 px-1.5 py-0.5 text-[10px] font-medium text-(--primary)">
							{selectedColumns.length}
						</span>
					</div>
					{selectedColumns.length > 0 && (
						<button
							type="button"
							onClick={handleClearAll}
							className="text-[10px] font-medium text-red-500 hover:underline"
						>
							Clear all
						</button>
					)}
				</div>

				<DndContext
					sensors={sensors}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<div className="max-h-[100px] overflow-y-auto">
						{selectedColumns.length === 0 ? (
							<div className="flex h-12 items-center justify-center rounded-md border border-dashed border-(--cards-border) text-xs text-(--text-tertiary)">
								No columns selected
							</div>
						) : (
							<SortableContext items={selectedColumns} strategy={horizontalListSortingStrategy}>
								<div className="flex flex-wrap gap-1.5">
									{selectedColumns.map((columnId, index) => {
										const meta = getColumnMeta(columnId, customColumns)
										if (!meta) return null
										return (
											<SortableChip
												key={meta.id}
												id={meta.id}
												label={meta.header}
												isFirst={index === 0}
												onRemove={() => handleRemoveColumn(meta.id)}
												isCustom={meta.group === 'custom'}
											/>
										)
									})}
								</div>
							</SortableContext>
						)}
					</div>
					<DragOverlay>
						{activeColumn ? (
							<div className="rounded-md border border-(--primary) bg-(--primary)/20 px-2 py-1 text-xs font-medium text-(--primary) shadow-lg">
								{activeColumn.header}
							</div>
						) : null}
					</DragOverlay>
				</DndContext>

				<p className="mt-2 text-[10px] text-(--text-tertiary)">Drag to reorder. First column pinned left.</p>
			</section>

			{sorting !== undefined && onSortingChange && (
				<SortingSection
					currentSortColumn={currentSortColumn}
					isDescending={isDescending}
					selectableColumns={selectableColumnsForSort}
					onColumnChange={handleSortColumnChange}
					onDirectionChange={handleSortDirectionChange}
					onReset={onSortingReset}
				/>
			)}

			<section className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3">
				<button
					type="button"
					onClick={() => {
						setCustomColumnExpanded(!customColumnExpanded)
						if (editingId) handleCancelEdit()
					}}
					className="flex w-full items-center justify-between"
				>
					<div className="flex items-center gap-2">
						<Icon name={customColumnExpanded ? 'minus' : 'plus'} width={14} height={14} className="text-(--primary)" />
						<span className="text-xs font-semibold text-(--text-primary)">
							{editingId ? 'Edit Custom Column' : 'Custom Column'}
						</span>
						{(customColumns?.length ?? 0) > 0 && (
							<span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-500">
								{customColumns?.length}
							</span>
						)}
					</div>
					<Icon
						name="chevron-down"
						width={14}
						height={14}
						className={`text-(--text-tertiary) transition-transform ${customColumnExpanded ? 'rotate-180' : ''}`}
					/>
				</button>

				<div className="mt-2 flex flex-wrap gap-1.5">
					{EXAMPLE_PRESETS.map((preset) => (
						<button
							key={preset.name}
							type="button"
							onClick={() => handleApplyPreset(preset)}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 px-2 py-1 text-[10px] font-medium text-(--text-secondary) transition-colors hover:border-(--primary) hover:text-(--primary)"
						>
							{preset.name}
						</button>
					))}
				</div>

				{customColumnExpanded && (
					<div className="mt-3 space-y-3 border-t border-(--cards-border) pt-3">
						{editingId && (
							<div className="flex items-center justify-between">
								<span className="text-xs text-(--text-secondary)">Editing: {customName || 'Custom Column'}</span>
								<button type="button" onClick={handleCancelEdit} className="text-xs text-(--primary) hover:underline">
									Cancel
								</button>
							</div>
						)}

						<div className="flex gap-2">
							<input
								type="text"
								value={customName}
								onChange={(e) => setCustomName(e.target.value)}
								placeholder="Column name"
								className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 px-2 py-1.5 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--primary) focus:outline-none"
							/>
						</div>

						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<input
								ref={expressionInputRef}
								type="text"
								value={customExpression}
								onChange={handleExpressionChange}
								onKeyDown={handleExpressionKeyDown}
								onFocus={() => customExpression && setShowAutocomplete(true)}
								placeholder="e.g., tvl / mcap, fees24h * 365"
								className={`w-full rounded-md border bg-(--cards-bg-alt)/50 px-2 py-1.5 pr-8 font-mono text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-none ${
									customExpression && !expressionValidation.isValid
										? 'border-red-500'
										: customExpression && expressionValidation.isValid
											? 'border-green-500'
											: 'border-(--cards-border) focus:border-(--primary)'
								}`}
							/>
							{customExpression && (
								<div className="absolute top-1/2 right-2 -translate-y-1/2">
									{expressionValidation.isValid ? (
										<Icon name="check" height={12} width={12} className="text-green-500" />
									) : (
										<Icon name="x" height={12} width={12} className="text-red-500" />
									)}
								</div>
							)}
							{showAutocomplete && filteredSuggestions.length > 0 && (
								<div className="thin-scrollbar absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg">
									{filteredSuggestions.map((suggestion, index) => (
										<div
											key={`${suggestion.type}-${suggestion.value}`}
											onClick={() => insertSuggestion(suggestion)}
											onMouseEnter={() => setAutocompleteIndex(index)}
											className={`flex cursor-pointer items-center gap-2 px-2 py-1 text-xs ${
												index === autocompleteIndex
													? 'bg-(--primary) text-white'
													: 'text-(--text-primary) hover:bg-(--cards-bg-alt)'
											}`}
										>
											<span
												className={`h-1.5 w-1.5 shrink-0 rounded-full ${
													suggestion.type === 'variable'
														? 'bg-blue-400'
														: suggestion.type === 'function'
															? 'bg-purple-400'
															: 'bg-gray-400'
												}`}
											/>
											<code className="shrink-0">{suggestion.display}</code>
											<span className="ml-auto truncate text-(--text-tertiary)">{suggestion.description}</span>
										</div>
									))}
								</div>
							)}
						</div>
						<p className="text-[9px] text-(--text-tertiary)">Ctrl+Space to show all · ↑↓ navigate · Enter select</p>

						<div className="flex flex-wrap gap-2">
							<div className="flex-1">
								<label className="mb-1 block text-[10px] font-medium text-(--text-secondary)">Format</label>
								<div className="flex gap-1">
									{FORMAT_OPTIONS.map((opt) => (
										<Tooltip key={opt.id} content={opt.description} placement="bottom">
											<button
												type="button"
												onClick={() => setCustomFormat(opt.id)}
												className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
													customFormat === opt.id
														? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
														: 'border-(--cards-border) text-(--text-tertiary) hover:border-(--primary)/50'
												}`}
											>
												{opt.label}
											</button>
										</Tooltip>
									))}
								</div>
							</div>
							<div className="flex-1">
								<label className="mb-1 block text-[10px] font-medium text-(--text-secondary)">Aggregation</label>
								<div className="flex gap-1">
									{AGGREGATION_OPTIONS.map((opt) => (
										<Tooltip key={opt.id} content={opt.description} placement="bottom">
											<button
												type="button"
												onClick={() => {
													aggregationTouchedRef.current = true
													setCustomAggregation(opt.id)
												}}
												className={`flex-1 rounded-md border px-1 py-1 text-[10px] font-medium transition-colors ${
													customAggregation === opt.id
														? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
														: 'border-(--cards-border) text-(--text-tertiary) hover:border-(--primary)/50'
												}`}
											>
												{opt.label}
											</button>
										</Tooltip>
									))}
								</div>
							</div>
						</div>

						{customExpression && (
							<div
								className={`rounded-md border p-2 text-xs ${
									expressionValidation.isValid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-(--text-secondary)">Result:</span>
									{preview !== null ? (
										<span className="font-mono font-semibold text-green-600 dark:text-green-400">{preview}</span>
									) : (
										<span className="text-red-500">{expressionValidation.error || 'Invalid'}</span>
									)}
								</div>
								{usedVariables.length > 0 && (
									<div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 border-t border-green-500/20 pt-1">
										{usedVariables.map((v) => (
											<span key={v.key} className="text-[10px] text-(--text-tertiary)">
												<code>{v.key}</code>={v.formatted}
											</span>
										))}
									</div>
								)}
							</div>
						)}

						<button
							type="button"
							onClick={handleAddOrUpdateCustomColumn}
							disabled={!validation.isValid}
							className="w-full rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
						>
							{editingId ? 'Update Column' : 'Add Custom Column'}
						</button>
					</div>
				)}

				{(customColumns?.length ?? 0) > 0 && (
					<div className="mt-3 space-y-1.5 border-t border-(--cards-border) pt-3">
						{customColumns?.map((col) => (
							<div
								key={col.id}
								className={`flex items-center justify-between rounded-md border p-2 ${editingId === col.id ? 'border-(--primary) bg-(--primary)/5' : 'border-(--cards-border) bg-(--cards-bg-alt)/30'}`}
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<span className="truncate text-xs font-medium text-(--text-primary)">{col.name}</span>
										<span className="rounded border border-(--cards-border) bg-(--cards-bg) px-1 py-0.5 text-[9px] uppercase">
											{col.format}
										</span>
										<span className="rounded border border-(--cards-border) bg-(--cards-bg) px-1 py-0.5 text-[9px] text-(--text-tertiary)">
											{AGGREGATION_OPTIONS.find((a) => a.id === col.aggregation)?.label}
										</span>
									</div>
									<code className="block truncate text-[10px] text-(--text-tertiary)">{col.expression}</code>
								</div>
								<div className="ml-2 flex shrink-0 items-center gap-1">
									<button
										type="button"
										onClick={() => handleEditCustomColumn(col)}
										className="rounded p-1 text-(--text-tertiary) hover:bg-(--cards-bg-alt) hover:text-(--primary)"
									>
										<Icon name="pencil" height={12} width={12} />
									</button>
									<button
										type="button"
										onClick={() => onRemoveCustomColumn?.(col.id)}
										className="rounded p-1 text-(--text-tertiary) hover:bg-red-500/10 hover:text-red-500"
									>
										<Icon name="trash-2" height={12} width={12} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			<section className="flex flex-col rounded-lg border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap gap-1 border-b border-(--cards-border) p-2">
					{GROUP_FILTERS.map((filter) => (
						<button
							key={filter.id}
							type="button"
							onClick={() => setGroupFilter(filter.id)}
							className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
								groupFilter === filter.id
									? 'bg-(--primary)/15 text-(--primary)'
									: 'text-(--text-tertiary) hover:bg-(--cards-bg-alt) hover:text-(--text-secondary)'
							}`}
						>
							{filter.label}
						</button>
					))}
				</div>

				<div className="border-b border-(--cards-border) p-2">
					<div className="relative">
						<Icon
							name="search"
							width={12}
							height={12}
							className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
						/>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search columns..."
							className="w-full rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 py-1.5 pr-2.5 pl-8 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--primary) focus:outline-none"
						/>
					</div>
				</div>

				<div className="thin-scrollbar max-h-[240px] overflow-y-auto p-2">
					{filteredColumns.length === 0 ? (
						<div className="flex h-16 items-center justify-center text-xs text-(--text-tertiary)">No columns match</div>
					) : (
						<div className="flex flex-col gap-1">
							{filteredColumns.map((column) => {
								const isSelected = selectedColumns.includes(column.id)
								return (
									<button
										key={column.id}
										type="button"
										onClick={() => handleToggleColumn(column.id)}
										className={`group flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all ${
											isSelected
												? 'border-(--primary)/30 bg-(--primary)/5'
												: 'border-transparent hover:border-(--cards-border) hover:bg-(--cards-bg-alt)/50'
										}`}
									>
										<div
											className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
												isSelected
													? 'border-(--primary) bg-(--primary) text-white'
													: 'border-(--cards-border) group-hover:border-(--primary)/50'
											}`}
										>
											{isSelected && <Icon name="check" width={8} height={8} />}
										</div>
										<span
											className={`flex-1 truncate text-xs ${isSelected ? 'font-medium text-(--text-primary)' : 'text-(--text-secondary)'}`}
										>
											{column.header}
										</span>
										<span className="rounded bg-(--cards-bg-alt) px-1 py-0.5 text-[9px] text-(--text-tertiary) uppercase">
											{GROUP_LABELS[column.group]}
										</span>
									</button>
								)
							})}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}

function SortableChip({
	id,
	label,
	isFirst,
	onRemove,
	isCustom
}: {
	id: string
	label: string
	isFirst: boolean
	onRemove: () => void
	isCustom?: boolean
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
	const style: React.CSSProperties = {
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition,
		opacity: isDragging ? 0.5 : 1
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors ${
				isFirst
					? 'border-(--primary)/50 bg-(--primary)/10'
					: isCustom
						? 'border-purple-500/30 bg-purple-500/5'
						: 'border-(--cards-border) bg-(--cards-bg-alt)/50'
			}`}
		>
			<span
				{...attributes}
				{...listeners}
				className="cursor-grab text-(--text-tertiary) hover:text-(--text-secondary) active:cursor-grabbing"
			>
				<Icon name="menu" width={10} height={10} />
			</span>
			<span className="max-w-[80px] truncate font-medium text-(--text-primary)" title={label}>
				{label}
			</span>
			{isFirst && <Icon name="pin" width={8} height={8} className="text-(--primary)" />}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onRemove()
				}}
				className="rounded text-(--text-tertiary) transition-colors hover:text-red-500"
			>
				<Icon name="x" width={10} height={10} />
			</button>
		</div>
	)
}

function SortingSection({
	currentSortColumn,
	isDescending,
	selectableColumns,
	onColumnChange,
	onDirectionChange,
	onReset
}: {
	currentSortColumn: string
	isDescending: boolean
	selectableColumns: ColumnMeta[]
	onColumnChange: (value: string) => void
	onDirectionChange: (desc: boolean) => void
	onReset?: () => void
}) {
	const popover = usePopoverStore({ placement: 'bottom-start' })

	const selectedLabel = useMemo(() => {
		if (!currentSortColumn) return 'No sorting'
		const selected = selectableColumns.find((col) => col.id === currentSortColumn)
		return selected?.header || currentSortColumn
	}, [currentSortColumn, selectableColumns])

	return (
		<section className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-3">
			<h4 className="mb-2 text-xs font-semibold text-(--text-primary) uppercase">Sorting</h4>
			<div className="flex flex-wrap items-center gap-2">
				<div className="min-w-[140px] flex-1">
					<PopoverDisclosure
						store={popover}
						className="flex w-full items-center justify-between rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 px-2 py-1.5 text-xs transition-colors hover:border-(--primary)/40 focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					>
						<span className={`truncate ${currentSortColumn ? 'text-(--text-primary)' : 'text-(--text-tertiary)'}`}>
							{selectedLabel}
						</span>
						<Icon name="chevron-down" width={12} height={12} className="ml-2 flex-shrink-0 opacity-70" />
					</PopoverDisclosure>
					<Popover
						store={popover}
						modal={false}
						portal={true}
						flip={false}
						gutter={4}
						className="z-50 rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg"
						style={{ width: 'var(--popover-anchor-width)' }}
					>
						<div className="thin-scrollbar max-h-[280px] overflow-y-auto p-1">
							<button
								type="button"
								onClick={() => {
									onColumnChange('')
									popover.setOpen(false)
								}}
								className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
									!currentSortColumn
										? 'bg-(--primary)/10 font-semibold text-(--primary)'
										: 'text-(--text-secondary) hover:bg-(--cards-bg-alt)'
								}`}
							>
								<span>No sorting</span>
								{!currentSortColumn && (
									<Icon name="check" width={12} height={12} className="ml-2 flex-shrink-0 text-(--primary)" />
								)}
							</button>
							{selectableColumns.map((col) => {
								const isActive = col.id === currentSortColumn
								return (
									<button
										key={col.id}
										type="button"
										onClick={() => {
											onColumnChange(col.id)
											popover.setOpen(false)
										}}
										className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
											isActive
												? 'bg-(--primary)/10 font-semibold text-(--primary)'
												: 'text-(--text-secondary) hover:bg-(--cards-bg-alt)'
										}`}
									>
										<span className="truncate">{col.header}</span>
										{isActive && (
											<Icon name="check" width={12} height={12} className="ml-2 flex-shrink-0 text-(--primary)" />
										)}
									</button>
								)
							})}
						</div>
					</Popover>
				</div>
				<div className="flex overflow-hidden rounded-md border border-(--cards-border)">
					<button
						type="button"
						onClick={() => onDirectionChange(false)}
						disabled={!currentSortColumn}
						className={`px-2 py-1 text-[10px] font-medium transition ${
							!currentSortColumn
								? 'cursor-not-allowed text-(--text-tertiary)'
								: !isDescending
									? 'bg-(--primary) text-white'
									: 'text-(--text-secondary) hover:bg-(--cards-bg-alt)'
						}`}
					>
						Asc
					</button>
					<button
						type="button"
						onClick={() => onDirectionChange(true)}
						disabled={!currentSortColumn}
						className={`border-l border-(--cards-border) px-2 py-1 text-[10px] font-medium transition ${
							!currentSortColumn
								? 'cursor-not-allowed text-(--text-tertiary)'
								: isDescending
									? 'bg-(--primary) text-white'
									: 'text-(--text-secondary) hover:bg-(--cards-bg-alt)'
						}`}
					>
						Desc
					</button>
				</div>
				{onReset && (
					<button type="button" onClick={onReset} className="text-[10px] text-(--primary) hover:underline">
						Reset
					</button>
				)}
			</div>
		</section>
	)
}
