import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { ResearchIcon } from '~/components/ResearchIcon'
import { FEATURES_SERVER } from '~/constants'
import {
	ArticleApiError,
	getAuthorBySlug,
	getResearchLanding,
	type ArticleAuthorResponse
} from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { isResearcher } from '~/containers/Articles/ArticlesAccessGate'
import { articleHref, formatDate, readingMinutes } from '~/containers/Articles/landing/utils'
import { ResearchAuthorBackground } from '~/containers/Articles/profile/ResearchAuthorBackground'
import {
	ARTICLE_SECTION_LABELS,
	type ArticleDocument,
	type ArticlePublicAuthorProfile,
	type ArticleSection
} from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

type ArchiveFilter = ArticleSection | 'all'

type AuthorPageProps = {
	slug: string
	initialData: ArticleAuthorResponse | null
}

const DEFILLAMA_RESEARCH_SLUG = 'defillama-research'
const AUTHOR_CACHE_CONTROL = 'public, s-maxage=60'
const AUTHOR_QUERY_STALE_TIME = 60_000
const AUTHOR_NO_STORE = 'no-store'
const DEFILLAMA_RESEARCH_ARTICLE_LIMIT = 12
const EMPTY_ARTICLES: ArticleDocument[] = []
const shortDateFormatter = new Intl.DateTimeFormat('en', {
	month: 'short',
	day: 'numeric'
})
const SITE_ORIGIN = 'https://defillama.com'

function formatShort(value: string | null) {
	if (!value) return ''
	return shortDateFormatter.format(new Date(value))
}

function formatYear(value: string | null) {
	if (!value) return ''
	return new Date(value).getFullYear().toString()
}

const DEFILLAMA_RESEARCH_AUTHOR: ArticlePublicAuthorProfile = {
	slug: DEFILLAMA_RESEARCH_SLUG,
	displayName: 'DefiLlama Research',
	bio: 'Data-driven digital asset research, market intelligence, and interviews from the DefiLlama Research team.',
	avatarUrl: '/assets/research/research-icon.svg',
	socials: {
		x: 'https://x.com/defillama_res',
		telegram: 'https://t.me/defillama_research',
		linkedin: 'https://www.linkedin.com/company/defillama/'
	},
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
}

const DEFILLAMA_RESEARCH_LANDING_LIMITS = {
	hero: 6,
	latest: 12,
	spotlight: 12,
	interviews: 12,
	highlight: 6,
	insights: 12,
	reportsCandidates: 18,
	spotlightCandidates: 18,
	collectionsCandidates: 18
}

function getArticleDateValue(article: ArticleDocument) {
	return new Date(article.displayDate ?? article.publishedAt ?? article.createdAt).getTime()
}

function getDefillamaResearchArticlesFromLandingBuckets(
	buckets: Awaited<ReturnType<typeof getResearchLanding>>
): ArticleDocument[] {
	const articlesById = new Map<string, ArticleDocument>()
	for (const articles of Object.values(buckets)) {
		for (const article of articles) {
			if (!article.brandByline) continue
			articlesById.set(article.id, {
				...article,
				authorProfile: article.authorProfile ?? DEFILLAMA_RESEARCH_AUTHOR
			})
		}
	}
	return [...articlesById.values()]
		.sort((a, b) => getArticleDateValue(b) - getArticleDateValue(a))
		.slice(0, DEFILLAMA_RESEARCH_ARTICLE_LIMIT)
}

async function loadDefillamaResearchPageData(): Promise<ArticleAuthorResponse> {
	const landingBuckets = await getResearchLanding(DEFILLAMA_RESEARCH_LANDING_LIMITS)
	return {
		author: DEFILLAMA_RESEARCH_AUTHOR,
		articles: getDefillamaResearchArticlesFromLandingBuckets(landingBuckets)
	}
}

async function loadAuthorPageData(slug: string): Promise<ArticleAuthorResponse | null> {
	try {
		const response = await getAuthorBySlug(slug)
		if (response && (slug !== DEFILLAMA_RESEARCH_SLUG || response.articles.length > 0)) return response
		return slug === DEFILLAMA_RESEARCH_SLUG ? loadDefillamaResearchPageData() : null
	} catch (error) {
		if (slug === DEFILLAMA_RESEARCH_SLUG) return loadDefillamaResearchPageData()
		throw error
	}
}

const getServerSidePropsHandler: GetServerSideProps<AuthorPageProps> = async ({ params, res }) => {
	const slug = typeof params?.slug === 'string' ? params.slug : ''
	if (!slug) {
		res.setHeader('Cache-Control', AUTHOR_NO_STORE)
		return { notFound: true }
	}

	const initialData = await loadAuthorPageData(slug)
	if (!initialData) {
		res.setHeader('Cache-Control', AUTHOR_NO_STORE)
		return { notFound: true }
	}
	res.setHeader('Cache-Control', AUTHOR_CACHE_CONTROL)
	return { props: { slug, initialData } }
}

export const getServerSideProps = withServerSidePropsTelemetry('/research/authors/[slug]', getServerSidePropsHandler)

function SocialLink({ kind, value }: { kind: string; value: string }) {
	const href = value.startsWith('http') ? value : `https://${value}`
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#0c2956]/15 px-3 text-xs font-medium text-[#0c2956]/70 transition-colors hover:border-[#237BFF]/40 hover:text-[#237BFF] dark:border-white/15 dark:text-white/70 dark:hover:border-white/40 dark:hover:text-white"
		>
			<span>{kind.replace(/-/g, ' ')}</span>
			<Icon name="arrow-up-right" className="size-3" />
		</a>
	)
}

function AuthorPageState({
	title,
	description,
	children
}: {
	title: string
	description?: string
	children?: React.ReactNode
}) {
	return (
		<div className="isolate flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) px-6 py-16">
			<div className="grid max-w-md gap-3 text-center">
				<h1 className="text-3xl font-bold text-(--text-primary)">{title}</h1>
				{description ? <p className="text-base text-(--text-label)">{description}</p> : null}
				{children}
			</div>
		</div>
	)
}

function OwnerChips({ authorPbUserId }: { authorPbUserId?: string }) {
	const { user, isAuthenticated } = useAuthContext()
	const isMine = isAuthenticated && isResearcher(user) && !!user?.id && user.id === authorPbUserId
	if (!isMine) return null
	return (
		<>
			<BasicLink
				href="/research/profile"
				className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
			>
				Edit profile
			</BasicLink>
			<BasicLink
				href="/research/mine"
				className="rounded-md border border-(--cards-border) px-2.5 py-1 text-xs text-(--text-secondary) transition-colors hover:border-(--link-text)/40 hover:text-(--link-text)"
			>
				Your research
			</BasicLink>
		</>
	)
}

function getResearchArticleLabel(article: ArticleDocument) {
	if (article.section === 'report') return 'Reports'
	if (article.section === 'spotlight') return 'Introducing'
	if (article.section) return ARTICLE_SECTION_LABELS[article.section]
	return 'Research'
}

function BrandHero() {
	return (
		<header className="relative text-white">
			<div className="relative z-10 mx-auto grid w-full max-w-[1368px] gap-6 px-4 pt-8 pb-12 sm:px-6 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,249px)] lg:items-start lg:gap-10 lg:px-8 lg:pt-12 lg:pb-16">
				<div className="grid gap-2">
					<h1 className="text-[28px] leading-tight font-bold tracking-widest text-white sm:text-3xl dark:text-[#3A8BFF]">
						<BasicLink
							href="/research"
							className="text-inherit transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
						>
							DefiLlama Research
						</BasicLink>
					</h1>
					<p className="text-lg leading-tight font-semibold tracking-widest text-[#F5F9FD] italic sm:text-xl">Editor</p>
				</div>

				<p className="max-w-[60ch] text-base leading-relaxed font-medium text-white lg:text-2xl lg:leading-snug">
					<span className="font-bold text-[#3A8BFF]">DefiLlama Research</span> is the research arm of{' '}
					<span className="font-semibold">DefiLlama</span>, delivering bespoke digital asset research, market
					intelligence, and strategic advisory services powered by the DefiLlama ecosystem.
				</p>

				<div className="grid w-full max-w-[280px] gap-6 justify-self-center pt-2 lg:justify-self-start lg:pt-0">
					<a
						href={`${FEATURES_SERVER.replace(/\/$/, '')}/uploads/media-kit.pdf`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-medium whitespace-nowrap text-[#3A8BFF] transition-opacity hover:opacity-90"
					>
						<span>Explore our media kit</span>
						<ResearchIcon name="research-media-kit" className="size-7 shrink-0" />
					</a>
					<BasicLink
						href="https://calendly.com/research-defillama/30min"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white px-6 text-base font-medium whitespace-nowrap text-white transition-colors hover:bg-white/10"
					>
						<span>Book a call</span>
						<ResearchIcon name="calendly-mark" className="size-7 shrink-0" />
					</BasicLink>
				</div>
			</div>
		</header>
	)
}

function ResearchArticleListRow({
	article,
	compact,
	index
}: {
	article: ArticleDocument
	compact?: boolean
	index: number
}) {
	if (compact) {
		return (
			<li>
				<BasicLink
					href={articleHref(article)}
					className="group grid min-h-16 grid-cols-[84px_minmax(0,1fr)] items-center gap-2.5"
				>
					{article.coverImage?.url ? (
						<img
							src={article.coverImage.url}
							alt={article.coverImage.alt ?? ''}
							width={84}
							height={64}
							loading={index < 3 ? 'eager' : 'lazy'}
							decoding="async"
							className="h-16 w-full rounded-md object-cover"
						/>
					) : (
						<div className="h-16 w-full rounded-md bg-[#000E41]/10 dark:bg-white/10" aria-hidden />
					)}
					<h3 className="line-clamp-3 text-base leading-snug font-medium text-[#000E41] transition-colors group-hover:text-[#3A8BFF] dark:text-white dark:group-hover:text-[#3A8BFF]">
						{article.title}
					</h3>
				</BasicLink>
			</li>
		)
	}

	return (
		<li>
			<BasicLink
				href={articleHref(article)}
				className={`group grid min-h-[176px] grid-cols-[218px_minmax(0,1fr)] gap-3 border ${
					index > 0 ? 'border-t-0' : ''
				} border-[#000E41] bg-transparent p-3 text-[#000E41] transition-colors hover:border-[#3A8BFF] dark:border-white dark:text-white dark:hover:border-[#3A8BFF]`}
			>
				{article.coverImage?.url ? (
					<img
						src={article.coverImage.url}
						alt={article.coverImage.alt ?? ''}
						width={218}
						height={152}
						loading={index < 2 ? 'eager' : 'lazy'}
						decoding="async"
						className="h-[152px] w-[218px] rounded-md object-cover"
					/>
				) : (
					<div className="h-[152px] w-[218px] rounded-md bg-[#000E41]/10 dark:bg-white/10" aria-hidden />
				)}
				<div className="grid min-w-0 content-between gap-4 py-0.5">
					<h3 className="line-clamp-4 text-lg leading-7 font-bold text-[#000E41] transition-colors group-hover:text-[#3A8BFF] dark:text-white dark:group-hover:text-[#3A8BFF]">
						{article.title}
					</h3>
					<p className="text-sm leading-tight font-bold text-[#3A8BFF]">{getResearchArticleLabel(article)}</p>
				</div>
			</BasicLink>
		</li>
	)
}

function ResearchArticleColumn({ articles }: { articles: ArticleDocument[] }) {
	return (
		<ol>
			{articles.map((article, index) => (
				<ResearchArticleListRow key={article.id} article={article} index={index} />
			))}
		</ol>
	)
}

function ResearchArticleLists({ articles }: { articles: ArticleDocument[] }) {
	const leftColumn = articles.filter((_, index) => index % 2 === 0)
	const rightColumn = articles.filter((_, index) => index % 2 === 1)

	return (
		<section className="relative z-10 mx-auto grid w-full max-w-[1368px] gap-5 px-4 pt-2 pb-8 sm:px-6 lg:gap-10 lg:px-8 lg:pb-12">
			<div className="flex items-center gap-2">
				<h2
					id="latest-research"
					className="shrink-0 text-base font-medium text-[#000E41] lg:text-lg lg:uppercase dark:text-white"
				>
					Our Latest Research
				</h2>
				<div className="h-px min-w-0 flex-1 bg-[#000E41] dark:bg-white" aria-hidden />
			</div>

			{/* mobile + tablet: compact rows, single column then two-up */}
			<ol className="grid gap-3 sm:grid-cols-2 sm:gap-x-8 lg:hidden">
				{articles.map((article, index) => (
					<ResearchArticleListRow key={article.id} article={article} index={index} compact />
				))}
			</ol>

			{/* desktop: two columns of cards */}
			<div className="hidden grid-cols-2 gap-x-[52px] lg:grid">
				<ResearchArticleColumn articles={leftColumn} />
				<ResearchArticleColumn articles={rightColumn} />
			</div>

			<BasicLink
				href="/research"
				className="inline-flex items-center gap-2 justify-self-end text-sm font-bold text-[#237BFF] uppercase transition-colors hover:text-[#000E41] lg:text-lg dark:hover:text-white"
			>
				<span>View all</span>
				<Icon name="arrow-right" className="size-4" />
			</BasicLink>
		</section>
	)
}

function DefillamaResearchContent({ articles }: { articles: ArticleDocument[] }) {
	return (
		<div className="relative isolate col-span-full overflow-x-clip overflow-y-hidden bg-[#F5F5F5] text-[#000E41] dark:bg-[#1D1D1D] dark:text-white lg:dark:bg-black">
			<ResearchAuthorBackground />
			<BrandHero />
			<ResearchArticleLists articles={articles} />
		</div>
	)
}

function AuthorContent({ slug, initialData }: { slug: string; initialData: ArticleAuthorResponse | null }) {
	const isDefillamaResearch = slug === DEFILLAMA_RESEARCH_SLUG
	const {
		data = null,
		isLoading,
		error
	} = useQuery({
		queryKey: ['research', 'author', slug],
		queryFn: () => loadAuthorPageData(slug),
		initialData: initialData ?? undefined,
		enabled: !!slug,
		staleTime: initialData ? AUTHOR_QUERY_STALE_TIME : 0,
		refetchOnMount: !initialData,
		retry: false
	})

	const articles = useMemo(() => {
		const items = data?.articles ?? EMPTY_ARTICLES
		if (isDefillamaResearch) return items
		return items.filter((article) => article.brandByline !== true)
	}, [data?.articles, isDefillamaResearch])

	const rest = useMemo(() => articles.slice(1), [articles])
	const sectionCounts = useMemo(() => {
		const counts = new Map<ArticleSection, number>()
		for (const article of rest) {
			if (!article.section) continue
			counts.set(article.section, (counts.get(article.section) ?? 0) + 1)
		}
		return counts
	}, [rest])
	const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all')
	const filteredArchive = useMemo(() => {
		if (archiveFilter === 'all') return rest
		return rest.filter((article) => article.section === archiveFilter)
	}, [rest, archiveFilter])
	const archiveTabs: ArchiveFilter[] = useMemo(() => {
		const tabs: ArchiveFilter[] = ['all']
		for (const [section] of sectionCounts) tabs.push(section)
		return tabs
	}, [sectionCounts])

	if (isLoading) {
		return <AuthorPageState title="Loading..." />
	}

	if (!data && !error) {
		return (
			<AuthorPageState title="Author not found">
				<BasicLink href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research
				</BasicLink>
			</AuthorPageState>
		)
	}

	if (error || !data) {
		const message = error instanceof ArticleApiError ? error.message : 'Failed to load author'
		return (
			<AuthorPageState title="Couldn't load author" description={message}>
				<BasicLink href="/research" className="text-sm text-(--link-text) hover:underline">
					Browse all research
				</BasicLink>
			</AuthorPageState>
		)
	}

	if (isDefillamaResearch) {
		return <DefillamaResearchContent articles={articles} />
	}

	const { author } = data
	const totalMinutes = articles.reduce((sum, article) => sum + readingMinutes(article), 0)
	const firstYear = articles.length ? formatYear(articles[articles.length - 1]?.publishedAt) : null
	const latestYear = articles.length ? formatYear(articles[0]?.publishedAt) : null
	const yearsLabel =
		firstYear && latestYear ? (firstYear === latestYear ? firstYear : `${firstYear}-${latestYear}`) : null

	const lead = articles[0]

	const socialEntries = author.socials ? Object.entries(author.socials).filter(([, value]) => Boolean(value)) : []
	const authorPbUserId = 'pbUserId' in author && typeof author.pbUserId === 'string' ? author.pbUserId : undefined

	return (
		<div className="mx-auto grid w-full max-w-4xl gap-10 px-1 pt-2 pb-20 md:gap-14">
			<div className="flex items-center justify-between gap-3">
				<BasicLink
					href="/research"
					className="inline-flex items-center gap-1 text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					<Icon name="arrow-left" className="size-3.5" />
					<span>All research</span>
				</BasicLink>
				<div className="flex flex-wrap items-center gap-1.5">
					<OwnerChips authorPbUserId={authorPbUserId} />
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
								<span aria-hidden>/</span>
								<span className="font-jetbrains">{yearsLabel}</span>
							</>
						) : null}
						{totalMinutes > 0 ? (
							<>
								<span aria-hidden>/</span>
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
							<BasicLink
								href={articleHref(lead)}
								className="group grid overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) transition-colors hover:border-(--link-text)/40 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
							>
								<div className="order-2 grid content-start gap-3 p-6 md:order-1 md:p-8">
									<div className="flex items-center gap-2 text-xs tracking-wide text-(--text-tertiary) uppercase">
										<span className="font-jetbrains">Latest</span>
										<span aria-hidden>/</span>
										<span>{formatDate(lead.displayDate ?? lead.publishedAt)}</span>
										<span aria-hidden>/</span>
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
							</BasicLink>
						</section>
					) : null}

					{rest.length ? (
						<section className="grid gap-4">
							<div className="flex items-baseline justify-between gap-2 border-b border-(--cards-border) pb-3">
								<h2 className="text-sm font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">Archive</h2>
								<p className="font-jetbrains text-xs text-(--text-tertiary)">
									{filteredArchive.length} {filteredArchive.length === 1 ? 'note' : 'notes'}
								</p>
							</div>
							{archiveTabs.length > 1 ? (
								<div className="flex flex-wrap gap-1.5">
									{archiveTabs.map((tab) => {
										const label = tab === 'all' ? 'All' : ARTICLE_SECTION_LABELS[tab]
										const count = tab === 'all' ? rest.length : (sectionCounts.get(tab) ?? 0)
										const isActive = archiveFilter === tab
										return (
											<button
												key={tab}
												type="button"
												onClick={() => setArchiveFilter(tab)}
												className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-jetbrains text-[10px] tracking-[0.16em] uppercase transition-colors ${
													isActive
														? 'border-(--link-text)/60 bg-(--link-button) text-(--link-text)'
														: 'border-(--cards-border) bg-transparent text-(--text-secondary) hover:border-(--link-text)/40 hover:text-(--link-text)'
												}`}
											>
												<span>{label}</span>
												<span className="tabular-nums">{count}</span>
											</button>
										)
									})}
								</div>
							) : null}
							<ul className="grid">
								{filteredArchive.map((article) => (
									<li
										key={article.id}
										className="grid grid-cols-[64px_72px_minmax(0,1fr)] items-start gap-4 border-b border-(--cards-border) py-5 last:border-b-0 sm:grid-cols-[88px_96px_minmax(0,1fr)] sm:gap-6"
									>
										<div className="pt-1 font-jetbrains text-xs tracking-tight text-(--text-tertiary) tabular-nums">
											{formatShort(article.publishedAt)}
										</div>
										{article.coverImage?.url ? (
											<BasicLink href={articleHref(article)} className="block">
												<img
													src={article.coverImage.url}
													alt=""
													loading="lazy"
													decoding="async"
													className="aspect-4/3 w-full rounded-sm border border-(--cards-border) object-cover"
												/>
											</BasicLink>
										) : (
											<div
												className="aspect-4/3 w-full rounded-sm border border-(--cards-border) bg-(--app-bg)"
												aria-hidden
											/>
										)}
										<BasicLink href={articleHref(article)} className="group grid gap-1.5">
											<h3 className="text-base leading-tight font-semibold text-(--text-primary) transition-colors group-hover:text-(--link-text) md:text-lg">
												{article.title}
											</h3>
											{article.excerpt ? (
												<p className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
													{article.excerpt}
												</p>
											) : null}
											<div className="flex items-center gap-2 text-xs text-(--text-tertiary)">
												<span>{readingMinutes(article)} min read</span>
												{article.tags && article.tags.length > 0 ? (
													<>
														<span aria-hidden>/</span>
														<span className="font-jetbrains">{article.tags[0]}</span>
													</>
												) : null}
											</div>
										</BasicLink>
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

function buildDefillamaResearchJsonLd(articles: ArticleDocument[]) {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'Organization',
			'@id': `${SITE_ORIGIN}/research/authors/${DEFILLAMA_RESEARCH_SLUG}`,
			name: 'DefiLlama Research',
			url: `${SITE_ORIGIN}/research/authors/${DEFILLAMA_RESEARCH_SLUG}`,
			parentOrganization: {
				'@type': 'Organization',
				name: 'DefiLlama',
				url: SITE_ORIGIN
			},
			sameAs: [
				'https://x.com/defillama_res',
				'https://t.me/defillama_research',
				'https://www.linkedin.com/company/defillama/'
			]
		},
		{
			'@context': 'https://schema.org',
			'@type': 'CollectionPage',
			name: 'DefiLlama Research Articles',
			description: 'Latest articles and market intelligence from DefiLlama Research.',
			url: `${SITE_ORIGIN}/research/authors/${DEFILLAMA_RESEARCH_SLUG}`,
			isPartOf: {
				'@type': 'WebSite',
				name: 'DefiLlama',
				url: SITE_ORIGIN
			},
			mainEntity: {
				'@type': 'ItemList',
				itemListElement: articles.slice(0, 10).map((article, index) => ({
					'@type': 'ListItem',
					position: index + 1,
					url: `${SITE_ORIGIN}${articleHref(article)}`,
					name: article.title
				}))
			}
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'DefiLlama Research',
					item: `${SITE_ORIGIN}/research`
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'DefiLlama Research Articles',
					item: `${SITE_ORIGIN}/research/authors/${DEFILLAMA_RESEARCH_SLUG}`
				}
			]
		}
	]
}

export default function ArticleAuthorPage({
	slug,
	initialData
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const isDefillamaResearch = slug === DEFILLAMA_RESEARCH_SLUG
	const articles = initialData?.articles ?? EMPTY_ARTICLES
	const title = isDefillamaResearch
		? 'DefiLlama Research Articles | DefiLlama Research'
		: initialData?.author
			? `${initialData.author.displayName} - DefiLlama Research`
			: 'Author - DefiLlama'
	const description = isDefillamaResearch
		? 'Read the latest DefiLlama Research articles, interviews, and digital asset market intelligence.'
		: initialData?.author?.bio || 'Read DefiLlama research by this author.'
	const canonicalUrl = slug ? `/research/authors/${slug}` : '/research'

	return (
		<Layout
			title={title}
			description={description}
			canonicalUrl={canonicalUrl}
			noIndex={!isDefillamaResearch}
			jsonLd={isDefillamaResearch ? buildDefillamaResearchJsonLd(articles) : undefined}
			hideDesktopSearch
		>
			{isDefillamaResearch ? <style>{`main{padding:0}#__next{gap:0;}`}</style> : null}
			<ArticleProxyAuthProvider>
				<AuthorContent slug={slug} initialData={initialData} />
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
