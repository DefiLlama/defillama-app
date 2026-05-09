import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
	deleteArticleRevision,
	getArticleRevision,
	listArticleRevisions,
	restoreArticleRevisionToPending
} from '../api'
import { ArticleRenderer } from '../renderer/ArticleRenderer'
import type {
	ArticleDocument,
	ArticleRevision,
	ArticleRevisionEventType,
	ArticleRevisionSummary,
	LocalArticleDocument
} from '../types'
import { diffMetadata, diffParagraphs, diffStats, type FieldChange, type ParagraphDiffOp } from './revisionDiff'

type AuthorizedFetch = (url: string, options?: RequestInit) => Promise<Response | null>

type Props = {
	onClose: () => void
	articleId: string
	authorizedFetch: AuthorizedFetch
	onRestored: (article: ArticleDocument) => void
}

type FilterKey = 'all' | 'edits' | 'publishes' | 'pending' | 'restores'
type ViewMode = 'preview' | 'diff'
type BaseMode = 'previous' | 'live' | 'pending'

const EVENT_LABELS: Record<ArticleRevisionEventType, string> = {
	create: 'Created',
	save: 'Draft saved',
	publish: 'Published',
	unpublish: 'Unpublished',
	delete: 'Deleted',
	pending_save: 'Pending edit',
	discard_pending: 'Pending discarded',
	restore_pending: 'Restored from history'
}

const EVENT_TONES: Record<ArticleRevisionEventType, string> = {
	create: 'text-(--text-secondary)',
	save: 'text-(--text-secondary)',
	publish: 'text-emerald-500',
	unpublish: 'text-amber-500',
	delete: 'text-red-500',
	pending_save: 'text-amber-500',
	discard_pending: 'text-(--text-tertiary)',
	restore_pending: 'text-(--link-text)'
}

const FILTER_LABELS: Record<FilterKey, string> = {
	all: 'All',
	publishes: 'Publishes',
	pending: 'Pending',
	edits: 'Drafts',
	restores: 'Restores'
}

const FILTER_MATCH: Record<FilterKey, (e: ArticleRevisionEventType) => boolean> = {
	all: () => true,
	publishes: (e) => e === 'publish' || e === 'unpublish' || e === 'create',
	pending: (e) => e === 'pending_save' || e === 'discard_pending',
	edits: (e) => e === 'save',
	restores: (e) => e === 'restore_pending'
}

function formatExact(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	})
}

function formatTime(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDayKey(iso: string): { key: string; label: string } {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return { key: iso, label: iso }
	const today = new Date()
	const isToday = d.toDateString() === today.toDateString()
	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)
	const isYesterday = d.toDateString() === yesterday.toDateString()
	const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
	const label = isToday
		? 'Today'
		: isYesterday
			? 'Yesterday'
			: d.toLocaleDateString(undefined, {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric'
				})
	return { key, label }
}

function formatRelative(iso: string): string {
	const ts = new Date(iso).getTime()
	if (Number.isNaN(ts)) return ''
	const diff = Date.now() - ts
	const minutes = Math.round(diff / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 7) return `${days}d ago`
	const weeks = Math.round(days / 7)
	if (weeks < 5) return `${weeks}w ago`
	const months = Math.round(days / 30)
	return `${months}mo ago`
}

function EventGlyph({ type, active }: { type: ArticleRevisionEventType; active: boolean }) {
	const tone = EVENT_TONES[type] ?? 'text-(--text-secondary)'
	const ringTone = (() => {
		switch (type) {
			case 'publish':
			case 'create':
				return 'bg-emerald-500'
			case 'unpublish':
			case 'pending_save':
				return 'bg-amber-500'
			case 'delete':
				return 'bg-red-500'
			case 'restore_pending':
				return 'bg-(--link-text)'
			case 'discard_pending':
				return 'bg-(--text-tertiary)'
			default:
				return 'bg-(--text-tertiary)'
		}
	})()
	const ringClass = `h-2 w-2 rounded-full ${ringTone}`
	const isFilled = type === 'publish' || type === 'create'
	const isHollow = type === 'save' || type === 'discard_pending'
	const isSquare = type === 'delete'
	const isTriangle = type === 'restore_pending'

	return (
		<span
			aria-hidden
			className={`relative grid h-5 w-5 place-items-center rounded-full transition-transform ${
				active ? 'scale-110' : ''
			}`}
		>
			{isFilled ? (
				<span className={ringClass} />
			) : isHollow ? (
				<span className={`h-2 w-2 rounded-full ring-1 ring-inset ${tone.replace('text-', 'ring-')}`} />
			) : isSquare ? (
				<span className="h-1.5 w-1.5 rotate-45 bg-red-500" />
			) : isTriangle ? (
				<span
					className="h-0 w-0 border-x-[4px] border-b-[6px] border-x-transparent"
					style={{ borderBottomColor: 'var(--link-text)' }}
				/>
			) : (
				<span className={`h-2 w-2 rounded-full ring-1 ring-inset ${tone.replace('text-', 'ring-')}`} />
			)}
		</span>
	)
}

function StatusBadge({ label, tone }: { label: string; tone: 'live' | 'pending' }) {
	const styles =
		tone === 'live'
			? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
			: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-px font-jetbrains text-[9px] font-medium tracking-[0.18em] uppercase ${styles}`}
		>
			<span
				aria-hidden
				className={`h-1 w-1 rounded-full ${tone === 'live' ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'}`}
			/>
			{label}
		</span>
	)
}

function ActorAvatar({ name, url, size = 16 }: { name: string; url?: string | null; size?: number }) {
	const initials = name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')
	if (url) {
		// eslint-disable-next-line @next/next/no-img-element
		return (
			<img
				src={url}
				alt=""
				style={{ width: size, height: size }}
				className="shrink-0 rounded-full object-cover ring-1 ring-(--cards-border)"
			/>
		)
	}
	return (
		<span
			style={{ width: size, height: size, fontSize: Math.max(8, size / 2.5) }}
			className="grid shrink-0 place-items-center rounded-full bg-(--link-button) font-jetbrains font-medium text-(--link-text)"
		>
			{initials || '·'}
		</span>
	)
}

export function RevisionHistoryDrawer({ onClose, articleId, authorizedFetch, onRestored }: Props) {
	const [selectedIdState, setSelectedId] = useState<string | null>(null)
	const [filter, setFilter] = useState<FilterKey>('all')
	const [confirming, setConfirming] = useState<null | 'restore' | 'delete'>(null)
	const [viewMode, setViewMode] = useState<ViewMode>('preview')
	const [baseMode, setBaseMode] = useState<BaseMode>('previous')
	const listRef = useRef<HTMLDivElement | null>(null)
	const queryClient = useQueryClient()
	const revisionsQueryKey = useMemo(() => ['research', 'article-revisions', articleId] as const, [articleId])
	const revisionsQuery = useInfiniteQuery({
		queryKey: revisionsQueryKey,
		queryFn: ({ pageParam }) => listArticleRevisions(articleId, { limit: 30, cursor: pageParam }, authorizedFetch),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		retry: false
	})
	const items = useMemo(() => revisionsQuery.data?.pages.flatMap((page) => page.items) ?? [], [revisionsQuery.data])
	const selectedId = selectedIdState ?? items[0]?.id ?? null
	const selectedRevisionQuery = useQuery({
		queryKey: ['research', 'article-revision', articleId, selectedId],
		queryFn: () => getArticleRevision(articleId, selectedId!, authorizedFetch),
		enabled: !!selectedId,
		retry: false
	})
	const selectedRevision = selectedRevisionQuery.data ?? null
	const isLoading = revisionsQuery.isLoading
	const isLoadingMore = revisionsQuery.isFetchingNextPage
	const isLoadingRevision = selectedRevisionQuery.isLoading
	const restoreRevisionMutation = useMutation({
		mutationFn: (revisionId: string) => restoreArticleRevisionToPending(articleId, revisionId, authorizedFetch)
	})
	const deleteRevisionMutation = useMutation({
		mutationFn: (revisionId: string) => deleteArticleRevision(articleId, revisionId, authorizedFetch)
	})
	const isRestoring = restoreRevisionMutation.isPending
	const pendingDeleteId = deleteRevisionMutation.isPending ? (deleteRevisionMutation.variables ?? null) : null

	useEffect(() => {
		if (revisionsQuery.error) {
			toast.error(revisionsQuery.error instanceof Error ? revisionsQuery.error.message : 'Failed to load history')
		}
	}, [revisionsQuery.error])

	useEffect(() => {
		if (selectedRevisionQuery.error) {
			toast.error(
				selectedRevisionQuery.error instanceof Error ? selectedRevisionQuery.error.message : 'Failed to load revision'
			)
		}
	}, [selectedRevisionQuery.error])

	const loadMore = useCallback(async () => {
		if (!revisionsQuery.hasNextPage) return
		await revisionsQuery.fetchNextPage()
	}, [revisionsQuery])

	const selectRevision = useCallback((revisionId: string) => {
		setConfirming(null)
		setSelectedId(revisionId)
	}, [])

	const handleRestore = useCallback(async () => {
		if (!selectedId) return
		try {
			const saved = await restoreRevisionMutation.mutateAsync(selectedId)
			toast.success('Restored as pending')
			onRestored(saved)
			onClose()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to restore revision')
		} finally {
			setConfirming(null)
		}
	}, [restoreRevisionMutation, onRestored, onClose, selectedId])

	const handleDelete = useCallback(
		async (revisionId: string) => {
			try {
				await deleteRevisionMutation.mutateAsync(revisionId)
				queryClient.setQueryData<typeof revisionsQuery.data>(revisionsQueryKey, (current) =>
					current
						? {
								...current,
								pages: current.pages.map((page) => ({
									...page,
									items: page.items.filter((entry) => entry.id !== revisionId)
								}))
							}
						: current
				)
				if (selectedId === revisionId) {
					setSelectedId((current) => {
						if (current !== revisionId) return current
						const remaining = items.filter((entry) => entry.id !== revisionId)
						return remaining[0]?.id ?? null
					})
				}
				toast.success('Revision removed from history')
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to delete revision')
			} finally {
				setConfirming(null)
			}
		},
		[deleteRevisionMutation, items, queryClient, revisionsQueryKey, selectedId]
	)

	const liveAnchorId = useMemo(() => {
		const anchor = items.find((entry) => entry.eventType === 'publish' || entry.eventType === 'create')
		return anchor?.id ?? null
	}, [items])

	const pendingAnchorId = useMemo(() => {
		if (!liveAnchorId) return null
		const livePos = items.findIndex((entry) => entry.id === liveAnchorId)
		const beforeLive = livePos === -1 ? items : items.slice(0, livePos)
		const anchor = beforeLive.find(
			(entry) => entry.eventType === 'pending_save' || entry.eventType === 'restore_pending'
		)
		return anchor?.id ?? null
	}, [items, liveAnchorId])

	const filtered = useMemo(() => items.filter((entry) => FILTER_MATCH[filter](entry.eventType)), [items, filter])

	const grouped = useMemo(() => {
		const groups: { key: string; label: string; items: ArticleRevisionSummary[] }[] = []
		for (const entry of filtered) {
			const day = formatDayKey(entry.createdAt)
			const last = groups[groups.length - 1]
			if (last && last.key === day.key) {
				last.items.push(entry)
			} else {
				groups.push({ key: day.key, label: day.label, items: [entry] })
			}
		}
		return groups
	}, [filtered])

	const counts = useMemo(() => {
		const c: Record<FilterKey, number> = { all: 0, publishes: 0, pending: 0, edits: 0, restores: 0 }
		for (const entry of items) {
			c.all += 1
			for (const key of Object.keys(FILTER_MATCH) as FilterKey[]) {
				if (key === 'all') continue
				if (FILTER_MATCH[key](entry.eventType)) c[key] += 1
			}
		}
		return c
	}, [items])

	const selectedIndex = useMemo(() => filtered.findIndex((entry) => entry.id === selectedId), [filtered, selectedId])

	const moveSelection = useCallback(
		(delta: number) => {
			if (filtered.length === 0) return
			const nextIndex = Math.min(filtered.length - 1, Math.max(0, selectedIndex + delta))
			const next = filtered[nextIndex]
			if (next) {
				setConfirming(null)
				setSelectedId(next.id)
			}
		},
		[filtered, selectedIndex]
	)

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
			if (event.key === 'Escape') {
				event.preventDefault()
				if (confirming) setConfirming(null)
				else onClose()
				return
			}
			if (event.key === 'j' || event.key === 'ArrowDown') {
				event.preventDefault()
				moveSelection(1)
				return
			}
			if (event.key === 'k' || event.key === 'ArrowUp') {
				event.preventDefault()
				moveSelection(-1)
				return
			}
			if (event.key === 'r' && !event.metaKey && !event.ctrlKey) {
				event.preventDefault()
				if (selectedId) setConfirming('restore')
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [onClose, moveSelection, confirming, selectedId])

	useEffect(() => {
		if (!selectedId || !listRef.current) return
		const node = listRef.current.querySelector<HTMLElement>(`[data-revision-id="${selectedId}"]`)
		if (node) node.scrollIntoView({ block: 'nearest' })
	}, [selectedId])

	const previewArticle = useMemo<LocalArticleDocument | null>(() => {
		if (!selectedRevision) return null
		const snapshot = selectedRevision.snapshot ?? {}
		return {
			contentVersion: 1,
			rendererVersion: 1,
			editorSchemaVersion: 1,
			title: 'Untitled',
			slug: 'preview',
			status: 'draft',
			contentJson: { type: 'doc', content: [] },
			plainText: '',
			entities: [],
			charts: [],
			citations: [],
			embeds: [],
			tags: [],
			createdAt: selectedRevision.createdAt,
			updatedAt: selectedRevision.createdAt,
			publishedAt: null,
			...(snapshot as Partial<LocalArticleDocument>)
		}
	}, [selectedRevision])

	const wordCount = useMemo(() => {
		const text = (selectedRevision?.snapshot as { plainText?: string } | undefined)?.plainText ?? ''
		const trimmed = text.trim()
		return trimmed ? trimmed.split(/\s+/).length : 0
	}, [selectedRevision])

	const previousId = useMemo(() => {
		if (!selectedId) return null
		const idx = items.findIndex((entry) => entry.id === selectedId)
		if (idx < 0) return null
		const next = items[idx + 1]
		return next?.id ?? null
	}, [items, selectedId])

	const baseAvailability = useMemo(() => {
		const previous = previousId && previousId !== selectedId ? previousId : null
		const live = liveAnchorId && liveAnchorId !== selectedId ? liveAnchorId : null
		const pending = pendingAnchorId && pendingAnchorId !== selectedId ? pendingAnchorId : null
		return { previous, live, pending }
	}, [previousId, liveAnchorId, pendingAnchorId, selectedId])

	const baseId = useMemo(() => {
		if (baseMode === 'previous') return baseAvailability.previous
		if (baseMode === 'live') return baseAvailability.live
		return baseAvailability.pending
	}, [baseMode, baseAvailability])

	useEffect(() => {
		if (viewMode !== 'diff') return
		if (baseAvailability[baseMode]) return
		const fallback: BaseMode | null =
			(['previous', 'live', 'pending'] as BaseMode[]).find((mode) => baseAvailability[mode]) ?? null
		if (fallback && fallback !== baseMode) setBaseMode(fallback)
	}, [viewMode, baseMode, baseAvailability])

	const baseRevisionQuery = useQuery({
		queryKey: ['research', 'article-revision', articleId, baseId],
		queryFn: () => getArticleRevision(articleId, baseId!, authorizedFetch),
		enabled: viewMode === 'diff' && !!baseId,
		retry: false
	})

	useEffect(() => {
		if (baseRevisionQuery.error) {
			toast.error(
				baseRevisionQuery.error instanceof Error ? baseRevisionQuery.error.message : 'Failed to load base revision'
			)
		}
	}, [baseRevisionQuery.error])

	const baseRevision = baseRevisionQuery.data ?? null

	const diff = useMemo(() => {
		if (viewMode !== 'diff' || !selectedRevision || !baseRevision) return null
		const before = baseRevision.snapshot ?? {}
		const after = selectedRevision.snapshot ?? {}
		const beforeText = (before as { plainText?: string }).plainText ?? ''
		const afterText = (after as { plainText?: string }).plainText ?? ''
		const paragraphs = diffParagraphs(beforeText, afterText)
		const metadata = diffMetadata(before as Record<string, unknown>, after as Record<string, unknown>)
		const stats = diffStats(paragraphs)
		return { paragraphs, metadata, stats }
	}, [viewMode, selectedRevision, baseRevision])

	return (
		<div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Revision history">
			<button
				type="button"
				aria-label="Close history"
				onClick={onClose}
				className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
			/>
			<div className="relative ml-auto flex h-full w-full max-w-[1280px] flex-col border-l border-(--cards-border) bg-(--cards-bg) shadow-2xl">
				<header className="grid grid-cols-[1fr_auto] items-end gap-6 border-b border-(--cards-border) px-7 pt-6 pb-4">
					<div className="grid gap-1">
						<div className="flex items-center gap-2 font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
							<span aria-hidden>›</span>
							<span>Article</span>
							<span aria-hidden>·</span>
							<span>Ledger</span>
						</div>
						<h2 className="text-2xl leading-tight font-semibold tracking-tight text-(--text-primary)">
							Revision history
						</h2>
						<p className="font-jetbrains text-[11px] text-(--text-tertiary)">
							<span className="text-(--text-secondary) tabular-nums">{counts.all}</span> entries
							<span aria-hidden> · </span>
							<kbd className="rounded border border-(--cards-border) px-1 py-px text-[9px] tracking-tight">J/K</kbd>
							<span> navigate </span>
							<kbd className="rounded border border-(--cards-border) px-1 py-px text-[9px] tracking-tight">R</kbd>
							<span> restore </span>
							<kbd className="rounded border border-(--cards-border) px-1 py-px text-[9px] tracking-tight">Esc</kbd>
							<span> close</span>
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-9 w-9 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
					>
						<svg
							className="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="6" y1="6" x2="18" y2="18" />
							<line x1="6" y1="18" x2="18" y2="6" />
						</svg>
					</button>
				</header>

				<div className="grid min-h-0 flex-1 grid-cols-[360px_1fr]">
					<aside className="flex min-h-0 flex-col border-r border-(--cards-border)">
						<div className="flex flex-wrap items-center gap-1 border-b border-(--cards-border) px-3 py-2">
							{(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
								const isActive = filter === key
								return (
									<button
										key={key}
										type="button"
										onClick={() => setFilter(key)}
										className={`flex items-center gap-1.5 rounded-sm px-2 py-1 font-jetbrains text-[10px] tracking-[0.14em] uppercase transition-colors ${
											isActive
												? 'bg-(--text-primary) text-(--cards-bg)'
												: 'text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-secondary)'
										}`}
									>
										<span>{FILTER_LABELS[key]}</span>
										<span className={`tabular-nums ${isActive ? 'text-(--cards-bg)/70' : 'text-(--text-tertiary)/60'}`}>
											{counts[key]}
										</span>
									</button>
								)
							})}
						</div>

						<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
							{isLoading ? (
								<TimelineSkeleton />
							) : grouped.length === 0 ? (
								<EmptyState filter={filter} />
							) : (
								<div className="relative">
									{grouped.map((group) => (
										<section key={group.key}>
											<header className="sticky top-0 z-10 flex items-baseline justify-between gap-2 border-b border-(--cards-border) bg-(--cards-bg)/95 px-5 py-2 backdrop-blur">
												<span className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
													{group.label}
												</span>
												<span className="font-jetbrains text-[10px] text-(--text-tertiary)/70 tabular-nums">
													{group.items.length}
												</span>
											</header>
											<ul className="relative">
												<span
													aria-hidden
													className="pointer-events-none absolute top-2 bottom-2 left-[34px] w-px bg-(--cards-border)"
												/>
												{group.items.map((entry) => {
													const isSelected = entry.id === selectedId
													const isLive = entry.id === liveAnchorId
													const isPendingAnchor = entry.id === pendingAnchorId
													const tone = EVENT_TONES[entry.eventType] ?? 'text-(--text-secondary)'
													const isDeleting = pendingDeleteId === entry.id
													return (
														<li
															key={entry.id}
															data-revision-id={entry.id}
															className={`group relative ${isDeleting ? 'opacity-50' : ''}`}
														>
															<button
																type="button"
																onClick={() => selectRevision(entry.id)}
																aria-current={isSelected}
																className={`relative flex w-full items-start gap-3 px-5 py-3 text-left transition-colors ${
																	isSelected ? 'bg-(--link-button)' : 'hover:bg-(--link-hover-bg)/60'
																}`}
															>
																{isSelected ? (
																	<span aria-hidden className="absolute top-0 bottom-0 left-0 w-0.5 bg-(--link-text)" />
																) : null}
																<span className="relative z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-(--cards-bg)">
																	<EventGlyph type={entry.eventType} active={isSelected} />
																</span>
																<div className="min-w-0 flex-1">
																	<div className="flex items-center gap-2">
																		<span
																			className={`font-jetbrains text-[10px] font-medium tracking-[0.18em] uppercase ${tone}`}
																		>
																			{EVENT_LABELS[entry.eventType] ?? entry.eventType}
																		</span>
																		{isLive ? <StatusBadge label="Live" tone="live" /> : null}
																		{isPendingAnchor ? <StatusBadge label="Pending" tone="pending" /> : null}
																	</div>
																	<div className="mt-1 flex items-baseline gap-2">
																		<span className="font-jetbrains text-[12px] text-(--text-primary) tabular-nums">
																			{formatTime(entry.createdAt)}
																		</span>
																		<span className="text-[11px] text-(--text-tertiary)">
																			{formatRelative(entry.createdAt)}
																		</span>
																	</div>
																	{entry.actor ? (
																		<div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-(--text-tertiary)">
																			<ActorAvatar
																				name={entry.actor.displayName}
																				url={entry.actor.avatarUrl}
																				size={14}
																			/>
																			<span className="truncate">{entry.actor.displayName}</span>
																		</div>
																	) : null}
																</div>
															</button>
														</li>
													)
												})}
											</ul>
										</section>
									))}
									{revisionsQuery.hasNextPage ? (
										<div className="px-5 py-4">
											<button
												type="button"
												onClick={loadMore}
												disabled={isLoadingMore}
												className="w-full rounded-sm border border-dashed border-(--cards-border) bg-transparent px-3 py-2 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase transition-colors hover:border-(--text-secondary) hover:text-(--text-secondary) disabled:opacity-50"
											>
												{isLoadingMore ? 'Loading…' : '↓  Older revisions'}
											</button>
										</div>
									) : items.length > 0 ? (
										<div className="px-5 py-6 text-center font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary)/60 uppercase">
											· end of ledger ·
										</div>
									) : null}
								</div>
							)}
						</div>
					</aside>

					<section className="flex min-h-0 flex-col bg-(--app-bg)">
						<PreviewSpecimenHeader
							revision={selectedRevision}
							isLoading={isLoadingRevision}
							wordCount={wordCount}
							isLive={selectedRevision ? selectedRevision.id === liveAnchorId : false}
							isPendingAnchor={selectedRevision ? selectedRevision.id === pendingAnchorId : false}
							confirming={confirming}
							isRestoring={isRestoring}
							isDeleting={selectedId ? pendingDeleteId === selectedId : false}
							canDelete={!!selectedRevision && selectedRevision.id !== liveAnchorId}
							onAskRestore={() => setConfirming('restore')}
							onAskDelete={() => setConfirming('delete')}
							onCancelConfirm={() => setConfirming(null)}
							onConfirmRestore={() => void handleRestore()}
							onConfirmDelete={() => selectedId && void handleDelete(selectedId)}
							viewMode={viewMode}
							onChangeView={setViewMode}
							baseMode={baseMode}
							onChangeBase={setBaseMode}
							baseAvailability={baseAvailability}
							baseRevision={baseRevision}
							diffStats={diff?.stats ?? null}
						/>
						<div className="min-h-0 flex-1 overflow-y-auto">
							{isLoadingRevision ? (
								<PreviewSkeleton />
							) : !previewArticle ? (
								<div className="grid h-full place-items-center px-6">
									<div className="max-w-sm text-center">
										<div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-dashed border-(--cards-border)">
											<svg
												className="h-5 w-5 text-(--text-tertiary)"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<circle cx="12" cy="12" r="9" />
												<polyline points="12 7 12 12 15.5 14" />
											</svg>
										</div>
										<p className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
											No revision selected
										</p>
										<p className="mt-2 text-sm text-(--text-secondary)">
											Pick an entry from the ledger to inspect its snapshot.
										</p>
									</div>
								</div>
							) : viewMode === 'diff' ? (
								<DiffPane
									selected={selectedRevision}
									base={baseRevision}
									baseMode={baseMode}
									baseAvailable={Boolean(baseAvailability[baseMode])}
									diff={diff}
								/>
							) : (
								<div className="article-page-frame">
									<ArticleRenderer article={previewArticle} />
								</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}

function PreviewSpecimenHeader({
	revision,
	isLoading,
	wordCount,
	isLive,
	isPendingAnchor,
	confirming,
	isRestoring,
	isDeleting,
	canDelete,
	onAskRestore,
	onAskDelete,
	onCancelConfirm,
	onConfirmRestore,
	onConfirmDelete,
	viewMode,
	onChangeView,
	baseMode,
	onChangeBase,
	baseAvailability,
	baseRevision,
	diffStats: stats
}: {
	revision: ArticleRevision | null
	isLoading: boolean
	wordCount: number
	isLive: boolean
	isPendingAnchor: boolean
	confirming: null | 'restore' | 'delete'
	isRestoring: boolean
	isDeleting: boolean
	canDelete: boolean
	onAskRestore: () => void
	onAskDelete: () => void
	onCancelConfirm: () => void
	onConfirmRestore: () => void
	onConfirmDelete: () => void
	viewMode: ViewMode
	onChangeView: (mode: ViewMode) => void
	baseMode: BaseMode
	onChangeBase: (mode: BaseMode) => void
	baseAvailability: Record<BaseMode, string | null>
	baseRevision: ArticleRevision | null
	diffStats: { added: number; removed: number } | null
}) {
	const eventType = revision?.eventType ?? 'save'
	const tone = EVENT_TONES[eventType] ?? 'text-(--text-secondary)'
	const snapshot = (revision?.snapshot ?? {}) as { title?: string; slug?: string; status?: string }
	const title = snapshot.title || (isLoading ? 'Loading…' : '—')
	const slug = snapshot.slug ?? '—'
	const status = snapshot.status

	const baseLabels: Record<BaseMode, string> = {
		previous: 'Previous',
		live: 'Live',
		pending: 'Pending'
	}
	const baseRevisionLabel = baseRevision
		? `${EVENT_LABELS[baseRevision.eventType] ?? baseRevision.eventType} · ${formatExact(baseRevision.createdAt)}`
		: null

	return (
		<div className="border-b border-(--cards-border) bg-(--cards-bg)">
			<div className="grid grid-cols-[1fr_auto] items-start gap-6 px-7 py-5">
				<div className="grid min-w-0 gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`inline-flex items-center gap-1.5 rounded-sm border border-(--cards-border) bg-(--app-bg) px-2 py-0.5 font-jetbrains text-[10px] font-medium tracking-[0.18em] uppercase ${tone}`}
						>
							{revision ? <EventGlyph type={eventType} active={false} /> : null}
							{revision ? EVENT_LABELS[eventType] : '—'}
						</span>
						{isLive ? <StatusBadge label="Currently Live" tone="live" /> : null}
						{isPendingAnchor ? <StatusBadge label="Currently Pending" tone="pending" /> : null}
						{status ? (
							<span className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
								{status}
							</span>
						) : null}
					</div>
					<h3
						className="truncate text-xl leading-tight font-semibold tracking-tight text-(--text-primary)"
						style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
					>
						{title}
					</h3>
					<dl className="flex flex-wrap items-center gap-x-5 gap-y-1 font-jetbrains text-[11px] text-(--text-tertiary)">
						<div className="flex items-center gap-1.5">
							<dt className="text-(--text-tertiary)/60">slug</dt>
							<dd className="text-(--text-secondary)">{slug}</dd>
						</div>
						<div className="flex items-center gap-1.5">
							<dt className="text-(--text-tertiary)/60">words</dt>
							<dd className="text-(--text-secondary) tabular-nums">{wordCount}</dd>
						</div>
						{revision ? (
							<>
								<div className="flex items-center gap-1.5">
									<dt className="text-(--text-tertiary)/60">when</dt>
									<dd className="text-(--text-secondary) tabular-nums" title={revision.createdAt}>
										{formatExact(revision.createdAt)}
									</dd>
								</div>
								{revision.actor ? (
									<div className="flex items-center gap-1.5">
										<dt className="text-(--text-tertiary)/60">by</dt>
										<dd className="flex items-center gap-1.5 text-(--text-secondary)">
											<ActorAvatar name={revision.actor.displayName} url={revision.actor.avatarUrl} size={14} />
											{revision.actor.displayName}
										</dd>
									</div>
								) : null}
							</>
						) : null}
					</dl>
				</div>

				<div className="flex items-center gap-2">
					{confirming === 'restore' ? (
						<InlineConfirm
							tone="primary"
							title="Restore as pending?"
							description="Loads this snapshot into the editor as a pending edit."
							confirmLabel={isRestoring ? 'Restoring…' : 'Confirm restore'}
							onConfirm={onConfirmRestore}
							onCancel={onCancelConfirm}
							disabled={isRestoring}
						/>
					) : confirming === 'delete' ? (
						<InlineConfirm
							tone="danger"
							title="Remove from history?"
							description="The snapshot will be permanently deleted."
							confirmLabel={isDeleting ? 'Deleting…' : 'Confirm delete'}
							onConfirm={onConfirmDelete}
							onCancel={onCancelConfirm}
							disabled={isDeleting}
						/>
					) : (
						<>
							<button
								type="button"
								onClick={onAskRestore}
								disabled={!revision || isRestoring}
								className="group flex h-9 items-center gap-2 rounded-md bg-(--link-text) px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<svg
									className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M3 12a9 9 0 1 0 3-6.7" />
									<polyline points="3 4 3 9 8 9" />
								</svg>
								<span>Restore as pending</span>
								<kbd className="hidden rounded border border-white/30 px-1 py-px font-jetbrains text-[9px] tracking-tight md:inline">
									R
								</kbd>
							</button>
							<button
								type="button"
								onClick={onAskDelete}
								disabled={!revision || !canDelete || isDeleting}
								title={canDelete ? 'Delete this revision' : 'The current live revision cannot be deleted'}
								className="flex h-9 w-9 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) transition-colors hover:border-red-500/50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-(--cards-border) disabled:hover:text-(--text-secondary)"
							>
								<svg
									className="h-3.5 w-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.75"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
									<path d="M10 11v6M14 11v6" />
								</svg>
							</button>
						</>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--cards-border) bg-(--app-bg)/50 px-7 py-2.5">
				<div className="inline-flex items-center gap-px rounded-md border border-(--cards-border) bg-(--cards-bg) p-0.5 font-jetbrains text-[10px] tracking-[0.16em] uppercase">
					{(['preview', 'diff'] as ViewMode[]).map((mode) => {
						const isActive = viewMode === mode
						return (
							<button
								key={mode}
								type="button"
								onClick={() => onChangeView(mode)}
								className={`rounded-sm px-3 py-1.5 transition-colors ${
									isActive
										? 'bg-(--text-primary) text-(--cards-bg)'
										: 'text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-secondary)'
								}`}
							>
								{mode}
							</button>
						)
					})}
				</div>

				{viewMode === 'diff' ? (
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary)/70 uppercase">
							compare against
						</span>
						<div className="flex items-center gap-px rounded-md border border-(--cards-border) bg-(--cards-bg) p-0.5">
							{(['previous', 'live', 'pending'] as BaseMode[]).map((mode) => {
								const enabled = !!baseAvailability[mode]
								const isActive = baseMode === mode
								return (
									<button
										key={mode}
										type="button"
										onClick={() => enabled && onChangeBase(mode)}
										disabled={!enabled}
										title={
											!enabled
												? mode === 'previous'
													? 'No earlier revision'
													: mode === 'live'
														? 'No live revision recorded'
														: 'No pending revision'
												: undefined
										}
										className={`rounded-sm px-2.5 py-1 font-jetbrains text-[10px] tracking-[0.16em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
											isActive
												? 'bg-(--link-text) text-white'
												: 'text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-secondary)'
										}`}
									>
										{baseLabels[mode]}
									</button>
								)
							})}
						</div>
						{stats ? (
							<div className="flex items-center gap-2 font-jetbrains text-[11px] tabular-nums">
								<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
									<span aria-hidden>+</span>
									{stats.added}
								</span>
								<span aria-hidden className="text-(--text-tertiary)/40">
									/
								</span>
								<span className="inline-flex items-center gap-1 text-red-500">
									<span aria-hidden>−</span>
									{stats.removed}
								</span>
								<span className="text-(--text-tertiary)/70">words</span>
							</div>
						) : null}
						{baseRevisionLabel ? (
							<span className="hidden truncate font-jetbrains text-[11px] text-(--text-tertiary) lg:inline">
								base · {baseRevisionLabel}
							</span>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	)
}

function DiffPane({
	selected,
	base,
	baseMode,
	baseAvailable,
	diff
}: {
	selected: ArticleRevision | null
	base: ArticleRevision | null
	baseMode: BaseMode
	baseAvailable: boolean
	diff: { paragraphs: ParagraphDiffOp[]; metadata: FieldChange[]; stats: { added: number; removed: number } } | null
}) {
	if (!selected) {
		return (
			<div className="grid h-full place-items-center px-6">
				<p className="font-jetbrains text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase">
					Select a revision
				</p>
			</div>
		)
	}
	if (!baseAvailable) {
		const label =
			baseMode === 'previous' ? 'an earlier revision' : baseMode === 'live' ? 'a live revision' : 'a pending revision'
		return (
			<div className="grid h-full place-items-center px-6">
				<div className="max-w-sm text-center">
					<div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-dashed border-(--cards-border)">
						<svg
							className="h-5 w-5 text-(--text-tertiary)"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M8 5l-5 7 5 7M16 5l5 7-5 7" />
						</svg>
					</div>
					<p className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
						Nothing to compare
					</p>
					<p className="mt-2 text-sm text-(--text-secondary)">There is no {label} to diff against.</p>
				</div>
			</div>
		)
	}
	if (!base || !diff) {
		return (
			<div className="grid h-full place-items-center px-6 py-12">
				<div className="text-center">
					<div className="mx-auto mb-3 h-1 w-24 animate-pulse rounded bg-(--cards-border)" />
					<p className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
						computing diff
					</p>
				</div>
			</div>
		)
	}

	const noBodyChanges =
		diff.stats.added === 0 && diff.stats.removed === 0 && diff.paragraphs.every((op) => op.type === 'equal')
	const noMetadataChanges = diff.metadata.length === 0

	if (noBodyChanges && noMetadataChanges) {
		return (
			<div className="grid h-full place-items-center px-6">
				<div className="max-w-sm text-center">
					<div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-(--cards-border) bg-(--cards-bg)">
						<svg
							className="h-5 w-5 text-emerald-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="5 12 10 17 19 8" />
						</svg>
					</div>
					<p className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">Identical</p>
					<p className="mt-2 text-sm text-(--text-secondary)">
						No textual or metadata changes between these revisions.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-[860px] px-6 py-8">
			{!noMetadataChanges ? <MetadataDiffSection changes={diff.metadata} /> : null}
			{noBodyChanges ? (
				<div className="mt-2 rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg)/50 px-4 py-3 font-jetbrains text-[11px] text-(--text-tertiary)">
					Body unchanged.
				</div>
			) : (
				<BodyDiffSection ops={diff.paragraphs} />
			)}
		</div>
	)
}

function MetadataDiffSection({ changes }: { changes: FieldChange[] }) {
	return (
		<section className="mb-8 grid gap-2">
			<header className="flex items-baseline justify-between gap-2">
				<h4 className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
					Metadata · {changes.length} change{changes.length === 1 ? '' : 's'}
				</h4>
			</header>
			<dl className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{changes.map((change) => (
					<div key={change.key} className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3">
						<dt className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
							{change.label}
						</dt>
						<dd className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
							<MetaValue value={change.before} tone="remove" />
							<span aria-hidden className="hidden font-jetbrains text-[10px] text-(--text-tertiary)/60 sm:inline">
								→
							</span>
							<MetaValue value={change.after} tone="add" />
						</dd>
					</div>
				))}
			</dl>
		</section>
	)
}

function MetaValue({ value, tone }: { value: string | null; tone: 'add' | 'remove' }) {
	if (value == null) {
		return <span className="font-jetbrains text-[11px] text-(--text-tertiary)/60 italic">empty</span>
	}
	const styles =
		tone === 'remove'
			? 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 line-through'
			: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
	return (
		<span className={`inline-block max-w-full truncate rounded-sm border px-2 py-0.5 text-[12px] ${styles}`}>
			{value}
		</span>
	)
}

function BodyDiffSection({ ops }: { ops: ParagraphDiffOp[] }) {
	return (
		<section className="grid gap-3">
			<header>
				<h4 className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">Body</h4>
			</header>
			<div className="grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				{ops.map((op, idx) => (
					<DiffParagraph key={idx} op={op} />
				))}
			</div>
		</section>
	)
}

function DiffParagraph({ op }: { op: ParagraphDiffOp }) {
	const baseClasses = 'group relative grid grid-cols-[18px_1fr] items-start gap-2 rounded-sm px-3 py-2 leading-relaxed'
	if (op.type === 'equal') {
		return (
			<div className={`${baseClasses} text-(--text-secondary)`}>
				<span aria-hidden className="pt-0.5 text-center font-jetbrains text-[10px] text-(--text-tertiary)/60">
					·
				</span>
				<p className="text-[14px]">{op.value}</p>
			</div>
		)
	}
	if (op.type === 'add') {
		return (
			<div
				className={`${baseClasses} bg-emerald-500/[0.07] text-(--text-primary) ring-1 ring-emerald-500/20 ring-inset`}
			>
				<span aria-hidden className="pt-0.5 text-center font-jetbrains text-[11px] font-medium text-emerald-500">
					+
				</span>
				<p className="text-[14px]">{op.value}</p>
			</div>
		)
	}
	if (op.type === 'remove') {
		return (
			<div
				className={`${baseClasses} bg-red-500/[0.06] text-red-500/85 line-through ring-1 ring-red-500/20 ring-inset dark:text-red-400/85`}
			>
				<span
					aria-hidden
					className="pt-0.5 text-center font-jetbrains text-[11px] font-medium text-red-500 no-underline"
				>
					−
				</span>
				<p className="text-[14px]">{op.value}</p>
			</div>
		)
	}
	return (
		<div className={`${baseClasses} bg-amber-500/[0.04] text-(--text-primary) ring-1 ring-amber-500/20 ring-inset`}>
			<span aria-hidden className="pt-0.5 text-center font-jetbrains text-[11px] font-medium text-amber-500">
				~
			</span>
			<p className="text-[14px] [overflow-wrap:anywhere]">
				{op.words.map((word, idx) => {
					if (word.type === 'equal') return <span key={idx}>{word.value}</span>
					if (word.type === 'add')
						return (
							<span key={idx} className="rounded-[2px] bg-emerald-500/15 px-0.5 text-emerald-700 dark:text-emerald-300">
								{word.value}
							</span>
						)
					return (
						<span key={idx} className="rounded-[2px] bg-red-500/12 px-0.5 text-red-600 line-through dark:text-red-400">
							{word.value}
						</span>
					)
				})}
			</p>
		</div>
	)
}

function InlineConfirm({
	tone,
	title,
	description,
	confirmLabel,
	onConfirm,
	onCancel,
	disabled
}: {
	tone: 'primary' | 'danger'
	title: string
	description: string
	confirmLabel: string
	onConfirm: () => void
	onCancel: () => void
	disabled: boolean
}) {
	const accent = tone === 'danger' ? 'border-red-500/40 bg-red-500/5' : 'border-(--link-text)/40 bg-(--link-text)/5'
	const button = tone === 'danger' ? 'bg-red-500 hover:bg-red-500/90' : 'bg-(--link-text) hover:opacity-90'
	return (
		<div
			role="alertdialog"
			aria-label={title}
			className={`flex items-center gap-3 rounded-md border px-3 py-2 ${accent}`}
		>
			<div className="grid">
				<div className="text-xs font-medium text-(--text-primary)">{title}</div>
				<div className="text-[11px] text-(--text-tertiary)">{description}</div>
			</div>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={onCancel}
					disabled={disabled}
					className="rounded-md px-2.5 py-1.5 text-xs text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={disabled}
					autoFocus
					className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${button}`}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	)
}

function TimelineSkeleton() {
	return (
		<div className="grid gap-1 p-5">
			{[0.9, 0.7, 0.55, 0.85, 0.6, 0.7].map((scale, idx) => (
				<div key={idx} className="flex items-start gap-3 py-2">
					<span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-(--cards-border)" />
					<div className="grid flex-1 gap-1.5">
						<span aria-hidden className="h-2 rounded bg-(--cards-border)" style={{ width: `${scale * 100}%` }} />
						<span aria-hidden className="h-2 w-24 rounded bg-(--cards-border)/60" />
					</div>
				</div>
			))}
			<div className="mt-2 text-center font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary)/60 uppercase">
				· loading ·
			</div>
		</div>
	)
}

function PreviewSkeleton() {
	return (
		<div className="mx-auto grid w-full max-w-[760px] gap-4 px-6 py-12">
			<span aria-hidden className="h-3 w-32 rounded bg-(--cards-border)/70" />
			<span aria-hidden className="h-10 w-3/4 rounded bg-(--cards-border)" />
			<span aria-hidden className="h-5 w-2/3 rounded bg-(--cards-border)/70" />
			<div className="mt-6 grid gap-2">
				{[1, 0.95, 0.9, 0.7, 0.85, 0.6].map((scale, idx) => (
					<span
						key={idx}
						aria-hidden
						className="h-3 rounded bg-(--cards-border)/50"
						style={{ width: `${scale * 100}%` }}
					/>
				))}
			</div>
		</div>
	)
}

function EmptyState({ filter }: { filter: FilterKey }) {
	return (
		<div className="grid h-full place-items-center px-6 py-16">
			<div className="max-w-xs text-center">
				<div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-dashed border-(--cards-border)">
					<svg
						className="h-6 w-6 text-(--text-tertiary)"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 4h18v4H3zM3 12h18v4H3zM3 20h18" />
					</svg>
				</div>
				<p className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
					{filter === 'all' ? 'No revisions yet' : 'No matches'}
				</p>
				<p className="mt-2 text-sm text-(--text-secondary)">
					{filter === 'all'
						? 'Save or publish to start writing the ledger.'
						: 'Try another filter — or switch back to All.'}
				</p>
			</div>
		</div>
	)
}
