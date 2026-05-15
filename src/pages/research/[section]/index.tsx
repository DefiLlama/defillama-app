import { useQuery } from '@tanstack/react-query'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArticleApiError } from '~/containers/Articles/api'
import { ArticleProxyAuthProvider } from '~/containers/Articles/ArticleProxyAuthProvider'
import { ArticlesAccessGate } from '~/containers/Articles/ArticlesAccessGate'
import { ArticleBannerStrip } from '~/containers/Articles/renderer/ArticleBannerStrip'
import { ResearchLoader } from '~/containers/Articles/ResearchLoader'
import { getArticlesFetchFromRequest } from '~/containers/Articles/server/auth'
import { fetchResearchSectionIndex } from '~/containers/Articles/server/queries'
import type { ArticleSection, LightweightArticleDocument } from '~/containers/Articles/types'
import { ARTICLE_SECTION_FROM_SLUG, ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from '~/containers/Articles/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

function formatDate(value: string | null) {
	if (!value) return 'Draft'
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function readingMinutes(article: LightweightArticleDocument) {
	const text = article.excerpt?.trim() || article.subtitle?.trim() || ''
	const words = text ? text.split(/\s+/).length : 0
	return Math.max(1, Math.ceil(words / 220))
}

function articleHref(article: LightweightArticleDocument) {
	if (article.section) return `/research/${ARTICLE_SECTION_SLUGS[article.section]}/${article.slug}`
	return '/research'
}

function intervieweeLabel(article: LightweightArticleDocument): string | null {
	const list = (article.interviewees ?? []).filter((p) => p?.name?.trim()).map((p) => p.name)
	if (list.length === 0) return null
	if (list.length === 1) return list[0]
	if (list.length === 2) return `${list[0]} & ${list[1]}`
	return `${list[0]}, ${list[1]} +${list.length - 2}`
}

function InterviewCard({ article }: { article: LightweightArticleDocument }) {
	const cover = article.coverImage?.url || null
	const interviewee = intervieweeLabel(article)
	const firstInterviewee = (article.interviewees ?? []).find((p) => p?.name?.trim())
	return (
		<Link
			href={articleHref(article)}
			className="group grid content-start gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)/40 p-4 transition-colors hover:border-(--link-text)/40"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span>Interview</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			{cover ? (
				<div className="aspect-[16/9] w-full overflow-hidden">
					<img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
				</div>
			) : null}
			{interviewee ? (
				<div className="flex items-center gap-2">
					{firstInterviewee?.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={firstInterviewee.avatarUrl}
							alt=""
							className="h-9 w-9 shrink-0 rounded-full border border-(--cards-border) object-cover"
						/>
					) : null}
					<div className="grid">
						<span className="text-sm font-semibold text-(--text-primary)">{interviewee}</span>
						{firstInterviewee?.role ? (
							<span className="text-[11px] text-(--text-tertiary)">{firstInterviewee.role}</span>
						) : null}
					</div>
				</div>
			) : null}
			<h3 className="text-base leading-snug font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
				{formatDate(article.publishedAt)}
			</span>
		</Link>
	)
}

function GenericCard({ article, section }: { article: LightweightArticleDocument; section: ArticleSection }) {
	const cover = article.coverImage?.url || null
	const sectionLabel = ARTICLE_SECTION_LABELS[section]
	return (
		<Link
			href={articleHref(article)}
			className="group grid content-start gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg)/40 p-4 transition-colors hover:border-(--link-text)/40"
		>
			<div className="flex items-center justify-between gap-3 font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
				<span>{sectionLabel}</span>
				<span className="tabular-nums">{readingMinutes(article)} min</span>
			</div>
			{cover ? (
				<div className="aspect-[16/9] w-full overflow-hidden">
					<img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
				</div>
			) : null}
			<h3 className="text-base leading-snug font-semibold tracking-tight text-(--text-primary) group-hover:text-(--link-text)">
				{article.title}
			</h3>
			{article.excerpt || article.subtitle ? (
				<p className="line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
					{article.excerpt || article.subtitle}
				</p>
			) : null}
			<span className="flex items-center gap-2 text-xs text-(--text-tertiary)">
				{article.brandByline ? (
					<>
						<span className="font-medium text-(--text-secondary)">DefiLlama Research</span>
						<span aria-hidden>·</span>
					</>
				) : article.authorProfile?.displayName ? (
					<>
						<span className="font-medium text-(--text-secondary)">{article.authorProfile.displayName}</span>
						<span aria-hidden>·</span>
					</>
				) : null}
				<span>{formatDate(article.publishedAt)}</span>
			</span>
		</Link>
	)
}

function SectionLandingContent({
	section,
	items,
	totalItems
}: {
	section: ArticleSection
	items: LightweightArticleDocument[]
	totalItems: number
}) {
	const sectionLabel = ARTICLE_SECTION_LABELS[section]
	const isInterview = section === 'interview'

	return (
		<>
			<ArticleBannerStrip scope="section" section={section} />
			<div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 pt-8 pb-24 sm:px-6">
				<header className="grid gap-3 border-b border-(--cards-border) pb-6">
					<div className="flex items-center justify-between gap-3">
						<Link
							href="/research"
							className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase hover:text-(--link-text)"
						>
							← All research
						</Link>
						<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase tabular-nums">
							{totalItems} {totalItems === 1 ? 'story' : 'stories'}
						</span>
					</div>
					<h1 className="text-3xl leading-tight font-bold tracking-tight text-(--text-primary) sm:text-4xl">
						{sectionLabel}
					</h1>
					{isInterview ? (
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							Conversations with the people building, funding, and using DeFi.
						</p>
					) : null}
				</header>

				{items.length === 0 ? (
					<div className="mx-auto grid max-w-xl gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg)/50 p-8 text-center">
						<p className="text-sm text-(--text-secondary)">Nothing here yet.</p>
						<Link href="/research" className="text-sm text-(--link-text) hover:underline">
							Browse all research →
						</Link>
					</div>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((article) =>
							isInterview ? (
								<InterviewCard key={article.id} article={article} />
							) : (
								<GenericCard key={article.id} article={article} section={section} />
							)
						)}
					</div>
				)}
			</div>
		</>
	)
}

function SectionLanding({
	section,
	initialItems,
	initialTotalItems
}: {
	section: ArticleSection
	initialItems: LightweightArticleDocument[] | null
	initialTotalItems: number | null
}) {
	const { authorizedFetch, isAuthenticated, loaders } = useAuthContext()
	const needsClientFetch = initialItems === null

	const sectionQuery = useQuery({
		queryKey: ['research', 'section-index', section],
		queryFn: () => fetchResearchSectionIndex(section, authorizedFetch),
		enabled: needsClientFetch && isAuthenticated && !loaders.userLoading,
		retry: false,
		initialData:
			initialItems !== null && initialTotalItems !== null
				? { items: initialItems, totalItems: initialTotalItems }
				: undefined
	})

	if (needsClientFetch && (loaders.userLoading || sectionQuery.isLoading)) {
		return <ResearchLoader />
	}

	if (needsClientFetch && sectionQuery.error) {
		const message =
			sectionQuery.error instanceof ArticleApiError ? sectionQuery.error.message : 'Failed to load research'
		return (
			<div className="mx-auto grid max-w-xl gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-6">
				<h1 className="text-xl font-semibold text-(--text-primary)">Couldn&apos;t load this section</h1>
				<p className="text-sm text-(--text-secondary)">{message}</p>
			</div>
		)
	}

	const items = sectionQuery.data?.items ?? []
	const totalItems = sectionQuery.data?.totalItems ?? items.length

	return <SectionLandingContent section={section} items={items} totalItems={totalItems} />
}

type SectionLandingPageProps = {
	section: ArticleSection
	items: LightweightArticleDocument[] | null
	totalItems: number | null
}

const getServerSidePropsHandler: GetServerSideProps<SectionLandingPageProps> = async (context) => {
	context.res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')

	const sectionSlug = typeof context.params?.section === 'string' ? context.params.section : ''
	const section = ARTICLE_SECTION_FROM_SLUG[sectionSlug]

	if (!section) {
		return { notFound: true }
	}

	const fetchFn = getArticlesFetchFromRequest(context.req)
	if (!fetchFn) {
		return { props: { section, items: null, totalItems: null } }
	}

	try {
		const { items, totalItems } = await fetchResearchSectionIndex(section, fetchFn)
		return { props: { section, items, totalItems } }
	} catch {
		return { props: { section, items: null, totalItems: null } }
	}
}

export const getServerSideProps = withServerSidePropsTelemetry('/research/[section]', getServerSidePropsHandler)

export default function SectionLandingPage({ section, items, totalItems }: SectionLandingPageProps) {
	const canonical = `/research/${ARTICLE_SECTION_SLUGS[section]}`

	return (
		<Layout
			title={`${ARTICLE_SECTION_LABELS[section]} — DefiLlama Research`}
			description={
				section === 'interview'
					? 'Interviews with the people building, funding, and using DeFi — by DefiLlama Research.'
					: 'DefiLlama research, grouped by section.'
			}
			canonicalUrl={canonical}
			hideDesktopSearch
		>
			<ArticleProxyAuthProvider>
				<ArticlesAccessGate loadingFallback={<ResearchLoader />}>
					<SectionLanding section={section} initialItems={items} initialTotalItems={totalItems} />
				</ArticlesAccessGate>
			</ArticleProxyAuthProvider>
		</Layout>
	)
}
