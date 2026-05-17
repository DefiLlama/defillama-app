import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteArticle as deleteArticleApi, listMyArticles, type ArticleListResponse } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import type { ArticleDocument, ArticleSection } from '~/containers/Articles/types'
import { ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

type StatusFilter = 'all' | 'draft' | 'published'
type SortKey = 'updated' | 'created' | 'title'
type SectionFilter = ArticleSection | 'all'

const FETCH_LIMIT = 100
const PAGE_SIZE = 12
const EMPTY_ARTICLES: ArticleDocument[] = []

const SORT_LABELS: Record<SortKey, string> = {
	updated: 'Recently updated',
	created: 'Recently created',
	title: 'Title (A–Z)'
}

function formatRelative(iso: string | null | undefined) {
	if (!iso) return '—'
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return '—'
	const diff = Date.now() - date.getTime()
	if (diff < 60_000) return 'just now'
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
	if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
	return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function wordCount(text: string | undefined): number {
	if (!text) return 0
	const trimmed = text.trim()
	return trimmed ? trimmed.split(/\s+/).length : 0
}

function useDebounced<T>(value: T, delay = 200): T {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const id = window.setTimeout(() => setDebounced(value), delay)
		return () => window.clearTimeout(id)
	}, [value, delay])
	return debounced
}

function StatusDot({ status }: { status: ArticleDocument['status'] }) {
	const isPublished = status === 'published'
	return (
		<span
			aria-hidden
			className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`}
		/>
	)
}

function MyArticlesContent() {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const queryClient = useQueryClient()

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all')
	const [sortKey, setSortKey] = useState<SortKey>('updated')
	const [searchInput, setSearchInput] = useState('')
	const [page, setPage] = useState(1)
	const search = useDebounced(searchInput, 200).trim().toLowerCase()

	const myArticlesQueryKey = ['research', 'my-articles'] as const
	const { data, isLoading, error } = useQuery({
		queryKey: myArticlesQueryKey,
		queryFn: () => listMyArticles({ limit: FETCH_LIMIT }, authorizedFetch),
		enabled: !loaders.userLoading && isAuthenticated,
		retry: false
	})

	const deleteArticleMutation = useMutation({
		mutationFn: (articleId: string) => deleteArticleApi(articleId, authorizedFetch),
		onSuccess: (_, articleId) => {
			queryClient.setQueryData<ArticleListResponse | undefined>(myArticlesQueryKey, (current) =>
				current ? { ...current, items: current.items.filter((a) => a.id !== articleId) } : current
			)
			toast.success('Deleted')
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to delete')
		}
	})

	const allArticles = data?.items ?? EMPTY_ARTICLES
	const draftCount = useMemo(() => allArticles.filter((a) => a.status === 'draft').length, [allArticles])
	const publishedCount = allArticles.length - draftCount
	const totalCount = allArticles.length
	const capped = data ? data.totalItems > FETCH_LIMIT : false

	const availableSections = useMemo(() => {
		const seen = new Set<ArticleSection>()
		for (const a of allArticles) if (a.section) seen.add(a.section)
		return Array.from(seen)
	}, [allArticles])

	const filtered = useMemo(() => {
		const byStatus = statusFilter === 'all' ? allArticles : allArticles.filter((a) => a.status === statusFilter)
		const bySection = sectionFilter === 'all' ? byStatus : byStatus.filter((a) => a.section === sectionFilter)
		const bySearch = search
			? bySection.filter(
					(a) =>
						(a.title ?? '').toLowerCase().includes(search) ||
						(a.slug ?? '').toLowerCase().includes(search) ||
						(a.excerpt ?? '').toLowerCase().includes(search)
				)
			: bySection
		const sorted = [...bySearch]
		if (sortKey === 'title') {
			sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
		} else if (sortKey === 'created') {
			sorted.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
		} else {
			sorted.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
		}
		return sorted
	}, [allArticles, statusFilter, sectionFilter, search, sortKey])

	useEffect(() => {
		setPage(1)
	}, [statusFilter, sectionFilter, search, sortKey])

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const safePage = Math.min(page, totalPages)
	const paged = useMemo(() => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [filtered, safePage])
	const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
	const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length)

	const handleDelete = (article: ArticleDocument) => {
		if (!confirm(`Delete "${article.title || 'Untitled'}"? This cannot be undone.`)) return
		deleteArticleMutation.mutate(article.id)
	}

	const showLoading = loaders.userLoading || (isAuthenticated && isLoading)

	return (
		<div className="mx-auto grid w-full max-w-5xl gap-8 px-3 pt-2 pb-20 lg:px-0">
			<header className="grid gap-6 border-b border-(--cards-border) pb-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div className="grid gap-2">
						<span className="font-jetbrains text-[10px] tracking-[0.22em] text-(--text-tertiary) uppercase">
							Research · Workspace
						</span>
						<h1 className="text-4xl font-semibold tracking-tight text-(--text-primary) sm:text-5xl">My research</h1>
						{!showLoading ? (
							<p className="text-sm text-(--text-secondary)">
								<span className="text-(--text-primary) tabular-nums">{draftCount}</span> draft
								{draftCount === 1 ? '' : 's'}
								<span className="mx-2 text-(--text-tertiary)">·</span>
								<span className="text-(--text-primary) tabular-nums">{publishedCount}</span> published
								{capped ? (
									<>
										<span className="mx-2 text-(--text-tertiary)">·</span>
										<span className="text-(--text-tertiary)">
											showing latest {FETCH_LIMIT} of {data?.totalItems.toLocaleString()}
										</span>
									</>
								) : null}
							</p>
						) : null}
					</div>
					<div className="flex items-center gap-2">
						<Link
							href="/research/profile"
							className="rounded-md border border-(--cards-border) px-3 py-2 text-sm text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary)"
						>
							Edit profile
						</Link>
						<Link
							href="/research"
							className="rounded-md border border-(--cards-border) px-3 py-2 text-sm text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary)"
						>
							Browse all
						</Link>
						<Link
							href="/research/new"
							className="inline-flex items-center gap-1.5 rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
						>
							<svg
								viewBox="0 0 24 24"
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden
							>
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							New
						</Link>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					<nav className="flex items-baseline gap-5 text-sm" aria-label="Status filter">
						{(['all', 'draft', 'published'] as const).map((value) => {
							const count = value === 'all' ? totalCount : value === 'draft' ? draftCount : publishedCount
							const active = statusFilter === value
							const label = value === 'all' ? 'All' : value === 'draft' ? 'Drafts' : 'Published'
							return (
								<button
									key={value}
									type="button"
									onClick={() => setStatusFilter(value)}
									className={`group relative -mb-px flex items-baseline gap-1.5 border-b-2 pb-2 transition-colors ${
										active
											? 'border-(--link-text) text-(--text-primary)'
											: 'border-transparent text-(--text-tertiary) hover:text-(--text-primary)'
									}`}
								>
									<span className="font-medium">{label}</span>
									<span className="font-jetbrains text-[11px] tabular-nums opacity-70">{count}</span>
								</button>
							)
						})}
					</nav>

					<div className="ml-auto flex flex-wrap items-center gap-2">
						<label className="relative flex items-center">
							<svg
								viewBox="0 0 24 24"
								className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-(--text-tertiary)"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden
							>
								<circle cx="11" cy="11" r="7" />
								<line x1="20" y1="20" x2="16.5" y2="16.5" />
							</svg>
							<input
								type="search"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search title, slug…"
								className="w-44 rounded-md border border-(--cards-border) bg-(--cards-bg) py-1.5 pr-2 pl-8 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text)/50 focus:outline-none sm:w-56"
							/>
						</label>
						<select
							value={sortKey}
							onChange={(e) => setSortKey(e.target.value as SortKey)}
							className="rounded-md border border-(--cards-border) bg-(--cards-bg) py-1.5 pr-2 pl-2.5 text-sm text-(--text-primary) focus:border-(--link-text)/50 focus:outline-none"
							aria-label="Sort"
						>
							{(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
								<option key={k} value={k}>
									{SORT_LABELS[k]}
								</option>
							))}
						</select>
					</div>
				</div>

				{availableSections.length > 0 ? (
					<div className="-mt-2 flex flex-wrap items-center gap-1.5">
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
							Section
						</span>
						<button
							type="button"
							onClick={() => setSectionFilter('all')}
							className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
								sectionFilter === 'all'
									? 'border-(--link-text)/40 bg-(--link-button) text-(--link-text)'
									: 'border-(--cards-border) text-(--text-tertiary) hover:text-(--text-primary)'
							}`}
						>
							Any
						</button>
						{availableSections.map((section) => {
							const active = sectionFilter === section
							return (
								<button
									key={section}
									type="button"
									onClick={() => setSectionFilter(active ? 'all' : section)}
									className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
										active
											? 'border-(--link-text)/40 bg-(--link-button) text-(--link-text)'
											: 'border-(--cards-border) text-(--text-tertiary) hover:text-(--text-primary)'
									}`}
								>
									{ARTICLE_SECTION_LABELS[section]}
								</button>
							)
						})}
					</div>
				) : null}
			</header>

			{error ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
					{error instanceof Error ? error.message : 'Failed to load research'}
				</div>
			) : null}

			{showLoading ? (
				<ul className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{Array.from({ length: 6 }).map((_, i) => (
						<li key={i} className="flex items-center gap-3 px-4 py-3.5">
							<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--cards-border)" />
							<span className="h-3.5 w-2/3 animate-pulse rounded bg-(--cards-border)" />
							<span className="ml-auto h-3 w-20 animate-pulse rounded bg-(--cards-border)" />
						</li>
					))}
				</ul>
			) : filtered.length === 0 ? (
				<div className="grid gap-3 px-4 py-16 text-center">
					<h2 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
						{totalCount === 0 ? 'Nothing here yet' : 'No matches'}
					</h2>
					<p className="mx-auto max-w-md text-sm text-(--text-secondary)">
						{totalCount === 0
							? "Notes turn into drafts the moment you start typing. Publish when you're ready."
							: search || sectionFilter !== 'all' || statusFilter !== 'all'
								? 'Try adjusting the filters or clearing the search.'
								: 'Nothing here.'}
					</p>
					{totalCount === 0 ? (
						<Link
							href="/research/new"
							className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
						>
							Write your first
						</Link>
					) : null}
				</div>
			) : (
				<>
					<ul className="grid divide-y divide-(--cards-border) overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
						{paged.map((article) => {
							const updated = formatRelative(article.updatedAt)
							const words = wordCount(article.plainText) || wordCount(article.excerpt)
							const minutes = words > 0 ? Math.max(1, Math.ceil(words / 220)) : 0
							const isDeleting = deleteArticleMutation.variables === article.id && deleteArticleMutation.isPending
							return (
								<li
									key={article.id}
									className="group relative grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-(--link-hover-bg)"
								>
									<span
										aria-hidden
										className={`absolute top-2 bottom-2 left-0 w-[2px] rounded-r ${
											article.status === 'draft' ? 'bg-amber-500/70' : 'bg-transparent'
										}`}
									/>
									<Link href={`/research/edit/${article.id}`} className="grid min-w-0 gap-1">
										<div className="flex min-w-0 flex-wrap items-center gap-2">
											<StatusDot status={article.status} />
											<h3 className="truncate text-base font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
												{article.title || 'Untitled'}
											</h3>
											{article.viewerRole === 'collaborator' ? (
												<span className="rounded bg-(--link-button) px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-(--link-text) uppercase">
													Co-author
												</span>
											) : null}
											{article.section ? (
												<span className="font-jetbrains text-[10px] tracking-[0.14em] text-(--text-tertiary) uppercase">
													{ARTICLE_SECTION_LABELS[article.section]}
												</span>
											) : null}
										</div>
										<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-(--text-tertiary)">
											<span>
												{article.status === 'draft' ? 'Saved' : 'Updated'} {updated}
											</span>
											<span aria-hidden>·</span>
											<span className="truncate font-jetbrains text-[11px]">/{article.slug}</span>
											{words > 0 ? (
												<>
													<span aria-hidden>·</span>
													<span className="tabular-nums">
														{words.toLocaleString()} words · {minutes} min
													</span>
												</>
											) : null}
										</div>
									</Link>

									<div className="flex shrink-0 items-center gap-1">
										{article.section ? (
											<Link
												href={`/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`}
												target="_blank"
												rel="noreferrer"
												aria-label={article.status === 'published' ? 'View' : 'Preview'}
												title={article.status === 'published' ? 'View' : 'Preview'}
												className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-(--cards-bg) hover:text-(--text-primary)"
											>
												<svg
													viewBox="0 0 24 24"
													className="h-4 w-4"
													fill="none"
													stroke="currentColor"
													strokeWidth="1.75"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
													<circle cx="12" cy="12" r="3" />
												</svg>
											</Link>
										) : null}
										<Link
											href={`/research/edit/${article.id}`}
											className="hidden h-8 items-center gap-1.5 rounded-md border border-(--cards-border) px-3 text-xs text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary) sm:flex"
										>
											Edit
										</Link>
										{article.viewerRole !== 'collaborator' ? (
											<button
												type="button"
												aria-label="Delete"
												title="Delete"
												disabled={isDeleting}
												onClick={() => handleDelete(article)}
												className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
											>
												<svg
													viewBox="0 0 24 24"
													className="h-3.5 w-3.5"
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
										) : null}
									</div>
								</li>
							)
						})}
					</ul>

					{totalPages > 1 ? (
						<div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-(--text-tertiary)">
							<span className="font-jetbrains text-xs tabular-nums">
								{rangeStart}–{rangeEnd} of {filtered.length.toLocaleString()}
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={safePage <= 1}
									className="flex h-8 items-center gap-1 rounded-md border border-(--cards-border) px-2.5 text-xs text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-(--cards-border) disabled:hover:text-(--text-secondary)"
								>
									<span aria-hidden>←</span> Prev
								</button>
								<span className="px-3 font-jetbrains text-xs tabular-nums">
									{safePage} / {totalPages}
								</span>
								<button
									type="button"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={safePage >= totalPages}
									className="flex h-8 items-center gap-1 rounded-md border border-(--cards-border) px-2.5 text-xs text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-(--cards-border) disabled:hover:text-(--text-secondary)"
								>
									Next <span aria-hidden>→</span>
								</button>
							</div>
						</div>
					) : null}
				</>
			)}
		</div>
	)
}

export default function MyArticlesPage() {
	return (
		<Layout
			title="My research - DefiLlama"
			description="Drafts and published research."
			canonicalUrl="/research/mine"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<MyArticlesContent />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
