import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArticleApiError, listArticles, type ArticleListResponse } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import type { ArticleDocument } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

const EMPTY_LIST: ArticleListResponse = {
	items: [],
	page: 1,
	perPage: 20,
	totalItems: 0,
	totalPages: 1
}

const getQueryParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

function formatDate(value: string | null) {
	if (!value) return 'Draft'
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatShort(value: string | null) {
	if (!value) return ''
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function readingMinutes(article: ArticleDocument) {
	const text = article.plainText?.trim() || article.excerpt?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function ArticleMeta({ article }: { article: ArticleDocument }) {
	return (
		<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
			<span>{formatDate(article.publishedAt)}</span>
			{article.authorProfile ? (
				<>
					<span aria-hidden>·</span>
					<Link href={`/articles/authors/${article.authorProfile.slug}`} className="hover:text-(--text-primary)">
						{article.authorProfile.displayName}
					</Link>
				</>
			) : null}
			<span aria-hidden>·</span>
			<span>{readingMinutes(article)} min</span>
		</div>
	)
}

function HeroCard({ article }: { article: ArticleDocument }) {
	return (
		<Link
			href={`/articles/${article.slug}`}
			className="group grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:bg-(--link-button) md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"
		>
			<div className="order-2 grid content-start gap-3 p-5 md:order-1 md:p-6">
				<div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-(--link-text) uppercase">
					Featured
				</div>
				<h2 className="text-2xl leading-tight font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text) md:text-3xl">
					{article.title}
				</h2>
				{article.subtitle ? (
					<p className="text-base leading-snug text-(--text-secondary)">{article.subtitle}</p>
				) : article.excerpt ? (
					<p className="line-clamp-3 text-sm text-(--text-secondary)">{article.excerpt}</p>
				) : null}
				<ArticleMeta article={article} />
				{article.tags?.length ? (
					<div className="flex flex-wrap gap-1.5 pt-1">
						{article.tags.slice(0, 4).map((t) => (
							<span key={t} className="rounded bg-(--link-button) px-2 py-0.5 text-[11px] text-(--link-text)">
								{t}
							</span>
						))}
					</div>
				) : null}
			</div>
			{article.coverImage?.url ? (
				<img
					src={article.coverImage.url}
					alt=""
					className="order-1 h-48 w-full object-cover md:order-2 md:h-full"
				/>
			) : null}
		</Link>
	)
}

function FeaturedDigest({ articles }: { articles: ArticleDocument[] }) {
	if (articles.length === 0) return null
	return (
		<section className="grid gap-3">
			<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">More featured</h2>
			<div className="grid gap-3 md:grid-cols-3">
				{articles.map((article) => (
					<Link
						key={article.id}
						href={`/articles/${article.slug}`}
						className="group grid content-start gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4 transition-colors hover:bg-(--link-button)"
					>
						<ArticleMeta article={article} />
						<h3 className="text-base leading-tight font-semibold text-(--text-primary) group-hover:text-(--link-text)">
							{article.title}
						</h3>
						{article.excerpt ? (
							<p className="line-clamp-3 text-sm text-(--text-secondary)">{article.excerpt}</p>
						) : null}
					</Link>
				))}
			</div>
		</section>
	)
}

function ArchiveRow({ article }: { article: ArticleDocument }) {
	return (
		<li className="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-4 border-t border-(--cards-border) py-4 first:border-t-0 sm:grid-cols-[100px_minmax(0,1fr)]">
			<div className="font-jetbrains text-[11px] tracking-tight text-(--text-tertiary)">
				{formatShort(article.publishedAt)}
			</div>
			<Link href={`/articles/${article.slug}`} className="group grid gap-1.5">
				<h3 className="text-base leading-tight font-semibold text-(--text-primary) group-hover:text-(--link-text)">
					{article.title}
				</h3>
				{article.excerpt ? <p className="line-clamp-2 text-sm text-(--text-secondary)">{article.excerpt}</p> : null}
				<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
					{article.authorProfile ? <span>{article.authorProfile.displayName}</span> : null}
					<span aria-hidden>·</span>
					<span>{readingMinutes(article)} min</span>
					{article.tags?.length ? (
						<>
							<span aria-hidden>·</span>
							<span className="truncate">{article.tags.slice(0, 3).join(', ')}</span>
						</>
					) : null}
				</div>
			</Link>
		</li>
	)
}

function TopicRail({ articles }: { articles: ArticleDocument[] }) {
	const counts = new Map<string, number>()
	for (const article of articles) {
		for (const tag of article.tags ?? []) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1)
		}
	}
	const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
	if (tags.length === 0) return null
	return (
		<aside className="hidden lg:block">
			<div className="sticky top-24 grid gap-3">
				<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">Topics</h2>
				<ul className="grid gap-1">
					{tags.map(([tag, count]) => (
						<li key={tag}>
							<Link
								href={`/articles?tag=${encodeURIComponent(tag)}`}
								className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-(--text-secondary) hover:bg-(--link-button) hover:text-(--text-primary)"
							>
								<span className="capitalize">{tag.replace(/-/g, ' ')}</span>
								<span className="text-xs tabular-nums text-(--text-tertiary)">{count}</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</aside>
	)
}

function MineLink() {
	const { isAuthenticated } = useAuthContext()
	if (!isAuthenticated) return null
	return (
		<Link
			href="/articles/mine"
			className="rounded-md border border-(--cards-border) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
		>
			My articles
		</Link>
	)
}

function ArticlesContent() {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()
	const query = getQueryParam(router.query.q).trim()
	const tag = getQueryParam(router.query.tag).trim()
	const isFiltered = !!(query || tag)

	const [featured, setFeatured] = useState<ArticleListResponse>(EMPTY_LIST)
	const [newest, setNewest] = useState<ArticleListResponse>(EMPTY_LIST)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		setIsLoading(true)
		Promise.all([
			isFiltered
				? Promise.resolve(EMPTY_LIST)
				: listArticles({ sort: 'featured', limit: 6 }, authorizedFetch),
			listArticles({ sort: 'newest', limit: 30, query, tags: tag ? [tag] : undefined }, authorizedFetch)
		])
			.then(([f, n]) => {
				if (cancelled) return
				setFeatured(f)
				setNewest(n)
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
	}, [authorizedFetch, isFiltered, query, tag])

	const allArticles = [...featured.items, ...newest.items]
	const heroFeatured = featured.items[0] ?? null
	const restFeatured = featured.items.slice(1, 4)

	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 px-1 pb-16 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-8">
			<div className="grid gap-6">
				<header className="grid gap-3 border-b border-(--cards-border) py-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-3xl font-semibold tracking-tight text-(--text-primary)">Articles</h1>
							<p className="mt-1 max-w-2xl text-sm text-(--text-secondary)">
								Research notes, data explainers, and market context from the DefiLlama ecosystem.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<MineLink />
							<Link
								href="/articles/new"
								className="rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white"
							>
								Write
							</Link>
						</div>
					</div>
					<form className="flex flex-wrap gap-2" action="/articles">
						<input
							name="q"
							defaultValue={query}
							placeholder="Search articles"
							className="min-w-0 flex-1 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) focus:border-(--link-text) focus:outline-none"
						/>
						<input
							name="tag"
							defaultValue={tag}
							placeholder="Tag"
							className="w-40 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) focus:border-(--link-text) focus:outline-none"
						/>
						<button type="submit" className="rounded-md border border-(--cards-border) px-3 py-2 text-sm">
							Search
						</button>
					</form>
				</header>

				{isFiltered ? (
					<section className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
						<div className="text-sm text-(--text-secondary)">
							{newest.totalItems} {newest.totalItems === 1 ? 'result' : 'results'}
							{query ? (
								<>
									{' for '}
									<span className="text-(--text-primary)">"{query}"</span>
								</>
							) : null}
							{tag ? (
								<>
									{' tagged '}
									<span className="text-(--text-primary)">#{tag}</span>
								</>
							) : null}
						</div>
					</section>
				) : null}

				{error ? (
					<div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
				) : null}

				{isLoading ? (
					<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-sm text-(--text-tertiary)">
						Loading…
					</div>
				) : (
					<>
						{!isFiltered && heroFeatured ? <HeroCard article={heroFeatured} /> : null}

						{!isFiltered && restFeatured.length > 0 ? <FeaturedDigest articles={restFeatured} /> : null}

						<section className="grid gap-3">
							<div className="flex items-end justify-between gap-2">
								<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">
									{isFiltered ? 'Results' : 'Newest'}
								</h2>
								<p className="text-xs text-(--text-tertiary)">
									Showing {newest.items.length} of {newest.totalItems}
								</p>
							</div>
							{newest.items.length ? (
								<ul className="grid rounded-md border border-(--cards-border) bg-(--cards-bg) px-4">
									{newest.items.map((article) => (
										<ArchiveRow key={article.id} article={article} />
									))}
								</ul>
							) : (
								<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-sm text-(--text-secondary)">
									No published articles found.
								</div>
							)}
						</section>
					</>
				)}
			</div>

			<TopicRail articles={allArticles} />
		</div>
	)
}

export default function ArticlesPage() {
	return (
		<Layout
			title="Articles - DefiLlama"
			description="Read DefiLlama articles and research with live protocol, chain, and market data."
			canonicalUrl="/articles"
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>
					<ArticlesContent />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
