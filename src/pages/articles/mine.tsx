import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
	ArticleApiError,
	deleteArticle as deleteArticleApi,
	listMyArticles,
	type ArticleListResponse
} from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import type { ArticleDocument } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

type Filter = 'all' | 'draft' | 'published'

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

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
	const isPublished = status === 'published'
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${
				isPublished
					? 'bg-emerald-500/10 text-emerald-500'
					: 'bg-amber-500/10 text-amber-500'
			}`}
		>
			<span
				aria-hidden
				className={`h-1.5 w-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`}
			/>
			{isPublished ? 'Published' : 'Draft'}
		</span>
	)
}

function MyArticlesContent() {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const [data, setData] = useState<ArticleListResponse | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [filter, setFilter] = useState<Filter>('all')
	const [deletingId, setDeletingId] = useState<string | null>(null)

	useEffect(() => {
		if (loaders.userLoading) return
		if (!isAuthenticated) {
			setIsLoading(false)
			return
		}
		let cancelled = false
		setIsLoading(true)
		listMyArticles({ limit: 50 }, authorizedFetch)
			.then((response) => {
				if (cancelled) return
				setData(response)
				setError(null)
			})
			.catch((err) => {
				if (cancelled) return
				setError(err instanceof ArticleApiError ? err.message : 'Failed to load articles')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [authorizedFetch, isAuthenticated, loaders.userLoading])

	const articles = data?.items ?? []
	const drafts = useMemo(() => articles.filter((a) => a.status === 'draft'), [articles])
	const published = useMemo(() => articles.filter((a) => a.status === 'published'), [articles])
	const filtered = filter === 'draft' ? drafts : filter === 'published' ? published : articles

	const handleDelete = async (article: ArticleDocument) => {
		if (!confirm(`Delete "${article.title || 'Untitled'}"? This cannot be undone.`)) return
		setDeletingId(article.id)
		try {
			await deleteArticleApi(article.id, authorizedFetch)
			setData((current) =>
				current ? { ...current, items: current.items.filter((a) => a.id !== article.id) } : current
			)
			toast.success('Deleted')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete')
		} finally {
			setDeletingId(null)
		}
	}

	if (loaders.userLoading || (isAuthenticated && isLoading)) {
		return (
			<div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-sm text-(--text-tertiary)">
				Loading…
			</div>
		)
	}

	return (
		<div className="mx-auto grid w-full max-w-4xl gap-6 px-1 pb-16">
			<header className="grid gap-3 border-b border-(--cards-border) py-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-(--text-primary)">My articles</h1>
						<p className="mt-1 text-sm text-(--text-secondary)">
							{drafts.length} draft{drafts.length === 1 ? '' : 's'}
							<span className="mx-2 text-(--text-tertiary)">·</span>
							{published.length} published
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Link
							href="/articles"
							className="rounded-md border border-(--cards-border) px-3 py-2 text-sm text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary)"
						>
							Browse all
						</Link>
						<Link
							href="/articles/new"
							className="rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
						>
							Write
						</Link>
					</div>
				</div>

				<div className="flex items-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-0.5 text-sm sm:w-fit">
					{(['all', 'draft', 'published'] as const).map((value) => {
						const count =
							value === 'all' ? articles.length : value === 'draft' ? drafts.length : published.length
						const active = filter === value
						const label = value === 'all' ? 'All' : value === 'draft' ? 'Drafts' : 'Published'
						return (
							<button
								key={value}
								type="button"
								onClick={() => setFilter(value)}
								className={`flex items-baseline gap-1.5 rounded px-3 py-1 transition-colors ${
									active
										? 'bg-(--link-button) text-(--link-text)'
										: 'text-(--text-tertiary) hover:text-(--text-primary)'
								}`}
							>
								<span>{label}</span>
								<span className="text-xs tabular-nums opacity-70">{count}</span>
							</button>
						)
					})}
				</div>
			</header>

			{error ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
			) : null}

			{filtered.length === 0 ? (
				<div className="grid gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-8 text-center">
					<h2 className="text-lg font-semibold text-(--text-primary)">
						{filter === 'all' ? 'No articles yet' : `No ${filter}s`}
					</h2>
					<p className="mx-auto max-w-md text-sm text-(--text-secondary)">
						{filter === 'all'
							? "Notes turn into drafts the moment you start typing. Publish when you're ready."
							: 'Nothing here.'}
					</p>
					{filter === 'all' ? (
						<Link
							href="/articles/new"
							className="mx-auto mt-2 rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
						>
							New article
						</Link>
					) : null}
				</div>
			) : (
				<ul className="grid rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{filtered.map((article) => {
						const updated = formatRelative(article.updatedAt)
						const words = wordCount(article.plainText) || wordCount(article.excerpt)
						const minutes = Math.max(1, Math.ceil(words / 220))
						const isDeleting = deletingId === article.id
						return (
							<li
								key={article.id}
								className="group grid grid-cols-[1fr_auto] items-center gap-3 border-t border-(--cards-border) px-4 py-3 first:border-t-0 transition-colors hover:bg-(--link-hover-bg)"
							>
								<Link href={`/articles/edit/${article.id}`} className="grid min-w-0 gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<StatusBadge status={article.status} />
										<h3 className="truncate text-base font-semibold text-(--text-primary) group-hover:text-(--link-text)">
											{article.title || 'Untitled'}
										</h3>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
										<span>Updated {updated}</span>
										<span aria-hidden>·</span>
										<span className="font-jetbrains truncate text-[11px]">/{article.slug}</span>
										{words > 0 ? (
											<>
												<span aria-hidden>·</span>
												<span>
													{words.toLocaleString()} words · {minutes} min
												</span>
											</>
										) : null}
									</div>
								</Link>

								<div className="flex shrink-0 items-center gap-1">
									{article.status === 'published' ? (
										<Link
											href={`/articles/${article.slug}`}
											target="_blank"
											rel="noreferrer"
											aria-label="View"
											title="View"
											className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--cards-bg) hover:text-(--text-primary)"
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
										href={`/articles/edit/${article.id}`}
										className="flex h-8 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 text-xs text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--text-primary)"
									>
										Edit
									</Link>
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
								</div>
							</li>
						)
					})}
				</ul>
			)}
		</div>
	)
}

export default function MyArticlesPage() {
	return (
		<Layout
			title="My articles - DefiLlama"
			description="Drafts and published articles."
			canonicalUrl="/articles/mine"
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
