import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as Ariakit from '@ariakit/react'
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
	type UniqueIdentifier
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColumnOrderState, VisibilityState } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import {
	COLUMN_DICTIONARY_BY_ID,
	UNIFIED_TABLE_COLUMN_DICTIONARY
} from '~/containers/ProDashboard/components/UnifiedTable/config/ColumnDictionary'
import { isColumnSupported } from '~/containers/ProDashboard/components/UnifiedTable/config/metricCapabilities'
import type { MetricGroup } from '~/containers/ProDashboard/components/UnifiedTable/types'

interface ColumnManagerProps {
	strategyType: 'protocols' | 'chains'
	columnOrder: ColumnOrderState
	columnVisibility: VisibilityState
	onChange: (columnOrder: ColumnOrderState, columnVisibility: VisibilityState) => void
}

type ColumnGroupId = MetricGroup | 'meta'

interface ColumnMeta {
	id: string
	header: string
	group: ColumnGroupId
	tags: string[]
}

const ALWAYS_INCLUDED = new Set(['name'])

const GROUP_FILTERS: Array<{ id: ColumnGroupId | 'all'; label: string }> = [
	{ id: 'all', label: 'All' },
	{ id: 'meta', label: 'Meta' },
	{ id: 'tvl', label: 'TVL' },
	{ id: 'volume', label: 'Volume' },
	{ id: 'fees', label: 'Fees' },
	{ id: 'revenue', label: 'Revenue' },
	{ id: 'perps', label: 'Perps' },
	{ id: 'aggregators', label: 'Aggregators' },
	{ id: 'derivatives-aggregators', label: 'Derivatives Aggs' },
	{ id: 'options', label: 'Options' },
	{ id: 'ratios', label: 'Ratios' }
]

const GROUP_LABELS: Record<ColumnGroupId, string> = GROUP_FILTERS.reduce(
	(acc, filter) => {
		if (filter.id !== 'all') {
			acc[filter.id as ColumnGroupId] = filter.label
		}
		return acc
	},
	{} as Record<ColumnGroupId, string>
)

const TAG_FILTERS: Array<{ id: string; label: string }> = [
	{ id: 'change', label: 'Changes' },
	{ id: 'dominance', label: 'Market Share' },
	{ id: 'cumulative', label: 'Cumulative' },
	{ id: 'distribution', label: 'Fee Breakdown' },
	{ id: 'derived', label: 'Derived' },
	{ id: 'advanced', label: 'Advanced' },
	{ id: 'specialized', label: 'Specialized' }
]

const NAME_COLUMN: ColumnMeta = {
	id: 'name',
	header: 'Name',
	group: 'meta',
	tags: []
}

const getColumnMeta = (id: string): ColumnMeta | null => {
	if (id === 'name') return NAME_COLUMN
	const dictionaryEntry = COLUMN_DICTIONARY_BY_ID.get(id)
	if (!dictionaryEntry) return null
	return {
		id: dictionaryEntry.id,
		header: dictionaryEntry.header,
		group: (dictionaryEntry.group as ColumnGroupId) ?? 'meta',
		tags: dictionaryEntry.tags ?? []
	}
}

const buildAllColumns = (strategyType: 'protocols' | 'chains'): ColumnMeta[] => {
	const dictionaryMetas = UNIFIED_TABLE_COLUMN_DICTIONARY.filter((column) => {
		if (column.strategies && !column.strategies.includes(strategyType)) return false
		if (!isColumnSupported(column.id, strategyType)) return false
		return true
	})
		.map(({ id }) => getColumnMeta(id))
		.filter((meta): meta is ColumnMeta => Boolean(meta))

	return [NAME_COLUMN, ...dictionaryMetas]
}

export function ColumnManager({ strategyType, columnOrder, columnVisibility, onChange }: ColumnManagerProps) {
	const [search, setSearch] = useState('')
	const [groupFilter, setGroupFilter] = useState<ColumnGroupId | 'all'>('all')
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
	const [recentlyChangedIds, setRecentlyChangedIds] = useState<Set<string>>(new Set())
	const [selectedCheckboxIds, setSelectedCheckboxIds] = useState<Set<string>>(new Set())
	const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)

	const allColumns = useMemo(() => buildAllColumns(strategyType), [strategyType])
	const allColumnIds = useMemo(() => new Set(allColumns.map((column) => column.id)), [allColumns])

	const visibleSet = useMemo(() => {
		const entries = Object.entries(columnVisibility)
		const set = new Set<string>()
		for (const column of allColumns) {
			if (column.id === 'name') {
				set.add('name')
				continue
			}
			const entry = entries.find(([key]) => key === column.id)
			const isVisible = entry ? entry[1] !== false : true
			if (isVisible) set.add(column.id)
		}
		return set
	}, [allColumns, columnVisibility])

	const selectedColumns = useMemo(() => {
		const selected: string[] = []
		for (const id of columnOrder) {
			if (id === 'name') continue
			if (!allColumnIds.has(id)) continue
			if (visibleSet.has(id)) {
				selected.push(id)
			}
		}

		if (selected.length !== visibleSet.size - 1) {
			for (const meta of allColumns) {
				if (meta.id === 'name') continue
				if (selected.includes(meta.id)) continue
				if (visibleSet.has(meta.id)) {
					selected.push(meta.id)
				}
			}
		}

		return selected
	}, [allColumns, allColumnIds, columnOrder, visibleSet])

	const availableColumns = useMemo(() => {
		const selectedSet = new Set(selectedColumns)
		return allColumns.filter((column) => column.id !== 'name' && !selectedSet.has(column.id))
	}, [allColumns, selectedColumns])

	const filteredAvailableColumns = useMemo(() => {
		const term = search.trim().toLowerCase()
		const tagsActive = selectedTags.size > 0
		return availableColumns.filter((column) => {
			if (groupFilter !== 'all' && column.group !== groupFilter) {
				return false
			}

			if (term) {
				const haystack = `${column.header} ${column.group}`.toLowerCase()
				if (!haystack.includes(term)) {
					return false
				}
			}

			if (tagsActive) {
				const hasMatch = column.tags.some((tag) => selectedTags.has(tag))
				if (!hasMatch) return false
			}

			return true
		})
	}, [availableColumns, groupFilter, search, selectedTags])

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 4
			}
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates
		})
	)

	const selectedListRef = useRef<HTMLDivElement | null>(null)

	const selectedDroppable = useDroppable({
		id: 'selected-drop',
		data: { container: 'selected' }
	})

	const toggleTag = (tagId: string) => {
		setSelectedTags((prev) => {
			const next = new Set(prev)
			if (next.has(tagId)) {
				next.delete(tagId)
			} else {
				next.add(tagId)
			}
			return next
		})
	}

	const clearAllFilters = () => {
		setSearch('')
		setGroupFilter('all')
		setSelectedTags(new Set())
	}

	const hasActiveFilters = search.trim() !== '' || groupFilter !== 'all' || selectedTags.size > 0

	const applyChanges = (nextSelected: string[], highlightIds?: string[]) => {
		const remaining = allColumns.map((column) => column.id).filter((id) => id !== 'name' && !nextSelected.includes(id))

		const nextOrder: ColumnOrderState = ['name', ...nextSelected, ...remaining]
		const nextVisibility: VisibilityState = {}

		for (const column of allColumns) {
			if (column.id === 'name') {
				nextVisibility[column.id] = true
				continue
			}
			nextVisibility[column.id] = nextSelected.includes(column.id)
		}

		if (highlightIds && highlightIds.length > 0) {
			setRecentlyChangedIds(new Set(highlightIds))
			setTimeout(() => setRecentlyChangedIds(new Set()), 200)
		}

		onChange(nextOrder, nextVisibility)
	}

	const handleAddColumn = (id: string, index?: number) => {
		if (!allColumnIds.has(id) || id === 'name') return
		if (selectedColumns.includes(id)) return
		const next = [...selectedColumns]
		const insertIndex = index === undefined ? next.length : Math.max(0, Math.min(index, next.length))
		next.splice(insertIndex, 0, id)
		applyChanges(next, [id])
	}

	const handleAddColumnsBulk = (ids: string[]) => {
		if (!ids.length) return
		const next = [...selectedColumns]
		const added: string[] = []
		for (const id of ids) {
			if (!allColumnIds.has(id) || id === 'name') continue
			if (next.includes(id)) continue
			next.push(id)
			added.push(id)
		}
		if (added.length > 0) {
			applyChanges(next, added)
		}
	}

	const handleRemoveColumn = (id: string) => {
		if (!selectedColumns.includes(id)) return
		const next = selectedColumns.filter((columnId) => columnId !== id)
		applyChanges(next, [id])
	}

	const handleRemoveAllColumns = () => {
		if (selectedColumns.length === 0) return
		applyChanges([])
	}

	const handleCheckboxToggle = (id: string, index: number, shiftKey: boolean) => {
		setSelectedCheckboxIds((prev) => {
			const next = new Set(prev)
			if (shiftKey && lastClickedIndex !== null) {
				const start = Math.min(lastClickedIndex, index)
				const end = Math.max(lastClickedIndex, index)
				const shouldCheck = !prev.has(id)
				for (let i = start; i <= end; i++) {
					const columnId = filteredAvailableColumns[i]?.id
					if (columnId) {
						if (shouldCheck) {
							next.add(columnId)
						} else {
							next.delete(columnId)
						}
					}
				}
			} else {
				if (next.has(id)) {
					next.delete(id)
				} else {
					next.add(id)
				}
			}
			return next
		})
		setLastClickedIndex(index)
	}

	const handleAddSelectedColumns = () => {
		const idsToAdd = Array.from(selectedCheckboxIds)
		if (idsToAdd.length === 0) return
		handleAddColumnsBulk(idsToAdd)
		setSelectedCheckboxIds(new Set())
		setLastClickedIndex(null)
	}

	const handleReorder = (activeId: string, overId: string | undefined) => {
		if (!selectedColumns.includes(activeId)) return
		if (overId && !selectedColumns.includes(overId)) {
			handleAddColumn(activeId)
			return
		}
		const oldIndex = selectedColumns.indexOf(activeId)
		const newIndex = overId ? selectedColumns.indexOf(overId) : selectedColumns.length - 1
		if (oldIndex === newIndex) return
		const reordered = arrayMove(selectedColumns, oldIndex, newIndex)
		applyChanges(reordered)
	}

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id)
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over) {
			setActiveId(null)
			return
		}

		const activeContainer = active.data.current?.container as string | undefined
		const overId = over.id as string

		if (activeContainer === 'selected') {
			handleReorder(active.id as string, selectedColumns.includes(overId) ? overId : undefined)
		}

		setActiveId(null)
	}

	const handleDragCancel = () => {
		setActiveId(null)
	}

	const renderColumnCard = (column: ColumnMeta, opts: { variant: 'available' | 'selected'; isDragging?: boolean; index?: number }) => {
		const groupLabel = GROUP_LABELS[column.group] ?? column.group
		const tagBadges = column.tags.slice(0, 2)
		const remainingTags = column.tags.length - tagBadges.length
		const isHighlighted = recentlyChangedIds.has(column.id)
		const isChecked = selectedCheckboxIds.has(column.id)

		if (opts.variant === 'available') {
			return (
				<Ariakit.CheckboxProvider value={isChecked}>
					<label
						className={`group flex w-full items-center rounded-lg border text-xs transition-all duration-150 cursor-pointer gap-2.5 px-3 py-2 ${
							isChecked
								? 'border-(--primary)/70 bg-(--primary)/12 shadow-sm'
								: 'border-(--cards-border) bg-(--cards-bg) hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)/50 hover:shadow-sm'
						}`}
					>
						<Ariakit.Checkbox
							onChange={(e) => {
								if (opts.index !== undefined) {
									handleCheckboxToggle(column.id, opts.index, (e.nativeEvent as MouseEvent).shiftKey)
								}
							}}
							className="pro-border data-[checked]:bg-pro-blue-400 data-[checked]:border-pro-blue-100 dark:data-[checked]:bg-pro-blue-300/20 dark:data-[checked]:border-pro-blue-300/20 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-all"
						/>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="truncate leading-tight font-semibold text-(--text-primary) text-[11px]" title={column.header}>
								{column.header}
							</span>
							<div className="flex flex-wrap items-center gap-1">
								<span className="rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/80 px-1.5 py-0.5 font-semibold tracking-wide text-(--text-tertiary) uppercase text-[8px] leading-none">
									{groupLabel}
								</span>
								{tagBadges.map((tag) => (
									<span
										key={tag}
										className="rounded-md bg-(--primary)/8 px-1.5 py-0.5 text-(--text-secondary) text-[8px] leading-none font-medium"
									>
										{tag}
									</span>
								))}
								{remainingTags > 0 ? (
									<span className="rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg-alt)/50 px-1.5 py-0.5 text-(--text-tertiary) text-[8px] leading-none">
										+{remainingTags}
									</span>
								) : null}
							</div>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								handleAddColumn(column.id)
							}}
							className="flex-shrink-0 cursor-pointer rounded-md border border-(--cards-border) p-1.5 text-(--text-secondary) transition-all opacity-0 group-hover:opacity-100 hover:border-(--primary) hover:bg-(--primary)/15 hover:text-(--primary) hover:scale-110"
							title="Add column immediately"
						>
							<Icon name="plus" width={12} height={12} />
						</button>
					</label>
				</Ariakit.CheckboxProvider>
			)
		}

		return (
			<div
				className={`group flex w-full items-center rounded-lg border text-xs transition-all duration-150 gap-2.5 px-3 py-2.5 border-(--primary)/50 bg-gradient-to-r from-(--primary)/10 to-(--primary)/5 shadow-sm ${
					opts.isDragging ? 'opacity-60 scale-95' : ''
				} ${isHighlighted ? 'ring-2 ring-(--primary)/50 shadow-md' : ''}`}
			>
				<span className="flex flex-shrink-0 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/80 text-(--text-tertiary) h-6 w-6 cursor-grab active:cursor-grabbing">
					<Icon name="menu" width={11} height={11} />
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="truncate leading-tight font-semibold text-(--text-primary) text-[12px]" title={column.header}>
						{column.header}
					</span>
					<div className="flex flex-wrap items-center gap-1">
						<span className="rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/80 px-1.5 py-0.5 font-semibold tracking-wide text-(--text-tertiary) uppercase text-[8px] leading-none">
							{groupLabel}
						</span>
						{tagBadges.map((tag) => (
							<span
								key={tag}
								className="rounded-md bg-(--primary)/8 px-1.5 py-0.5 text-(--text-secondary) text-[8px] leading-none font-medium"
							>
								{tag}
							</span>
						))}
						{remainingTags > 0 ? (
							<span className="rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg-alt)/50 px-1.5 py-0.5 text-(--text-tertiary) text-[8px] leading-none">
								+{remainingTags}
							</span>
						) : null}
					</div>
				</div>
				<button
					type="button"
					onClick={() => handleRemoveColumn(column.id)}
					className="flex-shrink-0 cursor-pointer rounded-md border border-(--cards-border) px-3 py-1 text-[10px] font-semibold text-(--text-secondary) transition-all hover:border-red-500/70 hover:bg-red-500/15 hover:text-red-500 hover:scale-105"
				>
					Remove
				</button>
			</div>
		)
	}

	const activeColumn = activeId ? getColumnMeta(String(activeId)) : null

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<section className="flex flex-col h-[700px] rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/30 shadow-sm">
				<div className="flex flex-col gap-2.5 border-b border-(--cards-border) p-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-xs font-semibold tracking-wide text-(--text-primary) uppercase">Available Columns</h3>
						<div className="flex items-center gap-2">
							<span className="rounded bg-(--cards-bg-alt) px-2 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
								{filteredAvailableColumns.length} columns
							</span>
							<button
								type="button"
								onClick={() => handleAddColumnsBulk(filteredAvailableColumns.map((column) => column.id))}
								disabled={filteredAvailableColumns.length === 0}
								className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
									filteredAvailableColumns.length === 0
										? 'cursor-not-allowed border-(--cards-border) text-(--text-tertiary)'
										: 'border-(--primary)/50 text-(--primary) hover:bg-(--primary)/10'
								}`}
							>
								Add all
							</button>
						</div>
					</div>
					<div className="relative w-full">
						<Icon
							name="search"
							width={12}
							height={12}
							className="absolute top-1/2 left-2.5 -translate-y-1/2 text-(--text-tertiary)"
						/>
						<input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search columns..."
							className="w-full rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/50 py-1.5 pr-2.5 pl-8 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--primary) focus:bg-(--cards-bg) focus:ring-1 focus:ring-(--primary)/30 focus:outline-none"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">Category</span>
						<div className="flex flex-wrap gap-1.5">
							{GROUP_FILTERS.map((filter) => {
								const active = groupFilter === filter.id
								return (
									<button
										type="button"
										key={filter.id}
										onClick={() => setGroupFilter(filter.id)}
										className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
											active
												? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
												: 'border-(--cards-border) text-(--text-secondary) hover:border-(--primary)/50 hover:text-(--primary)'
										}`}
									>
										{filter.label}
									</button>
								)
							})}
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] font-medium tracking-wide text-(--text-tertiary) uppercase">Type</span>
						<div className="flex flex-wrap gap-1.5">
							{TAG_FILTERS.map((tag) => {
								const active = selectedTags.has(tag.id)
								return (
									<button
										type="button"
										key={tag.id}
										onClick={() => toggleTag(tag.id)}
										className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
											active
												? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
												: 'border-(--cards-border) text-(--text-secondary) hover:border-(--primary)/50 hover:text-(--primary)'
										}`}
									>
										{tag.label}
									</button>
								)
							})}
						</div>
					</div>
				</div>
				<div className="thin-scrollbar flex-1 overflow-auto relative">
					{filteredAvailableColumns.length === 0 ? (
						<div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
							<p className="text-xs text-(--text-tertiary)">No columns match your filters</p>
							{hasActiveFilters && (
								<button
									type="button"
									onClick={clearAllFilters}
									className="rounded border border-(--primary)/50 px-3 py-1 text-xs font-medium text-(--primary) hover:bg-(--primary)/10"
								>
									Clear filters
								</button>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-1.5 p-2.5 pb-20">
							{filteredAvailableColumns.map((column, index) => (
								<div key={column.id}>
									{renderColumnCard(column, { variant: 'available', index })}
								</div>
							))}
						</div>
					)}
					{selectedCheckboxIds.size > 0 && (
						<div className="sticky bottom-0 left-0 right-0 border-t-2 border-(--primary)/30 bg-gradient-to-t from-(--cards-bg) to-(--cards-bg)/95 backdrop-blur-sm px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
							<button
								type="button"
								onClick={handleAddSelectedColumns}
								className="w-full rounded-lg border-2 border-(--primary) bg-(--primary)/20 px-4 py-2.5 text-sm font-bold text-(--primary) transition-all hover:bg-(--primary)/30 hover:border-(--primary) hover:shadow-lg active:scale-95"
							>
								<span className="flex items-center justify-center gap-2">
									<Icon name="plus" width={16} height={16} />
									Add {selectedCheckboxIds.size} column{selectedCheckboxIds.size !== 1 ? 's' : ''}
								</span>
							</button>
						</div>
					)}
				</div>
			</section>

			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				<section className="flex flex-col h-[700px] rounded-lg border border-(--cards-border) border-t-2 border-t-(--primary)/20 bg-(--cards-bg) shadow-md">
					<div className="flex flex-col gap-2.5 border-b border-(--cards-border) bg-(--cards-bg-alt)/10 p-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-1.5">
								<h3 className="text-xs font-bold tracking-wide text-(--text-primary) uppercase">Selected Columns</h3>
								<Tooltip content="The first selected column is always pinned to the left side of the table and remains visible when scrolling. Drag columns to reorder them." placement="top">
									<Icon name="help-circle" width={12} height={12} className="text-(--text-tertiary) hover:text-(--text-secondary) cursor-help" />
								</Tooltip>
							</div>
							<div className="flex items-center gap-2">
								<span className="rounded bg-(--primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--primary)">
									{selectedColumns.length} selected
								</span>
							</div>
						</div>
						<p className="text-[11px] leading-relaxed text-(--text-secondary)">
							<strong>First column is pinned left.</strong> Drag to reorder remaining columns.
						</p>
					</div>

					<div className="border-b border-(--cards-border) bg-(--cards-bg-alt)/30 px-3 py-2">
						<div className="flex items-center gap-2">
							<span className="flex h-5 w-5 items-center justify-center rounded border border-(--cards-border) bg-(--cards-bg) text-(--text-tertiary)">
								<Icon name="pin" width={10} height={10} />
							</span>
							<div className="flex flex-col gap-0.5">
								<span className="text-[11px] leading-none font-semibold text-(--text-primary)">Name</span>
								<span className="text-[9px] leading-none text-(--text-tertiary)">Always visible & pinned</span>
							</div>
						</div>
					</div>

					<div
						ref={(node) => {
							selectedListRef.current = node
							selectedDroppable.setNodeRef(node)
						}}
						className="thin-scrollbar flex-1 overflow-auto"
					>
						<SortableContext items={selectedColumns}>
							<div className="flex flex-col gap-2 p-2.5">
								{selectedColumns.length === 0 ? (
									<div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-(--cards-border) px-4 text-center text-xs text-(--text-tertiary)">
										Drag columns here to build your table
									</div>
								) : (
									selectedColumns.map((columnId) => {
										const meta = getColumnMeta(columnId)
										if (!meta) return null
										return (
											<SortableSelectedItem key={meta.id} id={meta.id} disabled={ALWAYS_INCLUDED.has(meta.id)}>
												{renderColumnCard(meta, { variant: 'selected' })}
											</SortableSelectedItem>
										)
									})
								)}
							</div>
						</SortableContext>
					</div>
				</section>

				<DragOverlay>
					{activeColumn ? (
						<div className="rotate-2 scale-105 shadow-lg">
							{renderColumnCard(activeColumn, { variant: 'selected', isDragging: true })}
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	)
}


function SortableSelectedItem({ id, children, disabled }: { id: string; children: ReactNode; disabled?: boolean }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
		disabled,
		data: { container: 'selected' }
	})

	const style: React.CSSProperties = {
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition,
		opacity: isDragging ? 0.6 : undefined,
		cursor: disabled ? 'default' : 'grab'
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			{children}
		</div>
	)
}
