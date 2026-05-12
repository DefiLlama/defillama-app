import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArticleApiError, getAuthorBySlug } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ARTICLE_SECTION_SLUGS, type ArticleDocument } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'

function articleHref(article: ArticleDocument) {
	if (article.section) {
		return `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
	}
	return '/research'
}

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

function OwnerChips({ authorPbUserId }: { authorPbUserId: string }) {
	const { user, isAuthenticated } = useAuthContext()
	const isMine = isAuthenticated && !!user?.id && user.id === authorPbUserId
	if (!isMine) return null
	return (
		<>
			<Link
				href="/research/profile"
				className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
			>
				Edit profile
			</Link>
			<Link
				href="/research/mine"
				className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
			>
				Your research →
			</Link>
		</>
	)
}

function AuthorContent({ slug }: { slug: string }) {
	const { authorizedFetch } = useAuthContext()
	const {
		data = null,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'author', slug],
		queryFn: () => getAuthorBySlug(slug, authorizedFetch),
		enabled: !!slug,
		retry: false
	})

	if (isLoading) {
		return (
			<div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-sm text-(--text-tertiary)">
				Loading…
			</div>
		)
	}

	if (!data && !error) {
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Author not found</h1>
				<Link href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research →
				</Link>
			</div>
		)
	}

	if (error || !data) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load author'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn't load author</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
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

	const socialEntries = author.socials ? Object.entries(author.socials).filter(([, value]) => Boolean(value)) : []

	return (
		<div className="mx-auto grid w-full max-w-4xl gap-10 px-1 pt-2 pb-20 md:gap-14">
			<div className="flex items-center justify-between gap-3">
				<Link
					href="/research"
					className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					<span aria-hidden>←</span> All research
				</Link>
				<div className="flex flex-wrap items-center gap-1.5">
					<OwnerChips authorPbUserId={author.pbUserId} />
				</div>
			</div>

			<header className="grid gap-6 border-b border-(--cards-border) pb-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 md:pb-12">
				{author.avatarUrl ? (
					<img
						src={author.avatarUrl}
						alt=""
						className="h-24 w-24 shrink-0 rounded-full border border-(--cards-border) object-cover md:h-32 md:w-32"
					/>
				) : (
					<div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-(--cards-border) bg-(--cards-bg) text-2xl font-semibold text-(--text-secondary) md:h-32 md:w-32 md:text-3xl">
						{author.displayName.slice(0, 2).toUpperCase()}
					</div>
				)}
				<div className="grid min-w-0 gap-4">
					<div className="grid gap-1.5">
						<h1 className="text-3xl leading-tight font-semibold tracking-tight text-(--text-primary) md:text-5xl">
							{author.displayName}
						</h1>
						<p className="font-jetbrains text-xs text-(--text-tertiary)">@{author.slug}</p>
					</div>
					{author.bio ? (
						<p className="max-w-prose text-base leading-relaxed text-(--text-secondary)">{author.bio}</p>
					) : null}
					<div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-(--text-tertiary)">
						<span>
							<strong className="font-semibold text-(--text-primary)">{articles.length}</strong>{' '}
							{articles.length === 1 ? 'piece' : 'pieces'}
						</span>
						{yearsLabel ? (
							<>
								<span aria-hidden>·</span>
								<span className="font-jetbrains">{yearsLabel}</span>
							</>
						) : null}
						{totalMinutes > 0 ? (
							<>
								<span aria-hidden>·</span>
								<span>
									<strong className="font-semibold text-(--text-primary)">{totalMinutes}</strong> min reading
								</span>
							</>
						) : null}
					</div>
					{socialEntries.length > 0 ? (
						<div className="flex flex-wrap gap-1.5 pt-1">
							{socialEntries.map(([kind, value]) => (
								<SocialLink key={kind} kind={kind} value={value} />
							))}
						</div>
					) : null}
				</div>
			</header>

			{articles.length === 0 ? (
				<div className="rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) p-10 text-center">
					<p className="text-sm text-(--text-secondary)">No published research yet.</p>
				</div>
			) : (
				<>
					{lead ? (
						<section>
							<Link
								href={articleHref(lead)}
								className="group grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
							>
								<div className="order-2 grid content-start gap-3 p-6 md:order-1 md:p-8">
									<div className="flex items-center gap-2 text-[11px] tracking-wide text-(--text-tertiary) uppercase">
										<span className="font-jetbrains">Latest</span>
										<span aria-hidden>·</span>
										<span>{formatDate(lead.publishedAt)}</span>
										<span aria-hidden>·</span>
										<span>{readingMinutes(lead)} min read</span>
									</div>
									<h2 className="text-2xl leading-[1.15] font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text) md:text-3xl">
										{lead.title}
									</h2>
									{lead.subtitle ? (
										<p className="text-base leading-snug text-(--text-secondary)">{lead.subtitle}</p>
									) : lead.excerpt ? (
										<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">{lead.excerpt}</p>
									) : null}
								</div>
								{lead.coverImage?.url ? (
									<div className="order-1 overflow-hidden md:order-2">
										<img
											src={lead.coverImage.url}
											alt=""
											className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] md:h-full"
										/>
									</div>
								) : null}
							</Link>
						</section>
					) : null}

					{rest.length ? (
						<section className="grid gap-4">
							<div className="flex items-baseline justify-between gap-2 border-b border-(--cards-border) pb-3">
								<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">Archive</h2>
								<p className="font-jetbrains text-xs text-(--text-tertiary)">
									{rest.length} {rest.length === 1 ? 'note' : 'notes'}
								</p>
							</div>
							<ul className="grid">
								{rest.map((article) => (
									<li
										key={article.id}
										className="grid grid-cols-[64px_72px_minmax(0,1fr)] items-start gap-4 border-b border-(--cards-border) py-5 last:border-b-0 sm:grid-cols-[88px_96px_minmax(0,1fr)] sm:gap-6"
									>
										<div className="pt-1 font-jetbrains text-[11px] tracking-tight text-(--text-tertiary) tabular-nums">
											{formatShort(article.publishedAt)}
										</div>
										{article.coverImage?.url ? (
											<Link href={articleHref(article)} className="block">
												<img
													src={article.coverImage.url}
													alt=""
													loading="lazy"
													decoding="async"
													className="aspect-[4/3] w-full rounded-sm border border-(--cards-border) object-cover"
												/>
											</Link>
										) : (
											<div
												className="aspect-[4/3] w-full rounded-sm border border-(--cards-border) bg-(--app-bg)"
												aria-hidden
											/>
										)}
										<Link href={articleHref(article)} className="group grid gap-1.5">
											<h3 className="text-base leading-tight font-semibold text-(--text-primary) transition-colors group-hover:text-(--link-text) md:text-lg">
												{article.title}
											</h3>
											{article.excerpt ? (
												<p className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
													{article.excerpt}
												</p>
											) : null}
											<div className="flex items-center gap-2 text-[11px] text-(--text-tertiary)">
												<span>{readingMinutes(article)} min read</span>
												{article.tags && article.tags.length > 0 ? (
													<>
														<span aria-hidden>·</span>
														<span className="font-jetbrains">{article.tags[0]}</span>
													</>
												) : null}
											</div>
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
			description="Read DefiLlama research by this author."
			canonicalUrl={slug ? `/research/authors/${slug}` : '/research'}
			noIndex
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate>{slug ? <AuthorContent slug={slug} /> : null}</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
