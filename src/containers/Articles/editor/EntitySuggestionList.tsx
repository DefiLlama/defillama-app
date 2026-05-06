import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ArticleEntitySuggestionItem } from '../entitySuggestions'
import type { ArticleEntityType } from '../types'

type Props = {
	items: ArticleEntitySuggestionItem[]
	recents: ArticleEntitySuggestionItem[]
	query: string
	loading: boolean
	command: (item: ArticleEntitySuggestionItem) => void
}

export type EntitySuggestionListHandle = {
	onKeyDown: (event: KeyboardEvent) => boolean
}

const TYPE_BADGE: Record<ArticleEntityType, string> = {
	protocol: 'PROTO',
	chain: 'CHAIN',
	metric: 'PAGE',
	category: 'CAT',
	stablecoin: 'STBL',
	cex: 'CEX',
	bridge: 'BRIDGE',
	hack: 'HACK'
}

type Filter = 'all' | ArticleEntityType
const FILTER_ORDER: Array<{ key: Filter; label: string }> = [
	{ key: 'all', label: 'All' },
	{ key: 'protocol', label: 'Proto' },
	{ key: 'chain', label: 'Chain' },
	{ key: 'metric', label: 'Page' },
	{ key: 'stablecoin', label: 'Stbl' },
	{ key: 'category', label: 'Cat' },
	{ key: 'cex', label: 'CEX' },
	{ key: 'bridge', label: 'Bridge' }
]

const fmtCompactUsd = (n?: number | null): string | null => {
	if (typeof n !== 'number' || !isFinite(n)) return null
	const abs = Math.abs(n)
	if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
	if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
	if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
	if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
	return `$${n.toFixed(0)}`
}

const fmtPctShort = (n?: number | null): string | null => {
	if (typeof n !== 'number' || !isFinite(n)) return null
	const sign = n > 0 ? '+' : ''
	return `${sign}${(n * 100).toFixed(1)}%`
}

const changeColor = (n?: number | null) =>
	typeof n !== 'number' ? '' : n > 0 ? 'text-[#16a34a]' : n < 0 ? 'text-[#dc2626]' : ''

function MetricChip({ item }: { item: ArticleEntitySuggestionItem }) {
	const p = item.preview
	if (!p) return null
	if (p.kind === 'protocol' || p.kind === 'chain') {
		const tvl = fmtCompactUsd(p.tvl)
		const change = fmtPctShort(p.change7d)
		if (!tvl && !change) return null
		return (
			<span className="ml-1 flex shrink-0 flex-col items-end gap-0.5 leading-none">
				{tvl ? <span className="text-[11px] text-(--text-secondary) tabular-nums">{tvl}</span> : null}
				{change ? <span className={`text-[10px] tabular-nums ${changeColor(p.change7d)}`}>{change}</span> : null}
			</span>
		)
	}
	return null
}

export const EntitySuggestionList = forwardRef<EntitySuggestionListHandle, Props>(function EntitySuggestionList(
	{ items, recents, query, loading, command },
	ref
) {
	const [filter, setFilter] = useState<Filter>('all')

	const availableTypes = useMemo(() => {
		const set = new Set<ArticleEntityType>()
		for (const i of items) set.add(i.entityType)
		return set
	}, [items])

	const showRecents = !query.trim() && recents.length > 0 && filter === 'all'
	const filtered = useMemo(
		() => (filter === 'all' ? items : items.filter((i) => i.entityType === filter)),
		[items, filter]
	)
	const flat = useMemo<ArticleEntitySuggestionItem[]>(() => {
		const list: ArticleEntitySuggestionItem[] = []
		if (showRecents) list.push(...recents)
		list.push(...filtered)
		return list
	}, [filtered, recents, showRecents])

	const [selectedId, setSelectedId] = useState<string | null>(flat[0]?.id ?? null)
	const listRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		if (flat.length === 0) {
			setSelectedId(null)
			return
		}
		setSelectedId((prev) => (prev && flat.some((i) => i.id === prev) ? prev : flat[0].id))
	}, [flat])

	useEffect(() => {
		if (!selectedId || !listRef.current) return
		const el = listRef.current.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`)
		el?.scrollIntoView({ block: 'nearest' })
	}, [selectedId])

	useImperativeHandle(ref, () => ({
		onKeyDown(event) {
			if (event.key === 'Tab') {
				const enabledFilters = FILTER_ORDER.filter((f) => f.key === 'all' || availableTypes.has(f.key))
				const idx = enabledFilters.findIndex((f) => f.key === filter)
				const dir = event.shiftKey ? -1 : 1
				const next = enabledFilters[(idx + dir + enabledFilters.length) % enabledFilters.length]
				setFilter(next.key)
				return true
			}
			if (flat.length === 0) {
				if (event.key === 'Enter' || event.key === 'ArrowUp' || event.key === 'ArrowDown') return true
				return false
			}
			const idx = flat.findIndex((i) => i.id === selectedId)
			if (event.key === 'ArrowDown') {
				setSelectedId(flat[(idx + 1 + flat.length) % flat.length].id)
				return true
			}
			if (event.key === 'ArrowUp') {
				setSelectedId(flat[(idx - 1 + flat.length) % flat.length].id)
				return true
			}
			if (event.key === 'Enter') {
				const item = flat[idx >= 0 ? idx : 0]
				if (item) command(item)
				return true
			}
			return false
		}
	}))

	const renderItem = (item: ArticleEntitySuggestionItem, opts?: { recent?: boolean }) => {
		const active = item.id === selectedId
		return (
			<button
				key={item.id}
				data-id={item.id}
				type="button"
				role="option"
				aria-selected={active}
				className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
					active ? 'bg-(--link-button)' : 'hover:bg-(--link-hover-bg)'
				}`}
				onMouseEnter={() => setSelectedId(item.id)}
				onMouseDown={(event) => {
					event.preventDefault()
					command(item)
				}}
			>
				<span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--cards-border) bg-(--app-bg)">
					{item.logo ? (
						<img src={item.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
					) : (
						<span className="text-[9px] font-medium tracking-wider text-(--text-tertiary)">
							{item.label.slice(0, 2).toUpperCase()}
						</span>
					)}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm text-(--text-primary)">{item.label}</span>
					<span className="truncate text-[11px] text-(--text-tertiary)">
						{opts?.recent ? 'Recent · ' : ''}
						{item.subLabel || item.route}
					</span>
				</span>
				<MetricChip item={item} />
				<span className="ml-1 shrink-0 rounded border border-(--cards-border) px-1.5 py-px text-[9px] font-medium tracking-wider text-(--text-tertiary)">
					{TYPE_BADGE[item.entityType] ?? item.entityType.toUpperCase()}
				</span>
			</button>
		)
	}

	const totalCount = items.length
	const filteredCount = filtered.length

	return (
		<div className="article-mention-pop w-[22rem] overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-xl">
			<div className="flex items-center justify-between gap-2 border-b border-(--cards-border) px-3 py-1.5 text-[11px] text-(--text-tertiary)">
				<span className="truncate">
					{query ? (
						<>
							Searching <span className="text-(--text-secondary)">"{query}"</span>
						</>
					) : (
						'Type to search · Suggested'
					)}
				</span>
				<span className="shrink-0">
					{loading
						? 'Searching…'
						: totalCount
							? filter === 'all'
								? `${totalCount}`
								: `${filteredCount}/${totalCount}`
							: '—'}
				</span>
			</div>
			<div className="flex thin-scrollbar items-center gap-1 overflow-x-auto border-b border-(--cards-border) px-2 py-1.5">
				{FILTER_ORDER.map((f) => {
					const enabled = f.key === 'all' || availableTypes.has(f.key)
					const active = f.key === filter
					return (
						<button
							key={f.key}
							type="button"
							disabled={!enabled}
							onMouseDown={(event) => {
								event.preventDefault()
								if (enabled) setFilter(f.key)
							}}
							className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase transition-colors ${
								active
									? 'border-(--link-text) bg-(--link-text) text-white'
									: enabled
										? 'border-(--cards-border) text-(--text-secondary) hover:bg-(--link-hover-bg)'
										: 'border-(--cards-border)/50 text-(--text-tertiary)/50'
							}`}
						>
							{f.label}
						</button>
					)
				})}
			</div>
			<div ref={listRef} className="max-h-80 overflow-y-auto py-1" role="listbox">
				{flat.length === 0 ? (
					<div className="px-3 py-8 text-center text-xs text-(--text-tertiary)">
						{loading ? 'Searching…' : 'No matches'}
					</div>
				) : (
					<>
						{showRecents ? recents.map((i) => renderItem(i, { recent: true })) : null}
						{showRecents ? <div className="my-1 border-t border-(--cards-border)" /> : null}
						{filtered.map((i) => renderItem(i))}
					</>
				)}
			</div>
			<div className="flex items-center justify-between gap-2 border-t border-(--cards-border) px-3 py-1.5 text-[10px] text-(--text-tertiary)">
				<span>
					<kbd className="rounded border border-(--cards-border) px-1">↑</kbd>{' '}
					<kbd className="rounded border border-(--cards-border) px-1">↓</kbd> nav{' '}
					<kbd className="ml-1 rounded border border-(--cards-border) px-1">tab</kbd> filter
				</span>
				<span>
					<kbd className="rounded border border-(--cards-border) px-1">↵</kbd> insert{' '}
					<kbd className="ml-1 rounded border border-(--cards-border) px-1">esc</kbd> dismiss
				</span>
			</div>
		</div>
	)
})
