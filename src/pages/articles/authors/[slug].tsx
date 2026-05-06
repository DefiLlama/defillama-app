import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArticleApiError, getAuthorBySlug, type ArticleAuthorResponse } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import type { ArticleDocument } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function formatDate(value: string | null) {
	if (!value) return ''
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatShort(value: string | null) {
	if (!value) return ''
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatYear(value: string | null) {
	if (!value) return ''
	return new Date(value).getFullYear().toString()
}

function readingMinutes(article: ArticleDocument) {
	const text = article.plainText?.trim() || article.excerpt?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function SocialLink({ kind, value }: { kind: string; value: string }) {
	const href = value.startsWith('http') ? value : `https://${value}`
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
		>
			{kind.replace(/-/g, ' ')} ↗
		</a>
	)
}

function YourArticlesChip({ authorPbUserId }: { authorPbUserId: string }) {
	const { user, isAuthenticated } = useAuthContext()
	const isMine = isAuthenticated && !!user?.id && user.id === authorPbUserId
	if (!isMine) return null
	return (
		<Link
			href="/articles/mine"
			className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
		>
			Your articles →
		</Link>
	)
}

function AuthorContent({ slug }: { slug: string }) {
	const { authorizedFetch } = useAuthContext()
	const [data, setData] = useState<ArticleAuthorResponse | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notFound, setNotFound] = useState(false)

	useEffect(() => {
		if (!slug) return
		let cancelled = false
		setIsLoading(true)
		getAuthorBySlug(slug, authorizedFetch)
			.then((response) => {
				if (cancelled) return
				if (!response) setNotFound(true)
				else {
					setData(response)
					setError(null)
				}
			})
			.catch((err) => {
				if (cancelled) return
				setError(err instanceof ArticleApiError ? err.message : 'Failed to load author')
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [authorizedFetch, slug])

	if (isLoading) {
		return (
			<div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-sm text-(--text-tertiary)">
				Loading…
			</div>
		)
	}

	if (notFound) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Author not found</h1>
				<Link href="/articles" className="text-sm text-(--link-text) hover:underline">
					Browse all articles →
				</Link>
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load author</h1>
				<p className="text-sm text-(--text-secondary)">{error}</p>
			</div>
		)
	}

	const { author, articles } = data
	const totalMinutes = articles.reduce((sum, article) => sum + readingMinutes(article), 0)
	const firstYear = articles.length ? formatYear(articles[articles.length - 1]?.publishedAt) : null
	const latestYear = articles.length ? formatYear(articles[0]?.publishedAt) : null
	const yearsLabel =
		firstYear && latestYear ? (firstYear === latestYear ? firstYear : `${firstYear}–${latestYear}`) : null

	const lead = articles[0]
	const rest = articles.slice(1)

	return (
		<div className="mx-auto grid w-full max-w-4xl gap-6 px-1 pb-16">
			<header className="grid gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 md:p-6">
				<div className="flex items-start gap-4">
					{author.avatarUrl ? (
						<img
							src={author.avatarUrl}
							alt=""
							className="h-20 w-20 shrink-0 rounded-full border border-(--cards-border) object-cover"
						/>
					) : (
						<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-(--cards-border) bg-(--app-bg) text-xl font-semibold text-(--text-secondary)">
							{author.displayName.slice(0, 2).toUpperCase()}
						</div>
					)}
					<div className="grid min-w-0 gap-1.5">
						<h1 className="text-2xl font-semibold tracking-tight text-(--text-primary) md:text-3xl">
							{author.displayName}
						</h1>
						<p className="font-jetbrains text-xs text-(--text-tertiary)">@{author.slug}</p>
						{author.bio ? (
							<p className="max-w-prose text-sm leading-relaxed text-(--text-secondary)">{author.bio}</p>
						) : null}
						<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
							<span>
								{articles.length} {articles.length === 1 ? 'article' : 'articles'}
							</span>
							{yearsLabel ? (
								<>
									<span aria-hidden>·</span>
									<span>{yearsLabel}</span>
								</>
							) : null}
							{totalMinutes > 0 ? (
								<>
									<span aria-hidden>·</span>
									<span>{totalMinutes} min reading</span>
								</>
							) : null}
						</div>
					</div>
				</div>
				{(author.socials && Object.keys(author.socials).length > 0) || author.pbUserId ? (
					<div className="flex flex-wrap gap-1.5">
						{author.socials &&
							Object.entries(author.socials).map(([kind, value]) =>
								value ? <SocialLink key={kind} kind={kind} value={value} /> : null
							)}
						<YourArticlesChip authorPbUserId={author.pbUserId} />
					</div>
				) : null}
			</header>

			{articles.length === 0 ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-sm text-(--text-secondary)">
					No published articles yet.
				</div>
			) : (
				<>
					{lead ? (
						<section className="grid gap-3">
							<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">Latest</h2>
							<Link
								href={`/articles/${lead.slug}`}
								className="group grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:bg-(--link-button) md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]"
							>
								<div className="order-2 grid content-start gap-2 p-5 md:order-1">
									<div className="text-xs text-(--text-tertiary)">
										{formatDate(lead.publishedAt)} · {readingMinutes(lead)} min read
									</div>
									<h3 className="text-xl leading-tight font-semibold text-(--text-primary) group-hover:text-(--link-text) md:text-2xl">
										{lead.title}
									</h3>
									{lead.subtitle ? (
										<p className="text-sm leading-snug text-(--text-secondary)">{lead.subtitle}</p>
									) : lead.excerpt ? (
										<p className="line-clamp-3 text-sm text-(--text-secondary)">{lead.excerpt}</p>
									) : null}
								</div>
								{lead.coverImage?.url ? (
									<img
										src={lead.coverImage.url}
										alt=""
										className="order-1 h-40 w-full object-cover md:order-2 md:h-full"
									/>
								) : null}
							</Link>
						</section>
					) : null}

					{rest.length ? (
						<section className="grid gap-3">
							<div className="flex items-end justify-between gap-2">
								<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">
									Archive
								</h2>
								<p className="text-xs text-(--text-tertiary)">
									{rest.length} {rest.length === 1 ? 'note' : 'notes'}
								</p>
							</div>
							<ul className="grid rounded-md border border-(--cards-border) bg-(--cards-bg) px-4">
								{rest.map((article) => (
									<li
										key={article.id}
										className="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-4 border-t border-(--cards-border) py-4 first:border-t-0 sm:grid-cols-[100px_minmax(0,1fr)]"
									>
										<div className="font-jetbrains text-[11px] tracking-tight text-(--text-tertiary)">
											{formatShort(article.publishedAt)}
										</div>
										<Link href={`/articles/${article.slug}`} className="group grid gap-1">
											<h3 className="text-base leading-tight font-semibold text-(--text-primary) group-hover:text-(--link-text)">
												{article.title}
											</h3>
											{article.excerpt ? (
												<p className="line-clamp-2 text-sm text-(--text-secondary)">{article.excerpt}</p>
											) : null}
											<div className="text-xs text-(--text-tertiary)">{readingMinutes(article)} min read</div>
										</Link>
									</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			)}
		</div>
	)
}

export default function ArticleAuthorPage() {
	const router = useRouter()
	const slug = typeof router.query.slug === 'string' ? router.query.slug : ''

	return (
		<Layout
			title="Author - DefiLlama"
			description="Read DefiLlama articles by this author."
			canonicalUrl={slug ? `/articles/authors/${slug}` : '/articles'}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>{slug ? <AuthorContent slug={slug} /> : null}</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
