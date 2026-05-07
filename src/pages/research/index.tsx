import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
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

function timeAgo(value: string | null) {
	if (!value) return 'Draft'
	const ms = Date.now() - new Date(value).getTime()
	if (ms < 0) return formatDate(value)
	const minutes = Math.floor(ms / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days < 7) return `${days}d ago`
	return formatDate(value)
}

function readingMinutes(article: ArticleDocument) {
	const text = article.plainText?.trim() || article.excerpt?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function TagChips({ tags, max = 3 }: { tags: string[] | null | undefined; max?: number }) {
	if (!tags?.length) return null
	return (
		<div className="flex flex-wrap items-center gap-1">
			{tags.slice(0, max).map((t) => (
				<span
					key={t}
					className="font-jetbrains rounded-sm border border-(--cards-border) bg-(--app-bg) px-1.5 py-0.5 text-[10px] tracking-wider text-(--text-secondary) uppercase"
				>
					{t}
				</span>
			))}
		</div>
	)
}

function ByLine({
	article,
	withTime = true,
	className = ''
}: {
	article: ArticleDocument
	withTime?: boolean
	className?: string
}) {
	return (
		<div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-tertiary) ${className}`}>
			{article.authorProfile ? (
				<Link
					href={`/research/authors/${article.authorProfile.slug}`}
					className="font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
				>
					{article.authorProfile.displayName}
				</Link>
			) : null}
			{article.authorProfile && withTime ? <span aria-hidden>·</span> : null}
			{withTime ? <span className="font-jetbrains tabular-nums">{timeAgo(article.publishedAt)}</span> : null}
			<span aria-hidden>·</span>
			<span>{readingMinutes(article)} min read</span>
		</div>
	)
}

function LeadCard({ article }: { article: ArticleDocument }) {
	return (
		<Link
			href={`/research/${article.slug}`}
			className="group grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
		>
			<div className="order-2 grid content-start gap-3 p-5 md:order-1 md:p-6">
				<div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
					<span className="text-(--link-text)">Top story</span>
					{article.tags?.[0] ? (
						<>
							<span className="text-(--cards-border)" aria-hidden>
								·
							</span>
							<span className="text-(--text-tertiary)">{article.tags[0]}</span>
						</>
					) : null}
				</div>
				<h2 className="text-2xl leading-[1.15] font-bold tracking-tight text-(--text-primary) group-hover:text-(--link-text) md:text-3xl">
					{article.title}
				</h2>
				{article.subtitle ? (
					<p className="text-base leading-snug text-(--text-secondary)">{article.subtitle}</p>
				) : article.excerpt ? (
					<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">{article.excerpt}</p>
				) : null}
				<ByLine article={article} className="pt-1" />
				{article.tags?.length ? <TagChips tags={article.tags} max={4} /> : null}
			</div>
			{article.coverImage?.url ? (
				<img
					src={article.coverImage.url}
					alt=""
					loading="eager"
					decoding="async"
					className="order-1 h-48 w-full object-cover md:order-2 md:h-full md:max-h-[340px]"
				/>
			) : (
				<div className="order-1 h-48 w-full bg-(--app-bg) md:order-2 md:h-full" aria-hidden />
			)}
		</Link>
	)
}

function FeaturedDigest({ articles }: { articles: ArticleDocument[] }) {
	if (articles.length === 0) return null
	return (
		<section className="grid gap-3">
			<SectionHeader label="Editor picks" right={`${articles.length} ${articles.length === 1 ? 'pick' : 'picks'}`} />
			<div className="grid gap-3 md:grid-cols-3">
				{articles.map((article) => (
					<Link
						key={article.id}
						href={`/research/${article.slug}`}
						className="group grid content-start overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40"
					>
						{article.coverImage?.url ? (
							<img
								src={article.coverImage.url}
								alt=""
								loading="lazy"
								decoding="async"
								className="aspect-[16/9] w-full border-b border-(--cards-border) object-cover"
							/>
						) : (
							<div className="aspect-[16/9] w-full border-b border-(--cards-border) bg-(--app-bg)" aria-hidden />
						)}
						<div className="grid content-start gap-2 p-4">
							<h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
								{article.title}
							</h3>
							{article.excerpt ? (
								<p className="line-clamp-2 text-xs leading-relaxed text-(--text-secondary)">{article.excerpt}</p>
							) : null}
							<ByLine article={article} className="pt-1 text-[11px]" />
							{article.tags?.length ? <TagChips tags={article.tags} max={3} /> : null}
						</div>
					</Link>
				))}
			</div>
		</section>
	)
}

function ArchiveRow({ article }: { article: ArticleDocument }) {
	return (
		<li>
			<Link
				href={`/research/${article.slug}`}
				className="group grid grid-cols-[80px_minmax(0,1fr)] items-start gap-3 border-b border-(--cards-border) py-4 last:border-b-0 transition-colors sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4"
			>
				{article.coverImage?.url ? (
					<img
						src={article.coverImage.url}
						alt=""
						loading="lazy"
						decoding="async"
						className="aspect-square w-full rounded-md border border-(--cards-border) object-cover transition-opacity group-hover:opacity-90 sm:aspect-[4/3]"
					/>
				) : (
					<div
						className="aspect-square w-full rounded-md border border-(--cards-border) bg-(--app-bg) sm:aspect-[4/3]"
						aria-hidden
					/>
				)}
				<div className="grid gap-1.5">
					<h3 className="text-sm leading-snug font-semibold text-(--text-primary) transition-colors group-hover:text-(--link-text) sm:text-base">
						{article.title}
					</h3>
					{article.excerpt ? (
						<p className="line-clamp-2 text-xs leading-relaxed text-(--text-secondary) sm:text-[13px]">
							{article.excerpt}
						</p>
					) : null}
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[11px] text-(--text-tertiary)">
						{article.authorProfile ? (
							<>
								<span className="text-(--text-secondary)">{article.authorProfile.displayName}</span>
								<span aria-hidden>·</span>
							</>
						) : null}
						<span className="font-jetbrains tabular-nums">{timeAgo(article.publishedAt)}</span>
						<span aria-hidden>·</span>
						<span>{readingMinutes(article)} min</span>
						{article.tags?.length ? (
							<>
								<span className="ml-auto" aria-hidden />
								<TagChips tags={article.tags} max={2} />
							</>
						) : null}
					</div>
				</div>
			</Link>
		</li>
	)
}

function SectionHeader({ label, right }: { label: string; right?: string }) {
	return (
		<div className="flex items-end justify-between gap-3">
			<h2 className="text-xs font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">{label}</h2>
			{right ? (
				<span className="font-jetbrains text-[11px] tracking-tight text-(--text-tertiary) tabular-nums">{right}</span>
			) : null}
		</div>
	)
}

function TrendingTags({ articles }: { articles: ArticleDocument[] }) {
	const tags = useMemo(() => {
		const counts = new Map<string, number>()
		for (const article of articles) {
			for (const tag of article.tags ?? []) {
				counts.set(tag, (counts.get(tag) ?? 0) + 1)
			}
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
	}, [articles])
	if (tags.length === 0) return null
	return (
		<div className="grid gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
			<div className="flex items-center justify-between border-b border-(--cards-border) pb-2">
				<h2 className="text-[11px] font-semibold tracking-[0.16em] text-(--text-secondary) uppercase">Trending</h2>
				<span className="font-jetbrains text-[10px] tracking-tight text-(--text-tertiary) tabular-nums">
					{tags.length}
				</span>
			</div>
			<ul className="grid">
				{tags.map(([tag, count]) => (
					<li key={tag}>
						<Link
							href={`/research?tag=${encodeURIComponent(tag)}`}
							className="group flex items-center justify-between rounded-sm px-1.5 py-1.5 text-[13px] text-(--text-secondary) transition-colors hover:bg-(--link-button) hover:text-(--text-primary)"
						>
							<span className="capitalize">{tag.replace(/-/g, ' ')}</span>
							<span className="font-jetbrains text-[10px] tabular-nums text-(--text-tertiary) group-hover:text-(--link-text)">
								{count}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}

function MineLink() {
	const { isAuthenticated } = useAuthContext()
	if (!isAuthenticated) return null
	return (
		<Link
			href="/research/mine"
			className="rounded-md border border-(--cards-border) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
		>
			My research
		</Link>
	)
}

function Masthead({ query, tag }: { query: string; tag: string }) {
	return (
		<header className="grid gap-4 border-b border-(--cards-border) pb-5">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="grid gap-1">
					<h1 className="text-2xl font-bold tracking-tight text-(--text-primary)">Research</h1>
					<p className="text-sm text-(--text-secondary)">
						Research notes, data explainers, and market context from the DL Research team.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<MineLink />
					<Link
						href="/research/new"
						className="rounded-md bg-(--link-text) px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
					>
						Write
					</Link>
				</div>
			</div>
			<form className="flex flex-wrap gap-2" action="/research">
				<input
					name="q"
					defaultValue={query}
					placeholder="Search research"
					className="min-w-0 flex-1 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
				/>
				<input
					name="tag"
					defaultValue={tag}
					placeholder="Tag"
					className="w-32 rounded-md border border-(--form-control-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none sm:w-44"
				/>
				<button
					type="submit"
					className="rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary)"
				>
					Search
				</button>
			</form>
		</header>
	)
}

function LoadingPlaceholder() {
	return (
		<div className="grid gap-6">
			<div className="grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<div className="grid content-start gap-3 p-5 md:p-6">
					<div className="h-3 w-24 rounded bg-(--app-bg)" aria-hidden />
					<div className="h-6 w-full rounded bg-(--app-bg)" aria-hidden />
					<div className="h-6 w-3/4 rounded bg-(--app-bg)" aria-hidden />
					<div className="h-3 w-1/2 rounded bg-(--app-bg)" aria-hidden />
				</div>
				<div className="h-48 w-full bg-(--app-bg) md:h-auto" aria-hidden />
			</div>
			<ul className="grid">
				{[0, 1, 2].map((i) => (
					<li
						key={i}
						className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-3 border-b border-(--cards-border) py-4 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4"
					>
						<div
							className="aspect-square w-full rounded-md border border-(--cards-border) bg-(--app-bg) sm:aspect-[4/3]"
							aria-hidden
						/>
						<div className="grid gap-2">
							<div className="h-4 w-3/4 rounded bg-(--app-bg)" aria-hidden />
							<div className="h-3 w-full rounded bg-(--app-bg)" aria-hidden />
							<div className="h-3 w-1/3 rounded bg-(--app-bg)" aria-hidden />
						</div>
					</li>
				))}
			</ul>
		</div>
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

	const featuredHero = featured.items[0] ?? null
	const featuredRest = featured.items.slice(1, 4)
	const fallbackHero = !featuredHero && newest.items.length > 0 ? newest.items[0] : null
	const heroArticle = featuredHero ?? fallbackHero
	const heroId = heroArticle?.id
	const archiveItems = newest.items.filter((article) => article.id !== heroId)

	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 px-1 pb-16 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-8">
			<div className="grid gap-6">
				<Masthead query={query} tag={tag} />

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
					<LoadingPlaceholder />
				) : (
					<>
						{!isFiltered && heroArticle ? <LeadCard article={heroArticle} /> : null}

						{!isFiltered && featuredRest.length > 0 ? <FeaturedDigest articles={featuredRest} /> : null}

						{archiveItems.length || isFiltered ? (
							<section className="grid gap-3">
								<SectionHeader
									label={isFiltered ? 'Results' : 'Latest'}
									right={`Showing ${archiveItems.length || newest.items.length} of ${newest.totalItems}`}
								/>
								{archiveItems.length ? (
									<ul className="grid rounded-md border border-(--cards-border) bg-(--cards-bg) px-4">
										{archiveItems.map((article) => (
											<ArchiveRow key={article.id} article={article} />
										))}
									</ul>
								) : (
									<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-sm text-(--text-secondary)">
										No published research found.
									</div>
								)}
							</section>
						) : null}
					</>
				)}
			</div>

			<aside className="hidden lg:block">
				<div className="sticky top-24 grid gap-4">
					<TrendingTags articles={allArticles} />
				</div>
			</aside>
		</div>
	)
}

export default function ArticlesPage() {
	return (
		<Layout
			title="Research - DefiLlama"
			description="Read DefiLlama research with live protocol, chain, and market data."
			canonicalUrl="/research"
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
